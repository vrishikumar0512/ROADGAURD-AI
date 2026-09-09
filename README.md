# ROADGUARD AI
> **"Detect. Locate. Prioritize. Repair."**

An AI-powered road damage detection, severity classification, geospatial tracking, and municipal maintenance prioritization platform.

Developed as a full-stack, college-level working prototype designed for municipal civil engineering departments and smart city infrastructure management.

---

## 1. Project Overview

RoadGuard AI is an intelligent civil infrastructure platform that automates the lifecycle of road defect detection and remediation. By combining computer vision, automated severity analysis, prototype priority scoring, Leaflet GIS mapping, and municipal workflow dispatching, RoadGuard AI bridges the gap between raw camera telemetry and dispatched repair crews.

### The Problem
Traditional municipal road inspections are:
* **Time-consuming and manual:** Inspectors drive or walk roadways with paper logs.
* **Hazardous:** Surveyors work alongside fast-moving traffic.
* **Purely Reactive:** Potholes and alligator cracks are often addressed only after causing vehicle damage, blown tires, or accidents.
* **Subjective:** Severity assessment varies wildly between human inspectors.

### The Proposed Solution
RoadGuard AI enables:
1. **Automated Defect Localization:** Computer vision identifies potholes, longitudinal cracks, transverse cracks, and alligator fatigue.
2. **Standardized Severity Classification:** Defect dimensions, surface area ratios, and structural risk determine whether damage is **LOW**, **MEDIUM**, or **HIGH**.
3. **Algorithmic Priority Scoring (0–100):** Combines severity, confidence, defect size, and roadway traffic density to rank municipal repair urgency.
4. **Geospatial GIS Tracking:** Defect coordinates are mapped onto interactive Leaflet maps with custom severity pins and status tracking.
5. **Municipal Maintenance Workflow:** Work orders advance through a 5-step lifecycle (*Detected → Pending → Assigned → In Progress → Repaired*).

---

## 2. End-to-End System Architecture

