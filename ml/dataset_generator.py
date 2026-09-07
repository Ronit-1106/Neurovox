#!/usr/bin/env python3
"""
Neurovox Benchmark Dataset Generator & Participant-Separated Splitter
Generates anthropometrically grounded facial biometric measurements across 100 participants
with multi-frame samples per participant.
Strictly separates participants across Train (70%), Validation (15%), and Test (15%)
to eliminate data leakage.
"""
import os
import json
import random
import math
from typing import List, Dict, Any

CLASSES = ["Small", "Medium", "Large"]
CLASS_TO_IDX = {"Small": 0, "Medium": 1, "Large": 2}

def generate_participant_profile(participant_id: int) -> Dict[str, Any]:
    """Generate ground-truth anatomical baseline for a human subject."""
    rand_val = random.random()
    if rand_val < 0.25:
        true_class = "Small"
        jaw_cm = random.gauss(11.4, 0.4)
        height_cm = random.gauss(10.6, 0.35)
        width_cm = random.gauss(12.2, 0.4)
    elif rand_val < 0.75:
        true_class = "Medium"
        jaw_cm = random.gauss(13.1, 0.45)
        height_cm = random.gauss(11.9, 0.4)
        width_cm = random.gauss(14.0, 0.45)
    else:
        true_class = "Large"
        jaw_cm = random.gauss(14.6, 0.5)
        height_cm = random.gauss(13.0, 0.45)
        width_cm = random.gauss(15.5, 0.5)

    ref_inter_eye_cm = random.gauss(6.3, 0.25)
    ref_inter_eye_cm = max(5.6, min(7.1, ref_inter_eye_cm))

    return {
        "participant_id": f"PARTICIPANT_{participant_id:03d}",
        "true_class": true_class,
        "class_index": CLASS_TO_IDX[true_class],
        "baseline": {
            "jaw_cm": jaw_cm,
            "height_cm": height_cm,
            "width_cm": width_cm,
            "inter_eye_cm": ref_inter_eye_cm,
        }
    }

def generate_frame_sample(participant: Dict[str, Any], frame_num: int) -> Dict[str, Any]:
    """Simulate a single camera frame for the participant with micro-movements and sensor noise."""
    base = participant["baseline"]
    scale = random.gauss(1.0, 0.02)
    noise_jaw = random.gauss(0, 0.08)
    noise_height = random.gauss(0, 0.08)
    noise_width = random.gauss(0, 0.08)

    jaw_cm = (base["jaw_cm"] + noise_jaw) * scale
    height_cm = (base["height_cm"] + noise_height) * scale
    width_cm = (base["width_cm"] + noise_width) * scale
    inter_eye_cm = base["inter_eye_cm"] * scale

    cheek_cm = width_cm * random.gauss(0.88, 0.015)
    forehead_cm = width_cm * random.gauss(0.78, 0.015)
    chin_cm = height_cm * random.gauss(0.38, 0.015)
    nose_cm = inter_eye_cm * random.gauss(0.55, 0.02)
    eye_region_cm = inter_eye_cm * random.gauss(1.58, 0.02)

    jaw_norm = jaw_cm / inter_eye_cm
    height_norm = height_cm / inter_eye_cm
    width_norm = width_cm / inter_eye_cm
    cheek_norm = cheek_cm / inter_eye_cm
    forehead_norm = forehead_cm / inter_eye_cm
    chin_norm = chin_cm / inter_eye_cm
    nose_norm = nose_cm / inter_eye_cm
    eye_region_norm = eye_region_cm / inter_eye_cm
    inter_eye_norm = inter_eye_cm / (width_cm + height_cm)

    aspect_ratio = jaw_cm / height_cm
    jaw_width_ratio = jaw_cm / width_cm
    height_width_ratio = height_cm / width_cm
    chin_height_ratio = chin_cm / height_cm

    yaw_deg = round(random.gauss(0, 3.5), 2)
    pitch_deg = round(random.gauss(0, 3.0), 2)
    roll_deg = round(random.gauss(0, 2.5), 2)

    feature_vector = [
        round(jaw_norm, 4),
        round(height_norm, 4),
        round(width_norm, 4),
        round(cheek_norm, 4),
        round(forehead_norm, 4),
        round(chin_norm, 4),
        round(nose_norm, 4),
        round(eye_region_norm, 4),
        round(inter_eye_norm, 4),
        round(aspect_ratio, 4),
        round(jaw_width_ratio, 4),
        round(height_width_ratio, 4),
        round(chin_height_ratio, 4),
        yaw_deg,
        pitch_deg,
        roll_deg,
    ]

    return {
        "sample_id": f"{participant['participant_id']}_F{frame_num:02d}",
        "participant_id": participant["participant_id"],
        "label": participant["true_class"],
        "class_index": participant["class_index"],
        "estimated_jaw_width_cm": round(jaw_cm, 1),
        "estimated_face_height_cm": round(height_cm, 1),
        "estimated_face_width_cm": round(width_cm, 1),
        "features": feature_vector,
    }

def create_full_dataset(num_participants: int = 100, frames_per_participant: int = 15, output_dir: str = "ml/dataset"):
    os.makedirs(output_dir, exist_ok=True)
    random.seed(42)

    participants = [generate_participant_profile(i + 1) for i in range(num_participants)]

    # Strictly partition by participant:
    # 0 - 69: Train (70%)
    # 70 - 84: Val (15%)
    # 85 - 99: Test (15%)
    train_parts = participants[:70]
    val_parts = participants[70:85]
    test_parts = participants[85:100]

    def build_split(parts):
        samples = []
        for p in parts:
            for f in range(frames_per_participant):
                samples.append(generate_frame_sample(p, f + 1))
        return samples

    train_data = build_split(train_parts)
    val_data = build_split(val_parts)
    test_data = build_split(test_parts)

    all_data = train_data + val_data + test_data

    with open(os.path.join(output_dir, "train.json"), "w") as f:
        json.dump(train_data, f, indent=2)
    with open(os.path.join(output_dir, "val.json"), "w") as f:
        json.dump(val_data, f, indent=2)
    with open(os.path.join(output_dir, "test.json"), "w") as f:
        json.dump(test_data, f, indent=2)
    with open(os.path.join(output_dir, "dataset.json"), "w") as f:
        json.dump(all_data, f, indent=2)

    summary = {
        "num_participants": num_participants,
        "train_participants": len(train_parts),
        "val_participants": len(val_parts),
        "test_participants": len(test_parts),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "test_samples": len(test_data),
        "total_samples": len(all_data),
        "feature_count": 16,
        "classes": CLASSES,
        "partition_strategy": "Strict participant-level isolation (zero inter-set subject overlap)",
    }

    with open(os.path.join(output_dir, "dataset_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    return summary

if __name__ == "__main__":
    create_full_dataset()
