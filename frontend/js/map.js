/**
 * RoadGuard AI - Interactive Leaflet GIS Map Controller
 * Regional Focus: Tamil Nadu & India
 */

let map = null;
let allMarkersData = [];
let markerLayerGroup = null;

// Geographic constants
const TAMIL_NADU_CENTER = [11.1271, 78.6569];
const TAMIL_NADU_DEFAULT_ZOOM = 7.2;
const TAMIL_NADU_BOUNDS = L.latLngBounds([[8.05, 76.15], [13.55, 80.35]]);

const INDIA_CENTER = [21.7679, 78.8718];
const INDIA_DEFAULT_ZOOM = 5;
const INDIA_MAX_BOUNDS = L.latLngBounds([[5.0, 66.0], [37.5, 98.5]]);

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupFilterEvents();
  setupViewButtons();
  loadMapLocations();
});

function initMap() {
  // Initialize map centered strictly on Tamil Nadu, India
  map = L.map('damage-map', {
    center: TAMIL_NADU_CENTER,
    zoom: TAMIL_NADU_DEFAULT_ZOOM,
    minZoom: 5,                       // Prevents zooming out to the whole world
    maxZoom: 18,
    maxBounds: INDIA_MAX_BOUNDS,      // Restricts panning far outside India
    maxBoundsViscosity: 1.0,          // Hard boundary lock
    worldCopyJump: false,
    zoomControl: false
  });

  // Zoom control in bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Standard OpenStreetMap tiles with noWrap=true to fix the world repeating issue
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    noWrap: true                      // CRITICAL: prevents map repeating horizontally
  }).addTo(map);

  markerLayerGroup = L.layerGroup().addTo(map);

  // Fit Tamil Nadu bounds on initial launch
  map.fitBounds(TAMIL_NADU_BOUNDS, { padding: [20, 20] });

  // Invalidate size to guarantee clean tile rendering
  setTimeout(() => {
    map.invalidateSize();
  }, 250);
}

function setupViewButtons() {
  const tnBtn = document.getElementById('btn-view-tn');
  const indiaBtn = document.getElementById('btn-view-india');

  if (tnBtn) {
    tnBtn.addEventListener('click', () => {
      map.fitBounds(TAMIL_NADU_BOUNDS, { padding: [20, 20], animate: true });
      showToast('Centered on Tamil Nadu state view', 'info', 'Tamil Nadu View');
    });
  }

  if (indiaBtn) {
    indiaBtn.addEventListener('click', () => {
      map.setView(INDIA_CENTER, INDIA_DEFAULT_ZOOM, { animate: true });
      showToast('Zoomed out to National India overview', 'info', 'India View');
    });
  }
}

async function loadMapLocations() {
  try {
    const data = await API.getLocations();
    allMarkersData = data || [];
    renderMarkers(allMarkersData);
  } catch (err) {
    console.error(err);
    showToast('Failed to load GIS marker telemetry from database', 'error', 'Map Error');
  }
}

