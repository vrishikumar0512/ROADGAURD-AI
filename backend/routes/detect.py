"""
RoadGuard AI - AI Detection and Inference API Blueprint
"""

import os
import time
import shutil
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ai.detector import RoadDamageDetector
from backend.models import insert_detection

detect_bp = Blueprint("detect", __name__, url_prefix="/api")

# Singleton detector instance
_detector_instance = None

def get_detector():
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = RoadDamageDetector()
    return _detector_instance


ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}

def is_allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@detect_bp.route("/sample-images", methods=["GET"])
def get_sample_images():
    """GET /api/sample-images - returns pre-configured sample road images for 1-click testing"""
    samples = [
        {
            "id": "pothole",
            "name": "Severe Pothole (Avinashi Road, Coimbatore)",
            "filename": "sample_pothole.jpg",
            "damage_type": "Pothole",
            "expected_severity": "HIGH",
            "preview_url": "/uploads/samples/sample_pothole.jpg",
            "suggested_location": "Avinashi Road Arterial (Peelamedu), Coimbatore",
            "lat": 11.0285,
            "lng": 76.9625
        },
        {
            "id": "alligator_crack",
            "name": "Alligator Fatigue Cracking (GST Road, Chennai)",
            "filename": "sample_alligator_crack.jpg",
            "damage_type": "Alligator Crack",
            "expected_severity": "HIGH",
            "preview_url": "/uploads/samples/sample_alligator_crack.jpg",
            "suggested_location": "Grand Southern Trunk (GST) Road, Chennai",
            "lat": 12.9644,
            "lng": 80.1472
        },
        {
            "id": "longitudinal_crack",
            "name": "Longitudinal Joint Crack (NH44 Bypass, Salem)",
            "filename": "sample_longitudinal_crack.jpg",
            "damage_type": "Longitudinal Crack",
            "expected_severity": "MEDIUM",
            "preview_url": "/uploads/samples/sample_longitudinal_crack.jpg",
            "suggested_location": "Salem - Bengaluru NH44 Bypass, Salem",
            "lat": 11.6450,
            "lng": 78.1620
        },
        {
            "id": "transverse_crack",
            "name": "Transverse Thermal Fracture (Thillai Nagar, Trichy)",
            "filename": "sample_transverse_crack.jpg",
            "damage_type": "Transverse Crack",
            "expected_severity": "MEDIUM",
            "preview_url": "/uploads/samples/sample_transverse_crack.jpg",
            "suggested_location": "Thillai Nagar Main Road, Tiruchirappalli",
            "lat": 10.8285,
            "lng": 78.6892
        }
    ]
    return jsonify({"status": "success", "data": samples}), 200


@detect_bp.route("/detect", methods=["POST"])
def run_detection():
    """
    POST /api/detect
    Accepts:
    - 'image' file upload (multipart/form-data) OR 'sample_filename' string
    - 'latitude': float (optional)
    - 'longitude': float (optional)
    - 'location_name': string (optional)
    - 'traffic_importance': float 0.0 - 1.0 (optional)
    - 'save_to_db': 'true' | 'false' (default 'true')
    """
    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        uploads_orig = os.path.join(base_dir, "uploads", "original")
        uploads_proc = os.path.join(base_dir, "uploads", "processed")
        uploads_samples = os.path.join(base_dir, "uploads", "samples")

        os.makedirs(uploads_orig, exist_ok=True)
        os.makedirs(uploads_proc, exist_ok=True)

        target_image_path = None
        rel_orig_path = None

        # Check if user selected a preloaded sample image
        sample_filename = request.form.get("sample_filename")
        if sample_filename:
            sample_src = os.path.join(uploads_samples, secure_filename(sample_filename))
            if not os.path.exists(sample_src):
                return jsonify({"status": "error", "message": f"Sample image '{sample_filename}' not found"}), 404
            
            # Copy to original uploads with timestamp to keep records unique
            unique_name = f"sample_{int(time.time()*1000)}_{secure_filename(sample_filename)}"
            target_image_path = os.path.join(uploads_orig, unique_name)
            shutil.copyfile(sample_src, target_image_path)
            rel_orig_path = f"uploads/original/{unique_name}"
        
        # Or check uploaded file
        elif "image" in request.files:
            file = request.files["image"]
            if file.filename == "":
                return jsonify({"status": "error", "message": "No file selected"}), 400

            if not is_allowed_file(file.filename):
                return jsonify({"status": "error", "message": "Invalid file format. Allowed: .jpg, .jpeg, .png, .webp"}), 400

            safe_name = secure_filename(file.filename)
            unique_name = f"upload_{int(time.time()*1000)}_{safe_name}"
            target_image_path = os.path.join(uploads_orig, unique_name)
            file.save(target_image_path)
            rel_orig_path = f"uploads/original/{unique_name}"

        else:
            return jsonify({"status": "error", "message": "Neither 'image' file nor 'sample_filename' provided"}), 400

        # Parse GPS & Location (Default to Tamil Nadu: Coimbatore / Chennai corridor)
        lat = request.form.get("latitude")
        lng = request.form.get("longitude")
        location_name = request.form.get("location_name") or "State Highway 172, Tamil Nadu"

        try:
            latitude = float(lat) if lat else 11.0168
            longitude = float(lng) if lng else 76.9558
        except ValueError:
            latitude = 11.0168
            longitude = 76.9558

        traffic_importance = float(request.form.get("traffic_importance", 0.7))
        save_to_db = request.form.get("save_to_db", "true").lower() in ("true", "1", "yes")

        # Run AI Detector
        detector = get_detector()
        result = detector.detect(
            image_path=target_image_path,
            output_dir=uploads_proc,
            traffic_importance=traffic_importance
        )

        proc_filename = os.path.basename(result["processed_image_path"])
        rel_proc_path = f"uploads/processed/{proc_filename}"

        saved_record = None
        if save_to_db:
            db_payload = {
                "damage_type": result["damage_type"],
                "confidence": result["confidence"],
                "severity": result["severity"],
                "priority_score": result["priority_score"],
                "latitude": latitude,
                "longitude": longitude,
                "location_name": location_name,
                "image_path": rel_orig_path,
                "processed_image_path": rel_proc_path,
                "bounding_boxes": result["bounding_boxes"],
                "maintenance_status": "Pending",
                "maintenance_notes": f"AI Detected defect: {result['damage_type']} with {result['severity']} severity (Score: {result['priority_score']}).",
                "is_demo": result["is_demo"]
            }
            saved_record = insert_detection(db_payload)

        return jsonify({
            "status": "success",
            "message": "AI detection completed successfully",
            "data": {
                "is_demo": result["is_demo"],
                "mode_notice": result["mode_notice"],
                "damage_type": result["damage_type"],
                "confidence": result["confidence"],
                "severity": result["severity"],
                "priority_score": result["priority_score"],
                "priority_level": result["priority_level"],
                "priority_components": result["priority_components"],
                "latitude": latitude,
                "longitude": longitude,
                "location_name": location_name,
                "bounding_boxes": result["bounding_boxes"],
                "original_image_url": f"/{rel_orig_path}",
                "processed_image_url": f"/{rel_proc_path}",
                "timestamp": result["timestamp"],
                "saved_detection_id": saved_record["id"] if saved_record else None,
                "disclaimer": "Demo AI Mode: Confidence & scores generated for simulation; connect a trained YOLO model for measured production accuracy."
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Detection failed: {str(e)}"}), 500
