"""
RoadGuard AI - Comprehensive Automated Verification Test Suite
Tests AI Module, SQLite Database, REST API Endpoints, and Frontend Routing
"""

import os
import sys
import json
import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import create_app
from backend.database import init_db, get_db_connection
from backend.models import get_system_statistics, get_all_detections, get_detection_by_id
from ai.detector import RoadDamageDetector
from ai.severity import calculate_severity, calculate_priority_score
from ai.generate_samples import generate_all_samples


class RoadGuardAITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Ensure samples exist
        samples_dir = os.path.join(BASE_DIR, "uploads", "samples")
        generate_all_samples(samples_dir)

        # 2. Initialize Database with sample data
        init_db(force_reseed=True)

        # 3. Create Flask test client
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def test_01_database_seeding(self):
        """Verify that SQLite database is initialized and contains sample detections."""
        stats = get_system_statistics()
        self.assertGreaterEqual(stats["total_detections"], 10, "Should have at least 10 sample detections")
        self.assertGreater(stats["high_severity"], 0, "Should have high severity detections")
        self.assertGreater(stats["medium_severity"], 0, "Should have medium severity detections")
        self.assertGreater(stats["low_severity"], 0, "Should have low severity detections")

    def test_02_ai_severity_calculation(self):
        """Verify severity and priority scoring formulas."""
        pothole_sev = calculate_severity("Pothole", 0.12, 0.92)
        self.assertEqual(pothole_sev, "HIGH")

        crack_sev = calculate_severity("Road Surface Damage", 0.02, 0.80)
        self.assertEqual(crack_sev, "LOW")

        p_data = calculate_priority_score("HIGH", 0.95, 0.15, 0.8)
        self.assertGreaterEqual(p_data["score"], 70, "High severity should produce High Priority score")
        self.assertEqual(p_data["priority_level"], "High Priority")

    def test_03_ai_detector(self):
        """Verify that the AI detector processes an image and generates bounding boxes."""
        detector = RoadDamageDetector()
        sample_path = os.path.join(BASE_DIR, "uploads", "samples", "sample_pothole.jpg")
        proc_dir = os.path.join(BASE_DIR, "uploads", "processed")

        res = detector.detect(sample_path, output_dir=proc_dir)
        self.assertTrue(res["is_demo"])
        self.assertIn(res["damage_type"], ["Pothole", "Alligator Crack", "Transverse Crack", "Longitudinal Crack", "Road Surface Damage"])
        self.assertIn(res["severity"], ["LOW", "MEDIUM", "HIGH"])
        self.assertGreater(res["priority_score"], 0)
        self.assertTrue(os.path.exists(res["processed_image_path"]), "Annotated image must be saved")

    def test_04_api_health_and_statistics(self):
        """Test /api/health and /api/statistics endpoints."""
        res_health = self.client.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json["status"], "healthy")

        res_stats = self.client.get("/api/statistics")
        self.assertEqual(res_stats.status_code, 200)
        data = res_stats.json["data"]
        self.assertIn("total_detections", data)
        self.assertIn("severity_distribution", data)

    def test_05_api_locations_for_map(self):
        """Test /api/locations endpoint for Leaflet map markers."""
        res = self.client.get("/api/locations")
        self.assertEqual(res.status_code, 200)
        markers = res.json["data"]
        self.assertGreater(len(markers), 0)
        first = markers[0]
        self.assertIn("latitude", first)
        self.assertIn("longitude", first)
        self.assertIn("severity", first)
        self.assertIn("priority_score", first)

    def test_06_api_detections_crud(self):
        """Test detections CRUD listing, single fetch, and filtering."""
        res = self.client.get("/api/detections?limit=5")
        self.assertEqual(res.status_code, 200)
        items = res.json["data"]
        self.assertGreater(len(items), 0)
        target_id = items[0]["id"]

        # Filter by severity
        target_sev = items[0]["severity"]
        res_filtered = self.client.get(f"/api/detections?severity={target_sev}&limit=5")
        self.assertEqual(res_filtered.status_code, 200)
        for it in res_filtered.json["data"]:
            self.assertEqual(it["severity"], target_sev)

        # Single detection
        res_single = self.client.get(f"/api/detections/{target_id}")
        self.assertEqual(res_single.status_code, 200)
        det = res_single.json["data"]
        self.assertEqual(det["id"], target_id)
        self.assertIn("maintenance_logs", det)

    def test_07_api_detect_endpoint(self):
        """Test POST /api/detect using sample_filename."""
        payload = {
            "sample_filename": "sample_pothole.jpg",
            "latitude": 37.7850,
            "longitude": -122.4050,
            "location_name": "Automated Unit Test Arterial",
            "traffic_importance": 0.85,
            "save_to_db": "true"
        }
        res = self.client.post("/api/detect", data=payload)
        self.assertEqual(res.status_code, 200)
        body = res.json["data"]
        self.assertIn("damage_type", body)
        self.assertIn("priority_score", body)
        self.assertIsNotNone(body["saved_detection_id"])

        # Verify record exists in DB
        saved = get_detection_by_id(body["saved_detection_id"])
        self.assertIsNotNone(saved)
        self.assertEqual(saved["location_name"], "Automated Unit Test Arterial")

    def test_08_api_maintenance_workflow(self):
        """Test updating maintenance status to In Progress."""
        list_res = self.client.get("/api/detections?limit=1")
        target_id = list_res.json["data"][0]["id"]

        payload = {
            "status": "In Progress",
            "crew": "Rapid Patch Unit Alpha",
            "notes": "Unit test verified crew dispatch"
        }
        res = self.client.put(f"/api/maintenance/{target_id}", json=payload)
        self.assertEqual(res.status_code, 200)
        updated = res.json["data"]
        self.assertEqual(updated["maintenance_status"], "In Progress")
        self.assertEqual(updated["assigned_crew"], "Rapid Patch Unit Alpha")

        # Verify audit log recorded
        logs = updated["maintenance_logs"]
        self.assertGreater(len(logs), 0)
        self.assertEqual(logs[0]["new_status"], "In Progress")

    def test_09_frontend_pages_serving(self):
        """Verify that all frontend pages respond with HTTP 200."""
        routes = ["/", "/dashboard", "/detect", "/map", "/history", "/details", "/maintenance", "/analytics", "/about"]
        for r in routes:
            res = self.client.get(r)
            self.assertEqual(res.status_code, 200, f"Route {r} must respond with 200 OK")
            self.assertIn(b"ROADGUARD", res.data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
