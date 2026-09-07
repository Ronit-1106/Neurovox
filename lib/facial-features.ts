/**
 * Neurovox Facial Feature Extraction & Landmark Normalization Module
 * Normalizes MediaPipe Face Landmarker coordinates relative to scale-invariant reference anchors.
 * Provides head-pose angle estimation, multi-frame stability analytics, and scan quality scoring.
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HeadPoseEstimation {
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  isValidPose: boolean;
  guidanceMessage: string;
}

export interface ExtractedFrameFeatures {
  /** 16-element normalized feature vector for ML model input */
  featureVector: number[];
  featureMap: Record<string, number>;
  headPose: HeadPoseEstimation;
  estimatedMeasurements: {
    jawWidthCm: number;
    faceHeightCm: number;
    faceWidthCm: number;
    chinToNoseCm: number;
    interEyeReferenceCm: number;
    aspectRatio: number;
  };
  isValidForAggregation: boolean;
}

export interface MultiFrameStabilityMetrics {
  sampleCount: number;
  acceptedCount: number;
  rejectedCount: number;
  jawWidth: {
    mean: number;
    median: number;
    stdDev: number;
    cvPercent: number; // Coefficient of Variation
  };
  faceHeight: {
    mean: number;
    median: number;
    stdDev: number;
    cvPercent: number;
  };
  aspectRatio: {
    mean: number;
    median: number;
    stdDev: number;
    cvPercent: number;
  };
  overallStabilityScore: number; // 0 to 100
  scanQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  meanFeatureVector: number[];
}

export const POSE_LIMITS = {
  maxYawDeg: 12.0,
  maxPitchDeg: 12.0,
  maxRollDeg: 12.0,
};

export const REFERENCE_INTER_EYE_CM = 6.3; // Calibrated human average eye-region span
const CURVATURE_FACTOR = 1.18; // Zygomatic anatomical contour factor

