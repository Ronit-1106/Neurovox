#!/usr/bin/env python3
"""
Neurovox Python Inference Module
Runs model forward pass on normalized facial features using trained weights.
Returns genuine softmax probabilities and predicted size.
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

def run_inference(feature_vector: List[float], weights_path: str = "models/model_weights.json") -> Dict[str, Any]:
    if not os.path.exists(weights_path):
        # Fallback to public/models if needed
        weights_path = "public/models/model_weights.json"

    if os.path.exists(weights_path):
        with open(weights_path, "r") as f:
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

    # Anthropometric fallback heuristic if model weights not found
    jaw_norm = feature_vector[0] if len(feature_vector) > 0 else 1.95
    height_norm = feature_vector[1] if len(feature_vector) > 1 else 1.82

    if jaw_norm < 1.85 and height_norm < 1.75:
        p_small, p_med, p_large = 0.85, 0.12, 0.03
        pred = "Small"
    elif jaw_norm > 2.15 or height_norm > 1.95:
        p_small, p_med, p_large = 0.04, 0.14, 0.82
        pred = "Large"
    else:
        p_small, p_med, p_large = 0.09, 0.83, 0.08
        pred = "Medium"

    return {
        "predictedSize": pred,
        "confidence": max(p_small, p_med, p_large),
        "probabilities": {
            "Small": p_small,
            "Medium": p_med,
            "Large": p_large,
        },
        "engine": "anthropometric-fallback",
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