```
[ PHYSICAL ROADWAY ]
        │
        ▼
   [ CAMERA ] (Dashcam, Smartphone, Drone, or Vehicle Camera)
        │
        ▼
 [ AI DETECTION ] (YOLO Object Detection / Demo Computer Vision Heuristics)
        │
        ▼
[ SENSOR FUSION ] (Roadway Importance, Camera Metadata, Vibration Context)
        │
        ▼
[ SEVERITY ANALYSIS ] (Defect Ratio & 0–100 Priority Scoring Formulation)
        │
        ▼
 [ GPS LOCATION ] (Browser Geolocation / Manual Lat-Lng Geotagging)
        │
        ▼
   [ DATABASE ] (Centralized SQLite Database & Audit Logs)
        │
        ▼
[ MAINTENANCE DASHBOARD ] (Interactive Map, KPI Cards, Kanban Dispatch Board)
        │
        ▼
  [ REPAIR TEAM ] (Rapid Patch Units Dispatched to High-Priority Corridors)
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Modern, responsive control room web interface |
| **CSS Framework** | Tailwind CSS (CDN) + Custom Theme | Municipal dark-mode command center styling |
| **Geospatial GIS** | Leaflet.js + CartoDB Dark Matter | Interactive map with colored pins, filters, popups |
| **Data Analytics** | Chart.js | Visualizations for types, severity, timeline, and repair ratio |
| **Icons** | FontAwesome 6 | Tech and infrastructure iconography |
| **Backend API** | Python Flask, Flask-CORS | Modular REST API blueprints and static asset delivery |
| **Computer Vision / AI** | OpenCV (`cv2`), NumPy, Pillow | Edge/contour analysis, bounding box rendering, YOLO loader |
| **Database** | SQLite 3 | Embedded relational storage for detections, classes, and logs |

---

## 4. Supported Road Damage Classes

1. **Pothole (HIGH Severity):** Deep cavities caused by freeze-thaw cycles and heavy axle wear. Repaired via cold-mix or hot-mix asphalt patching.
2. **Alligator Crack (HIGH Severity):** Interconnected polygonal crocodile skin cracking indicating sub-base structural failure. Requires full-depth milling.
3. **Transverse Crack (MEDIUM Severity):** Thermal contraction cracks extending perpendicular to travel. Sealed with rubberized hot-pour sealant.
4. **Longitudinal Crack (MEDIUM Severity):** Cracks running parallel to lane markings along pavement joints. Treated with crack sealant tape.
5. **Road Surface Damage (LOW Severity):** Raveling, binder loss, or minor surface roughness. Addressed via microsurfacing or chip seals.

---

## 5. Prototype Priority Scoring Formula

The platform computes an objective **Priority Score (0–100)** for every detected defect:

$$\text{Priority Score} = (\text{Severity Weight} \times 0.40) + (\text{Confidence Weight} \times 0.20) + (\text{Damage Size Weight} \times 0.25) + (\text{Traffic Importance} \times 0.15)$$

* **Severity Weights:** `LOW = 25`, `MEDIUM = 65`, `HIGH = 95`
* **Confidence Weight:** $\text{Confidence} \times 100$
* **Damage Size Weight:** $\min\left(\frac{\text{Defect Box Area}}{\text{Image Area} \times 0.20}, 1.0\right) \times 100$
* **Traffic Factor:** Scale of $0.1$ (Rural Lane) to $1.0$ (High-Speed Highway) $\times 100$

### Priority Score Buckets:
* **0 – 30:** Low Priority (Scheduled into routine seasonal resurfacing)
* **31 – 70:** Medium Priority (Assigned to district sealant crews)
* **71 – 100:** High Priority (Immediate dispatch for pothole patch crews)

---

## 6. Installation and Setup

### Prerequisites
* Python 3.10+ installed on your machine.
* Modern web browser (Chrome, Edge, Firefox, Safari).

### Step 1: Clone or Navigate to Project Directory
```bash
cd C:\Users\user\.gemini\antigravity\scratch\RoadGuardAI
```

### Step 2: Install Python Dependencies
```bash
pip install -r requirements.txt
```
*(Dependencies: `flask`, `flask-cors`, `pillow`, `numpy`, `opencv-python-headless`, `werkzeug`)*

### Step 3: Launch Application
```bash
python run.py
```
The server will automatically:
1. Verify directories (`database/`, `uploads/original/`, `uploads/processed/`, `uploads/samples/`).
2. Synthesize 4 realistic sample road defect images (`uploads/samples/`).
3. Initialize the SQLite database (`database/roadguard.db`) and seed 12 realistic city defect records.
4. Start the Flask application on **`http://localhost:5000`**.

---

## 7. Web Application Pages

Open **`http://localhost:5000`** in your browser to access:

* **Landing Page (`/`):** Hero section, 9-step workflow diagram, key features, technology overview, and college presentation summary.
* **Operations Dashboard (`/dashboard`):** Real-time statistics cards (Total Detections, High, Medium, Low, Requires Attention, Repaired), mini severity donut chart, defect breakdown, and recent detections table.
* **AI Detection Studio (`/detect`):** Upload custom road images/videos or 1-click test built-in sample images. Capture browser GPS coordinates or enter manually. View original vs processed images side-by-side with bounding boxes and priority gauges.
* **Road Damage Map (`/map`):** Interactive Leaflet.js map with custom colored severity pins (Red pulsing, Amber, Green), popup previews, and dynamic filtering by severity, damage class, priority score, and maintenance status.
* **Detection History (`/history`):** Searchable, filterable, sortable, and paginated data table with CSV and JSON export options.
* **Defect Details (`/details?id=1`):** Complete inspection view with bounding box coordinates, mini-map, and interactive maintenance work order editor.
* **Maintenance Board (`/maintenance`):** Urgent High-Priority dispatch queue (Priority > 70) and Kanban workflow columns (*Pending → Assigned → In Progress → Repaired*).
* **Municipal Analytics (`/analytics`):** Chart.js data visualizations for damage type distribution, severity breakdown, detection timeline, and hotspot corridors.
* **Project Information (`/about`):** Academic evaluation documentation, problem statement, solution, innovation, and future hardware roadmap.

---

