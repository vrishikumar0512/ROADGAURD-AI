"""
RoadGuard AI - SQLite Database Manager and Seed Data Initializer
"""

import os
import sqlite3
import json
import time
from datetime import datetime, timedelta

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database"))
DB_PATH = os.path.join(DB_DIR, "roadguard.db")


def get_db_connection():
    """Returns a SQLite connection with row factory configured."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(force_reseed=False):
    """Initializes schema and seeds realistic data if table is empty or force_reseed=True."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Detections Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        damage_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH')),
        priority_score INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_name TEXT NOT NULL,
        image_path TEXT NOT NULL,
        processed_image_path TEXT,
        bounding_boxes TEXT,
        maintenance_status TEXT NOT NULL DEFAULT 'Pending' 
            CHECK(maintenance_status IN ('Detected', 'Pending', 'Assigned', 'In Progress', 'Repaired')),
        maintenance_notes TEXT,
        assigned_crew TEXT,
        scheduled_date TEXT,
        timestamp TEXT NOT NULL,
        is_demo INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 2. Road Damage Catalog
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_damage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        default_severity TEXT,
        urgency_weight REAL,
        typical_repair_method TEXT
    );
    """)

    # 3. Maintenance Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detection_id INTEGER NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        assigned_crew TEXT,
        notes TEXT,
        logged_by TEXT DEFAULT 'Dispatch Engineer',
        timestamp TEXT NOT NULL
    );
    """)

    # 4. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT
    );
    """)

    # Seed Road Damage types
    cursor.execute("SELECT COUNT(*) FROM road_damage")
    if cursor.fetchone()[0] == 0:
        damages = [
            ("Pothole", "Deep hollow cavity in road surface caused by wear and freeze-thaw water erosion.", "HIGH", 0.95, "Cold-mix / hot-mix asphalt patching and mechanical compaction"),
            ("Alligator Crack", "Interconnected polygonal cracks resembling reptilian scales; indicates structural sub-base fatigue.", "HIGH", 0.90, "Full-depth asphalt patching or sub-base milling and overlay"),
            ("Transverse Crack", "Cracks extending perpendicularly across the direction of travel due to thermal shrinkage.", "MEDIUM", 0.65, "Rubberized asphalt crack sealing or routing and fill"),
            ("Longitudinal Crack", "Cracks running parallel to the direction of vehicular movement along joint lines.", "MEDIUM", 0.60, "Hot-pour crack sealant and structural bonding tape"),
            ("Road Surface Damage", "Surface raveling, minor rutting, surface friction degradation, or minor spalling.", "LOW", 0.35, "Microsurfacing, chip sealing, or surface fog seal application")
        ]
        cursor.executemany("""
            INSERT INTO road_damage (name, description, default_severity, urgency_weight, typical_repair_method)
            VALUES (?, ?, ?, ?, ?)
        """, damages)

    # Seed Default Users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        sample_users = [
            ("admin", "Dr. Marcus Vance", "Municipal Chief Engineer", "m.vance@roadguard.gov"),
            ("inspector_raj", "Rajesh Sharma", "Senior Field Surveyor", "r.sharma@roadguard.gov"),
            ("crew_lead_sarah", "Sarah Jenkins", "Rapid Response Crew Alpha Lead", "s.jenkins@roadguard.gov")
        ]
        cursor.executemany("""
            INSERT INTO users (username, full_name, role, email)
            VALUES (?, ?, ?, ?)
        """, sample_users)

    # Seed Sample Detections if empty
    cursor.execute("SELECT COUNT(*) FROM detections")
    existing_count = cursor.fetchone()[0]
    if existing_count == 0 or force_reseed:
        if force_reseed:
            cursor.execute("DELETE FROM detections")
            cursor.execute("DELETE FROM maintenance_logs")
            cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('detections', 'maintenance_logs')")

        _seed_sample_detections(cursor)

    conn.commit()
    conn.close()
    print(f"[RoadGuard AI] SQLite database verified and initialized at: {DB_PATH}")


def _seed_sample_detections(cursor):
    """Inserts 12+ realistic sample detections with coordinates, varied severity, and statuses."""
    now = datetime.now()

    sample_images = {
        "Pothole": "uploads/samples/sample_pothole.jpg",
        "Alligator Crack": "uploads/samples/sample_alligator_crack.jpg",
        "Transverse Crack": "uploads/samples/sample_transverse_crack.jpg",
        "Longitudinal Crack": "uploads/samples/sample_longitudinal_crack.jpg",
        "Road Surface Damage": "uploads/samples/sample_transverse_crack.jpg"
    }

    # Clean, realistic sample records (7 demo records across Tamil Nadu)
    samples = [
        # 1. Coimbatore - High Severity
        {
            "damage_type": "Pothole",
            "confidence": 0.94,
            "severity": "HIGH",
            "priority_score": 92,
            "lat": 11.0285,
            "lng": 76.9625,
            "location_name": "Avinashi Road Arterial, Coimbatore",
            "status": "In Progress",
            "crew": "Rapid Patch Unit Alpha",
            "notes": "Demo Data: Pothole detected on arterial corridor.",
            "days_ago": 1,
            "sched_days": 1
        },
        # 2. Coimbatore - Medium Severity
        {
            "damage_type": "Longitudinal Crack",
            "confidence": 0.83,
            "severity": "MEDIUM",
            "priority_score": 58,
            "lat": 10.9982,
            "lng": 76.9712,
            "location_name": "Trichy Road Junction, Coimbatore",
            "status": "Assigned",
            "crew": "District Maintenance Unit 4",
            "notes": "Demo Data: Joint crack scheduled for sealing.",
            "days_ago": 3,
            "sched_days": 3
        },
        # 3. Chennai - High Severity
        {
            "damage_type": "Pothole",
            "confidence": 0.95,
            "severity": "HIGH",
            "priority_score": 94,
            "lat": 13.0102,
            "lng": 80.2156,
            "location_name": "Anna Salai (Mount Road), Chennai",
            "status": "Repaired",
            "crew": "Rapid Patch Unit Alpha",
            "notes": "Demo Data: Repaired and surface restored.",
            "days_ago": 5,
            "sched_days": -1
        },
        # 4. Chennai - High Severity
        {
            "damage_type": "Alligator Crack",
            "confidence": 0.89,
            "severity": "HIGH",
            "priority_score": 88,
            "lat": 12.9644,
            "lng": 80.1472,
            "location_name": "GST Road Corridor, Chennai",
            "status": "Assigned",
            "crew": "Metro Heavy Asphalt Crew",
            "notes": "Demo Data: Fatigue crack pattern identified.",
            "days_ago": 2,
            "sched_days": 2
        },
        # 5. Madurai - High Severity
        {
            "damage_type": "Pothole",
            "confidence": 0.91,
            "severity": "HIGH",
            "priority_score": 89,
            "lat": 9.9412,
            "lng": 78.1485,
            "location_name": "Ring Road Highway, Madurai",
            "status": "Pending",
            "crew": None,
            "notes": "Demo Data: High severity road defect.",
            "days_ago": 0,
            "sched_days": None
        },
        # 6. Tiruchirappalli - Medium Severity
        {
            "damage_type": "Transverse Crack",
            "confidence": 0.85,
            "severity": "MEDIUM",
            "priority_score": 62,
            "lat": 10.8285,
            "lng": 78.6892,
            "location_name": "Thillai Nagar Main Road, Tiruchirappalli",
            "status": "In Progress",
            "crew": "Sealant Specialist Team 3",
            "notes": "Demo Data: Thermal crack under maintenance.",
            "days_ago": 2,
            "sched_days": 2
        },
        # 7. Salem - Low Severity
        {
            "damage_type": "Road Surface Damage",
            "confidence": 0.80,
            "severity": "LOW",
            "priority_score": 28,
            "lat": 11.6725,
            "lng": 78.1384,
            "location_name": "Omalur Main Road, Salem",
            "status": "Pending",
            "crew": None,
            "notes": "Demo Data: Surface wear identified for routine cycle.",
            "days_ago": 4,
            "sched_days": None
        }
    ]

    for s in samples:
        dt = (now - timedelta(days=s["days_ago"], hours=s.get("hours", 3))).strftime("%Y-%m-%d %H:%M:%S")
        sched_date = (now + timedelta(days=s["sched_days"])).strftime("%Y-%m-%d") if s["sched_days"] is not None else None
        
        img_path = sample_images.get(s["damage_type"], "uploads/samples/sample_pothole.jpg")
        # Dummy bounding box JSON
        bbox_data = json.dumps([{
            "box": [200, 240, 600, 480],
            "class_name": s["damage_type"],
            "confidence": s["confidence"],
            "severity": s["severity"],
            "area_ratio": 0.12
        }])

        cursor.execute("""
            INSERT INTO detections (
                damage_type, confidence, severity, priority_score,
                latitude, longitude, location_name,
                image_path, processed_image_path, bounding_boxes,
                maintenance_status, maintenance_notes, assigned_crew, scheduled_date,
                timestamp, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        """, (
            s["damage_type"], s["confidence"], s["severity"], s["priority_score"],
            s["lat"], s["lng"], s["location_name"],
            img_path, img_path, bbox_data,
            s["status"], s["notes"], s["crew"], sched_date,
            dt, dt, dt
        ))
        det_id = cursor.lastrowid

        # Insert audit log
        cursor.execute("""
            INSERT INTO maintenance_logs (
                detection_id, previous_status, new_status, assigned_crew, notes, timestamp
            ) VALUES (?, 'Detected', ?, ?, ?, ?)
        """, (
            det_id, s["status"], s["crew"], f"Initial assessment: {s['notes']}", dt
        ))
