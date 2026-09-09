"""
RoadGuard AI - Severity & Priority Scoring Engine
Implements the prototype severity calculation and priority scoring system.
"""

def calculate_severity(damage_type: str, box_area_ratio: float, confidence: float) -> str:
    """
    Classify damage into LOW, MEDIUM, or HIGH severity based on damage type,
    relative surface area occupied by defect, and confidence.
    """
    base_severity = {
        "Pothole": "HIGH",
        "Alligator Crack": "HIGH",
        "Transverse Crack": "MEDIUM",
        "Longitudinal Crack": "MEDIUM",
        "Road Surface Damage": "LOW"
    }.get(damage_type, "MEDIUM")

    # Modulate based on size ratio (damage area / total image area)
    if box_area_ratio > 0.15:
        return "HIGH"
    elif box_area_ratio < 0.03:
        if base_severity == "HIGH":
            return "MEDIUM"
        return "LOW"
    
    return base_severity


def calculate_priority_score(
    severity: str,
    confidence: float,
    box_area_ratio: float = 0.05,
    traffic_importance: float = 0.7
) -> dict:
    """
    Calculates prototype priority score (0 - 100):
    Priority Score = (Severity_Weight * 0.40) + (Confidence_Weight * 0.20) + 
                     (Damage_Size_Weight * 0.25) + (Traffic_Importance_Weight * 0.15)

    Mapping:
      0  - 30  -> Low Priority
      31 - 70  -> Medium Priority
      71 - 100 -> High Priority
    """
    severity_weights = {
        "LOW": 25.0,
        "MEDIUM": 65.0,
        "HIGH": 95.0
    }
    sev_weight = severity_weights.get(severity.upper(), 50.0)
    conf_weight = min(max(confidence, 0.0), 1.0) * 100.0
    size_weight = min(box_area_ratio / 0.20, 1.0) * 100.0  # 20% area = max size weight
    traffic_weight = min(max(traffic_importance, 0.0), 1.0) * 100.0

    raw_score = (
        (sev_weight * 0.40) +
        (conf_weight * 0.20) +
        (size_weight * 0.25) +
        (traffic_weight * 0.15)
    )

    score = int(round(min(max(raw_score, 0.0), 100.0)))

    if score <= 30:
        priority_level = "Low Priority"
        badge_class = "priority-low"
    elif score <= 70:
        priority_level = "Medium Priority"
        badge_class = "priority-medium"
    else:
        priority_level = "High Priority"
        badge_class = "priority-high"

    return {
        "score": score,
        "priority_level": priority_level,
        "badge_class": badge_class,
        "components": {
            "severity_factor": round(sev_weight * 0.40, 1),
            "confidence_factor": round(conf_weight * 0.20, 1),
            "size_factor": round(size_weight * 0.25, 1),
            "traffic_factor": round(traffic_weight * 0.15, 1)
        },
        "is_prototype": True,
        "disclaimer": "Prototype scoring algorithm: Combines severity, confidence, estimated defect area, and traffic weight."
    }
