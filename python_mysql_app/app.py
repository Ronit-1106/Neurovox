"""
Neurovox Python & MySQL Web Application
REST API and Web Server powered by Python & Flask
"""
import os
import json
from flask import Flask, render_template, request, jsonify
from database import save_face_scan, get_face_scans, save_order, get_orders, USE_MYSQL

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "neurovox-secret-key-12345")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/scan", methods=["POST"])
def scan_biometrics():
    """
    Receives face measurements, applies anthropometric calculation,
    and stores the record in MySQL.
    """
    data = request.get_json() or {}
    jaw_width = float(data.get("jawWidthCm", 12.8))
    face_height = float(data.get("faceHeightCm", 12.2))
    facial_ratio = round(jaw_width / max(face_height, 0.1), 2)

    # Anthropometric calculation in Python
    if jaw_width < 12.0 or face_height < 11.0:
        recommended_size = "Small"
        confidence = 0.94
    elif jaw_width > 13.8 or face_height > 13.5:
        recommended_size = "Large"
        confidence = 0.96
    else:
        recommended_size = "Medium"
        confidence = 0.97

    scan_payload = {
        "username": data.get("username", "Anonymous User").strip(),
        "recommendedSize": recommended_size,
        "jawWidthCm": jaw_width,
        "faceHeightCm": face_height,
        "facialRatio": facial_ratio,
        "confidence": confidence,
        "selectedMaskStyle": data.get("selectedMaskStyle", "Everyday Comfort Mask"),
        "notes": data.get("notes", "")
    }

    record = save_face_scan(scan_payload)

    return jsonify({
        "success": True,
        "data": {
            **scan_payload,
            **record,
            "processedBy": "Python Flask + MySQL"
        }
    }), 201


@app.route("/api/scans", methods=["GET"])
def list_scans():
    username = request.args.get("username")
    records = get_face_scans(username)
    return jsonify({
        "success": True,
        "count": len(records),
        "data": records
    })


@app.route("/api/orders", methods=["POST", "GET"])
def handle_orders():
    if request.method == "POST":
        data = request.get_json() or {}
        if not data.get("customerName") or not data.get("shippingAddress"):
            return jsonify({"success": False, "error": "Customer name and address are required"}), 400

        order_res = save_order(data)
        return jsonify({"success": True, "data": order_res}), 201
    else:
        orders = get_orders()
        return jsonify({"success": True, "data": orders})


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "backend": "Python 3.10 / Flask",
        "database": "MySQL 8.0" if USE_MYSQL else "SQLite Fallback",
        "retention": "30-Day Automated Direct Retention Window"
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Neurovox Python Server on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
