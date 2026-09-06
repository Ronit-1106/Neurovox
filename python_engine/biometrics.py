#!/usr/bin/env python3
"""
Neurovox Biometric Analysis Engine (Python)
Performs anthropometric face contour calculation and mask size prediction.
"""
import sys
import json
from datetime import datetime, timedelta

def calculate_mask_size(jaw_width_cm, face_height_cm, facial_ratio=None):
    """
    Predict mask size using facial anthropometric thresholds.
    Standard adult dimensions:
    - Small:  Composite score < 11.9 cm OR (Jaw width < 12.2 cm AND Face height < 11.2 cm)
    - Medium: Universal adult contour (Jaw width 12.2 - 14.0 cm, Face height 11.2 - 12.6 cm)
    - Large:  Composite score > 13.4 cm OR (Jaw width > 14.0 cm AND Face height > 12.5 cm)
    """
    if facial_ratio is None:
        facial_ratio = round(jaw_width_cm / max(face_height_cm, 0.1), 2)

    composite_score = (jaw_width_cm * 0.55) + (face_height_cm * 0.45)

    if composite_score < 11.9 or (jaw_width_cm < 12.2 and face_height_cm < 11.2):
        recommended_size = "Small"
        fit_confidence = 0.96
        description = "Petite / Slim facial structure with narrower cheekbone span."
    elif composite_score > 13.4 or (jaw_width_cm > 14.0 and face_height_cm > 12.5):
        recommended_size = "Large"
        fit_confidence = 0.97
        description = "Broad facial structure requiring extended seal and jawline coverage."
    else:
        recommended_size = "Medium"
        fit_confidence = 0.98
        description = "Standard universal facial contours with balanced nose-to-chin proportions."

    now = datetime.utcnow()
    expires_at = now + timedelta(days=30)

    return {
        "recommendedSize": recommended_size,
        "fitConfidence": fit_confidence,
        "jawWidthCm": round(jaw_width_cm, 1),
        "faceHeightCm": round(face_height_cm, 1),
        "facialRatio": facial_ratio,
        "description": description,
        "processedBy": "Python 3.10 Anthropometric Engine",
        "timestamp": int(now.timestamp() * 1000),
        "expiresAt": int(expires_at.timestamp() * 1000),
        "isoExpiration": expires_at.isoformat() + "Z"
    }

def main():
    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            print(json.dumps({"error": "No input received"}), file=sys.stderr)
            sys.exit(1)

        payload = json.loads(raw_input)
        jaw_width = float(payload.get("jawWidthCm", 12.8))
        face_height = float(payload.get("faceHeightCm", 12.2))
        facial_ratio = payload.get("facialRatio")
        if facial_ratio is not None:
            facial_ratio = float(facial_ratio)

        result = calculate_mask_size(jaw_width, face_height, facial_ratio)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