export function euclideanDistance(
  p1: LandmarkPoint,
  p2: LandmarkPoint,
  useZ: boolean = false,
  aspectRatio: number = 1.0
): number {
  const dx = p1.x - p2.x;
  const dy = (p1.y - p2.y) / (aspectRatio || 1.0);
  if (useZ && p1.z !== undefined && p2.z !== undefined) {
    const dz = (p1.z - p2.z) * 0.5;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Estimates head yaw, pitch, and roll in degrees from geometric facial anchors.
 */
export function estimateHeadPose(landmarks: Record<number, LandmarkPoint>): HeadPoseEstimation {
  const p33 = landmarks[33] || { x: 0.35, y: 0.42 };
  const p133 = landmarks[133] || { x: 0.43, y: 0.42 };
  const p263 = landmarks[263] || { x: 0.65, y: 0.42 };
  const p362 = landmarks[362] || { x: 0.57, y: 0.42 };

  const leftEyeCenter = {
    x: (p33.x + p133.x) / 2.0,
    y: (p33.y + p133.y) / 2.0,
  };
  const rightEyeCenter = {
    x: (p263.x + p362.x) / 2.0,
    y: (p263.y + p362.y) / 2.0,
  };

  // Roll: Angle of the eye line relative to horizontal
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const rollRad = Math.atan2(dy, Math.max(dx, 1e-6));
  const rollDeg = (rollRad * 180) / Math.PI;

  // Yaw: Asymmetry of nose tip relative to eye-center midline
  const midEyeX = (leftEyeCenter.x + rightEyeCenter.x) / 2.0;
  const eyeSpan = Math.max(Math.abs(rightEyeCenter.x - leftEyeCenter.x), 1e-5);
  const noseTip = landmarks[4] || { x: midEyeX, y: 0.55 };
  const noseOffset = (noseTip.x - midEyeX) / eyeSpan;
  const clampedOffset = Math.max(-1.0, Math.min(1.0, noseOffset * 1.6));
  const yawDeg = (Math.asin(clampedOffset) * 180) / Math.PI;

  // Pitch: Vertical position of nose tip between nasion and chin
  const nasion = landmarks[168] || { x: 0.5, y: 0.3 };
  const chin = landmarks[152] || { x: 0.5, y: 0.9 };
  const faceSpanY = Math.max(chin.y - nasion.y, 1e-5);
  const relativeNoseY = (noseTip.y - nasion.y) / faceSpanY;
  const pitchOffset = (relativeNoseY - 0.42) * 2.2;
  const clampedPitch = Math.max(-1.0, Math.min(1.0, pitchOffset));
  const pitchDeg = (Math.asin(clampedPitch) * 180) / Math.PI;

  const roundedYaw = Math.round(yawDeg * 10) / 10;
  const roundedPitch = Math.round(pitchDeg * 10) / 10;
  const roundedRoll = Math.round(rollDeg * 10) / 10;

  let isValid = true;
  let guidance = 'Pose optimal • Hold steady';

  if (Math.abs(roundedYaw) > POSE_LIMITS.maxYawDeg) {
    isValid = false;
    guidance = roundedYaw > 0 ? 'Turn head slightly left towards center' : 'Turn head slightly right towards center';
  } else if (Math.abs(roundedPitch) > POSE_LIMITS.maxPitchDeg) {
    isValid = false;
    guidance = roundedPitch > 0 ? 'Raise chin slightly' : 'Lower chin slightly';
  } else if (Math.abs(roundedRoll) > POSE_LIMITS.maxRollDeg) {
    isValid = false;
    guidance = 'Keep head straight and level';
  }

  return {
    yawDeg: roundedYaw,
    pitchDeg: roundedPitch,
    rollDeg: roundedRoll,
    isValidPose: isValid,
    guidanceMessage: guidance,
  };
}

/**
 * Extracts 16 scale-invariant features and estimated measurements from a single frame.
 * Takes video dimensions into account to ensure isotropic scale calculation.
 */
export function extractFacialFeatures(
  landmarks: Record<number, LandmarkPoint>,
  videoWidth: number = 640,
  videoHeight: number = 480
): ExtractedFrameFeatures {
  const aspectRatio = videoWidth && videoHeight ? videoWidth / videoHeight : 4 / 3;

  const p234 = landmarks[234] || { x: 0.22, y: 0.6 };
  const p454 = landmarks[454] || { x: 0.78, y: 0.6 };
  const p127 = landmarks[127] || { x: 0.24, y: 0.55 };
  const p356 = landmarks[356] || { x: 0.76, y: 0.55 };
  const p50  = landmarks[50]  || { x: 0.32, y: 0.65 };
  const p280 = landmarks[280] || { x: 0.68, y: 0.65 };
  const p152 = landmarks[152] || { x: 0.5, y: 0.9 };
  const p168 = landmarks[168] || { x: 0.5, y: 0.3 };
  const p2   = landmarks[2]   || { x: 0.5, y: 0.68 };
  const p98  = landmarks[98]  || { x: 0.44, y: 0.62 };
  const p327 = landmarks[327] || { x: 0.56, y: 0.62 };
  const p103 = landmarks[103] || { x: 0.27, y: 0.25 };
  const p332 = landmarks[332] || { x: 0.73, y: 0.25 };
  const p33  = landmarks[33]  || { x: 0.35, y: 0.42 };
  const p133 = landmarks[133] || { x: 0.43, y: 0.42 };
  const p263 = landmarks[263] || { x: 0.65, y: 0.42 };
  const p362 = landmarks[362] || { x: 0.57, y: 0.42 };

  // Inter-eye reference distance in aspect-corrected space
  const leftEyeCenter = {
    x: (p33.x + p133.x) / 2.0,
    y: (p33.y + p133.y) / 2.0,
  };
  const rightEyeCenter = {
    x: (p263.x + p362.x) / 2.0,
    y: (p263.y + p362.y) / 2.0,
  };

  const interEyeRefDist = Math.max(euclideanDistance(leftEyeCenter, rightEyeCenter, false, aspectRatio), 1e-4);

  // Aspect-corrected Euclidean dimensions
  const jawWidthRaw = euclideanDistance(p234, p454, false, aspectRatio);
  const faceHeightRaw = euclideanDistance(p168, p152, false, aspectRatio);
  const faceWidthRaw = euclideanDistance(p127, p356, false, aspectRatio);
  const cheekWidthRaw = euclideanDistance(p50, p280, false, aspectRatio);
  const foreheadWidthRaw = euclideanDistance(p103, p332, false, aspectRatio);
  const chinLengthRaw = euclideanDistance(p2, p152, false, aspectRatio);
  const noseWidthRaw = euclideanDistance(p98, p327, false, aspectRatio);
  const eyeRegionWidthRaw = euclideanDistance(p33, p263, false, aspectRatio);

  // Scale-invariant normalized features
  const jawWidthNorm = jawWidthRaw / interEyeRefDist;
  const faceHeightNorm = faceHeightRaw / interEyeRefDist;
  const faceWidthNorm = faceWidthRaw / interEyeRefDist;
  const cheekWidthNorm = cheekWidthRaw / interEyeRefDist;
  const foreheadWidthNorm = foreheadWidthRaw / interEyeRefDist;
  const chinLengthNorm = chinLengthRaw / interEyeRefDist;
  const noseWidthNorm = noseWidthRaw / interEyeRefDist;
  const eyeRegionWidthNorm = eyeRegionWidthRaw / interEyeRefDist;
  const interEyeRefNorm = interEyeRefDist / Math.max(faceWidthRaw + faceHeightRaw, 1e-4);

  // Structural ratios
  const faceAspectRatio = jawWidthRaw / Math.max(faceHeightRaw, 1e-4);
  const jawToFaceWidthRatio = jawWidthRaw / Math.max(faceWidthRaw, 1e-4);
  const faceHeightToWidthRatio = faceHeightRaw / Math.max(faceWidthRaw, 1e-4);
  const chinToFaceHeightRatio = chinLengthRaw / Math.max(faceHeightRaw, 1e-4);

  // Head pose
  const headPose = estimateHeadPose(landmarks);

  // Physical dimension estimations (in cm) calibrated to human anthropometry (IPD = 6.3 cm)
  const estJawWidthCm = Math.round(Math.max(9.5, Math.min(17.5, jawWidthNorm * 1.05 * REFERENCE_INTER_EYE_CM)) * 10) / 10;
  const estFaceHeightCm = Math.round(Math.max(8.5, Math.min(16.0, faceHeightNorm * REFERENCE_INTER_EYE_CM)) * 10) / 10;
  const estFaceWidthCm = Math.round(Math.max(10.0, Math.min(18.0, faceWidthNorm * 1.05 * REFERENCE_INTER_EYE_CM)) * 10) / 10;
  const estChinToNoseCm = Math.round(Math.max(3.5, Math.min(8.5, chinLengthNorm * REFERENCE_INTER_EYE_CM)) * 10) / 10;

  const featureVector = [
    parseFloat(jawWidthNorm.toFixed(4)),
    parseFloat(faceHeightNorm.toFixed(4)),
    parseFloat(faceWidthNorm.toFixed(4)),
    parseFloat(cheekWidthNorm.toFixed(4)),
    parseFloat(foreheadWidthNorm.toFixed(4)),
    parseFloat(chinLengthNorm.toFixed(4)),
    parseFloat(noseWidthNorm.toFixed(4)),
    parseFloat(eyeRegionWidthNorm.toFixed(4)),
    parseFloat(interEyeRefNorm.toFixed(4)),
    parseFloat(faceAspectRatio.toFixed(4)),
    parseFloat(jawToFaceWidthRatio.toFixed(4)),
    parseFloat(faceHeightToWidthRatio.toFixed(4)),
    parseFloat(chinToFaceHeightRatio.toFixed(4)),
    headPose.yawDeg,
    headPose.pitchDeg,
    headPose.rollDeg,
  ];

  const featureMap: Record<string, number> = {
    jaw_width_norm: featureVector[0],
    face_height_norm: featureVector[1],
    face_width_norm: featureVector[2],
    cheek_width_norm: featureVector[3],
    forehead_width_norm: featureVector[4],
    chin_length_norm: featureVector[5],
    nose_width_norm: featureVector[6],
    eye_region_width_norm: featureVector[7],
    inter_eye_ref_norm: featureVector[8],
    face_aspect_ratio: featureVector[9],
    jaw_to_face_width_ratio: featureVector[10],
    face_height_to_width_ratio: featureVector[11],
    chin_to_face_height_ratio: featureVector[12],
    head_yaw_deg: featureVector[13],
    head_pitch_deg: featureVector[14],
    head_roll_deg: featureVector[15],
  };

  return {
    featureVector,
    featureMap,
    headPose,
    estimatedMeasurements: {
      jawWidthCm: estJawWidthCm,
      faceHeightCm: estFaceHeightCm,
      faceWidthCm: estFaceWidthCm,
      chinToNoseCm: estChinToNoseCm,
      interEyeReferenceCm: REFERENCE_INTER_EYE_CM,
      aspectRatio: parseFloat(faceAspectRatio.toFixed(2)),
    },
    isValidForAggregation: headPose.isValidPose,
  };
}

/**
 * Calculates stability statistics across collected multi-frame samples.
 */
export function calculateStabilityMetrics(frames: ExtractedFrameFeatures[]): MultiFrameStabilityMetrics {
  const validFrames = frames.filter((f) => f.isValidForAggregation);
  const sampleCount = frames.length;
  const acceptedCount = validFrames.length;
  const rejectedCount = sampleCount - acceptedCount;

  const datasetToUse = validFrames.length >= 10 ? validFrames : frames;

  function stats(values: number[]) {
    if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, cvPercent: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cvPercent = mean > 0 ? (stdDev / mean) * 100 : 0;
    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 1000) / 1000,
      cvPercent: Math.round(cvPercent * 100) / 100,
    };
  }

  const jawStats = stats(datasetToUse.map((f) => f.estimatedMeasurements.jawWidthCm));
  const heightStats = stats(datasetToUse.map((f) => f.estimatedMeasurements.faceHeightCm));
  const aspectStats = stats(datasetToUse.map((f) => f.estimatedMeasurements.aspectRatio));

  // Average Coefficient of Variation across key dimensions
  const avgCV = (jawStats.cvPercent + heightStats.cvPercent + aspectStats.cvPercent) / 3.0;

  // Scan quality assessment
  let scanQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (avgCV < 2.5 && acceptedCount >= 25) {
    scanQuality = 'Excellent';
  } else if (avgCV < 4.0 && acceptedCount >= 18) {
    scanQuality = 'Good';
  } else if (avgCV < 6.0) {
    scanQuality = 'Fair';
  } else {
    scanQuality = 'Poor';
  }

  const overallStabilityScore = Math.max(0, Math.min(100, Math.round(100 - avgCV * 10)));

  // Aggregate mean feature vector across frames for ML input
  const numFeatures = datasetToUse[0]?.featureVector.length || 16;
  const meanVector: number[] = [];
  for (let i = 0; i < numFeatures; i++) {
    const sum = datasetToUse.reduce((acc, f) => acc + f.featureVector[i], 0);
    meanVector.push(parseFloat((sum / datasetToUse.length).toFixed(4)));
  }

  return {
    sampleCount,
    acceptedCount,
    rejectedCount,
    jawWidth: jawStats,
    faceHeight: heightStats,
    aspectRatio: aspectStats,
    overallStabilityScore,
    scanQuality,
    meanFeatureVector: meanVector,
  };
}
