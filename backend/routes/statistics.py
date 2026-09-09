"""
RoadGuard AI - Statistics and Map Locations API Blueprint
"""

from flask import Blueprint, jsonify
from backend.models import get_system_statistics, get_map_markers

statistics_bp = Blueprint("statistics", __name__, url_prefix="/api")


@statistics_bp.route("/statistics", methods=["GET"])
def get_stats():
    """GET /api/statistics - returns aggregate analytics and KPI numbers."""
    try:
        stats = get_system_statistics()
        return jsonify({"status": "success", "data": stats}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@statistics_bp.route("/locations", methods=["GET"])
def get_locations():
    """GET /api/locations - returns coordinates and preview data for Leaflet map markers."""
    try:
        markers = get_map_markers()
        return jsonify({"status": "success", "count": len(markers), "data": markers}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
