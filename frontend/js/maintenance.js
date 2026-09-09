/**
 * RoadGuard AI - Maintenance Management Controller
 */

let allDetections = [];
let activeEditId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadMaintenanceBoard();
  setupModalSave();
});

async function loadMaintenanceBoard() {
  try {
    const res = await API.getDetections({ limit: 200, sort_by: 'priority_score', sort_order: 'DESC' });
    allDetections = res.data || [];
    renderUrgentQueue(allDetections);
    renderKanbanBoard(allDetections);
  } catch (err) {
    console.error(err);
    showToast('Failed to load maintenance records', 'error', 'Error');
  }
}

function renderUrgentQueue(items) {
  const urgent = items.filter(d => (d.priority_score || 0) >= 70 && d.maintenance_status !== 'Repaired');
  const tbody = document.getElementById('urgent-queue-tbody');
  const countBadge = document.getElementById('urgent-queue-count');

  if (countBadge) countBadge.textContent = `${urgent.length} Urgent Defects`;

  if (!urgent || urgent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-gray-500">
          <i class="fas fa-check-circle text-emerald-400 text-lg mr-2"></i>
          All high-priority road damages are currently addressed or repaired!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = urgent.map(item => {
    const imgUrl = item.processed_image_path ? `/${item.processed_image_path}` : (item.image_path ? `/${item.image_path}` : '/uploads/samples/sample_pothole.jpg');

    return `
      <tr class="hover:bg-rose-950/20 transition">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <a href="/details?id=${item.id}" class="w-10 h-8 rounded overflow-hidden border border-gray-700 bg-gray-900 block">
              <img src="${imgUrl}" alt="${item.damage_type}" class="w-full h-full object-cover" onerror="this.src='/uploads/samples/sample_pothole.jpg'">
            </a>
            <span class="font-mono text-rose-400 font-bold">#${item.id}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          ${getPriorityBadge(item.priority_score)}
        </td>
        <td class="py-3 px-4 font-semibold text-white">
          ${item.damage_type}
        </td>
        <td class="py-3 px-4 max-w-[200px] truncate text-gray-300">
          ${item.location_name}
        </td>
        <td class="py-3 px-4 text-gray-300">
          ${item.assigned_crew ? `<span class="inline-flex items-center gap-1 text-indigo-300"><i class="fas fa-users text-[10px]"></i> ${item.assigned_crew}</span>` : '<span class="text-gray-500 italic">Unassigned</span>'}
        </td>
        <td class="py-3 px-4 font-mono text-[11px] text-gray-400">
          ${item.scheduled_date || '<span class="text-gray-600">Not Set</span>'}
        </td>
        <td class="py-3 px-4">
          ${getStatusBadge(item.maintenance_status)}
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="openQuickModal(${item.id})" class="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow">
            <i class="fas fa-truck-fast mr-1"></i> Dispatch
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderKanbanBoard(items) {
  const buckets = {
    pending: items.filter(d => d.maintenance_status === 'Pending' || d.maintenance_status === 'Detected'),
    assigned: items.filter(d => d.maintenance_status === 'Assigned'),
    inprogress: items.filter(d => d.maintenance_status === 'In Progress'),
    repaired: items.filter(d => d.maintenance_status === 'Repaired')
  };

  document.getElementById('col-count-pending').textContent = buckets.pending.length;
  document.getElementById('col-count-assigned').textContent = buckets.assigned.length;
  document.getElementById('col-count-inprogress').textContent = buckets.inprogress.length;
  document.getElementById('col-count-repaired').textContent = buckets.repaired.length;

  renderKanbanColumn('col-items-pending', buckets.pending);
  renderKanbanColumn('col-items-assigned', buckets.assigned);
  renderKanbanColumn('col-items-inprogress', buckets.inprogress);
  renderKanbanColumn('col-items-repaired', buckets.repaired);
}

function renderKanbanColumn(containerId, items) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="text-center py-8 text-gray-500 text-xs italic">No defects in this column</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const imgUrl = item.processed_image_path ? `/${item.processed_image_path}` : (item.image_path ? `/${item.image_path}` : '/uploads/samples/sample_pothole.jpg');

    return `
      <div class="p-3.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 transition space-y-2 shadow">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-white text-xs">${item.damage_type}</span>
              ${getSeverityBadge(item.severity)}
            </div>
            <span class="text-[10px] font-mono text-gray-500">Record #${item.id}</span>
          </div>
          <span class="font-bold text-xs ${item.priority_score > 70 ? 'text-rose-400' : 'text-amber-400'}">
            ${item.priority_score} pts
          </span>
        </div>

        <div class="h-24 rounded-lg overflow-hidden border border-gray-800 bg-black">
          <img src="${imgUrl}" alt="${item.damage_type}" class="w-full h-full object-cover" onerror="this.src='/uploads/samples/sample_pothole.jpg'">
        </div>

        <p class="text-[11px] text-gray-300 leading-tight line-clamp-2">${item.location_name}</p>

        ${item.assigned_crew ? `<div class="text-[10px] text-indigo-300 flex items-center gap-1 truncate"><i class="fas fa-users text-[9px]"></i> ${item.assigned_crew}</div>` : ''}

        <div class="pt-2 border-t border-gray-800/80 flex items-center justify-between">
          <a href="/details?id=${item.id}" class="text-[11px] text-sky-400 hover:underline">
            Details →
          </a>
          <button onclick="openQuickModal(${item.id})" class="px-2 py-0.5 rounded bg-gray-800 hover:bg-sky-600 text-gray-300 hover:text-white text-[10px] font-semibold transition border border-gray-700">
            Edit Status
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openQuickModal(id) {
  activeEditId = id;
  const item = allDetections.find(d => d.id === id);
  if (!item) return;

  document.getElementById('modal-defect-id').textContent = `#${id} (${item.damage_type})`;
  document.getElementById('modal-status').value = item.maintenance_status || 'Pending';
  document.getElementById('modal-crew').value = item.assigned_crew || '';
  document.getElementById('modal-date').value = item.scheduled_date || '';
  document.getElementById('modal-notes').value = item.maintenance_notes || '';

  document.getElementById('quick-edit-modal').classList.remove('hidden');
}

function closeQuickModal() {
  document.getElementById('quick-edit-modal').classList.add('hidden');
  activeEditId = null;
}

function setupModalSave() {
  document.getElementById('btn-modal-save').addEventListener('click', async () => {
    if (!activeEditId) return;

    const payload = {
      status: document.getElementById('modal-status').value,
      crew: document.getElementById('modal-crew').value || null,
      scheduled_date: document.getElementById('modal-date').value || null,
      notes: document.getElementById('modal-notes').value
    };

    const saveBtn = document.getElementById('btn-modal-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Updating...`;

    try {
      await API.updateMaintenance(activeEditId, payload);
      closeQuickModal();
      showToast(`Updated maintenance work order #${activeEditId}`, 'success', 'Work Order Saved');
      loadMaintenanceBoard();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update work order', 'error', 'Error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `Apply Update`;
    }
  });
}
