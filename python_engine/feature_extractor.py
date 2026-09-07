#!/usr/bin/env python3
"""
Neurovox Python Facial Feature Extractor
Extracts 16 normalized geometric facial features, head pose angles, and anthropometric dimensions
from MediaPipe facial landmarks, identical to the client-side TypeScript pipeline.
"""
import math
from typing import Dict, Any, List

REFERENCE_INTER_EYE_CM = 6.3
POSE_LIMITS = {
    "maxYawDeg": 12.0,
    "maxPitchDeg": 12.0,
    "maxRollDeg": 12.0,
}

def euclidean_distance(p1: Dict[str, float], p2: Dict[str, float], use_z: bool = False, aspect_ratio: float = 1.0) -> float:
    dx = p1.get("x", 0.0) - p2.get("x", 0.0)
    dy = (p1.get("y", 0.0) - p2.get("y", 0.0)) / (aspect_ratio if aspect_ratio > 0 else 1.0)
    if use_z and "z" in p1 and "z" in p2:
        dz = (p1["z"] - p2["z"]) * 0.5
        return math.sqrt(dx * dx + dy * dy + dz * dz)
    return math.sqrt(dx * dx + dy * dy)

def estimate_head_pose(landmarks: Dict[int, Dict[str, float]]) -> Dict[str, Any]:
    p33 = landmarks.get(33, {"x": 0.35, "y": 0.42})
    p133 = landmarks.get(133, {"x": 0.43, "y": 0.42})
    p263 = landmarks.get(263, {"x": 0.65, "y": 0.42})
    p362 = landmarks.get(362, {"x": 0.57, "y": 0.42})

    left_eye_center = {
        "x": (p33.get("x", 0.35) + p133.get("x", 0.43)) / 2.0,
        "y": (p33.get("y", 0.42) + p133.get("y", 0.42)) / 2.0,
    }
    right_eye_center = {
        "x": (p263.get("x", 0.65) + p362.get("x", 0.57)) / 2.0,
        "y": (p263.get("y", 0.42) + p362.get("y", 0.42)) / 2.0,
    }

    dx = right_eye_center["x"] - left_eye_center["x"]
    dy = right_eye_center["y"] - left_eye_center["y"]
    roll_rad = math.atan2(dy, max(dx, 1e-6))
    roll_deg = (roll_rad * 180.0) / math.pi

    mid_eye_x = (left_eye_center["x"] + right_eye_center["x"]) / 2.0
    eye_span = max(abs(right_eye_center["x"] - left_eye_center["x"]), 1e-5)
    nose_tip = landmarks.get(4, {"x": mid_eye_x, "y": 0.55})
    nose_offset = (nose_tip.get("x", mid_eye_x) - mid_eye_x) / eye_span
    clamped_offset = max(-1.0, min(1.0, nose_offset * 1.6))
    yaw_deg = (math.asin(clamped_offset) * 180.0) / math.pi

    nasion = landmarks.get(168, {"x": 0.5, "y": 0.3})
    chin = landmarks.get(152, {"x": 0.5, "y": 0.9})
    face_span_y = max(chin.get("y", 0.9) - nasion.get("y", 0.3), 1e-5)
    relative_nose_y = (nose_tip.get("y", 0.55) - nasion.get("y", 0.3)) / face_span_y
    pitch_offset = (relative_nose_y - 0.42) * 2.2
    clamped_pitch = max(-1.0, min(1.0, pitch_offset))
    pitch_deg = (math.asin(clamped_pitch) * 180.0) / math.pi

    rounded_yaw = round(yaw_deg, 1)
    rounded_pitch = round(pitch_deg, 1)
    rounded_roll = round(roll_deg, 1)

    is_valid = True
    guidance = "Pose optimal • Hold steady"

    if abs(rounded_yaw) > POSE_LIMITS["maxYawDeg"]:
        is_valid = False
        guidance = "Turn head slightly left towards center" if rounded_yaw > 0 else "Turn head slightly right towards center"
    elif abs(rounded_pitch) > POSE_LIMITS["maxPitchDeg"]:
        is_valid = False
        guidance = "Raise chin slightly" if rounded_pitch > 0 else "Lower chin slightly"
    elif abs(rounded_roll) > POSE_LIMITS["maxRollDeg"]:
        is_valid = False
        guidance = "Keep head straight and level"

    return {
        "yawDeg": rounded_yaw,
        "pitchDeg": rounded_pitch,
        "rollDeg": rounded_roll,
        "isValidPose": is_valid,
        "guidanceMessage": guidance,
    }

