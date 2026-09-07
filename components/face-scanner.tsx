'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Database,
  BarChart2,
  Sliders,
} from 'lucide-react';
import { MaskSize, ModelPrediction, MASK_SIZE_GUIDELINES } from '@/lib/mask-fit';
import {
  extractFacialFeatures,
  calculateStabilityMetrics,
  ExtractedFrameFeatures,
  HeadPoseEstimation,
  MultiFrameStabilityMetrics,
  REFERENCE_INTER_EYE_CM,
} from '@/lib/facial-features';
import { runLocalModelInference, getOrInitOnnxSession, ModelInferenceResult } from '@/lib/model-runner';
import { saveGuestScan } from '@/lib/storage';
import { ModelEvaluationModal } from './model-evaluation-modal';
import { DatasetCollectorModal } from './dataset-collector-modal';
import { installConsoleGuard } from './console-guard';

interface FaceScannerProps {
  onScanComplete: (result: {
    measurements: {
      jawWidth: number;
      faceHeight: number;
      faceWidth?: number;
      referenceInterEyeDistanceCm: number;
    };
    prediction: ModelPrediction;
  }) => void;
  onNavigateToStore?: (recommendedSize: MaskSize) => void;
  userId?: string;
  userName?: string;
}

const TARGET_FRAME_COUNT = 35;

