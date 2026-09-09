"""
RoadGuard AI - Main Flask Application Factory
"""

import os
from flask import Flask, send_from_directory, jsonify, send_file
from flask_cors import CORS

from backend.database import init_db
from backend.routes import detections_bp, detect_bp, maintenance_bp, statistics_bp


def create_app(test_config=None):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    frontend_dir = os.path.join(base_dir, "frontend")
    uploads_dir = os.path.join(base_dir, "uploads")

    app = Flask(
        __name__,
        static_folder=frontend_dir,
        static_url_path=""
    )

    # Enable CORS for all routes
    CORS(app)

    # Register API Blueprints
    app.register_blueprint(detections_bp)
    app.register_blueprint(detect_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(statistics_bp)

    # Initialize SQLite database with sample data on startup
    with app.app_context():
        init_db()

    # Serve uploads (original images, annotated images, samples)
    @app.route("/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory(uploads_dir, filename)

    # API Health Endpoint
    @app.route("/api/health")
    def health_check():
        return jsonify({
            "status": "healthy",
            "system": "RoadGuard AI",
            "tagline": "Detect. Locate. Prioritize. Repair.",
            "version": "1.0.0-prototype"
        })

    # Serve Frontend Pages
    @app.route("/")
    def index_page():
        return send_file(os.path.join(frontend_dir, "index.html"))

    @app.route("/dashboard")
    def dashboard_page():
        return send_file(os.path.join(frontend_dir, "dashboard.html"))

    @app.route("/detection")
    @app.route("/detect")
    def detection_page():
        return send_file(os.path.join(frontend_dir, "detection.html"))

    @app.route("/map")
    def map_page():
        return send_file(os.path.join(frontend_dir, "map.html"))

    @app.route("/history")
    def history_page():
        return send_file(os.path.join(frontend_dir, "history.html"))

    @app.route("/details")
    def details_page():
        return send_file(os.path.join(frontend_dir, "details.html"))

    @app.route("/maintenance")
    def maintenance_page():
        return send_file(os.path.join(frontend_dir, "maintenance.html"))

    @app.route("/analytics")
    def analytics_page():
        return send_file(os.path.join(frontend_dir, "analytics.html"))

    @app.route("/about")
    def about_page():
        return send_file(os.path.join(frontend_dir, "about.html"))

    # Error Handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({"status": "error", "message": "Resource not found", "code": 404}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"status": "error", "message": "Internal server error", "code": 500}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
