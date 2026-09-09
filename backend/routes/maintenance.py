"""
RoadGuard AI - Maintenance Management API Blueprint
"""

from flask import Blueprint, request, jsonify
from backend.models import update_maintenance, get_detection_by_id

maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/api/maintenance")


MUNICIPAL_CREWS = [
    {"id": "crew_1", "name": "Rapid Patch Unit Alpha", "specialty": "Potholes & Emergency Surface Repairs", "capacity": "Active"},
    {"id": "crew_2", "name": "Sealant Specialist Team 3", "specialty": "Longitudinal & Transverse Crack Sealing", "capacity": "Active"},
    {"id": "crew_3", "name": "Metro Heavy Asphalt Crew", "specialty": "Alligator Fatigue & Base Milling", "capacity": "Dispatched"},
    {"id": "crew_4", "name": "District Maintenance Unit 4", "specialty": "Routine Arterial Surface Maintenance", "capacity": "Available"},
    {"id": "crew_5", "name": "Expressway Night Division", "specialty": "High-Speed Highway Hot Asphalt Inlay", "capacity": "Standby"}
]


@maintenance_bp.route("/crews", methods=["GET"])
def get_crews():
    """GET /api/maintenance/crews"""
    return jsonify({"status": "success", "data": MUNICIPAL_CREWS}), 200


@maintenance_bp.route("/<int:detection_id>", methods=["PUT"])
def update_maintenance_status(detection_id):
    """
    PUT /api/maintenance/:id
    Body:
    - status: 'Detected' | 'Pending' | 'Assigned' | 'In Progress' | 'Repaired'
    - notes: string (optional)
    - crew: string (optional)
    - scheduled_date: 'YYYY-MM-DD' (optional)
    """
    try:
        data = request.get_json() or {}
        new_status = data.get("status")
        notes = data.get("notes", "")
        crew = data.get("crew")
        scheduled_date = data.get("scheduled_date")

        valid_statuses = {"Detected", "Pending", "Assigned", "In Progress", "Repaired"}
        if new_status and new_status not in valid_statuses:
            return jsonify({
                "status": "error",
                "message": f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}"
            }), 400

        updated_record = update_maintenance(
            detection_id=detection_id,
            new_status=new_status,
            notes=notes,
            crew=crew,
            scheduled_date=scheduled_date
        )

        if not updated_record:
            return jsonify({"status": "error", "message": f"Detection ID {detection_id} not found"}), 404

        return jsonify({
            "status": "success",
            "message": f"Maintenance status updated to '{new_status}'",
            "data": updated_record
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
