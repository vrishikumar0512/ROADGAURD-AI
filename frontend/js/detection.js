/**
 * RoadGuard AI - AI Detection Studio Controller
 */

let selectedFile = null;
let selectedSampleFilename = null;

document.addEventListener('DOMContentLoaded', () => {
  setupFileUpload();
  setupSampleButtons();
  setupLocationControls();
  setupInferenceTrigger();
});

function setupFileUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const placeholder = document.getElementById('drop-placeholder');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeBtn = document.getElementById('remove-file-btn');

  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-sky-500', 'bg-sky-950/20');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-sky-500', 'bg-sky-950/20');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });

  function handleFileSelected(file) {
    selectedFile = file;
    selectedSampleFilename = null;

    // Reset sample button highlights
    document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('ring-2', 'ring-sky-500', 'border-sky-500'));

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      placeholder.classList.add('hidden');
      previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    showToast(`Loaded ${file.name}`, 'info', 'File Ready');
  }

  function clearSelectedFile() {
    selectedFile = null;
    selectedSampleFilename = null;
    fileInput.value = '';
    imagePreview.src = '#';
    previewContainer.classList.add('hidden');
    placeholder.classList.remove('hidden');
    document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('ring-2', 'ring-sky-500', 'border-sky-500'));
  }
}

function setupSampleButtons() {
  const buttons = document.querySelectorAll('.sample-btn');
  const placeholder = document.getElementById('drop-placeholder');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');

  const sampleCorridors = {
    'sample_pothole.jpg': { name: 'Avinashi Road Arterial (Peelamedu), Coimbatore', lat: 11.0285, lng: 76.9625 },
    'sample_alligator_crack.jpg': { name: 'Grand Southern Trunk (GST) Road, Chennai', lat: 12.9644, lng: 80.1472 },
    'sample_longitudinal_crack.jpg': { name: 'Salem - Bengaluru NH44 Bypass, Salem', lat: 11.6450, lng: 78.1620 },
    'sample_transverse_crack.jpg': { name: 'Thillai Nagar Main Road, Tiruchirappalli', lat: 10.8285, lng: 78.6892 }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filename = btn.getAttribute('data-sample');
      selectedSampleFilename = filename;
      selectedFile = null;
      document.getElementById('file-input').value = '';

      buttons.forEach(b => b.classList.remove('ring-2', 'ring-sky-500', 'border-sky-500'));
      btn.classList.add('ring-2', 'ring-sky-500', 'border-sky-500');

      // Show preview
      imagePreview.src = `/uploads/samples/${filename}`;
      placeholder.classList.add('hidden');
      previewContainer.classList.remove('hidden');

      // Autofill realistic sample location
      const info = sampleCorridors[filename];
      if (info) {
        document.getElementById('input-location-name').value = info.name;
        document.getElementById('input-lat').value = info.lat;
        document.getElementById('input-lng').value = info.lng;
      }

      showToast(`Selected sample: ${filename}`, 'info', 'Sample Activated');
    });
  });
}

