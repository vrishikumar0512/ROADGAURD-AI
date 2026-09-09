"""
RoadGuard AI - Route Blueprints
"""
from .detections import detections_bp
from .detect import detect_bp
from .maintenance import maintenance_bp
from .statistics import statistics_bp

__all__ = ["detections_bp", "detect_bp", "maintenance_bp", "statistics_bp"]
