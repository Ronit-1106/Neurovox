#!/usr/bin/env python3
"""
Neurovox Python Inference Module:
Executes the production model on the 16-element normalized facial feature vector.
Loads the trained ONNX model via onnxruntime or verified model weights.
No fake heuristic fallbacks.
"""
import sys
import json
import math
import os
from typing import List, Dict, Any

CLASSES = ["Small", "Medium", "Large"]

def relu(x: float) -> float:
    return max(0.0, x)

def linear(x: List[float], weights: List[List[float]], biases: List[float]) -> List[float]:
    out = []
    for i in range(len(weights)):
        val = biases[i] + sum(xi * wi for xi, wi in zip(x, weights[i]))
        out.append(val)
    return out

def softmax(arr: List[float]) -> List[float]:
    max_v = max(arr)
    exps = [math.exp(v - max_v) for v in arr]
    sum_exps = sum(exps)
    return [e / max(sum_exps, 1e-12) for e in exps]

def run_inference(feature_vector: List[float], model_onnx_path: str = "models/neurovox_mask_classifier.onnx") -> Dict[str, Any]:
    # Check for ONNX model first
    if not os.path.exists(model_onnx_path):
        alt_paths = [
            "public/models/neurovox_mask_classifier.onnx",
            "public/model/mask_classifier.onnx",
            "public/neurovox_mask_classifier.onnx"
        ]
        for ap in alt_paths:
            if os.path.exists(ap):
                model_onnx_path = ap
                break

    if os.path.exists(model_onnx_path):
        try:
            import onnxruntime as ort
            import numpy as np

            session = ort.InferenceSession(model_onnx_path)
            input_name = session.get_inputs()[0].name
            input_tensor = np.array([feature_vector], dtype=np.float32)
            outputs = session.run(None, {input_name: input_tensor})

            # Handle probabilities or logits output
            if len(outputs) >= 2:
                probs = outputs[1][0].tolist()
            else:
                raw = outputs[0][0].tolist()
                probs = softmax(raw)

            best_idx = probs.index(max(probs))
            return {
                "predictedSize": CLASSES[best_idx],
                "confidence": round(probs[best_idx], 4),
                "probabilities": {
                    "Small": round(probs[0], 4),
                    "Medium": round(probs[1], 4),
                    "Large": round(probs[2], 4),
                },
                "engine": "onnxruntime",
            }
        except Exception as e:
            # If onnxruntime fails, fall back to exact weights JSON execution below
            pass

    weights_paths = ["models/model_weights.json", "public/models/model_weights.json"]
    found_weights = None
    for wp in weights_paths:
        if os.path.exists(wp):
            found_weights = wp
            break

    if not found_weights:
        raise FileNotFoundError("Trained model not found. Run training pipeline first.")

    with open(found_weights, "r") as f:
        weights = json.load(f)

    w0 = weights["network.0.weight"]
    b0 = weights["network.0.bias"]
    w3 = weights["network.3.weight"]
    b3 = weights["network.3.bias"]
    w6 = weights["network.6.weight"]
    b6 = weights["network.6.bias"]
    w8 = weights["network.8.weight"]
    b8 = weights["network.8.bias"]

    h1 = [relu(v) for v in linear(feature_vector, w0, b0)]
    h2 = [relu(v) for v in linear(h1, w3, b3)]
    h3 = [relu(v) for v in linear(h2, w6, b6)]
    logits = linear(h3, w8, b8)
    probs = softmax(logits)

    best_idx = probs.index(max(probs))

    return {
        "predictedSize": CLASSES[best_idx],
        "confidence": round(probs[best_idx], 4),
        "probabilities": {
            "Small": round(probs[0], 4),
            "Medium": round(probs[1], 4),
            "Large": round(probs[2], 4),
        },
        "engine": "python-mlp-weights",
    }

if __name__ == "__main__":
    try:
        raw_args = sys.argv[1] if len(sys.argv) > 1 else "[]"
        args = json.loads(raw_args)
        feature_vector = args[0] if len(args) > 0 else [1.95] * 16
        res = run_inference(feature_vector)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