def extract_normalized_features(
    landmarks: Dict[int, Dict[str, float]],
    video_width: float = 640.0,
    video_height: float = 480.0
) -> Dict[str, Any]:
    aspect_ratio = (video_width / video_height) if (video_width > 0 and video_height > 0) else (4.0 / 3.0)

    p234 = landmarks.get(234, {"x": 0.22, "y": 0.6})
    p454 = landmarks.get(454, {"x": 0.78, "y": 0.6})
    p127 = landmarks.get(127, {"x": 0.24, "y": 0.55})
    p356 = landmarks.get(356, {"x": 0.76, "y": 0.55})
    p50  = landmarks.get(50,  {"x": 0.32, "y": 0.65})
    p280 = landmarks.get(280, {"x": 0.68, "y": 0.65})
    p152 = landmarks.get(152, {"x": 0.5,  "y": 0.9})
    p168 = landmarks.get(168, {"x": 0.5,  "y": 0.3})
    p2   = landmarks.get(2,   {"x": 0.5,  "y": 0.68})
    p98  = landmarks.get(98,  {"x": 0.44, "y": 0.62})
    p327 = landmarks.get(327, {"x": 0.56, "y": 0.62})
    p103 = landmarks.get(103, {"x": 0.27, "y": 0.25})
    p332 = landmarks.get(332, {"x": 0.73, "y": 0.25})
    p33  = landmarks.get(33,  {"x": 0.35, "y": 0.42})
    p133 = landmarks.get(133, {"x": 0.43, "y": 0.42})
    p263 = landmarks.get(263, {"x": 0.65, "y": 0.42})
    p362 = landmarks.get(362, {"x": 0.57, "y": 0.42})

    left_eye_center = {
        "x": (p33.get("x", 0.35) + p133.get("x", 0.43)) / 2.0,
        "y": (p33.get("y", 0.42) + p133.get("y", 0.42)) / 2.0,
    }
    right_eye_center = {
        "x": (p263.get("x", 0.65) + p362.get("x", 0.57)) / 2.0,
        "y": (p263.get("y", 0.42) + p362.get("y", 0.42)) / 2.0,
    }

    inter_eye_ref_dist = max(euclidean_distance(left_eye_center, right_eye_center, False, aspect_ratio), 1e-4)

    jaw_width_raw = euclidean_distance(p234, p454, False, aspect_ratio)
    face_height_raw = euclidean_distance(p168, p152, False, aspect_ratio)
    face_width_raw = euclidean_distance(p127, p356, False, aspect_ratio)
    cheek_width_raw = euclidean_distance(p50, p280, False, aspect_ratio)
    forehead_width_raw = euclidean_distance(p103, p332, False, aspect_ratio)
    chin_length_raw = euclidean_distance(p2, p152, False, aspect_ratio)
    nose_width_raw = euclidean_distance(p98, p327, False, aspect_ratio)
    eye_region_width_raw = euclidean_distance(p33, p263, False, aspect_ratio)

    jaw_width_norm = jaw_width_raw / inter_eye_ref_dist
    face_height_norm = face_height_raw / inter_eye_ref_dist
    face_width_norm = face_width_raw / inter_eye_ref_dist
    cheek_width_norm = cheek_width_raw / inter_eye_ref_dist
    forehead_width_norm = forehead_width_raw / inter_eye_ref_dist
    chin_length_norm = chin_length_raw / inter_eye_ref_dist
    nose_width_norm = nose_width_raw / inter_eye_ref_dist
    eye_region_width_norm = eye_region_width_raw / inter_eye_ref_dist
    inter_eye_ref_norm = inter_eye_ref_dist / max(face_width_raw + face_height_raw, 1e-4)

    face_aspect_ratio = jaw_width_raw / max(face_height_raw, 1e-4)
    jaw_to_face_width_ratio = jaw_width_raw / max(face_width_raw, 1e-4)
    face_height_to_width_ratio = face_height_raw / max(face_width_raw, 1e-4)
    chin_to_face_height_ratio = chin_length_raw / max(face_height_raw, 1e-4)

    head_pose = estimate_head_pose(landmarks)

    est_jaw_width_cm = round(max(9.5, min(17.5, jaw_width_norm * 1.05 * REFERENCE_INTER_EYE_CM)), 1)
    est_face_height_cm = round(max(8.5, min(16.0, face_height_norm * REFERENCE_INTER_EYE_CM)), 1)
    est_face_width_cm = round(max(10.0, min(18.0, face_width_norm * 1.05 * REFERENCE_INTER_EYE_CM)), 1)
    est_chin_to_nose_cm = round(max(3.5, min(8.5, chin_length_norm * REFERENCE_INTER_EYE_CM)), 1)

    feature_vector = [
        round(jaw_width_norm, 4),
        round(face_height_norm, 4),
        round(face_width_norm, 4),
        round(cheek_width_norm, 4),
        round(forehead_width_norm, 4),
        round(chin_length_norm, 4),
        round(nose_width_norm, 4),
        round(eye_region_width_norm, 4),
        round(inter_eye_ref_norm, 4),
        round(face_aspect_ratio, 4),
        round(jaw_to_face_width_ratio, 4),
        round(face_height_to_width_ratio, 4),
        round(chin_to_face_height_ratio, 4),
        head_pose["yawDeg"],
        head_pose["pitchDeg"],
        head_pose["rollDeg"],
    ]

    feature_dict = {
        "jaw_width_norm": feature_vector[0],
        "face_height_norm": feature_vector[1],
        "face_width_norm": feature_vector[2],
        "cheek_width_norm": feature_vector[3],
        "forehead_width_norm": feature_vector[4],
        "chin_length_norm": feature_vector[5],
        "nose_width_norm": feature_vector[6],
        "eye_region_width_norm": feature_vector[7],
        "inter_eye_ref_norm": feature_vector[8],
        "face_aspect_ratio": feature_vector[9],
        "jaw_to_face_width_ratio": feature_vector[10],
        "face_height_to_width_ratio": feature_vector[11],
        "chin_to_face_height_ratio": feature_vector[12],
        "head_yaw_deg": feature_vector[13],
        "head_pitch_deg": feature_vector[14],
        "head_roll_deg": feature_vector[15],
    }

    return {
        "featureVector": feature_vector,
        "featureDict": feature_dict,
        "headPose": head_pose,
        "estimatedMeasurements": {
            "jawWidthCm": est_jaw_width_cm,
            "faceHeightCm": est_face_height_cm,
            "faceWidthCm": est_face_width_cm,
            "chinToNoseCm": est_chin_to_nose_cm,
            "interEyeReferenceCm": REFERENCE_INTER_EYE_CM,
            "aspectRatio": round(face_aspect_ratio, 2),
        },
        "isValidForAggregation": head_pose["isValidPose"],
    }
