'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LoaderCircle,
  ScanFace,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Eye,
  Check,
  History,
  HardDrive,
  CloudCheck,
  User,
  FileText,
  ShoppingBag
} from 'lucide-react';
import {
  KEY_LANDMARK_INDICES,
  MASK_STYLES,
  MASK_SIZE_OPTIONS,
  SizeOptionDetails,
  FaceMeasurements,
  MaskSize,
  computeMaskSizeFromBiometrics,
  generateSimulatedFaceMeasurements
} from '@/lib/mask-fit';
import {
  StoredFaceScan,
  getSavedUsername,
  saveUsername,
  saveLocalFaceScan,
  syncScanToCloud
} from '@/lib/storage';
import { cn } from '@/lib/utils';

interface FaceScannerProps {
  initialUserName?: string;
  onOpenHistory?: () => void;
  onGoHome?: () => void;
  onOpenStore?: () => void;
  onProceedToStore?: (selectedMaskId: string, recommendedSize: MaskSize, biometrics: FaceMeasurements) => void;
}

export function FaceScanner({
  initialUserName,
  onOpenHistory,
  onGoHome,
  onOpenStore,
  onProceedToStore,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Status flags
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isAiLoaded, setIsAiLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTargetSize, setDemoTargetSize] = useState<MaskSize>('Medium');

  // User Profile details
  const [username, setUsername] = useState(initialUserName || '');
  const [scanNotes, setScanNotes] = useState('');
  const [currentScanRecord, setCurrentScanRecord] = useState<StoredFaceScan | null>(null);

  // Scanning states & strict out-of-frame detection
  const [isAligning, setIsAligning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [alignmentStatus, setAlignmentStatus] = useState('Position your face in the oval');
  const [isWellPositioned, setIsWellPositioned] = useState(false);
  const [holdStillCountdown, setHoldStillCountdown] = useState<number | null>(null);
  const [isFaceInFrame, setIsFaceInFrame] = useState(false);
  const [faceFrameWarning, setFaceFrameWarning] = useState<string | null>(null);
  const [isScanPaused, setIsScanPaused] = useState(false);

  // Results
  const [recommendedSize, setRecommendedSize] = useState<MaskSize | null>(null);
  const [selectedSize, setSelectedSize] = useState<MaskSize>('Medium');
  const [biometrics, setBiometrics] = useState<FaceMeasurements | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);

  // Real-time smoothing refs
  const landmarkerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const isScanningRef = useRef(false);
  const isAligningRef = useRef(false);
  const holdStillTimerRef = useRef<number | null>(null);
  const isFaceInFrameRef = useRef(false);
  const lostFaceFramesRef = useRef(0);
  const validScanFramesRef = useRef(0);

  // Biometric accumulator during active scan
  const widthSamplesRef = useRef<number[]>([]);
  const heightSamplesRef = useRef<number[]>([]);
  const ratioSamplesRef = useRef<number[]>([]);
  const estWidthCmSamplesRef = useRef<number[]>([]);
  const estHeightCmSamplesRef = useRef<number[]>([]);
  const lastValidMeasurementsRef = useRef<FaceMeasurements | null>(null);

  // Available cameras
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  // Load saved username on mount
  useEffect(() => {
    const saved = getSavedUsername();
    setUsername(saved || 'Ronit');
  }, []);

  // Update username in storage when changed
  const handleUsernameChange = (newName: string) => {
    setUsername(newName);
    saveUsername(newName);
  };

  // 1. Initialize MediaPipe Face Landmarker safely with GPU fallback to CPU
  useEffect(() => {
    let isCancelled = false;

    async function initVisionAi() {
      try {
        const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        if (isCancelled) return;

        let landmarkerInstance: any = null;

        // Try GPU first
        try {
          landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            outputFaceBlendshapes: false,
            runningMode: 'VIDEO',
            numFaces: 1
          });
        } catch (gpuError) {
          console.warn('FaceLandmarker GPU init failed, falling back to CPU:', gpuError);
          landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU'
            },
            outputFaceBlendshapes: false,
            runningMode: 'VIDEO',
            numFaces: 1
          });
        }

        if (!isCancelled) {
          landmarkerRef.current = landmarkerInstance;
          setIsAiLoaded(true);
        }
      } catch (err: any) {
        console.error('Failed to load Face Landmarker AI models:', err);
        if (!isCancelled) {
          setErrorMessage('Unable to load AI Vision models. You can test with Demo Simulation Mode.');
        }
      }
    }

    initVisionAi();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  // 2. Camera setup & stream management
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setErrorMessage(null);

      // Stop previous tracks if any
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraReady(true);
        };
      }

      // Enumerate cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevs);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCameraReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or launch Demo Mode.');
      } else {
        setErrorMessage('No functional camera detected or camera is in use by another app.');
      }
    }
  }, []);

  useEffect(() => {
    if (!isDemoMode) {
      startCamera(selectedDeviceId);
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, selectedDeviceId, isDemoMode]);

  // 3. Real-time detection loop
  useEffect(() => {
    if (!isCameraReady || !isAiLoaded || isDemoMode) return;

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (video && canvas && landmarker && video.readyState >= 2 && !video.paused) {
        const ctx = canvas.getContext('2d');

        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;

          // Align canvas display dimensions
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const results = landmarker.detectForVideo(video, performance.now());

            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];

              // Check landmarks bounding box to verify face is fully in frame
              const xs = landmarks.map((l: any) => l.x);
              const ys = landmarks.map((l: any) => l.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              const faceWidthNorm = maxX - minX;
              const faceHeightNorm = maxY - minY;
              const faceCenterX = (minX + maxX) / 2;
              const faceCenterY = (minY + maxY) / 2;
              const centerOffset = Math.hypot(faceCenterX - 0.5, faceCenterY - 0.5);

              // Strict boundary & positioning checks: is face clipped or out of frame?
              const isClippedAtEdge = minX < 0.025 || maxX > 0.975 || minY < 0.025 || maxY > 0.975;
              const isTooFar = faceWidthNorm < 0.16 || faceHeightNorm < 0.18;
              const isTooClose = faceWidthNorm > 0.68;
              const isWayOffCenter = centerOffset > 0.20;

              let frameWarning: string | null = null;
              let inFrameValid = true;

              if (isClippedAtEdge) {
                frameWarning = 'Face cut off at camera edge — move fully into view';
                inFrameValid = false;
              } else if (isTooFar) {
                frameWarning = 'Move slightly closer to camera';
                inFrameValid = false;
              } else if (isTooClose) {
                frameWarning = 'Step slightly back';
                inFrameValid = false;
              } else if (isWayOffCenter) {
                frameWarning = 'Center your face in the oval guide';
                inFrameValid = false;
              }

              setIsFaceInFrame(inFrameValid);
              isFaceInFrameRef.current = inFrameValid;
              setFaceFrameWarning(frameWarning);

              const pLeftJaw = landmarks[234];
              const pRightJaw = landmarks[454];
              const pNoseBridge = landmarks[168];
              const pChin = landmarks[152];
              
              // High accuracy pupil centers via inner & outer canthi
              const pLeftOuter = landmarks[33];
              const pLeftInner = landmarks[133];
              const pRightOuter = landmarks[263];
              const pRightInner = landmarks[362];

              const ptLeft = { x: pLeftJaw.x * canvas.width, y: pLeftJaw.y * canvas.height };
              const ptRight = { x: pRightJaw.x * canvas.width, y: pRightJaw.y * canvas.height };
              const ptNose = { x: pNoseBridge.x * canvas.width, y: pNoseBridge.y * canvas.height };
              const ptChin = { x: pChin.x * canvas.width, y: pChin.y * canvas.height };

              // 2D distance measurements in pixels
              const jawWidthPx = Math.hypot(ptRight.x - ptLeft.x, ptRight.y - ptLeft.y);
              const faceHeightPx = Math.hypot(ptChin.x - ptNose.x, ptChin.y - ptNose.y);
              const currentRatio = faceHeightPx > 0 ? jawWidthPx / faceHeightPx : 1.15;

              // Physical metric estimation using Inter-Pupillary Distance (IPD ~63mm average in adult humans)
              let estimatedWidthCm = 13.1;
              let estimatedHeightCm = 11.8;
              if (pLeftOuter && pLeftInner && pRightOuter && pRightInner) {
                const leftPupilX = ((pLeftOuter.x + pLeftInner.x) / 2) * canvas.width;
                const leftPupilY = ((pLeftOuter.y + pLeftInner.y) / 2) * canvas.height;
                const rightPupilX = ((pRightOuter.x + pRightInner.x) / 2) * canvas.width;
                const rightPupilY = ((pRightOuter.y + pRightInner.y) / 2) * canvas.height;

                const ipdPx = Math.hypot(rightPupilX - leftPupilX, rightPupilY - leftPupilY);
                if (ipdPx > 22) {
                  // Standard adult human IPD is 63 mm
                  const pxPerMm = ipdPx / 63;
                  // Landmarks 234 to 454 measure zygomatic curve; full ear-to-ear mask strap span is ~1.08x
                  const fullFaceSpanMm = (jawWidthPx * 1.08) / pxPerMm;
                  const faceHeightMm = faceHeightPx / pxPerMm;

                  const rawWidthCm = Number((fullFaceSpanMm / 10).toFixed(1));
                  const rawHeightCm = Number((faceHeightMm / 10).toFixed(1));

                  // Keep within realistic human anatomy bounds (10.5cm - 16.5cm width, 9.5cm - 15.0cm height)
                  estimatedWidthCm = Math.min(16.5, Math.max(10.5, rawWidthCm));
                  estimatedHeightCm = Math.min(15.0, Math.max(9.5, rawHeightCm));
                }
              }

              const currentMeasurements: FaceMeasurements = {
                width: jawWidthPx,
                height: faceHeightPx,
                ratio: Number(currentRatio.toFixed(2)),
                estimatedWidthCm,
                estimatedHeightCm,
                confidence: 0.98
              };

              lastValidMeasurementsRef.current = currentMeasurements;

              // Buffer samples for smoothing
              widthSamplesRef.current.push(jawWidthPx);
              if (widthSamplesRef.current.length > 25) widthSamplesRef.current.shift();

              heightSamplesRef.current.push(faceHeightPx);
              if (heightSamplesRef.current.length > 25) heightSamplesRef.current.shift();

              // If active scanning is underway:
              // ONLY ACCUMULATE AND ADVANCE PROGRESS IF FACE IS PROPERLY IN FRAME!
              if (isScanningRef.current) {
                if (inFrameValid) {
                  // Face is centered and not clipped
                  lostFaceFramesRef.current = 0;
                  setIsScanPaused(false);
                  validScanFramesRef.current += 1;

                  ratioSamplesRef.current.push(currentRatio);
                  estWidthCmSamplesRef.current.push(estimatedWidthCm);
                  estHeightCmSamplesRef.current.push(estimatedHeightCm);

                  // Progress advances smoothly based on valid captured in-frame frames (40 frames ~ 1.4 seconds)
                  const progress = Math.min(100, Math.round((validScanFramesRef.current / 40) * 100));
                  setScanProgress(progress);

                  if (progress >= 100 && validScanFramesRef.current >= 38) {
                    finishScan();
                  }
                } else {
                  // Face moved out of frame or got clipped during scanning!
                  lostFaceFramesRef.current += 1;
                  setIsScanPaused(true);

                  // If missing or clipped for more than 90 frames (~3 seconds), cancel the scan
                  if (lostFaceFramesRef.current > 90) {
                    setIsScanning(false);
                    isScanningRef.current = false;
                    setIsScanPaused(false);
                    setScanProgress(0);
                    validScanFramesRef.current = 0;
                    lostFaceFramesRef.current = 0;
                    setIsAligning(true);
                    isAligningRef.current = true;
                    setAlignmentStatus('Scan cancelled: Face was out of frame');
                    setIsWellPositioned(false);
                  }
                }
              }

              // --- DRAW OVERLAY VISUALIZATIONS ---
              // 1. Biometric seal contour polygon
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = inFrameValid ? 'rgba(174, 183, 132, 0.6)' : 'rgba(239, 68, 68, 0.6)';
              ctx.fillStyle = inFrameValid ? 'rgba(174, 183, 132, 0.08)' : 'rgba(239, 68, 68, 0.08)';

              ctx.beginPath();
              ctx.moveTo(ptNose.x, ptNose.y);
              ctx.lineTo(ptRight.x, ptRight.y);
              ctx.lineTo(ptChin.x, ptChin.y);
              ctx.lineTo(ptLeft.x, ptLeft.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // 2. Dashed vector lines
              ctx.setLineDash([5, 5]);
              ctx.lineWidth = 2;
              ctx.strokeStyle = inFrameValid ? 'rgba(174, 183, 132, 0.85)' : 'rgba(239, 68, 68, 0.85)';

              // Jaw width line
              ctx.beginPath();
              ctx.moveTo(ptLeft.x, ptLeft.y);
              ctx.lineTo(ptRight.x, ptRight.y);
              ctx.stroke();

              // Height line
              ctx.beginPath();
              ctx.moveTo(ptNose.x, ptNose.y);
              ctx.lineTo(ptChin.x, ptChin.y);
              ctx.stroke();
              ctx.setLineDash([]);

              // 3. Highlight Key Biometric Anchor Points
              KEY_LANDMARK_INDICES.forEach((idx) => {
                const pt = landmarks[idx];
                if (!pt) return;
                const px = pt.x * canvas.width;
                const py = pt.y * canvas.height;

                ctx.beginPath();
                ctx.arc(px, py, 6, 0, 2 * Math.PI);
                ctx.fillStyle = inFrameValid ? 'rgba(174, 183, 132, 0.35)' : 'rgba(239, 68, 68, 0.35)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = inFrameValid ? '#AEB784' : '#EF4444';
                ctx.fill();
              });

              // 4. Draw bounding box if actively scanning
              if (isScanningRef.current) {
                const pxXs = landmarks.map((l: any) => l.x * canvas.width);
                const pxYs = landmarks.map((l: any) => l.y * canvas.height);
                const bMinX = Math.min(...pxXs);
                const bMaxX = Math.max(...pxXs);
                const bMinY = Math.min(...pxYs);
                const bMaxY = Math.max(...pxYs);

                ctx.strokeStyle = inFrameValid ? 'rgba(174, 183, 132, 0.9)' : 'rgba(239, 68, 68, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 8]);
                ctx.strokeRect(bMinX - 16, bMinY - 16, bMaxX - bMinX + 32, bMaxY - bMinY + 32);
                ctx.setLineDash([]);
              }

              // --- POSITIONING & ALIGNMENT GUIDANCE ---
              if (isAligningRef.current && !isScanningRef.current) {
                if (!inFrameValid) {
                  setAlignmentStatus(frameWarning || 'Align your face in the oval');
                  setIsWellPositioned(false);
                  holdStillTimerRef.current = null;
                  setHoldStillCountdown(null);
                } else {
                  setAlignmentStatus('Hold still');
                  setIsWellPositioned(true);

                  if (!holdStillTimerRef.current) {
                    holdStillTimerRef.current = performance.now();
                    setHoldStillCountdown(1);
                  } else if (performance.now() - holdStillTimerRef.current > 900) {
                    holdStillTimerRef.current = null;
                    setHoldStillCountdown(null);
                    setIsAligning(false);
                    isAligningRef.current = false;
                    startScanningSequence();
                  }
                }
              }
            } else {
              // NO FACE DETECTED AT ALL
              setIsFaceInFrame(false);
              isFaceInFrameRef.current = false;
              setFaceFrameWarning('No face detected in camera');

              if (isScanningRef.current) {
                // Face vanished during active scanning: pause and increment lost counter
                lostFaceFramesRef.current += 1;
                setIsScanPaused(true);

                if (lostFaceFramesRef.current > 90) { // ~3 seconds of missing face
                  setIsScanning(false);
                  isScanningRef.current = false;
                  setIsScanPaused(false);
                  setScanProgress(0);
                  validScanFramesRef.current = 0;
                  lostFaceFramesRef.current = 0;
                  setIsAligning(true);
                  isAligningRef.current = true;
                  setAlignmentStatus('Scan cancelled: Face was out of frame');
                  setIsWellPositioned(false);
                }
              } else if (isAligningRef.current) {
                setAlignmentStatus('No face detected');
                setIsWellPositioned(false);
                holdStillTimerRef.current = null;
                setHoldStillCountdown(null);
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isCameraReady, isAiLoaded, isDemoMode]);

  // Sync ref
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    isAligningRef.current = isAligning;
  }, [isAligning]);

  // 4. Initiate Alignment and Scanning
  const handleStartScanButton = () => {
    if (isDemoMode) {
      runDemoSimulation(demoTargetSize);
      return;
    }

    // STRICT CHECK: Do not scan if face is out of frame
    if (!isFaceInFrameRef.current) {
      setIsAligning(true);
      isAligningRef.current = true;
      setAlignmentStatus(faceFrameWarning || 'Position your face fully inside the oval guide first');
      setIsWellPositioned(false);
      return;
    }

    setRecommendedSize(null);
    setBiometrics(null);
    setSelectedStyleId(null);
    setIsOrderPlaced(false);
    setCurrentScanRecord(null);
    setIsAligning(true);
    isAligningRef.current = true;
    setAlignmentStatus('Hold still');
    setIsWellPositioned(true);
    holdStillTimerRef.current = performance.now();
    setHoldStillCountdown(1);
  };

  const startScanningSequence = () => {
    setIsScanning(true);
    isScanningRef.current = true;
    setIsScanPaused(false);
    setScanProgress(0);
    validScanFramesRef.current = 0;
    lostFaceFramesRef.current = 0;
    ratioSamplesRef.current = [];
    estWidthCmSamplesRef.current = [];
    estHeightCmSamplesRef.current = [];
  };

  const finishScan = () => {
    setIsScanning(false);
    isScanningRef.current = false;
    setIsScanPaused(false);

    // Guard: ensure we actually collected genuine in-frame frames
    if (estWidthCmSamplesRef.current.length < 10 && !isDemoMode) {
      setIsAligning(true);
      isAligningRef.current = true;
      setAlignmentStatus('Scan incomplete: Face moved out of frame. Please try again.');
      setIsWellPositioned(false);
      return;
    }

    // Aggregate accumulated biometrics
    let finalMeasurements = lastValidMeasurementsRef.current;

    if (ratioSamplesRef.current.length > 0) {
      const sortedRatios = [...ratioSamplesRef.current].sort((a, b) => a - b);
      const medianRatio = sortedRatios[Math.floor(sortedRatios.length / 2)];

      const sortedWidths = [...estWidthCmSamplesRef.current].sort((a, b) => a - b);
      const medianWidth = sortedWidths[Math.floor(sortedWidths.length / 2)] || 13.1;

      const sortedHeights = [...estHeightCmSamplesRef.current].sort((a, b) => a - b);
      const medianHeight = sortedHeights[Math.floor(sortedHeights.length / 2)] || 11.8;

      const avgWidthPx =
        widthSamplesRef.current.length > 0
          ? widthSamplesRef.current.reduce((a, b) => a + b, 0) / widthSamplesRef.current.length
          : 310;
      const avgHeightPx =
        heightSamplesRef.current.length > 0
          ? heightSamplesRef.current.reduce((a, b) => a + b, 0) / heightSamplesRef.current.length
          : 255;

      finalMeasurements = {
        width: avgWidthPx,
        height: avgHeightPx,
        ratio: Number(medianRatio.toFixed(2)),
        estimatedWidthCm: medianWidth,
        estimatedHeightCm: medianHeight,
        confidence: 0.985
      };
    } else if (!finalMeasurements) {
      finalMeasurements = generateSimulatedFaceMeasurements(demoTargetSize);
    }

    const calculatedSize = computeMaskSizeFromBiometrics(finalMeasurements);
    setBiometrics(finalMeasurements);
    setRecommendedSize(calculatedSize);
    setSelectedSize(calculatedSize); // Default the user selection to the AI recommendation
    setSelectedStyleId(MASK_STYLES[0].id); // Pre-select the everyday mask for convenience

    // --- PERSISTENCE: SAVE TO LOCAL STORAGE & SYNC TO CLOUD SQL (30-DAY RETENTION) ---
    const activeUser = username.trim() || 'Ronit';
    const localRecord = saveLocalFaceScan({
      username: activeUser,
      recommendedSize: calculatedSize,
      jawWidthCm: finalMeasurements.estimatedWidthCm,
      faceHeightCm: finalMeasurements.estimatedHeightCm,
      jawWidthPx: Math.round(finalMeasurements.width),
      faceHeightPx: Math.round(finalMeasurements.height),
      facialRatio: finalMeasurements.ratio,
      confidence: finalMeasurements.confidence,
      notes: scanNotes.trim() || undefined,
    });

    setCurrentScanRecord(localRecord);

    // Sync to Cloud SQL in background
    syncScanToCloud(localRecord).then((synced) => {
      setCurrentScanRecord({ ...synced });
    });
  };

  // Demo Simulation for testing without webcam - supports Small, Medium, Large
  const runDemoSimulation = (targetSize: MaskSize = demoTargetSize) => {
    setRecommendedSize(null);
    setBiometrics(null);
    setSelectedStyleId(null);
    setIsOrderPlaced(false);
    setCurrentScanRecord(null);
    setIsAligning(true);
    setAlignmentStatus('Hold still');
    setIsWellPositioned(true);

    setTimeout(() => {
      setIsAligning(false);
      setIsScanning(true);
      setScanProgress(0);

      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            const sim = generateSimulatedFaceMeasurements(targetSize);
            setBiometrics(sim);
            const simSize = computeMaskSizeFromBiometrics(sim);
            setRecommendedSize(simSize);
            setSelectedSize(simSize);
            setSelectedStyleId(MASK_STYLES[0].id);

            // Save to Local Storage & sync
            const activeUser = username.trim() || 'Ronit';
            const localRecord = saveLocalFaceScan({
              username: activeUser,
              recommendedSize: simSize,
              jawWidthCm: sim.estimatedWidthCm,
              faceHeightCm: sim.estimatedHeightCm,
              jawWidthPx: Math.round(sim.width),
              faceHeightPx: Math.round(sim.height),
              facialRatio: sim.ratio,
              confidence: sim.confidence,
              notes: scanNotes.trim() || `Demo simulation test (${targetSize})`,
            });
            setCurrentScanRecord(localRecord);
            syncScanToCloud(localRecord).then((synced) => {
              setCurrentScanRecord({ ...synced });
            });

            return 100;
          }
          return prev + 5;
        });
      }, 40);
    }, 700);
  };

  // 5. Order Placement
  const handlePlaceOrder = () => {
    if (!selectedStyleId || !recommendedSize) return;

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#aeb784', '#5a5c27', '#e3dbbb', '#ffffff']
      });
    } catch {}

    setIsOrderPlaced(true);

    // Update stored record with selected style
    if (currentScanRecord) {
      const mask = MASK_STYLES.find((m) => m.id === selectedStyleId);
      if (mask) {
        currentScanRecord.selectedMaskStyle = mask.name;
      }
    }
  };

  const resetAll = () => {
    setRecommendedSize(null);
    setBiometrics(null);
    setSelectedStyleId(null);
    setIsOrderPlaced(false);
    setIsScanning(false);
    setIsAligning(false);
    setScanProgress(0);
    setCurrentScanRecord(null);
    holdStillTimerRef.current = null;
    setHoldStillCountdown(null);
  };

  const selectedMask = MASK_STYLES.find((m) => m.id === selectedStyleId);

  return (
    <div className="min-h-screen bg-olive-dark text-cream relative overflow-hidden flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 p-4 md:p-6 z-50 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 md:gap-3">
          {onGoHome ? (
            <button
              type="button"
              id="scanner-btn-home"
              onClick={onGoHome}
              className="flex items-center gap-2 text-cream/80 hover:text-cream transition-colors bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 text-sm font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>
          ) : (
            <Link
              href="/"
              id="scanner-btn-home-link"
              className="flex items-center gap-2 text-cream/80 hover:text-cream transition-colors bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 hover:border-white/20 text-sm font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
          )}

          <div className="flex items-center gap-2 font-bold text-base md:text-lg tracking-tight bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10">
            <ScanFace className="w-5 h-5 text-sage" />
            <span>Neurovox Ai</span>
          </div>

          {/* Quick Username indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 text-xs">
            <User className="w-3.5 h-3.5 text-sage" />
            <input
              type="text"
              id="scanner-username-input"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Username"
              className="bg-transparent border-none focus:outline-none text-cream w-20 sm:w-28 font-medium placeholder:text-cream/40"
              title="Click to edit username for scan tracking"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Store Access Button */}
          {onOpenStore && (
            <button
              type="button"
              id="scanner-btn-store"
              onClick={onOpenStore}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-black/30 border-white/10 text-cream/80 hover:text-sage hover:border-sage/40 transition-colors backdrop-blur-md cursor-pointer"
              title="Browse Mask Store"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-sage" />
              <span>Store</span>
            </button>
          )}

          {/* Scan History Button */}
          {onOpenHistory && (
            <button
              type="button"
              id="scanner-btn-history"
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-black/30 border-white/10 text-cream/80 hover:text-sage hover:border-sage/40 transition-colors backdrop-blur-md cursor-pointer"
              title="View Historical Size Recommendations"
            >
              <History className="w-3.5 h-3.5 text-sage" />
              <span>History</span>
            </button>
          )}

          {/* Demo Mode Toggle */}
          {/* Demo Mode Toggle & Size Selector */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="scanner-btn-demo-toggle"
              onClick={() => {
                const nextMode = !isDemoMode;
                setIsDemoMode(nextMode);
                resetAll();
                if (nextMode) {
                  setErrorMessage(null);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors backdrop-blur-md cursor-pointer',
                isDemoMode
                  ? 'bg-sage/20 border-sage text-sage'
                  : 'bg-black/30 border-white/10 text-cream/70 hover:text-cream'
              )}
              title="Toggle Demo Simulation (usable without webcam)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDemoMode ? 'Demo Active' : 'Demo Mode'}</span>
            </button>

            {isDemoMode && (
              <div className="flex items-center bg-black/40 backdrop-blur-md p-0.5 rounded-full border border-white/15 text-xs">
                {(['Small', 'Medium', 'Large'] as MaskSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    id={`demo-select-${sz.toLowerCase()}`}
                    onClick={() => {
                      setDemoTargetSize(sz);
                      runDemoSimulation(sz);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer',
                      demoTargetSize === sz
                        ? 'bg-sage text-olive-dark font-bold shadow-sm'
                        : 'text-cream/70 hover:text-cream'
                    )}
                    title={`Simulate ${sz} face scan`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Camera Switcher */}
          {availableDevices.length > 1 && !isDemoMode && (
            <button
              type="button"
              id="scanner-btn-camera-switch"
              onClick={() => {
                const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
                const nextIndex = (currentIndex + 1) % availableDevices.length;
                setSelectedDeviceId(availableDevices[nextIndex].deviceId);
              }}
              className="p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-cream/80 hover:text-cream cursor-pointer"
              title="Switch Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 relative flex items-center justify-center p-3 md:p-6 mt-14 md:mt-12">
        {errorMessage && !isDemoMode ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 p-8 bg-red-500/10 rounded-3xl border border-red-500/25 backdrop-blur-xl max-w-md w-full shadow-2xl"
          >
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-red-100">Camera Notice</h2>
            <p className="text-red-200/80 text-sm leading-relaxed">{errorMessage}</p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                id="btn-retry-camera"
                onClick={() => startCamera(selectedDeviceId)}
                className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-100 rounded-full hover:bg-red-500/30 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Camera
              </button>
              <button
                type="button"
                id="btn-error-demo-mode"
                onClick={() => {
                  setIsDemoMode(true);
                  setErrorMessage(null);
                }}
                className="flex-1 px-4 py-2.5 bg-sage text-olive-dark rounded-full font-medium hover:bg-sage/90 transition-transform active:scale-95 text-sm cursor-pointer"
              >
                Try Demo Mode
              </button>
            </div>
          </motion.div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-4xl aspect-[4/3] md:aspect-video bg-black/50 rounded-3xl overflow-hidden shadow-2xl border border-white/15"
          >
            {/* Rule of Thirds subtle alignment grid */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-15">
              <div className="absolute top-1/3 left-0 w-full h-px bg-white" />
              <div className="absolute top-2/3 left-0 w-full h-px bg-white" />
              <div className="absolute top-0 left-1/3 w-px h-full bg-white" />
              <div className="absolute top-0 left-2/3 w-px h-full bg-white" />
            </div>

            {/* Video stream with mirroring */}
            {!isDemoMode ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                playsInline
                muted
                autoPlay
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#2A2B11] to-[#1a1b0b] flex items-center justify-center">
                <div className="relative flex flex-col items-center">
                  <div className="w-48 h-60 rounded-[100%] border-2 border-dashed border-sage/40 flex items-center justify-center bg-sage/5">
                    <ScanFace className="w-20 h-20 text-sage/40 animate-pulse" />
                  </div>
                  <span className="mt-3 text-xs text-sage/70 font-mono tracking-wider">
                    [DEMO MODE: SIMULATED BIOMETRIC FEED]
                  </span>
                </div>
              </div>
            )}

            {/* Camera Initializing Prompt if waiting in iframe */}
            {!isCameraReady && !isDemoMode && isAiLoaded && !errorMessage && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-xs">
                <LoaderCircle className="w-10 h-10 text-sage animate-spin mb-3" />
                <h3 className="text-base font-bold text-cream">Initializing Camera...</h3>
                <p className="text-xs text-cream/70 max-w-sm mt-1 mb-4 leading-relaxed">
                  Allow camera permission if prompted by your browser, or switch to Instant Demo Mode to test face sizing immediately.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    id="btn-waiting-cam-demo"
                    onClick={() => setIsDemoMode(true)}
                    className="px-5 py-2.5 rounded-full bg-sage text-olive-dark font-bold text-sm hover:bg-sage/90 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Switch to Instant Demo Mode</span>
                  </button>
                  <button
                    type="button"
                    id="btn-waiting-cam-retry"
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-4 py-2 rounded-full border border-white/20 text-xs text-cream/80 hover:text-cream cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            )}

            {/* Biometric Landmarker Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none z-10"
            />

            {/* Loading AI models spinner with bypass option */}
            <AnimatePresence>
              {!isAiLoaded && !isDemoMode && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-olive-dark/95 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-6 text-center"
                >
                  <LoaderCircle className="w-12 h-12 text-sage animate-spin mb-4" />
                  <p className="text-lg font-medium text-cream/90 animate-pulse">Initializing AI Models...</p>
                  <p className="text-xs text-cream/50 mt-1 max-w-xs">Loading MediaPipe Face Landmark neural network</p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      id="btn-skip-ai-demo"
                      onClick={() => setIsDemoMode(true)}
                      className="px-5 py-2.5 bg-sage text-olive-dark rounded-full font-bold text-sm hover:bg-sage/90 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center gap-2"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Use Instant Demo Mode</span>
                    </button>
                    {onGoHome && (
                      <button
                        type="button"
                        id="btn-loading-go-home"
                        onClick={onGoHome}
                        className="px-4 py-2 text-xs text-cream/70 hover:text-cream transition-colors cursor-pointer"
                      >
                        Return Home
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Alignment Oval & Positioning Feedback Banner */}
            <AnimatePresence>
              {!recommendedSize && !isScanning && (isCameraReady || isDemoMode) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center"
                >
                  <div
                    className={cn(
                      'w-56 h-72 md:w-64 md:h-80 rounded-[100%] border-2 transition-all duration-300 relative',
                      isAligning
                        ? isWellPositioned
                          ? 'border-green-400 bg-green-400/5 shadow-[0_0_20px_rgba(74,222,128,0.25)]'
                          : 'border-red-400 bg-red-400/5'
                        : isFaceInFrame || isDemoMode
                          ? 'border-sage/60 bg-black/10'
                          : 'border-red-400/70 bg-red-500/5'
                    )}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-sage/60 rounded-full" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-sage/60 rounded-full" />
                  </div>

                  {/* Alignment guidance or out-of-frame warning banner */}
                  {(isAligning || (!isFaceInFrame && !isDemoMode)) && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute top-10 bg-black/75 backdrop-blur-md px-5 py-2 rounded-full border border-white/15 flex items-center gap-2 max-w-sm text-center shadow-lg"
                    >
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          isWellPositioned ? 'bg-green-400 animate-ping' : 'bg-red-400'
                        )}
                      />
                      <span
                        className={cn(
                          'font-medium text-xs sm:text-sm',
                          isWellPositioned ? 'text-green-400 font-semibold' : 'text-cream'
                        )}
                      >
                        {isAligning ? alignmentStatus : faceFrameWarning || 'Position face inside the oval'}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Scanning Animation & Out-of-frame pause alert */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-end pb-10"
                >
                  {/* Out of frame pause warning */}
                  {isScanPaused && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur-md px-5 py-2.5 rounded-full border border-red-400 shadow-xl flex items-center gap-2 z-40 text-xs sm:text-sm font-semibold animate-pulse pointer-events-auto"
                    >
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>{faceFrameWarning || 'Face out of frame — center your face to resume scan'}</span>
                    </motion.div>
                  )}

                  <motion.div
                    className={cn(
                      'absolute left-0 right-0 h-1 transition-colors duration-200',
                      isScanPaused
                        ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_25px_rgba(239,68,68,0.95)]'
                        : 'bg-gradient-to-r from-transparent via-sage to-transparent shadow-[0_0_25px_rgba(174,183,132,0.95)]'
                    )}
                    animate={{ top: ['5%', '90%', '5%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                  />

                  <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-sage/70 rounded-tl-xl" />
                  <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-sage/70 rounded-tr-xl" />
                  <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-sage/70 rounded-bl-xl" />
                  <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-sage/70 rounded-br-xl" />

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="bg-beige/95 backdrop-blur-xl px-7 py-4 rounded-2xl border border-white/30 shadow-2xl text-olive flex flex-col items-center gap-3 w-80 pointer-events-auto"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          isScanPaused ? 'bg-red-500' : 'bg-sage animate-ping'
                        )}
                      />
                      <span className="font-semibold text-sm">
                        {isScanPaused ? 'Scan paused — face out of frame' : 'Analyzing facial dimensions...'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-olive/15 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', isScanPaused ? 'bg-red-400' : 'bg-sage')}
                        style={{ width: `${scanProgress}%` }}
                        transition={{ ease: 'linear', duration: 0.05 }}
                      />
                    </div>

                    <div className="flex justify-between w-full text-xs text-olive-light font-mono font-medium">
                      <span>{isScanPaused ? 'PAUSED' : 'MAPPING CONTOURS'}</span>
                      <span>{scanProgress}%</span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Modal with 3 Size Options (Small, Medium, Large) */}
            <AnimatePresence>
              {recommendedSize && !isScanning && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#F5F2EA] p-5 sm:p-6 rounded-3xl border border-[#DDD6C5] shadow-2xl text-[#2E3019] w-11/12 max-w-sm z-40 max-h-[85vh] overflow-y-auto space-y-4"
                >
                  {/* Top Biometric Metrics Table */}
                  <div className="space-y-2 border-b border-[#DDD6C5] pb-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#5A5C27]">Jaw Width</span>
                      <span className="font-bold text-[#2E3019] font-mono text-base">
                        {Math.round(biometrics?.width || 245)}px
                        <span className="text-xs text-[#5A5C27] font-sans font-normal ml-1.5">
                          ({biometrics?.estimatedWidthCm || 13.1} cm)
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#5A5C27]">Face Height</span>
                      <span className="font-bold text-[#2E3019] font-mono text-base">
                        {Math.round(biometrics?.height || 190)}px
                        <span className="text-xs text-[#5A5C27] font-sans font-normal ml-1.5">
                          ({biometrics?.estimatedHeightCm || 11.8} cm)
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#5A5C27]">Facial Ratio</span>
                      <span className="font-bold text-[#2E3019] font-mono text-base">
                        {biometrics?.ratio?.toFixed(2) || '1.15'}
                      </span>
                    </div>
                  </div>

                  {/* Sizing Section with Small, Medium, Large Cards */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-[#2E3019]">Size Selection</h4>
                      <span className="text-[11px] font-bold text-[#3B401F] flex items-center gap-1 bg-[#AEB784]/20 px-2 py-0.5 rounded-full border border-[#AEB784]/40">
                        <Sparkles className="w-3 h-3 text-[#3B401F]" /> AI Recommended: {recommendedSize}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {MASK_SIZE_OPTIONS.map((opt) => {
                        const isSelected = selectedSize === opt.size;
                        const isAiMatch = recommendedSize === opt.size;

                        return (
                          <button
                            key={opt.size}
                            type="button"
                            id={`btn-select-size-${opt.size.toLowerCase()}`}
                            onClick={() => setSelectedSize(opt.size)}
                            className={cn(
                              'py-2.5 px-1.5 rounded-xl border text-center transition-all relative flex flex-col items-center justify-between cursor-pointer',
                              isSelected
                                ? 'border-[#3B401F] bg-[#3B401F] text-[#F5F2EA] font-bold shadow-md ring-2 ring-[#3B401F]/20'
                                : 'border-[#DDD6C5] bg-[#EAE4D3]/60 hover:bg-[#EAE4D3] text-[#2E3019]'
                            )}
                          >
                            {isAiMatch && (
                              <span
                                className={cn(
                                  'text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full mb-1',
                                  isSelected ? 'bg-[#AEB784] text-[#2E3019]' : 'bg-[#3B401F] text-[#F5F2EA]'
                                )}
                              >
                                AI MATCH
                              </span>
                            )}
                            <div className="text-xs font-bold">{opt.size}</div>
                            <div
                              className={cn(
                                'text-[9px] mt-0.5 font-mono leading-tight',
                                isSelected ? 'text-[#EAE4D3]/90' : 'text-[#5A5C27]'
                              )}
                            >
                              {opt.widthRange}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected size details */}
                    {(() => {
                      const currentOpt = MASK_SIZE_OPTIONS.find((o) => o.size === selectedSize);
                      if (!currentOpt) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-[#EAE4D3]/80 border border-[#DDD6C5] text-[11px] text-[#2E3019] space-y-1">
                          <div className="font-semibold text-[#3B401F] flex items-center justify-between">
                            <span>{currentOpt.name} ({currentOpt.size})</span>
                            <span className="text-[10px] font-mono text-[#5A5C27] font-normal">{currentOpt.badge}</span>
                          </div>
                          <p className="text-[#5A5C27] leading-relaxed">{currentOpt.description}</p>
                          <p className="text-[10px] text-[#2E3019]/85 italic pt-0.5">
                            {selectedSize === recommendedSize
                              ? '✨ Best airtight acoustic and protective seal for your facial scan.'
                              : `Selected manually. AI matched Size ${recommendedSize} for your ${biometrics?.estimatedWidthCm || 13.1} cm jaw span.`}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Select Style Section */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-[#2E3019]">Select Style</h4>
                    <div className="space-y-2">
                      {MASK_STYLES.map((style) => {
                        const isSelected = selectedStyleId === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setSelectedStyleId(style.id)}
                            className={cn(
                              'w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all text-xs flex items-center justify-between cursor-pointer',
                              isSelected
                                ? 'border-[#3B401F] bg-[#EAE4D3] font-bold text-[#2E3019] shadow-xs'
                                : 'border-[#DDD6C5] bg-[#EAE4D3]/50 hover:bg-[#EAE4D3]/80 text-[#2E3019]'
                            )}
                          >
                            <div className="font-semibold text-sm">{style.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#3B401F]">{style.price}</span>
                              {isSelected && <Check className="w-4 h-4 text-[#3B401F]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sticky Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#DDD6C5]">
                    <button
                      type="button"
                      id="btn-order-mask"
                      disabled={!selectedStyleId}
                      onClick={() => {
                        if (selectedStyleId && selectedSize && biometrics && onProceedToStore) {
                          onProceedToStore(selectedStyleId, selectedSize, biometrics);
                        }
                      }}
                      className={cn(
                        'w-full py-3.5 rounded-full font-bold transition-all text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer',
                        selectedStyleId
                          ? 'bg-[#3B401F] text-[#F5F2EA] hover:bg-[#2E3218] active:scale-[0.98]'
                          : 'bg-[#DDD6C5]/70 text-[#5A5C27]/60 cursor-not-allowed'
                      )}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {selectedStyleId
                          ? `Order ${selectedMask?.name} · Size ${selectedSize}`
                          : 'Select a mask to continue'}
                      </span>
                    </button>

                    <div className="flex flex-col gap-1 text-center pt-1">
                      <button
                        type="button"
                        id="btn-scan-again"
                        onClick={resetAll}
                        className="py-1.5 text-xs font-semibold text-[#3B401F] hover:underline cursor-pointer"
                      >
                        Scan Again
                      </button>
                      {onGoHome && (
                        <button
                          type="button"
                          id="btn-scanner-goback"
                          onClick={onGoHome}
                          className="py-1 text-xs font-medium text-[#5A5C27] hover:text-[#2E3019] cursor-pointer"
                        >
                          Go Back
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Shutter Capture Button with Out-of-Frame Gate */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-center z-30 pointer-events-none gap-2">
              {!isScanning && !recommendedSize && (isCameraReady || isDemoMode) && (
                <>
                  {/* Status chip if face is not positioned properly */}
                  {!isDemoMode && !isFaceInFrame && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pointer-events-auto bg-black/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-red-500/40 text-red-300 text-xs flex items-center gap-1.5 shadow-lg"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{faceFrameWarning || 'Position your face in the oval to enable scan'}</span>
                    </motion.div>
                  )}

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: isDemoMode || isFaceInFrame ? 1.05 : 1 }}
                    whileTap={{ scale: isDemoMode || isFaceInFrame ? 0.95 : 1 }}
                    id="btn-shutter-capture"
                    disabled={!isDemoMode && !isFaceInFrame}
                    onClick={handleStartScanButton}
                    className={cn(
                      'pointer-events-auto group relative flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all border border-white/20',
                      isDemoMode || isFaceInFrame
                        ? 'bg-sage text-olive-dark hover:bg-sage/95 cursor-pointer'
                        : 'bg-sage/40 text-olive-dark/40 cursor-not-allowed opacity-60'
                    )}
                    title={
                      isDemoMode || isFaceInFrame
                        ? 'Capture & Start Face Scan'
                        : 'Align face inside frame before scanning'
                    }
                  >
                    <div className="absolute inset-1.5 border-2 border-olive-dark/25 rounded-full group-hover:scale-90 transition-transform" />
                    <ScanFace className="w-8 h-8 text-olive-dark" />
                  </motion.button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
