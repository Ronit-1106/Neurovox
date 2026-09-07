#!/usr/bin/env python3
"""
Neurovox Biometric Analysis Engine
Coordinates facial landmark processing, normalized geometric extraction,
and model inference for mask sizing.
All references use calibrated inter-eye reference distance.
"""
import sys
import json
from python_engine.feature_extractor import extract_normalized_features
from python_engine.inference import run_inference

def analyze_landmarks(landmarks_map):
    """
    Analyzes raw landmark points.
    1. Extracts normalized geometric features and head pose.
    2. Runs model inference.
    3. Returns consolidated sizing recommendation and metrics.
    """
    extracted = extract_normalized_features(landmarks_map)
    feature_vector = extracted["featureVector"]
    inference_result = run_inference(feature_vector)

    return {
        "status": "success",
        "predictedSize": inference_result["predictedSize"],
        "confidence": inference_result["confidence"],
        "probabilities": inference_result["probabilities"],
        "headPose": extracted["headPose"],
        "estimatedMeasurements": extracted["estimatedMeasurements"],
        "normalizedFeatures": extracted["featureDict"],
    }

if __name__ == "__main__":
    try:
        raw_args = sys.argv[1] if len(sys.argv) > 1 else "[]"
        args = json.loads(raw_args)
        landmarks = args[0] if len(args) > 0 else {}
        # Convert string keys to int if necessary
        landmarks_map = {int(k): v for k, v in landmarks.items()} if isinstance(landmarks, dict) else {}
        result = analyze_landmarks(landmarks_map)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)
