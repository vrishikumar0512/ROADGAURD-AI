"""
RoadGuard AI - Database Models and Data Access Layer
"""

import json
from datetime import datetime
from .database import get_db_connection


def row_to_dict(row):
    """Converts a SQLite Row object to a clean JSON-serializable dictionary."""
    if row is None:
        return None
    d = dict(row)
    if "bounding_boxes" in d and d["bounding_boxes"]:
        try:
            d["bounding_boxes"] = json.loads(d["bounding_boxes"])
        except Exception:
            pass
    return d


def get_all_detections(
    severity: str = None,
    damage_type: str = None,
    status: str = None,
    search: str = None,
    sort_by: str = "timestamp",
    sort_order: str = "DESC",
    limit: int = 50,
    offset: int = 0
) -> tuple[list[dict], int]:
    """Retrieves filtered, sorted, paginated detections along with total match count."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if severity and severity.upper() != "ALL":
        conditions.append("severity = ?")
        params.append(severity.upper())

    if damage_type and damage_type.upper() != "ALL":
        conditions.append("damage_type = ?")
        params.append(damage_type)

    if status and status.upper() != "ALL":
        conditions.append("maintenance_status = ?")
        params.append(status)

    if search:
        conditions.append("(location_name LIKE ? OR damage_type LIKE ? OR maintenance_notes LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Count total matches
    count_query = f"SELECT COUNT(*) FROM detections {where_clause}"
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]

    # Validate sorting fields
    allowed_sort_fields = {"id", "priority_score", "confidence", "severity", "timestamp", "damage_type", "maintenance_status"}
    if sort_by not in allowed_sort_fields:
        sort_by = "timestamp"
    sort_order = "ASC" if sort_order.upper() == "ASC" else "DESC"

    # Query items
    query = f"""
        SELECT * FROM detections
        {where_clause}
        ORDER BY {sort_by} {sort_order}
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    cursor.execute(query, params)
    rows = cursor.fetchall()

    conn.close()
    return [row_to_dict(r) for r in rows], total_count


