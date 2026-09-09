/**
 * RoadGuard AI - Dashboard View Controller
 */

let miniSeverityChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const stats = await API.getStatistics();
    renderKpiStats(stats);
    renderMiniSeverityChart(stats.severity_distribution);
    renderTypeBreakdown(stats.type_distribution, stats.total_detections);
    renderRecentTable(stats.recent_detections);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showToast('Failed to load dashboard statistics from backend', 'error', 'Database Error');
  }
}

function renderKpiStats(stats) {
  document.getElementById('stat-total').textContent = stats.total_detections || 0;
  document.getElementById('stat-high').textContent = stats.high_severity || 0;
  document.getElementById('stat-medium').textContent = stats.medium_severity || 0;
  document.getElementById('stat-low').textContent = stats.low_severity || 0;
  document.getElementById('stat-attention').textContent = stats.roads_requiring_attention || 0;
  document.getElementById('stat-repaired').textContent = stats.repaired_count || 0;
}

function renderMiniSeverityChart(sevDist) {
  const ctx = document.getElementById('miniSeverityChart');
  if (!ctx) return;

  const data = [
    sevDist.HIGH || 0,
    sevDist.MEDIUM || 0,
    sevDist.LOW || 0
  ];

  if (miniSeverityChartInstance) {
    miniSeverityChartInstance.destroy();
  }

  miniSeverityChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: data,
        backgroundColor: [
          '#ef4444', // High
          '#f59e0b', // Medium
          '#10b981'  // Low
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            boxWidth: 12,
            padding: 14
          }
        }
      }
    }
  });
}

function renderTypeBreakdown(typeDist, total) {
  const container = document.getElementById('type-breakdown-list');
  if (!container) return;

  const classes = [
    { name: 'Pothole', icon: 'fa-circle-dot', color: 'bg-rose-500' },
    { name: 'Alligator Crack', icon: 'fa-cubes', color: 'bg-indigo-500' },
    { name: 'Transverse Crack', icon: 'fa-arrows-left-right', color: 'bg-amber-500' },
    { name: 'Longitudinal Crack', icon: 'fa-arrows-up-down', color: 'bg-sky-500' },
    { name: 'Road Surface Damage', icon: 'fa-layer-group', color: 'bg-emerald-500' }
  ];

  if (!typeDist || Object.keys(typeDist).length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-xs text-center py-4">No defect classes logged yet.</div>';
    return;
  }

  const safeTotal = total > 0 ? total : 1;

  container.innerHTML = classes.map(item => {
    const count = typeDist[item.name] || 0;
    const pct = Math.round((count / safeTotal) * 100);

    return `
      <div>
        <div class="flex items-center justify-between text-xs mb-1.5">
          <span class="font-medium text-gray-200 flex items-center gap-2">
            <i class="fas ${item.icon} text-gray-400 text-[10px]"></i>
            ${item.name}
          </span>
          <span class="font-mono text-gray-400">
            <strong>${count}</strong> <span class="text-[10px] text-gray-500">(${pct}%)</span>
          </span>
        </div>
        <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700/60">
          <div class="${item.color} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentTable(recent) {
  const tbody = document.getElementById('recent-detections-tbody');
  if (!tbody) return;

  if (!recent || recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">
          No detections logged in the database yet. Run an AI scan to record the first defect!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent.map(r => {
    const imgUrl = r.processed_image_path ? `/${r.processed_image_path}` : (r.image_path ? `/${r.image_path}` : '/uploads/samples/sample_pothole.jpg');

    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="py-3 px-4">
          <a href="/details?id=${r.id}" class="block w-12 h-10 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 relative group">
            <img src="${imgUrl}" alt="${r.damage_type}" class="w-full h-full object-cover group-hover:scale-110 transition duration-200" onerror="this.src='/uploads/samples/sample_pothole.jpg'">
          </a>
        </td>
        <td class="py-3 px-4 font-semibold text-white">
          <a href="/details?id=${r.id}" class="hover:text-sky-400 transition">${r.damage_type}</a>
          <div class="text-[10px] font-mono text-gray-400">Conf: ${Math.round((r.confidence || 0.85) * 100)}%</div>
        </td>
        <td class="py-3 px-4">
          ${getSeverityBadge(r.severity)}
        </td>
        <td class="py-3 px-4">
          ${getPriorityBadge(r.priority_score)}
        </td>
        <td class="py-3 px-4">
          <div class="max-w-[180px] truncate text-gray-200 font-medium">${r.location_name}</div>
          <div class="text-[10px] font-mono text-gray-500">ID: #${r.id}</div>
        </td>
        <td class="py-3 px-4 text-gray-400 font-mono text-[11px]">
          ${formatDate(r.timestamp)}
        </td>
        <td class="py-3 px-4">
          ${getStatusBadge(r.maintenance_status)}
        </td>
        <td class="py-3 px-4 text-right">
          <a href="/details?id=${r.id}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-sky-600 hover:text-white text-gray-300 font-medium text-xs transition border border-gray-700 hover:border-sky-500">
            Inspect <i class="fas fa-chevron-right text-[9px]"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}
