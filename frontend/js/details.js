/**
 * RoadGuard AI - Detection Details & Maintenance Editor Controller
 */

let detectionId = 1;
let currentDetection = null;
let miniMap = null;
let miniMarker = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  detectionId = parseInt(urlParams.get('id'), 10) || 1;
  loadDetectionDetails(detectionId);
  setupSaveButton();
});

async function loadDetectionDetails(id) {
  try {
    let data;
    try {
      data = await API.getDetection(id);
    } catch (e) {
      // Fallback: fetch latest record if specific ID not found
      const listRes = await API.getDetections({ limit: 1 });
      if (listRes.data && listRes.data.length > 0) {
        data = await API.getDetection(listRes.data[0].id);
        detectionId = listRes.data[0].id;
      } else {
        throw e;
      }
    }
    currentDetection = data;
    renderDetails(data);
    initOrUpdateMiniMap(data.latitude, data.longitude, data.damage_type, data.severity);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to load detection record', 'error', 'Error');
  }
}

function renderDetails(det) {
  document.getElementById('header-id').textContent = `Record #${det.id} • Registered ${formatDate(det.timestamp)}`;
  document.getElementById('header-status-badge').innerHTML = getStatusBadge(det.maintenance_status);

  document.getElementById('detail-damage-type').textContent = det.damage_type;
  document.getElementById('detail-severity-badge').innerHTML = getSeverityBadge(det.severity);
  document.getElementById('detail-location-name').querySelector('span').textContent = det.location_name;

  document.getElementById('detail-priority-score').textContent = `${det.priority_score} / 100`;
  document.getElementById('detail-confidence').textContent = `${Math.round((det.confidence || 0.85) * 100)}%`;

  // Images
  const origImg = det.image_path ? `/${det.image_path}` : '/uploads/samples/sample_pothole.jpg';
  const procImg = det.processed_image_path ? `/${det.processed_image_path}` : origImg;

  document.getElementById('detail-orig-img').src = origImg;
  document.getElementById('detail-proc-img').src = procImg;

  // Bounding Boxes
  const bboxContainer = document.getElementById('bbox-container');
  if (det.bounding_boxes && Array.isArray(det.bounding_boxes) && det.bounding_boxes.length > 0) {
    bboxContainer.innerHTML = det.bounding_boxes.map((b, idx) => {
      const coords = b.box ? b.box.join(', ') : 'N/A';
      return `
        <div class="p-2.5 rounded-lg bg-gray-900 border border-gray-800 flex justify-between items-center">
          <div>
            <span class="text-sky-400 font-bold">Box #${idx + 1}:</span>
            <span class="text-gray-300 ml-1.5">[${coords}]</span>
          </div>
          <div class="text-[10px] text-gray-400">
            Area: ${(b.area_ratio ? (b.area_ratio * 100).toFixed(1) : '8.5')}% road
          </div>
        </div>
      `;
    }).join('');
  } else {
    bboxContainer.innerHTML = `
      <div class="p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">
        Default localized defect contour: [200, 240, 600, 480]
      </div>
    `;
  }

  // Coordinates text
  document.getElementById('detail-coords-text').textContent = `Latitude: ${det.latitude.toFixed(4)}, Longitude: ${det.longitude.toFixed(4)}`;

  // Form Inputs
  document.getElementById('input-status').value = det.maintenance_status || 'Pending';
  document.getElementById('input-crew').value = det.assigned_crew || '';
  document.getElementById('input-sched-date').value = det.scheduled_date || '';
  document.getElementById('input-notes').value = det.maintenance_notes || '';

  // Audit Logs
  renderAuditLogs(det.maintenance_logs || []);
}

function renderAuditLogs(logs) {
  const container = document.getElementById('audit-log-container');
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-xs py-2">No maintenance logs recorded yet.</div>';
    return;
  }

  container.innerHTML = logs.map(l => `
    <div class="pl-3 border-l-2 border-sky-500/50 space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-bold text-white">${l.new_status}</span>
        <span class="text-[10px] font-mono text-gray-400">${formatDate(l.timestamp)}</span>
      </div>
      ${l.assigned_crew ? `<div class="text-[11px] text-indigo-300"><i class="fas fa-user-gear mr-1"></i> ${l.assigned_crew}</div>` : ''}
      <div class="text-gray-300 text-[11px] leading-snug">${l.notes || 'Status updated'}</div>
    </div>
  `).join('');
}

function initOrUpdateMiniMap(lat, lng, damageType, severity) {
  if (!document.getElementById('mini-map')) return;

  if (!miniMap) {
    miniMap = L.map('mini-map', { zoomControl: false }).setView([lat, lng], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(miniMap);
  } else {
    miniMap.setView([lat, lng], 14);
  }

  if (miniMarker) {
    miniMap.removeLayer(miniMarker);
  }

  const pinColor = severity === 'HIGH' ? '#ef4444' : (severity === 'MEDIUM' ? '#f59e0b' : '#10b981');
  const customIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${pinColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  miniMarker = L.marker([lat, lng], { icon: customIcon }).addTo(miniMap);
}

function setupSaveButton() {
  const saveBtn = document.getElementById('btn-save-maintenance');
  saveBtn.addEventListener('click', async () => {
    const payload = {
      status: document.getElementById('input-status').value,
      crew: document.getElementById('input-crew').value || null,
      scheduled_date: document.getElementById('input-sched-date').value || null,
      notes: document.getElementById('input-notes').value
    };

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

    try {
      const updated = await API.updateMaintenance(detectionId, payload);
      currentDetection = updated;
      renderDetails(updated);
      showToast('Maintenance record and audit log updated successfully!', 'success', 'Work Order Saved');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update maintenance', 'error', 'Update Failed');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fas fa-floppy-disk"></i> Update Maintenance Record`;
    }
  });
}