function renderMarkers(items) {
  markerLayerGroup.clearLayers();

  const countBadge = document.getElementById('markers-count-badge');
  if (countBadge) {
    countBadge.textContent = `${items.length} Defects in TN`;
  }

  items.forEach(item => {
    const sev = (item.severity || 'LOW').toUpperCase();
    const pinClass = sev === 'HIGH' ? 'pin-high map-pin-high' : (sev === 'MEDIUM' ? 'pin-medium' : 'pin-low');
    const iconLetter = item.damage_type ? item.damage_type.charAt(0) : '!';

    const customIcon = L.divIcon({
      className: 'leaflet-custom-div-icon',
      html: `
        <div class="custom-leaflet-pin ${pinClass} w-8 h-8">
          <span>${iconLetter}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });

    const imgUrl = item.processed_image_path ? `/${item.processed_image_path}` : (item.image_path ? `/${item.image_path}` : '/uploads/samples/sample_pothole.jpg');

    const popupHtml = `
      <div class="p-1 space-y-2.5 max-w-[270px] text-xs font-sans">
        <div class="relative h-28 rounded-lg overflow-hidden border border-gray-700 bg-black">
          <img src="${imgUrl}" alt="${item.damage_type}" class="w-full h-full object-cover" onerror="this.src='/uploads/samples/sample_pothole.jpg'">
          <div class="absolute top-1.5 right-1.5">
            ${getSeverityBadge(item.severity)}
          </div>
        </div>

        <div>
          <div class="text-sm font-bold text-white leading-tight">${item.damage_type}</div>
          <div class="text-[11px] text-sky-300 font-medium mt-0.5 flex items-start gap-1">
            <i class="fas fa-location-dot text-rose-400 mt-0.5 text-[10px]"></i>
            <span>${item.location_name}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800 text-[11px]">
          <div>
            <span class="text-gray-400 block text-[9px] uppercase font-mono">Priority</span>
            <span class="font-bold ${item.priority_score > 70 ? 'text-rose-400' : 'text-amber-400'}">${item.priority_score} / 100</span>
          </div>
          <div>
            <span class="text-gray-400 block text-[9px] uppercase font-mono">Status</span>
            <span>${getStatusBadge(item.maintenance_status)}</span>
          </div>
        </div>

        <div class="pt-1 flex justify-between items-center text-[10px] text-gray-400 font-mono">
          <span>Date: ${formatDate(item.timestamp)}</span>
        </div>

        <div class="pt-1 flex justify-between items-center text-[10px] text-gray-500 font-mono">
          <span>Lat: ${item.latitude.toFixed(4)}, Lng: ${item.longitude.toFixed(4)}</span>
        </div>

        <div class="pt-1.5">
          <a href="/details?id=${item.id}" class="block text-center py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition">
            View Complete Inspection Details →
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markerLayerGroup.addLayer(marker);
  });
}

function setupFilterEvents() {
  const sevSelect = document.getElementById('filter-severity');
  const typeSelect = document.getElementById('filter-type');
  const statusSelect = document.getElementById('filter-status');
  const prioritySlider = document.getElementById('filter-priority');
  const sliderLabel = document.getElementById('priority-slider-label');
  const resetBtn = document.getElementById('btn-reset-filters');

  if (prioritySlider && sliderLabel) {
    prioritySlider.addEventListener('input', () => {
      sliderLabel.textContent = prioritySlider.value;
      applyFilters();
    });
  }

  [sevSelect, typeSelect, statusSelect].forEach(elem => {
    if (elem) elem.addEventListener('change', applyFilters);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      sevSelect.value = 'ALL';
      typeSelect.value = 'ALL';
      statusSelect.value = 'ALL';
      prioritySlider.value = 0;
      sliderLabel.textContent = '0';
      renderMarkers(allMarkersData);
      map.fitBounds(TAMIL_NADU_BOUNDS, { padding: [20, 20] });
    });
  }
}

function applyFilters() {
  const sevVal = document.getElementById('filter-severity').value;
  const typeVal = document.getElementById('filter-type').value;
  const statusVal = document.getElementById('filter-status').value;
  const minPriority = parseInt(document.getElementById('filter-priority').value, 10) || 0;

  const filtered = allMarkersData.filter(item => {
    if (sevVal !== 'ALL' && (item.severity || '').toUpperCase() !== sevVal) return false;
    if (typeVal !== 'ALL' && item.damage_type !== typeVal) return false;
    if (statusVal !== 'ALL') {
      if (statusVal === 'Pending') {
        if (item.maintenance_status !== 'Pending' && item.maintenance_status !== 'Detected') return false;
      } else if (item.maintenance_status !== statusVal) {
        return false;
      }
    }
    if ((item.priority_score || 0) < minPriority) return false;
    return true;
  });

  renderMarkers(filtered);
}
