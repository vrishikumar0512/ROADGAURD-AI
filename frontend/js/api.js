/**
 * RoadGuard AI - API Client and Shared Utilities
 */

const API_BASE = '/api';

const API = {
  async getStatistics() {
    const res = await fetch(`${API_BASE}/statistics`);
    if (!res.ok) throw new Error(`Failed to load statistics (${res.status})`);
    const json = await res.json();
    return json.data;
  },

  async getLocations() {
    const res = await fetch(`${API_BASE}/locations`);
    if (!res.ok) throw new Error(`Failed to load map locations (${res.status})`);
    const json = await res.json();
    return json.data;
  },

  async getDetections(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        query.append(k, v);
      }
    });
    const res = await fetch(`${API_BASE}/detections?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch detections (${res.status})`);
    return await res.json();
  },

  async getDetection(id) {
    const res = await fetch(`${API_BASE}/detections/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch detection details (${res.status})`);
    const json = await res.json();
    return json.data;
  },

  async runDetection(formData) {
    const res = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `AI Detection failed (${res.status})`);
    return json.data;
  },

  async getSampleImages() {
    const res = await fetch(`${API_BASE}/sample-images`);
    if (!res.ok) throw new Error('Failed to load sample images');
    const json = await res.json();
    return json.data;
  },

  async updateMaintenance(id, payload) {
    const res = await fetch(`${API_BASE}/maintenance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update maintenance');
    return json.data;
  },

  async getCrews() {
    const res = await fetch(`${API_BASE}/maintenance/crews`);
    if (!res.ok) throw new Error('Failed to fetch repair crews');
    const json = await res.json();
    return json.data;
  },

  async deleteDetection(id) {
    const res = await fetch(`${API_BASE}/detections/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete detection');
    return json;
  }
};

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info', title = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-check-circle text-emerald-400',
    error: 'fa-exclamation-triangle text-rose-400',
    warning: 'fa-exclamation-circle text-amber-400',
    info: 'fa-info-circle text-sky-400'
  };

  const borders = {
    success: 'border-emerald-500/40 bg-gray-900/95',
    error: 'border-rose-500/40 bg-gray-900/95',
    warning: 'border-amber-500/40 bg-gray-900/95',
    info: 'border-sky-500/40 bg-gray-900/95'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-start gap-3 p-4 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 text-sm max-w-sm ${borders[type] || borders.info}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} text-lg mt-0.5"></i>
    <div class="flex-1">
      ${title ? `<div class="font-semibold text-white mb-0.5">${title}</div>` : ''}
      <div class="text-gray-300 leading-snug">${message}</div>
    </div>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-white transition">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Formats ISO / timestamp string to human-readable format
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * HTML Badge renderers
 */
function getSeverityBadge(sev) {
  const s = (sev || 'LOW').toUpperCase();
  const cls = s === 'HIGH' ? 'badge-high' : s === 'MEDIUM' ? 'badge-medium' : 'badge-low';
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}">
    <span class="w-1.5 h-1.5 rounded-full ${s === 'HIGH' ? 'bg-red-400' : s === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
    ${s}
  </span>`;
}

function getStatusBadge(status) {
  const st = status || 'Pending';
  const mapping = {
    'Detected': 'status-detected',
    'Pending': 'status-pending',
    'Assigned': 'status-assigned',
    'In Progress': 'status-in-progress',
    'Repaired': 'status-repaired'
  };
  const cls = mapping[st] || 'status-pending';
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}">${st}</span>`;
}

function getPriorityBadge(score) {
  const sc = parseInt(score, 10) || 0;
  let bg = 'bg-emerald-500';
  let text = 'text-emerald-400';
  let label = 'Low Priority';

  if (sc > 70) {
    bg = 'bg-rose-500';
    text = 'text-rose-400';
    label = 'High Priority';
  } else if (sc > 30) {
    bg = 'bg-amber-500';
    text = 'text-amber-400';
    label = 'Medium Priority';
  }

  return `
    <div class="flex items-center gap-2">
      <div class="w-16 bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
        <div class="${bg} h-2 rounded-full priority-bar-fill" style="width: ${Math.min(sc, 100)}%"></div>
      </div>
      <span class="text-xs font-bold ${text}">${sc}</span>
    </div>
  `;
}
