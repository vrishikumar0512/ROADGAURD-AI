/**
 * RoadGuard AI - Detection History Table Controller
 */

let currentPage = 1;
const pageSize = 15;
let currentTotal = 0;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  setupFilterListeners();
  setupPaginationButtons();
  setupExportButtons();
  loadHistoryData();
});

function setupFilterListeners() {
  const searchInput = document.getElementById('search-input');
  const sevSelect = document.getElementById('select-severity');
  const typeSelect = document.getElementById('select-type');
  const statusSelect = document.getElementById('select-status');
  const sortSelect = document.getElementById('select-sort');
  const orderSelect = document.getElementById('select-order');
  const refreshBtn = document.getElementById('btn-refresh');

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 1;
      loadHistoryData();
    }, 300);
  });

  [sevSelect, typeSelect, statusSelect, sortSelect, orderSelect].forEach(elem => {
    elem.addEventListener('change', () => {
      currentPage = 1;
      loadHistoryData();
    });
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadHistoryData();
      showToast('Refreshed detection history', 'info');
    });
  }
}

function setupPaginationButtons() {
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadHistoryData();
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(currentTotal / pageSize) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      loadHistoryData();
    }
  });
}

async function loadHistoryData() {
  const params = {
    search: document.getElementById('search-input').value.trim(),
    severity: document.getElementById('select-severity').value,
    damage_type: document.getElementById('select-type').value,
    status: document.getElementById('select-status').value,
    sort_by: document.getElementById('select-sort').value,
    sort_order: document.getElementById('select-order').value,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  };

  try {
    const res = await API.getDetections(params);
    currentTotal = res.total || 0;
    renderTable(res.data || []);
    renderPagination(currentTotal);
  } catch (err) {
    console.error(err);
    showToast('Error loading history records', 'error', 'Database Error');
  }
}

function renderTable(items) {
  const tbody = document.getElementById('history-table-body');
  document.getElementById('history-total-count').textContent = `Showing ${items.length} of ${currentTotal} total records`;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-12 text-gray-500">
          <i class="fas fa-search text-2xl text-gray-600 mb-2 block"></i>
          No road damage records matched your criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const imgUrl = item.processed_image_path ? `/${item.processed_image_path}` : (item.image_path ? `/${item.image_path}` : '/uploads/samples/sample_pothole.jpg');

    return `
      <tr class="hover:bg-gray-800/50 transition">
        <td class="py-3 px-4 font-mono font-bold text-sky-400">#${item.id}</td>
        <td class="py-3 px-4">
          <a href="/details?id=${item.id}" class="block w-12 h-10 rounded-lg overflow-hidden border border-gray-700 bg-gray-900 group">
            <img src="${imgUrl}" alt="${item.damage_type}" class="w-full h-full object-cover group-hover:scale-110 transition" onerror="this.src='/uploads/samples/sample_pothole.jpg'">
          </a>
        </td>
        <td class="py-3 px-4 font-semibold text-white">
          <a href="/details?id=${item.id}" class="hover:text-sky-400 transition">${item.damage_type}</a>
        </td>
        <td class="py-3 px-4">
          ${getSeverityBadge(item.severity)}
        </td>
        <td class="py-3 px-4 font-mono text-gray-300">
          ${Math.round((item.confidence || 0.85) * 100)}%
        </td>
        <td class="py-3 px-4 max-w-[200px]">
          <div class="truncate font-medium text-gray-200">${item.location_name}</div>
          <div class="text-[10px] font-mono text-gray-500">
            ${item.latitude ? item.latitude.toFixed(3) : '--'}, ${item.longitude ? item.longitude.toFixed(3) : '--'}
          </div>
        </td>
        <td class="py-3 px-4 font-mono text-gray-400 text-[11px] whitespace-nowrap">
          ${formatDate(item.timestamp)}
        </td>
        <td class="py-3 px-4">
          ${getPriorityBadge(item.priority_score)}
        </td>
        <td class="py-3 px-4">
          ${getStatusBadge(item.maintenance_status)}
        </td>
        <td class="py-3 px-4 text-right whitespace-nowrap">
          <a href="/details?id=${item.id}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-medium text-xs border border-sky-500/30 transition mr-1">
            <i class="fas fa-eye text-[10px]"></i> View Details
          </a>
          <button onclick="handleDelete(${item.id})" class="p-1 text-gray-500 hover:text-rose-400 transition" title="Delete Record">
            <i class="far fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  document.getElementById('pagination-info').textContent = `Page ${currentPage} of ${totalPages} (${total} items)`;

  document.getElementById('btn-prev-page').disabled = currentPage <= 1;
  document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

  const numbersContainer = document.getElementById('page-numbers-container');
  numbersContainer.innerHTML = '';

  for (let i = 1; i <= Math.min(totalPages, 5); i++) {
    const btn = document.createElement('button');
    btn.className = `w-7 h-7 rounded-lg text-xs font-semibold ${i === currentPage ? 'bg-sky-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'} transition`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      loadHistoryData();
    };
    numbersContainer.appendChild(btn);
  }
}

async function handleDelete(id) {
  if (!confirm(`Are you sure you want to delete Road Damage record #${id}?`)) return;

  try {
    await API.deleteDetection(id);
    showToast(`Deleted detection #${id}`, 'success', 'Record Removed');
    loadHistoryData();
  } catch (err) {
    showToast(err.message || 'Failed to delete record', 'error', 'Delete Failed');
  }
}

function setupExportButtons() {
  document.getElementById('btn-export-csv').addEventListener('click', async () => {
    try {
      const res = await API.getDetections({ limit: 500 });
      const items = res.data || [];
      if (items.length === 0) {
        showToast('No records to export', 'warning');
        return;
      }

      const headers = ['ID', 'Damage_Type', 'Severity', 'Priority_Score', 'Confidence', 'Location', 'Latitude', 'Longitude', 'Status', 'Date_Logged'];
      const rows = items.map(r => [
        r.id,
        `"${r.damage_type}"`,
        r.severity,
        r.priority_score,
        r.confidence,
        `"${(r.location_name || '').replace(/"/g, '""')}"`,
        r.latitude,
        r.longitude,
        r.maintenance_status,
        `"${r.timestamp}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `roadguard_detections_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Exported detections to CSV', 'success', 'Export Complete');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  });

  document.getElementById('btn-export-json').addEventListener('click', async () => {
    try {
      const res = await API.getDetections({ limit: 500 });
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', dataStr);
      link.setAttribute('download', `roadguard_detections_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Exported detections to JSON', 'success', 'Export Complete');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  });
}
