import authApi from './api/authApi.js';
import { applyIcons, iconMarkup } from './bloodbank-icons.js';

const COLLAPSE_STORAGE_KEY = 'lb_sidebar_collapsed';

function ensureProgressBar() {
  let bar = document.getElementById('lb-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'lb-progress-bar';
    bar.className = 'lb-progress';
    document.body.prepend(bar);
  }
  return bar;
}

/** Shows the top progress bar. Call before an async fetch begins. */
export function showProgress() {
  ensureProgressBar().classList.add('active');
}

/** Hides the top progress bar. Call once an async fetch settles. */
export function hideProgress() {
  ensureProgressBar().classList.remove('active');
}

/** Wraps an async function so the top progress bar shows for its duration. */
export async function withProgress(fn) {
  showProgress();
  try {
    return await fn();
  } finally {
    hideProgress();
  }
}

export function initShell() {
  // Guard: bounce out if not logged in
  if (!authApi.isAuthenticated()) {
    window.location.href = 'login.html';
    return null;
  }

  ensureProgressBar();
  applyIcons();

  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarClose = document.getElementById('sidebar-close');

  const isMobile = () => window.innerWidth <= 768;

  function paintToggleIcon() {
    if (!menuToggle) return;
    if (isMobile()) {
      menuToggle.innerHTML = iconMarkup('menu', { size: 20 });
      menuToggle.title = 'Open menu';
    } else {
      const collapsed = sidebar.classList.contains('collapsed');
      menuToggle.innerHTML = iconMarkup(collapsed ? 'chevronRight' : 'chevronLeft', { size: 20 });
      menuToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    }
  }

  function openDrawer() {
    sidebar.classList.add('open');
    backdrop.classList.add('active');
  }
  function closeDrawer() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
  }
  function toggleCollapse() {
    const collapsed = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
    paintToggleIcon();
  }

  // Restore desktop collapse preference
  if (!isMobile()) {
    try {
      if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1') sidebar.classList.add('collapsed');
    } catch (e) { /* ignore */ }
  }
  paintToggleIcon();

  menuToggle?.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
    } else {
      toggleCollapse();
    }
  });
  window.addEventListener('resize', paintToggleIcon);
  sidebarClose?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  // Close the mobile drawer automatically after following a nav link
  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      if (isMobile()) closeDrawer();
    });
  });

  // Profile dropdown
  const toggle = document.getElementById('user-profile-toggle');
  const dropdown = document.getElementById('user-dropdown');
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Logout (works for the sidebar footer button and the dropdown item)
  async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await authApi.logout();
    } catch (e) {
      /* proceed to clear local session regardless */
    } finally {
      authApi.clearAuth();
      window.location.href = 'login.html';
    }
  }
  document.getElementById('dropdown-logout-btn')?.addEventListener('click', logout);
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', logout);

  function paintProfile(profile) {
    const p = profile || {};
    const name = p.bankName || p.name || '—';
    const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '--';

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    set('bank-name-header', name);
    set('avatar-initials', initials);
    set('user-name', name);
    set('dropdown-user-name', name);
    set('sidebar-user-name-footer', name);


    const dot = document.getElementById('sidebar-status-dot');
    if (dot) dot.classList.toggle('online', p.isOnline !== false);
  }

  const currentUser = authApi.getCurrentUser();
  if (currentUser?.bloodBank) {
    paintProfile(currentUser.bloodBank);
  }

  return { paintProfile, isMobile, closeDrawer, openDrawer };
}

export async function loadCommonData(api, paintProfile) {
  showProgress();
  try {
    const [dashboardRes, notifRes] = await Promise.all([
      api.get('/blood-banks/dashboard'),
      api.get('/notifications'),
    ]);

    const profile = dashboardRes.success ? dashboardRes.data.bloodBank : {};
    const stats = dashboardRes.success ? dashboardRes.data.stats : {};
    const inventory = dashboardRes.success ? dashboardRes.data.inventory : [];
    const monthlyTrends = dashboardRes.success ? (dashboardRes.data.monthlyTrends || []) : [];
    const recentRequests = dashboardRes.success ? (dashboardRes.data.recentRequests || []) : [];
    const notifications = notifRes.success
      ? (Array.isArray(notifRes.data) ? notifRes.data : notifRes.data?.notifications || [])
      : [];
    paintProfile(profile);

    const unread = notifications.filter((n) => !n.isRead).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.innerText = unread;
      badge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }
    const dot = document.getElementById('header-notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

    return { profile, stats, inventory, notifications, monthlyTrends, recentRequests };
  } catch (err) {
    console.error('Failed to load header data:', err);
    return { profile: {}, stats: {}, inventory: [], notifications: [], monthlyTrends: [], recentRequests: [] };
  } finally {
    hideProgress();
  }
}

/* ---------- Shared toast helper ---------- */
export function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${iconMarkup(type === 'success' ? 'check' : 'alert', { size: 16 })}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export { iconMarkup, applyIcons };