export function FaceScanner({
  onScanComplete,
  onNavigateToStore,
  userId = 'guest',
  userName = 'User',
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);

  const [cameraState, setCameraState] = useState<'idle' | 'initializing' | 'active' | 'denied'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<ExtractedFrameFeatures[]>([]);
  const [currentPose, setCurrentPose] = useState<HeadPoseEstimation>({
    yawDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    isValidPose: true,
    guidanceMessage: 'Position face within the calibration guide',
  });
  const [liveMeasurements, setLiveMeasurements] = useState<{
    jawWidthCm: number;
    faceHeightCm: number;
    aspectRatio: number;
  } | null>(null);

  const [scanResult, setScanResult] = useState<{
    metrics: MultiFrameStabilityMetrics;
    inference: ModelInferenceResult;
    isDemoSimulation: boolean;
  } | null>(null);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);

  // Modals
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showCollectorModal, setShowCollectorModal] = useState(false);

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    let active = true;

    async function initMediaPipe() {
      try {
        installConsoleGuard();
        const vision = await import('@mediapipe/tasks-vision');
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
        );
        const faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (active) {
          landmarkerRef.current = faceLandmarker;
        }
      } catch (err) {
        console.warn('MediaPipe initialization warning (demo mode available):', err);
      }
    }

    initMediaPipe();
    getOrInitOnnxSession().catch((err) => {
      console.warn('ONNX Runtime Web preloading note:', err);
    });

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Camera stream handler
  const startCamera = async () => {
    setCameraState('initializing');
    setScanResult(null);
    setCapturedFrames([]);
    setIsDemoMode(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState('active');
        startDetectionLoop();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unreadable:', err);
      setCameraState('denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setCameraState('idle');
    setIsScanning(false);
  };

  // Continuous Landmark Detection Loop
  const startDetectionLoop = useCallback(() => {
    let lastVideoTime = -1;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (landmarkerRef.current && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            try {
              installConsoleGuard();
              const startTimeMs = performance.now();
              const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

              if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                const rawLandmarks = results.faceLandmarks[0];
                const landmarksMap: Record<number, { x: number; y: number; z?: number }> = {};
                rawLandmarks.forEach((pt: any, idx: number) => {
                  landmarksMap[idx] = { x: pt.x, y: pt.y, z: pt.z };
                });

                const vWidth = video.videoWidth || 640;
                const vHeight = video.videoHeight || 480;
                const frameFeatures = extractFacialFeatures(landmarksMap, vWidth, vHeight);
                setCurrentPose(frameFeatures.headPose);
                setLiveMeasurements({
                  jawWidthCm: frameFeatures.estimatedMeasurements.jawWidthCm,
                  faceHeightCm: frameFeatures.estimatedMeasurements.faceHeightCm,
                  aspectRatio: frameFeatures.estimatedMeasurements.aspectRatio,
                });

                // Draw minimal high-precision visual biometric mesh
                drawFacialOverlay(ctx, canvas.width, canvas.height, landmarksMap, frameFeatures.headPose.isValidPose);

                // If actively scanning and pose is valid, accumulate frame
                if (isScanning && frameFeatures.headPose.isValidPose) {
                  setCapturedFrames((prev) => {
                    const next = [...prev, frameFeatures];
                    if (next.length >= TARGET_FRAME_COUNT) {
                      completeScan(next, false);
                    }
                    return next;
                  });
                }
              } else {
                setCurrentPose({
                  yawDeg: 0,
                  pitchDeg: 0,
                  rollDeg: 0,
                  isValidPose: false,
                  guidanceMessage: 'Align face inside the viewport guide',
                });
              }
            } catch (err) {
              console.warn('Detection iteration note:', err);
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
  }, [isScanning]);

  // Draw Biometric Points and Guidance Overlay
  const drawFacialOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: Record<number, { x: number; y: number }>,
    isValid: boolean
  ) => {
    const strokeColor = isValid ? 'rgba(99, 112, 77, 0.85)' : 'rgba(194, 132, 50, 0.85)';
    const pointColor = isValid ? '#63704D' : '#C28432';

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = pointColor;
    ctx.lineWidth = 1.5;

    // Draw key contour connections: Jawline (234 -> 152 -> 454)
    const jawIndices = [234, 127, 50, 152, 280, 356, 454];
    ctx.beginPath();
    jawIndices.forEach((idx, i) => {
      const p = landmarks[idx];
      if (p) {
        const px = p.x * w;
        const py = p.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    });
    ctx.stroke();

    // Draw key anchors
    const keyAnchors = [168, 152, 234, 454, 33, 133, 263, 362, 4];
    keyAnchors.forEach((idx) => {
      const p = landmarks[idx];
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.restore();
  };

  // Complete Multi-Frame Analysis & Run Model Inference
  const completeScan = async (frames: ExtractedFrameFeatures[], isDemo: boolean) => {
    setIsScanning(false);
    const metrics = calculateStabilityMetrics(frames);
    const inference = await runLocalModelInference(metrics.meanFeatureVector);

    const result = {
      metrics,
      inference,
      isDemoSimulation: isDemo,
    };

    setScanResult(result);

    // Provide parent callback
    const avgJaw = metrics.jawWidth.mean;
    const avgHeight = metrics.faceHeight.mean;

    onScanComplete({
      measurements: {
        jawWidth: avgJaw,
        faceHeight: avgHeight,
        referenceInterEyeDistanceCm: REFERENCE_INTER_EYE_CM,
      },
      prediction: {
        predictedSize: inference.predictedSize,
        confidence: inference.confidence,
        probabilities: inference.probabilities,
        scanQuality: metrics.scanQuality,
        coefficientOfVariation: metrics.jawWidth.cvPercent,
        isDemoSimulation: isDemo,
      },
    });

    // Save to server database / local guest storage
    persistScan(result, avgJaw, avgHeight);
  };

  // Persist Scan Record
  const persistScan = async (
    result: { metrics: MultiFrameStabilityMetrics; inference: ModelInferenceResult; isDemoSimulation: boolean },
    jawWidthCm: number,
    faceHeightCm: number
  ) => {
    setSavingScan(true);
    const payload = {
      userId,
      userName,
      jawWidthCm,
      faceHeightCm,
      referenceInterEyeCm: REFERENCE_INTER_EYE_CM,
      recommendedSize: result.inference.predictedSize,
      confidence: result.inference.confidence,
      scanQuality: result.metrics.scanQuality,
      probabilities: result.inference.probabilities,
      headPose: currentPose,
      stabilityMetrics: {
        sampleCount: result.metrics.sampleCount,
        acceptedCount: result.metrics.acceptedCount,
        rejectedCount: result.metrics.rejectedCount,
        jawCvPercent: result.metrics.jawWidth.cvPercent,
        heightCvPercent: result.metrics.faceHeight.cvPercent,
        stabilityScore: result.metrics.overallStabilityScore,
      },
      normalizedFeatures: result.metrics.meanFeatureVector,
      isDemoSimulation: result.isDemoSimulation,
    };

    // Save in local storage immediately
    saveGuestScan({ ...payload, id: `local_${Date.now()}`, createdAt: new Date().toISOString() });

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scan?.id) {
          setSavedScanId(data.scan.id);
        }
      }
    } catch (e) {
      console.warn('Background scan sync note:', e);
    } finally {
      setSavingScan(false);
    }
  };

  // Explicit Synthetic Demo Simulation (watermarked)
  const runDemoSimulation = async (profileType: 'Small' | 'Medium' | 'Large' | 'random' = 'random') => {
    setIsDemoMode(true);
    setCameraState('active');
    setIsScanning(true);
    setCapturedFrames([]);

    // Determine target profile
    let targetProfile: 'Small' | 'Medium' | 'Large' = 'Medium';
    if (profileType === 'random') {
      const types: ('Small' | 'Medium' | 'Large')[] = ['Small', 'Medium', 'Large'];
      targetProfile = types[Math.floor(Math.random() * types.length)];
    } else {
      targetProfile = profileType;
    }

    let baseJaw = 13.2;
    let baseHeight = 11.9;
    let baseJawNorm = 2.08;
    let baseHeightNorm = 1.88;

    if (targetProfile === 'Small') {
      baseJaw = 11.4;
      baseHeight = 10.6;
      baseJawNorm = 1.80;
      baseHeightNorm = 1.67;
    } else if (targetProfile === 'Large') {
      baseJaw = 14.8;
      baseHeight = 13.2;
      baseJawNorm = 2.32;
      baseHeightNorm = 2.09;
    }

    const demoFrames: ExtractedFrameFeatures[] = [];

    for (let i = 0; i < TARGET_FRAME_COUNT; i++) {
      await new Promise((r) => setTimeout(r, 40));
      const jitterJaw = baseJaw + Math.sin(i * 0.45) * 0.14;
      const jitterHeight = baseHeight + Math.cos(i * 0.45) * 0.11;
      const aspect = jitterJaw / jitterHeight;

      const liveJaw = parseFloat(jitterJaw.toFixed(1));
      const liveHeight = parseFloat(jitterHeight.toFixed(1));
      const liveAspect = parseFloat(aspect.toFixed(2));

      setLiveMeasurements({
        jawWidthCm: liveJaw,
        faceHeightCm: liveHeight,
        aspectRatio: liveAspect,
      });

      const f: ExtractedFrameFeatures = {
        featureVector: [
          parseFloat((baseJawNorm + Math.sin(i * 0.3) * 0.015).toFixed(4)),
          parseFloat((baseHeightNorm + Math.cos(i * 0.3) * 0.012).toFixed(4)),
          parseFloat((baseJawNorm * 1.05).toFixed(4)),
          parseFloat((baseJawNorm * 0.92).toFixed(4)),
          parseFloat((baseJawNorm * 0.82).toFixed(4)),
          0.72, 0.54, 1.58, 0.15,
          liveAspect,
          0.95, 0.86, 0.38,
          parseFloat((Math.sin(i * 0.2) * 1.5).toFixed(1)),
          parseFloat((Math.cos(i * 0.2) * 1.2).toFixed(1)),
          0.4,
        ],
        featureMap: {},
        headPose: {
          yawDeg: parseFloat((Math.sin(i * 0.2) * 1.5).toFixed(1)),
          pitchDeg: parseFloat((Math.cos(i * 0.2) * 1.2).toFixed(1)),
          rollDeg: 0.4,
          isValidPose: true,
          guidanceMessage: `Simulating ${targetProfile} profile • Sampling frame buffer`,
        },
        estimatedMeasurements: {
          jawWidthCm: liveJaw,
          faceHeightCm: liveHeight,
          faceWidthCm: parseFloat((liveJaw * 1.06).toFixed(1)),
          chinToNoseCm: parseFloat((liveHeight * 0.45).toFixed(1)),
          interEyeReferenceCm: REFERENCE_INTER_EYE_CM,
          aspectRatio: liveAspect,
        },
        isValidForAggregation: true,
      };

      demoFrames.push(f);
      setCapturedFrames([...demoFrames]);
    }

    completeScan(demoFrames, true);
  };

  const handleResetScan = () => {
    setScanResult(null);
    setCapturedFrames([]);
    setSavedScanId(null);
    if (cameraState === 'active' && !isDemoMode) {
      setIsScanning(false);
    } else {
      startCamera();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar: Model Architecture & Dataset Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/75 border border-[#DCD6C8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#4E5B31] text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#2E3019]">
              AI-Assisted Facial Analysis & Sizing Engine
            </h1>
            <p className="text-xs text-[#5D6346]">
              35-frame multi-sample stability analysis • Scale-calibrated via inter-eye reference distance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEvaluationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#EAE5D8] hover:bg-[#DCD6C8] text-[#2E3019] transition-colors border border-[#C4BDB0]"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#4E5B31]" />
            <span>AI Model Evaluation</span>
          </button>

          <button
            onClick={() => setShowCollectorModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#EAE5D8] hover:bg-[#DCD6C8] text-[#2E3019] transition-colors border border-[#C4BDB0]"
          >
            <Database className="w-3.5 h-3.5 text-[#4E5B31]" />
            <span>Dataset Collector</span>
          </button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Viewport / Video Area (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#1E2018] shadow-lg border border-[#DCD6C8] flex items-center justify-center">
            {/* Real Video & Overlay Canvas */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                cameraState === 'active' && !isDemoMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                cameraState === 'active' && !isDemoMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* Inactive or Initializing State */}
            {cameraState !== 'active' && (
              <div className="p-8 text-center text-white/90 space-y-4 max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Facial Scan Initialization</h3>
                  <p className="text-xs text-white/70 mt-1">
                    Grant camera permission for live MediaPipe facial landmark tracking and head-pose analysis.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-[#63704D] hover:bg-[#525E3E] text-white transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Enable Camera & Begin</span>
                  </button>

                  <div className="space-y-1.5 pt-1">
                    <button
                      onClick={() => runDemoSimulation('random')}
                      className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Run Dynamic Simulation (Random)</span>
                    </button>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => runDemoSimulation('Small')}
                        className="py-1 px-2 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors"
                        title="Simulate Small / Petite Face"
                      >
                        Petite (S)
                      </button>
                      <button
                        onClick={() => runDemoSimulation('Medium')}
                        className="py-1 px-2 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors"
                        title="Simulate Medium / Standard Face"
                      >
                        Standard (M)
                      </button>
                      <button
                        onClick={() => runDemoSimulation('Large')}
                        className="py-1 px-2 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/15 text-white/90 border border-white/10 transition-colors"
                        title="Simulate Large / Broad Face"
                      >
                        Broad (L)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Mode Face Guide Wireframe */}
            {cameraState === 'active' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Oval Guide */}
                <div
                  className={`w-52 h-72 rounded-[48%] border-2 transition-colors duration-200 ${
                    currentPose.isValidPose
                      ? 'border-[#63704D]/70 shadow-[0_0_20px_rgba(99,112,77,0.3)]'
                      : 'border-amber-500/80 shadow-[0_0_20px_rgba(194,132,50,0.4)]'
                  }`}
                />

                {/* Top Status & Pose Pill */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
                        currentPose.isValidPose ? 'bg-[#63704D]/80 text-white' : 'bg-amber-600/80 text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      {isScanning
                        ? `Sampling: ${capturedFrames.length}/${TARGET_FRAME_COUNT}`
                        : currentPose.isValidPose
                        ? 'Pose Centered'
                        : 'Adjust Angle'}
                    </span>

                    {isDemoMode && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
                        Demo Simulation
                      </span>
                    )}
                  </div>

                  {/* Head-Pose Angles */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/90 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-md">
                    <span>Y: {currentPose.yawDeg > 0 ? `+${currentPose.yawDeg}` : currentPose.yawDeg}°</span>
                    <span>P: {currentPose.pitchDeg > 0 ? `+${currentPose.pitchDeg}` : currentPose.pitchDeg}°</span>
                    <span>R: {currentPose.rollDeg > 0 ? `+${currentPose.rollDeg}` : currentPose.rollDeg}°</span>
                  </div>
                </div>

                {/* Guidance Banner */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="px-4 py-2 rounded-xl bg-black/65 backdrop-blur-md text-white text-xs text-center border border-white/10 font-medium">
                    {currentPose.guidanceMessage}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls Below Viewport */}
          <div className="w-full flex items-center justify-between mt-3 px-1">
            <div className="text-xs text-[#5D6346]">
              Reference Distance: <strong>{REFERENCE_INTER_EYE_CM} cm</strong> inter-eye scaling
            </div>

            {cameraState === 'active' && !scanResult && (
              <div className="flex items-center gap-2">
                {!isScanning ? (
                  <button
                    onClick={() => {
                      setCapturedFrames([]);
                      setIsScanning(true);
                    }}
                    disabled={!currentPose.isValidPose}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#4E5B31] text-white hover:bg-[#3E4924] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Start 35-Frame Capture
                  </button>
                ) : (
                  <button
                    onClick={() => setIsScanning(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-800 text-white hover:bg-red-900 transition-colors"
                  >
                    Cancel Scan
                  </button>
                )}

                <button
                  onClick={stopCamera}
                  className="px-3 py-2 text-xs font-medium rounded-xl bg-[#EAE5D8] hover:bg-[#DCD6C8] text-[#2E3019] transition-colors"
                >
                  Turn Off
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Diagnostics & Scan Results (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          {!scanResult ? (
            /* Live Diagnostics State */
            <div className="p-6 rounded-2xl bg-white/80 border border-[#DCD6C8] shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[#2E3019] uppercase tracking-wider text-[#7C8264]">
                  Live Biometric Telemetry
                </h3>
                <p className="text-xs text-[#5D6346] mt-0.5">
                  Extracted via MediaPipe Face Landmarker in real-time.
                </p>
              </div>

              {/* Progress if scanning */}
              {isScanning && (
                <div className="space-y-1.5 p-3 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8]">
                  <div className="flex justify-between text-xs font-semibold text-[#2E3019]">
                    <span>Multi-Frame Progress</span>
                    <span>
                      {Math.round((capturedFrames.length / TARGET_FRAME_COUNT) * 100)}% ({capturedFrames.length}/{TARGET_FRAME_COUNT})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#DCD6C8] overflow-hidden">
                    <div
                      className="h-full bg-[#4E5B31] transition-all duration-150"
                      style={{ width: `${(capturedFrames.length / TARGET_FRAME_COUNT) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#7C8264]">
                    Filtering invalid poses and checking landmark stability...
                  </div>
                </div>
              )}

              {/* Live Measurements Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8]">
                  <div className="text-[11px] font-semibold text-[#7C8264]">Estimated Jaw Span</div>
                  <div className="text-xl font-black text-[#2E3019] mt-0.5">
                    {liveMeasurements ? `${liveMeasurements.jawWidthCm} cm` : '—'}
                  </div>
                  <div className="text-[10px] text-[#7C8264]">Angle-calibrated</div>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8]">
                  <div className="text-[11px] font-semibold text-[#7C8264]">Estimated Face Height</div>
                  <div className="text-xl font-black text-[#2E3019] mt-0.5">
                    {liveMeasurements ? `${liveMeasurements.faceHeightCm} cm` : '—'}
                  </div>
                  <div className="text-[10px] text-[#7C8264]">Nasion to menton</div>
                </div>
              </div>

              {/* Protocol Instructions */}
              <div className="p-4 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8] space-y-2 text-xs text-[#5D6346]">
                <div className="font-bold text-[#2E3019] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4E5B31]" />
                  <span>Scanning Protocol Guidelines</span>
                </div>
                <ul className="space-y-1 text-[11px] list-disc list-inside">
                  <li>Hold device at natural eye level (30–50 cm distance).</li>
                  <li>Maintain neutral facial expression with lips closed.</li>
                  <li>Ensure even lighting across forehead and jawline.</li>
                  <li>Remove eyeglasses or heavy facial accessories if possible.</li>
                </ul>
              </div>

              {/* Demo Mode Trigger if Camera not active */}
              {cameraState === 'idle' && (
                <div className="p-4 rounded-xl bg-[#EAE5D8] border border-[#DCD6C8] text-center space-y-2">
                  <div className="text-xs text-[#5D6346]">
                    No camera available or testing in a virtualized container?
                  </div>
                  <button
                    onClick={() => runDemoSimulation('random')}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-white hover:bg-white/80 text-[#2E3019] border border-[#C4BDB0] transition-colors"
                  >
                    Launch Synthetic Biometric Simulation
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Completed Scan Results Card */
            <div className="p-6 rounded-2xl bg-white border border-[#DCD6C8] shadow-md space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C8264]">
                    AI Analysis Result
                  </span>
                  <h3 className="text-xl font-black text-[#2E3019]">
                    Recommended: Size {scanResult.inference.predictedSize}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-[#4E5B31]">
                    {(scanResult.inference.confidence * 100).toFixed(1)}% Confidence
                  </div>
                  <div className="text-[11px] text-[#7C8264]">
                    Softmax probability
                  </div>
                </div>
              </div>

              {/* Watermark badge if demo */}
              {scanResult.isDemoSimulation && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-semibold">
                    DEMO SIMULATION: Computed using synthetic landmark sequence for testing.
                  </span>
                </div>
              )}

              {/* Physical Dimension Estimates */}
              <div className="p-4 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8] space-y-3">
                <div className="text-xs font-bold text-[#2E3019] flex justify-between items-center">
                  <span>Aggregated Anthropometric Dimensions</span>
                  <span className="text-[11px] font-normal text-[#5D6346]">
                    N = {scanResult.metrics.acceptedCount} stable frames
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E0DACB]">
                    <span className="text-[11px] text-[#7C8264] block">Jaw Span (Bizygomatic)</span>
                    <span className="text-base font-bold text-[#2E3019]">
                      {scanResult.metrics.jawWidth.mean} cm
                    </span>
                    <span className="text-[10px] text-[#7C8264] block">
                      CV: {scanResult.metrics.jawWidth.cvPercent}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#E0DACB]">
                    <span className="text-[11px] text-[#7C8264] block">Face Height (Nasion-Chin)</span>
                    <span className="text-base font-bold text-[#2E3019]">
                      {scanResult.metrics.faceHeight.mean} cm
                    </span>
                    <span className="text-[10px] text-[#7C8264] block">
                      CV: {scanResult.metrics.faceHeight.cvPercent}%
                    </span>
                  </div>
                </div>

                {/* Quality & Engine Badges */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#5D6346] pt-1">
                  <span>
                    Quality: <strong className="text-[#384323]">{scanResult.metrics.scanQuality}</strong> (Stability {scanResult.metrics.overallStabilityScore}/100)
                  </span>
                  <span>
                    Inference: <strong>{scanResult.inference.inferenceLatencyMs} ms</strong> ({scanResult.inference.engine})
                  </span>
                </div>
              </div>

              {/* Class Probabilities Distribution */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#5D6346] flex justify-between">
                  <span>Size Probability Distribution</span>
                  <span>Model Softmax Outputs</span>
                </div>

                {(['Small', 'Medium', 'Large'] as MaskSize[]).map((size) => {
                  const prob = scanResult.inference.probabilities[size] || 0;
                  const isWinning = scanResult.inference.predictedSize === size;
                  return (
                    <div key={size} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isWinning ? 'font-bold text-[#2E3019]' : 'text-[#5D6346]'}>
                          {size} {isWinning ? '★' : ''}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#2E3019]">
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E0DACB] overflow-hidden">
                        <div
                          className={`h-full ${isWinning ? 'bg-[#4E5B31]' : 'bg-[#969C82]'}`}
                          style={{ width: `${Math.max(4, prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guidelines Fit Note */}
              <div className="p-3 rounded-xl bg-[#EAE5D8] border border-[#DCD6C8] text-xs text-[#44482B]">
                <strong>Fit Notes for {scanResult.inference.predictedSize}:</strong>{' '}
                {MASK_SIZE_GUIDELINES[scanResult.inference.predictedSize]?.notes}
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-2 pt-2">
                {onNavigateToStore && (
                  <button
                    onClick={() => onNavigateToStore(scanResult.inference.predictedSize)}
                    className="w-full py-3 px-4 rounded-xl bg-[#4E5B31] hover:bg-[#3E4924] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>View Fitted Protective Masks in Store</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleResetScan}
                    className="py-2.5 px-3 rounded-xl bg-[#EAE5D8] hover:bg-[#DCD6C8] text-[#2E3019] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Scan Again</span>
                  </button>

                  <button
                    onClick={() => setShowCollectorModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-[#EAE5D8] hover:bg-[#DCD6C8] text-[#2E3019] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Contribute to Dataset</span>
                  </button>
                </div>
              </div>

              {/* Data retention notice */}
              <div className="text-[11px] text-[#7C8264] text-center">
                Scan telemetry scheduled for 30-day automatic purge • Reference calibration: 6.3 cm
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Evaluation Modal */}
      <ModelEvaluationModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
      />

      {/* Dataset Collector Modal */}
      <DatasetCollectorModal
        isOpen={showCollectorModal}
        onClose={() => setShowCollectorModal(false)}
        collectedFrames={capturedFrames}
      />
    </div>
  );
}
