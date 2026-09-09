/**
 * RoadGuard AI - Municipal Analytics Charts Controller
 */

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Inter';

document.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
});

async function loadAnalytics() {
  try {
    const stats = await API.getStatistics();
    renderSummaryKpis(stats);
    renderDamageTypeChart(stats.type_distribution);
    renderSeverityBarChart(stats.severity_distribution);
    renderTimelineChart(stats.timeline);
    renderHotspotsChart(stats.hotspots);
    renderResolutionDonut(stats.status_distribution, stats.total_detections);
  } catch (err) {
    console.error(err);
    showToast('Failed to load analytics datasets', 'error', 'Analytics Error');
  }
}

function renderSummaryKpis(stats) {
  const total = stats.total_detections || 0;
  const high = stats.high_severity || 0;
  const repaired = stats.repaired_count || 0;
  const active = (stats.in_progress_count || 0) + (stats.status_distribution?.Assigned || 0);

  document.getElementById('ana-total').textContent = total;
  document.getElementById('ana-high-ratio').textContent = `${total > 0 ? Math.round((high / total) * 100) : 0}%`;
  document.getElementById('ana-repair-rate').textContent = `${total > 0 ? Math.round((repaired / total) * 100) : 0}%`;
  document.getElementById('ana-active-work').textContent = active;
}

function renderDamageTypeChart(typeDist) {
  const ctx = document.getElementById('typeDistChart');
  if (!ctx) return;

  const labels = Object.keys(typeDist || {});
  const data = Object.values(typeDist || {});

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['Pothole', 'Cracks', 'Surface Damage'],
      datasets: [{
        data: data.length > 0 ? data : [5, 4, 3],
        backgroundColor: ['#ef4444', '#6366f1', '#f59e0b', '#0ea5e9', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
        }
      }
    }
  });
}

function renderSeverityBarChart(sevDist) {
  const ctx = document.getElementById('severityBarChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['High Severity', 'Medium Severity', 'Low Severity'],
      datasets: [{
        label: 'Detected Defects',
        data: [
          sevDist?.HIGH || 0,
          sevDist?.MEDIUM || 0,
          sevDist?.LOW || 0
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderTimelineChart(timeline) {
  const ctx = document.getElementById('timelineChart');
  if (!ctx) return;

  const labels = (timeline || []).map(t => t.date);
  const data = (timeline || []).map(t => t.count);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['Day 1', 'Day 2', 'Day 3'],
      datasets: [{
        label: 'Detections',
        data: data.length > 0 ? data : [2, 4, 3],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: { stepSize: 1 }
        },
        x: {
          grid: { color: 'rgba(51, 65, 85, 0.2)' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderHotspotsChart(hotspots) {
  const ctx = document.getElementById('hotspotsChart');
  if (!ctx) return;

  const labels = (hotspots || []).map(h => h.location_name);
  const data = (hotspots || []).map(h => h.defect_count);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Market St', 'Grand Expwy', 'Harbor Blvd'],
      datasets: [{
        label: 'Defects Logged',
        data: data.length > 0 ? data : [4, 3, 2],
        backgroundColor: '#f43f5e',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: { stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: {
            callback: function(value, index) {
              const label = this.getLabelForValue(value) || '';
              return label.length > 20 ? label.substr(0, 18) + '...' : label;
            }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderResolutionDonut(statusDist, total) {
  const ctx = document.getElementById('resolutionDonutChart');
  if (!ctx) return;

  const repaired = statusDist?.Repaired || 0;
  const inProgress = statusDist?.['In Progress'] || 0;
  const pending = (statusDist?.Pending || 0) + (statusDist?.Detected || 0) + (statusDist?.Assigned || 0);

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Repaired', 'In Progress', 'Pending/Assigned'],
      datasets: [{
        data: [repaired, inProgress, pending],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false }
      }
    }
  });
}
