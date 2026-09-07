#!/usr/bin/env python3
"""
Neurovox Model Evaluation Script
Evaluates the trained mask-size classification model on the isolated TEST dataset
(consisting solely of participants 86-100, zero training overlap).
Computes:
- Overall Accuracy
- Per-class Precision, Recall, F1-score
- Macro-averaged metrics
- 3x3 Confusion Matrix
Outputs findings to models/model_metadata.json for UI evaluation dashboard.
"""
import os
import json
import math
from typing import List, Dict, Any

CLASSES = ["Small", "Medium", "Large"]

def compute_metrics(y_true: List[int], y_pred: List[int], y_probs: List[List[float]]) -> Dict[str, Any]:
    num_classes = len(CLASSES)
    total_samples = len(y_true)

    # Initialize confusion matrix [actual][predicted]
    cm = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for actual, predicted in zip(y_true, y_pred):
        cm[actual][predicted] += 1

    # Per-class metrics
    per_class = {}
    macro_prec = 0.0
    macro_rec = 0.0
    macro_f1 = 0.0

    for c in range(num_classes):
        tp = cm[c][c]
        fp = sum(cm[r][c] for r in range(num_classes) if r != c)
        fn = sum(cm[c][p] for p in range(num_classes) if p != c)
        tn = total_samples - (tp + fp + fn)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        class_total = sum(cm[c])
        class_acc = tp / class_total if class_total > 0 else 0.0

        per_class[CLASSES[c]] = {
            "accuracy": round(class_acc, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "support": class_total,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn,
        }

        macro_prec += precision
        macro_rec += recall
        macro_f1 += f1

    macro_prec /= num_classes
    macro_rec /= num_classes
    macro_f1 /= num_classes

    overall_accuracy = sum(cm[c][c] for c in range(num_classes)) / total_samples

    return {
        "overall_accuracy": round(overall_accuracy, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "total_test_samples": total_samples,
        "confusion_matrix": cm,
        "per_class": per_class,
        "classes": CLASSES,
    }

def evaluate_with_weights(weights: Dict[str, Any], test_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Forward pass using exported JSON weights without PyTorch dependency."""
    w0 = weights["network.0.weight"]
    b0 = weights["network.0.bias"]
    w3 = weights["network.3.weight"]
    b3 = weights["network.3.bias"]
    w6 = weights["network.6.weight"]
    b6 = weights["network.6.bias"]
    w8 = weights["network.8.weight"]
    b8 = weights["network.8.bias"]

    def relu(arr):
        return [max(0.0, x) for x in arr]

    def linear(x, w, b):
        out = []
        for row, bias in zip(w, b):
            val = bias + sum(xi * wi for xi, wi in zip(x, row))
            out.append(val)
        return out

    def softmax(arr):
        max_v = max(arr)
        exps = [math.exp(v - max_v) for v in arr]
        sum_exps = sum(exps)
        return [e / sum_exps for e in exps]

    y_true = []
    y_pred = []
    y_probs = []

    for s in test_data:
        x = s["features"]
        h1 = relu(linear(x, w0, b0))
        h2 = relu(linear(h1, w3, b3))
        h3 = relu(linear(h2, w6, b6))
        logits = linear(h3, w8, b8)
        probs = softmax(logits)

        predicted_class = probs.index(max(probs))
        y_true.append(s["class_index"])
        y_pred.append(predicted_class)
        y_probs.append(probs)

    metrics = compute_metrics(y_true, y_pred, y_probs)
    return metrics

def main():
    test_path = "ml/dataset/test.json"
    weights_path = "models/model_weights.json"
    output_path = "models/model_metadata.json"

    if not os.path.exists(test_path):
        print("Test dataset not found. Generating dataset first...")
        from ml.dataset_generator import create_full_dataset
        create_full_dataset()

    with open(test_path, "r") as f:
        test_data = json.load(f)

    if not os.path.exists(weights_path):
        print(f"Weights file not found at {weights_path}. Training model first...")
        from ml.train import main as train_main
        train_main()

    with open(weights_path, "r") as f:
        weights = json.load(f)

    print("Evaluating model on isolated test participants (15 subjects, 225 frames)...")
    metrics = evaluate_with_weights(weights, test_data)

    metadata = {
        "model_name": "Neurovox Facial Mask Sizing MLP",
        "model_version": "v2.0.0-onnx",
        "model_architecture": "16 -> Dense(128, ReLU) -> Dense(64, ReLU) -> Dense(32, ReLU) -> Dense(3, Softmax)",
        "input_features_count": 16,
        "input_feature_names": [
            "jaw_width_norm", "face_height_norm", "face_width_norm", "cheek_width_norm",
            "forehead_width_norm", "chin_length_norm", "nose_width_norm", "eye_region_width_norm",
            "inter_eye_ref_norm", "face_aspect_ratio", "jaw_to_face_width_ratio",
            "face_height_to_width_ratio", "chin_to_face_height_ratio", "head_yaw_deg",
            "head_pitch_deg", "head_roll_deg"
        ],
        "classes": CLASSES,
        "evaluation": metrics,
        "training_dataset": {
            "strategy": "Participant-isolated split (zero cross-set identity leakage)",
            "train_participants": 70,
            "val_participants": 15,
            "test_participants": 15,
            "test_samples_count": len(test_data),
        },
        "disclaimer": "AI-assisted anthropometric sizing model for protective mask fitting. Not a medical device or certified clinical caliper."
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print("Evaluation complete! Results saved to", output_path)
    print(f"Overall Test Accuracy: {metrics['overall_accuracy'] * 100:.2f}%")
    print(f"Macro F1-Score:        {metrics['macro_f1'] * 100:.2f}%")
    print("Confusion Matrix:")
    for row in metrics["confusion_matrix"]:
        print(" ", row)

if __name__ == "__main__":
    main()
