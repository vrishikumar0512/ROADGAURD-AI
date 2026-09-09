"""
RoadGuard AI - Detections CRUD API Blueprint
"""

from flask import Blueprint, request, jsonify
from backend.models import (
    get_all_detections,
    get_detection_by_id,
    insert_detection,
    update_detection_record,
    delete_detection_record
)

detections_bp = Blueprint("detections", __name__, url_prefix="/api/detections")


@detections_bp.route("", methods=["GET"])
def list_detections():
    """
    GET /api/detections
    Query parameters:
    - severity: LOW | MEDIUM | HIGH | ALL
    - damage_type: Pothole | Longitudinal Crack | Transverse Crack | Alligator Crack | Road Surface Damage | ALL
    - status: Detected | Pending | Assigned | In Progress | Repaired | ALL
    - search: keyword string
    - sort_by: timestamp | priority_score | confidence | severity | id
    - sort_order: ASC | DESC
    - limit: int (default 20)
    - offset: int (default 0)
    """
    try:
        severity = request.args.get("severity")
        damage_type = request.args.get("damage_type")
        status = request.args.get("status")
        search = request.args.get("search")
        sort_by = request.args.get("sort_by", "timestamp")
        sort_order = request.args.get("sort_order", "DESC")
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))

        items, total = get_all_detections(
            severity=severity,
            damage_type=damage_type,
            status=status,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=limit,
            offset=offset
        )

        return jsonify({
            "status": "success",
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": items
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@detections_bp.route("/<int:detection_id>", methods=["GET"])
def get_single_detection(detection_id):
    """GET /api/detections/:id"""
    try:
        detection = get_detection_by_id(detection_id)
        if not detection:
            return jsonify({"status": "error", "message": f"Detection ID {detection_id} not found"}), 404

        return jsonify({"status": "success", "data": detection}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@detections_bp.route("", methods=["POST"])
def create_detection():
    """POST /api/detections"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

        required_fields = ["damage_type", "severity", "priority_score", "latitude", "longitude", "location_name", "image_path"]
        for field in required_fields:
            if field not in data:
                return jsonify({"status": "error", "message": f"Missing required field: '{field}'"}), 400

        new_record = insert_detection(data)
        return jsonify({"status": "success", "message": "Detection recorded successfully", "data": new_record}), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@detections_bp.route("/<int:detection_id>", methods=["PUT"])
def update_detection(detection_id):
    """PUT /api/detections/:id"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

        updated = update_detection_record(detection_id, data)
        if not updated:
            return jsonify({"status": "error", "message": f"Detection ID {detection_id} not found"}), 404

        return jsonify({"status": "success", "message": "Detection updated", "data": updated}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@detections_bp.route("/<int:detection_id>", methods=["DELETE"])
def delete_detection(detection_id):
    """DELETE /api/detections/:id"""
    try:
        deleted = delete_detection_record(detection_id)
        if not deleted:
            return jsonify({"status": "error", "message": f"Detection ID {detection_id} not found"}), 404

        return jsonify({"status": "success", "message": f"Detection ID {detection_id} deleted successfully"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
