"""
RoadGuard AI - Application Runner
"Detect. Locate. Prioritize. Repair."

Starts the full-stack server on http://localhost:5000
"""

import os
import sys

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app import create_app
from ai.generate_samples import generate_all_samples

def check_and_prepare_environment():
    """Ensures uploads and sample images exist before server starts."""
    samples_dir = os.path.join(BASE_DIR, "uploads", "samples")
    if not os.path.exists(samples_dir) or len(os.listdir(samples_dir)) < 4:
        print("[RoadGuard AI] Generating initial sample road damage images...")
        generate_all_samples(samples_dir)

def print_banner(port=5000):
    banner = f"""
===================================================================
                  ROADGUARD AI PLATFORM ACTIVE
          "Detect. Locate. Prioritize. Repair."
===================================================================
* Server URL:         http://localhost:{port}
* Landing Page:       http://localhost:{port}/
* Live Dashboard:     http://localhost:{port}/dashboard
* AI Detection Studio:http://localhost:{port}/detect
* Road Damage Map:    http://localhost:{port}/map
* History & Logs:     http://localhost:{port}/history
* Maintenance Board:  http://localhost:{port}/maintenance
* Municipal Analytics:http://localhost:{port}/analytics
* College Info Page:  http://localhost:{port}/about
* REST API Health:    http://localhost:{port}/api/health
===================================================================
"""
    print(banner)

if __name__ == "__main__":
    check_and_prepare_environment()
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print_banner(port)
    app.run(host="0.0.0.0", port=port, debug=False)