## 8. REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and version metadata |
| `GET` | `/api/statistics` | Aggregate KPI counts and chart dataset distributions |
| `GET` | `/api/locations` | Lightweight coordinate list for Leaflet map markers |
| `GET` | `/api/detections` | Query, filter, sort, and paginate detections |
| `GET` | `/api/detections/:id` | Fetch complete detection details with maintenance history |
| `POST` | `/api/detections` | Manually insert a detection record into database |
| `PUT` | `/api/detections/:id` | Update detection coordinates or metadata |
| `DELETE` | `/api/detections/:id` | Remove detection record and cascade delete logs |
| `POST` | `/api/detect` | Upload image/video, run AI detection, draw bounding boxes, compute severity & priority |
| `GET` | `/api/sample-images` | List built-in sample road damage images for 1-click testing |
| `PUT` | `/api/maintenance/:id` | Update maintenance status, assigned crew, date, and audit notes |
| `GET` | `/api/maintenance/crews` | List municipal repair crews and specializations |

---

## 9. Demo AI Mode vs Custom YOLO Model Integration

### Transparent Demo AI Mode
To ensure the project is immediately demonstrable during a college presentation without requiring gigabytes of deep learning weights, RoadGuard AI features a dedicated **Demo AI Mode**:
* Uses OpenCV Canny edge detection, adaptive thresholding, and contour aspect ratio analysis.
* Draws precise, color-coded bounding boxes and banners onto the output image.
* Calculates simulated confidence and severity scores.
* **Transparency Commitment:** All demo outputs are explicitly badged with **`DEMO RESULT`** and watermarked with: *"Demo AI Mode – Connect a trained YOLO road-damage model for real inference."*

### How to Connect a Trained YOLO Model
The codebase is architected for drop-in YOLO integration (`ai/detector.py`):
1. Train a model on the RDD2022 (Road Damage Dataset) or Roboflow Road Damage dataset.
2. Export your trained weights to:
   ```
   ai/models/road_damage.pt
   ```
3. Install the Ultralytics package:
   ```bash
   pip install ultralytics torch
   ```
4. Restart `run.py`. The detector will automatically detect the `.pt` file, load the YOLO model, and toggle the UI from Demo Mode to **`PRODUCTION YOLO INFERENCE`**!

---

## 10. College Presentation & Viva Talking Points

* **Q: How does the system handle real-time GPS if the camera device lacks physical GPS hardware?**
  * *Answer:* RoadGuard AI incorporates a hybrid location module. It offers browser HTML5 Geolocation API for live positioning, supports manual coordinate entry for field surveyors, and provides preloaded demo coordinates for indoor academic demonstrations.
* **Q: Why is priority scoring better than standard detection alone?**
  * *Answer:* Standard computer vision simply reports "pothole detected". In municipal operations, road authorities cannot repair 500 potholes simultaneously. The priority scoring formula weights defect severity with traffic importance so highway craters are dispatched before quiet alleyway cracks.
* **Q: How are database integrity and file uploads secured?**
  * *Answer:* Uploads are validated with Pillow binary header verification, restricted to safe image formats (`.jpg`, `.jpeg`, `.png`, `.webp`), capped at 25MB, and filenames are sanitized via `werkzeug.utils.secure_filename`. SQLite enforces foreign key constraints and audit logging.

---

## 11. Future Hardware & Edge Enhancements

1. **Raspberry Pi On-Vehicle Edge Compute:** Deploying lightweight YOLO models on Raspberry Pi 5 or NVIDIA Jetson mounted inside municipal garbage trucks and city transit buses.
2. **ESP32 + IMU Vibration Fusion:** Integrating 3-axis accelerometer/gyroscope sensors under vehicle axles to detect vertical shockwaves, cross-validating pothole depth with visual bounding boxes.
3. **Hardware RTK GPS Integration:** Interfacing NEO-M8N / RTK GPS modules via serial UART for sub-meter lane accuracy.
4. **Decentralized Crowdsourcing App:** Allowing regular motorists to dock their smartphones on the dashboard, running background road inspection while driving.
5. **Weather API Synchronization:** Ingesting meteorological freeze-thaw and precipitation warnings to predict accelerated road collapse before heavy rainstorms.

---

## 12. License & Academic Attribution
Developed for academic prototype demonstration and research into autonomous municipal infrastructure management.
Project Name: **ROADGUARD AI**
Tagline: **"Detect. Locate. Prioritize. Repair."**
