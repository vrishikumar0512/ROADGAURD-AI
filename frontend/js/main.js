/**
 * RoadGuard AI - Layout & Navigation Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  highlightActiveNav();
  setupDemoBannerCheck();
});

function setupSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      if (overlay) overlay.classList.toggle('hidden');
    });
  }

  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    });
  }
}

function highlightActiveNav() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav-item');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href === '/' && currentPath === '') || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('bg-sky-500/10', 'text-sky-400', 'border-l-4', 'border-sky-500', 'font-semibold');
      link.classList.remove('text-gray-400', 'hover:bg-gray-800/60');
    }
  });
}

function setupDemoBannerCheck() {
  // Check backend health
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      const liveBadge = document.getElementById('live-engine-badge');
      if (liveBadge) {
        liveBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5"></span> AI Engine Online (Demo Mode)`;
      }
    })
    .catch(() => {
      const liveBadge = document.getElementById('live-engine-badge');
      if (liveBadge) {
        liveBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400 inline-block mr-1.5"></span> Engine Offline`;
      }
    });
}