function setupLocationControls() {
  const gpsBtn = document.getElementById('btn-get-location');
  const latInput = document.getElementById('input-lat');
  const lngInput = document.getElementById('input-lng');
  const trafficInput = document.getElementById('input-traffic');
  const trafficLabel = document.getElementById('traffic-label');

  if (trafficInput && trafficLabel) {
    trafficInput.addEventListener('input', () => {
      const val = parseFloat(trafficInput.value);
      let desc = 'Collector';
      if (val >= 0.8) desc = 'High-Speed Highway';
      else if (val >= 0.6) desc = 'Major Arterial';
      else if (val <= 0.3) desc = 'Local Residential';
      trafficLabel.textContent = `${val.toFixed(2)} (${desc})`;
    });
  }

  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Browser Geolocation is not supported. Using demo coordinates.', 'warning', 'GPS Offline');
        return;
      }

      gpsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Locating...`;
      gpsBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latInput.value = pos.coords.latitude.toFixed(4);
          lngInput.value = pos.coords.longitude.toFixed(4);
          document.getElementById('input-location-name').value = 'Field Inspection (Live GPS Geotag)';
          gpsBtn.innerHTML = `<i class="fas fa-check text-emerald-400"></i> GPS Locked`;
          gpsBtn.disabled = false;
          showToast(`Captured coordinates: ${latInput.value}, ${lngInput.value}`, 'success', 'GPS Updated');
        },
        (err) => {
          console.warn('Geolocation denied or failed, using demo coords:', err.message);
          // Set realistic demo coordinates in Tamil Nadu (Coimbatore / Trichy corridor)
          latInput.value = (11.0168 + (Math.random() - 0.5) * 0.05).toFixed(4);
          lngInput.value = (76.9558 + (Math.random() - 0.5) * 0.05).toFixed(4);
          document.getElementById('input-location-name').value = 'Avinashi Road Corridor, Coimbatore (Demo)';
          gpsBtn.innerHTML = `<i class="fas fa-crosshairs"></i> Use Browser GPS`;
          gpsBtn.disabled = false;
          showToast('GPS permission unavailable. Tamil Nadu demo coordinates assigned.', 'info', 'Demo Location Used');
        },
        { timeout: 8000 }
      );
    });
  }
}

function setupInferenceTrigger() {
  const detectBtn = document.getElementById('btn-detect');
  const resultsCard = document.getElementById('results-card');

  detectBtn.addEventListener('click', async () => {
    if (!selectedFile && !selectedSampleFilename) {
      showToast('Please upload an image/video or select one of the 4 preloaded samples above!', 'warning', 'Input Required');
      return;
    }

    const formData = new FormData();
    if (selectedFile) {
      formData.append('image', selectedFile);
    } else {
      formData.append('sample_filename', selectedSampleFilename);
    }

    formData.append('latitude', document.getElementById('input-lat').value);
    formData.append('longitude', document.getElementById('input-lng').value);
    formData.append('location_name', document.getElementById('input-location-name').value);
    formData.append('traffic_importance', document.getElementById('input-traffic').value);
    formData.append('save_to_db', 'true');

    // UI Loading State
    const originalBtnHtml = detectBtn.innerHTML;
    detectBtn.disabled = true;
    detectBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin text-lg"></i> Running AI Defect Localization...`;

    try {
      const data = await API.runDetection(formData);
      renderDetectionResults(data);
      showToast(`Detected ${data.damage_type} with ${data.severity} severity (Priority: ${data.priority_score})`, 'success', 'Detection Logged');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'AI inference failed', 'error', 'Inference Error');
    } finally {
      detectBtn.disabled = false;
      detectBtn.innerHTML = originalBtnHtml;
    }
  });
}

function renderDetectionResults(res) {
  const card = document.getElementById('results-card');
  card.classList.remove('hidden');

  // Images
  document.getElementById('res-orig-img').src = res.original_image_url;
  document.getElementById('res-proc-img').src = res.processed_image_url;

  // Text metrics
  document.getElementById('res-damage-type').textContent = res.damage_type;
  document.getElementById('res-confidence').textContent = `${Math.round(res.confidence * 100)}%`;
  document.getElementById('res-severity-badge').innerHTML = getSeverityBadge(res.severity);
  document.getElementById('res-priority-score').textContent = res.priority_score;
  document.getElementById('res-priority-level').textContent = `• ${res.priority_level}`;

  // Priority bar
  const pBar = document.getElementById('res-priority-bar');
  pBar.style.width = `${Math.min(res.priority_score, 100)}%`;
  pBar.className = `h-2 rounded-full ${res.priority_score > 70 ? 'bg-rose-500' : (res.priority_score > 30 ? 'bg-amber-500' : 'bg-emerald-500')}`;

  // Location & Timestamp
  document.getElementById('res-location-name').textContent = res.location_name;
  document.getElementById('res-coords').textContent = `Lat: ${res.latitude.toFixed(4)}, Lng: ${res.longitude.toFixed(4)}`;
  document.getElementById('res-timestamp').textContent = `Logged: ${res.timestamp}`;

  // Notice
  if (res.mode_notice) {
    document.getElementById('res-mode-notice').textContent = res.mode_notice;
  }

  // Link to details
  if (res.saved_detection_id) {
    document.getElementById('res-view-details-link').href = `/details?id=${res.saved_detection_id}`;
  }

  // Smooth scroll down to results
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