def get_detection_by_id(detection_id: int) -> dict:
    """Fetches full details of a single detection including maintenance history."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM detections WHERE id = ?", (detection_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    detection = row_to_dict(row)

    # Fetch audit logs
    cursor.execute("""
        SELECT * FROM maintenance_logs
        WHERE detection_id = ?
        ORDER BY timestamp DESC
    """, (detection_id,))
    logs = [dict(r) for r in cursor.fetchall()]
    detection["maintenance_logs"] = logs

    conn.close()
    return detection


def insert_detection(data: dict) -> dict:
    """Inserts a new detection record into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    bbox_str = json.dumps(data.get("bounding_boxes", []))

    cursor.execute("""
        INSERT INTO detections (
            damage_type, confidence, severity, priority_score,
            latitude, longitude, location_name,
            image_path, processed_image_path, bounding_boxes,
            maintenance_status, maintenance_notes, assigned_crew, scheduled_date,
            timestamp, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["damage_type"],
        data["confidence"],
        data["severity"],
        data["priority_score"],
        data["latitude"],
        data["longitude"],
        data["location_name"],
        data["image_path"],
        data.get("processed_image_path", data["image_path"]),
        bbox_str,
        data.get("maintenance_status", "Pending"),
        data.get("maintenance_notes", ""),
        data.get("assigned_crew", None),
        data.get("scheduled_date", None),
        data.get("timestamp", now),
        1 if data.get("is_demo", True) else 0,
        now,
        now
    ))
    new_id = cursor.lastrowid

    # Create initial maintenance log
    cursor.execute("""
        INSERT INTO maintenance_logs (
            detection_id, previous_status, new_status, assigned_crew, notes, timestamp
        ) VALUES (?, 'None', ?, ?, ?, ?)
    """, (
        new_id,
        data.get("maintenance_status", "Pending"),
        data.get("assigned_crew", None),
        "Detection registered into system",
        now
    ))

    conn.commit()
    conn.close()
    return get_detection_by_id(new_id)


def update_detection_record(detection_id: int, updates: dict) -> dict:
    """Updates general metadata of a detection."""
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    allowed_fields = [
        "damage_type", "severity", "priority_score", "latitude",
        "longitude", "location_name", "maintenance_notes"
    ]
    set_clauses = []
    params = []

    for f in allowed_fields:
        if f in updates:
            set_clauses.append(f"{f} = ?")
            params.append(updates[f])

    if not set_clauses:
        conn.close()
        return get_detection_by_id(detection_id)

    set_clauses.append("updated_at = ?")
    params.append(now)
    params.append(detection_id)

    cursor.execute(f"""
        UPDATE detections
        SET {', '.join(set_clauses)}
        WHERE id = ?
    """, params)

    conn.commit()
    conn.close()
    return get_detection_by_id(detection_id)


def update_maintenance(detection_id: int, new_status: str, notes: str = "", crew: str = None, scheduled_date: str = None) -> dict:
    """Updates maintenance status, assigned crew, notes, and records audit trail."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT maintenance_status FROM detections WHERE id = ?", (detection_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    prev_status = row["maintenance_status"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE detections
        SET maintenance_status = ?,
            maintenance_notes = COALESCE(?, maintenance_notes),
            assigned_crew = COALESCE(?, assigned_crew),
            scheduled_date = COALESCE(?, scheduled_date),
            updated_at = ?
        WHERE id = ?
    """, (new_status, notes or None, crew or None, scheduled_date or None, now, detection_id))

    # Record log entry
    cursor.execute("""
        INSERT INTO maintenance_logs (
            detection_id, previous_status, new_status, assigned_crew, notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (detection_id, prev_status, new_status, crew, notes, now))

    conn.commit()
    conn.close()
    return get_detection_by_id(detection_id)


def delete_detection_record(detection_id: int) -> bool:
    """Deletes a detection and its cascade logs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detections WHERE id = ?", (detection_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_map_markers() -> list[dict]:
    """Returns lightweight list of all detections formatted for Leaflet.js markers."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, damage_type, severity, priority_score, confidence,
               latitude, longitude, location_name,
               image_path, processed_image_path, maintenance_status, timestamp
        FROM detections
        ORDER BY priority_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_system_statistics() -> dict:
    """Computes comprehensive metrics for dashboard cards and analytics charts."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total Detections
    cursor.execute("SELECT COUNT(*) FROM detections")
    total = cursor.fetchone()[0]

    # Severity Counts
    cursor.execute("SELECT severity, COUNT(*) FROM detections GROUP BY severity")
    sev_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for row in cursor.fetchall():
        sev_counts[row[0]] = row[1]

    # Roads requiring attention (Active damages needing maintenance)
    cursor.execute("""
        SELECT COUNT(*) FROM detections
        WHERE maintenance_status IN ('Detected', 'Pending', 'Assigned', 'In Progress')
        AND severity IN ('HIGH', 'MEDIUM')
    """)
    roads_requiring_attention = cursor.fetchone()[0]

    # Maintenance Status breakdown
    cursor.execute("SELECT maintenance_status, COUNT(*) FROM detections GROUP BY maintenance_status")
    status_counts = {}
    for row in cursor.fetchall():
        status_counts[row[0]] = row[1]

    # Damage Type breakdown
    cursor.execute("SELECT damage_type, COUNT(*) FROM detections GROUP BY damage_type")
    type_counts = {}
    for row in cursor.fetchall():
        type_counts[row[0]] = row[1]

    # Recent detections (top 5)
    cursor.execute("""
        SELECT id, damage_type, severity, priority_score, confidence,
               location_name, maintenance_status, timestamp, image_path, processed_image_path
        FROM detections
        ORDER BY id DESC
        LIMIT 5
    """)
    recent = [dict(r) for r in cursor.fetchall()]

    # Timeline (by day)
    cursor.execute("""
        SELECT substr(timestamp, 1, 10) as day, COUNT(*) as count
        FROM detections
        GROUP BY day
        ORDER BY day ASC
        LIMIT 14
    """)
    timeline = [{"date": r["day"], "count": r["count"]} for r in cursor.fetchall()]

    # High-priority road hotspots
    cursor.execute("""
        SELECT location_name, COUNT(*) as defect_count, AVG(priority_score) as avg_priority
        FROM detections
        GROUP BY location_name
        ORDER BY defect_count DESC, avg_priority DESC
        LIMIT 6
    """)
    hotspots = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "total_detections": total,
        "high_severity": sev_counts["HIGH"],
        "medium_severity": sev_counts["MEDIUM"],
        "low_severity": sev_counts["LOW"],
        "roads_requiring_attention": roads_requiring_attention,
        "repaired_count": status_counts.get("Repaired", 0),
        "in_progress_count": status_counts.get("In Progress", 0),
        "pending_count": status_counts.get("Pending", 0) + status_counts.get("Detected", 0),
        "severity_distribution": sev_counts,
        "type_distribution": type_counts,
        "status_distribution": status_counts,
        "recent_detections": recent,
        "timeline": timeline,
        "hotspots": hotspots
    }
