/**
 * hospital-dashboard.js
 * ------------------------------------------------------------------
 * Controller for the Hospital Dashboard single-page app.
 *
 * Responsibilities:
 *   1. Sidebar navigation between the 6 pages (SPA).
 *   2. Loading data from the API service (hospitalApi) and rendering it.
 *   3. Handling forms, tabs, switches, and logout.
*/
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // API LAYER
  // ------------------------------------------------------------------
  // TODO: Replace THIS local `api` object with the real hospitalApi
  // from src/js/api/hospitalApi.js once the module is wired up, e.g.:
  //
  //   import { hospitalApi as api } from '../src/js/api/hospitalApi.js';
  //
  // For now, this mirrors the same interface so the UI contract is clear.
  // Each method returns a Promise. The real backend will replace these.
  // ------------------------------------------------------------------
  const api = {
    getHospitalProfile() {
      // TODO: return hospitalApi.getHospitalProfile();
      console.warn('hospitalApi.getHospitalProfile() is not connected yet.');
      return Promise.reject(new Error('getHospitalProfile not connected'));
    },
    getDashboardStats() {
      console.warn('hospitalApi.getDashboardStats() is not connected yet.');
      return Promise.reject(new Error('getDashboardStats not connected'));
    },
    getStatusOverview() {
      console.warn('hospitalApi.getStatusOverview() is not connected yet.');
      return Promise.reject(new Error('getStatusOverview not connected'));
    },
    getRecentRequests() {
      console.warn('hospitalApi.getRecentRequests() is not connected yet.');
      return Promise.reject(new Error('getRecentRequests not connected'));
    },
    getUrgentRequests() {
      console.warn('hospitalApi.getUrgentRequests() is not connected yet.');
      return Promise.reject(new Error('getUrgentRequests not connected'));
    },
    getMyRequests(status) {
      console.warn('hospitalApi.getMyRequests() is not connected yet.');
      return Promise.reject(new Error('getMyRequests not connected'));
    },
    getResponses(status) {
      console.warn('hospitalApi.getResponses() is not connected yet.');
      return Promise.reject(new Error('getResponses not connected'));
    },
    createRequest(data) {
      console.warn('hospitalApi.createRequest() is not connected yet.');
      return Promise.reject(new Error('createRequest not connected'));
    },
    updateProfile(data) {
      console.warn('hospitalApi.updateProfile() is not connected yet.');
      return Promise.reject(new Error('updateProfile not connected'));
    },
    updateSettings(data) {
      console.warn('hospitalApi.updateSettings() is not connected yet.');
      return Promise.reject(new Error('updateSettings not connected'));
    },
    logout() {
      console.warn('hospitalApi.logout() is not connected yet.');
      // TODO: when real logout is connected, clear auth token then redirect.
      // For now, just redirect to the login page as a placeholder.
      window.location.href = 'login.html';
      return Promise.resolve();
    },
  };

  // ------------------------------------------------------------------
  // DOM HELPERS
  // ------------------------------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    children.forEach((c) => {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  };

  const loadingRow = (colspan, message) => {
    const tr = el('tr');
    const td = el('td', { colspan, class: 'loading-hint', text: message });
    tr.appendChild(td);
    return tr;
  };

  const badgeFor = (status) => {
    const map = {
      active: 'active',
      progress: 'progress',
      'in progress': 'progress',
      completed: 'completed',
      cancelled: 'cancelled',
      new: 'new',
      contacted: 'contacted',
      confirmed: 'confirmed',
      declined: 'declined',
    };
    const key = String(status || '').toLowerCase();
    const cls = map[key] || 'active';
    const label = String(status || '—');
    return el('span', { class: `badge ${cls}`, text: label });
  };

  const urgencyFor = (urgency) => {
    const key = String(urgency || '').toLowerCase();
    const cls =
      key === 'emergency' ? 'emergency' : key === 'high' ? 'high' : 'medium';
    return el('span', { class: `urgency ${cls}`, text: urgency || '—' });
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const emptyRow = (colspan, message) => {
    const tr = el('tr', { class: 'empty-state-row' });
    const td = el('td', { colspan, text: message || 'No data available.' });
    tr.appendChild(td);
    return tr;
  };

  // ------------------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------------------
  const pages = [
    'dashboard',
    'create-request',
    'my-requests',
    'responses',
    'profile',
    'settings',
  ];

  function showPage(pageId) {
    if (!pages.includes(pageId)) return;

    // Update nav active states
    $$('.nav-item').forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.page === pageId) btn.classList.add('active');
    });

    // Show/hide pages
    $$('.page').forEach((p) => {
      p.classList.toggle('active-page', p.id === pageId);
    });

    // Load the page's data when it becomes visible
    loadPageData(pageId);

    window.scrollTo(0, 0);
  }

  // Wire up sidebar buttons
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Wire up any element that wants to navigate to another page
  $$('[data-page-target]').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.pageTarget));
  });

  // ------------------------------------------------------------------
  // PAGE DATA LOADING
  // ------------------------------------------------------------------
  function safeLoad(fn, onError) {
    return fn().catch((err) => {
      console.error(err);
      if (onError) onError(err);
    });
  }

  function loadPageData(pageId) {
    switch (pageId) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'my-requests':
        loadMyRequests('');
        break;
      case 'responses':
        loadResponses('');
        break;
      case 'profile':
        loadProfile();
        break;
      case 'settings':
        loadSettings();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------------
  function loadDashboard() {
    // Hospital profile (topbar + welcome)
    safeLoad(api.getHospitalProfile, () => {
      // keep default "Hospital" text when not connected
    }).then((profile) => {
      if (!profile) return;
      $('#hospital-name').textContent = profile.name || 'Hospital';
      $('#welcome-hospital-name').textContent = profile.name || 'Hospital';
      if (profile.name) {
        $('#hospital-avatar').textContent = profile.name.charAt(0).toUpperCase();
      }
    });

    // Stat cards
    safeLoad(api.getDashboardStats).then((stats) => {
      if (!stats) return;
      $('#stat-total-requests').textContent = stats.totalRequests ?? '—';
      $('#stat-active-requests').textContent = stats.activeRequests ?? '—';
      $('#stat-total-responses').textContent = stats.totalResponses ?? '—';
      $('#stat-completed-donations').textContent =
        stats.completedDonations ?? '—';
    });

    // Status overview (donut + legend)
   safeLoad(api.getStatusOverview).then((overview) => {
  if (!overview) return;

  const total =
    (overview.active?.count || 0) +
    (overview.inProgress?.count || 0) +
    (overview.completed?.count || 0);

  $('#status-total').textContent = total;

  $('#status-active').textContent =
    `${overview.active?.count ?? 0} (${overview.active?.percentage ?? 0}%)`;

  $('#status-inProgress').textContent =
    `${overview.inProgress?.count ?? 0} (${overview.inProgress?.percentage ?? 0}%)`;

  $('#status-completed').textContent =
    `${overview.completed?.count ?? 0} (${overview.completed?.percentage ?? 0}%)`;

  // Updating the donut chart
  if (total === 0) return;

  const activePct =
    ((overview.active?.count || 0) / total) * 100;

  const inProgressPct =
    activePct +
    ((overview.inProgress?.count || 0) / total) * 100;

  const chart = $('.donut-chart');

  chart.style.background = `
    conic-gradient(
      #d71920 0% ${activePct}%,
      #f59e0b ${activePct}% ${inProgressPct}%,
      #16a34a ${inProgressPct}% 100%
    )
  `;
});

    // Recent requests
    safeLoad(api.getRecentRequests).then((requests) => {
      const list = $('#recent-requests-list');
      if (!list) return;
      list.innerHTML = '';
      if (!requests || requests.length === 0) {
        list.appendChild(el('p', { class: 'loading-hint', text: 'No recent requests.' }));
        return;
      }
      requests.forEach((r) => {
        const row = el('div', { class: 'request-row' }, [
          el('span', { class: 'blood', text: r.bloodType || '—' }),
          el(
            'span',
            { text: `${r.units ?? '—'} Units • ${r.urgency || '—'}` }
          ),
          el('span', { text: r.hospital || '—' }),
          el('span', { text: formatDate(r.createdAt) }),
          badgeFor(r.status),
        ]);
        list.appendChild(row);
      });
    });

    // Urgent requests
    safeLoad(api.getUrgentRequests).then((requests) => {
      const tbody = $('#urgent-requests-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!requests || requests.length === 0) {
        tbody.appendChild(emptyRow(7, 'No urgent requests right now.'));
        return;
      }
      requests.forEach((r) => {
        const tr = el('tr', {}, [
          el('td', { text: r.bloodType || '—' }),
          el('td', { text: `${r.units || '—'} Units` }),
          el('td').appendChild(urgencyFor(r.urgency)),
          el('td', { text: r.hospital || '—' }),
          el('td', { text: r.location || '—' }),
          el('td', { text: formatDate(r.postedOn) }),
          el('td').appendChild(
            el('button', { class: 'view-btn', text: 'View' })
          ),
        ]);
        // Wire up the View button (TODO: open a detail modal)
        const viewBtn = tr.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
          // TODO: Open a request detail view/modal for this request id.
          console.log('View request:', r);
          alert(`Viewing request details for ${r.bloodType || 'request'}. TODO: open detail view.`);
        });
        tbody.appendChild(tr);
      });
    });
  }

  // ------------------------------------------------------------------
  // MY REQUESTS
  // ------------------------------------------------------------------
  function loadMyRequests(status) {
    const tbody = $('#my-requests-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(loadingRow(7, 'Loading requests...'));

    safeLoad(() => api.getMyRequests(status)).then((requests) => {
      tbody.innerHTML = '';
      if (!requests || requests.length === 0) {
        tbody.appendChild(emptyRow(7, 'No requests found.'));
        return;
      }
      requests.forEach((r) => {
        const tr = el('tr', {}, [
          el('td', { text: r.bloodType || '—' }),
          el('td', { text: `${r.units || '—'} Units` }),
          el('td', { text: r.urgency || '—' }),
          el('td', { text: r.hospital || '—' }),
          el('td', { text: r.location || '—' }),
          el('td').appendChild(badgeFor(r.status)),
          el('td', { text: formatDate(r.postedOn) }),
        ]);
        tbody.appendChild(tr);
      });
    });
  }

  // My Requests tabs
  $('#my-requests-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#my-requests-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadMyRequests(tab.dataset.filter || '');
  });

  // ------------------------------------------------------------------
  // RESPONSES
  // ------------------------------------------------------------------
  function loadResponses(status) {
    const tbody = $('#responses-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    tbody.appendChild(loadingRow(6, 'Loading responses...'));

    safeLoad(() => api.getResponses(status)).then((responses) => {
      tbody.innerHTML = '';
      if (!responses || responses.length === 0) {
        tbody.appendChild(emptyRow(6, 'No responses found.'));
        return;
      }
      responses.forEach((r) => {
        const actions = el('td');
        const callBtn = el('button', { class: 'view-btn', text: '☎' });
        const msgBtn = el('button', { class: 'view-btn', text: '💬', style: 'margin-left:6px' });
        // TODO: wire these to real contact actions (call / message donor)
        callBtn.addEventListener('click', () => {
          console.log('Call donor:', r);
          alert(`Calling ${r.donorName || 'donor'}... TODO: connect calling.`);
        });
        msgBtn.addEventListener('click', () => {
          console.log('Message donor:', r);
          alert(`Messaging ${r.donorName || 'donor'}... TODO: connect messaging.`);
        });
        actions.appendChild(callBtn);
        actions.appendChild(msgBtn);

        const tr = el('tr', {}, [
          el('td', { text: r.donorName || '—' }),
          el('td', { text: r.bloodType || '—' }),
          el('td', { text: r.request || '—' }),
          el('td', { text: formatDate(r.respondedOn) }),
          el('td').appendChild(badgeFor(r.status)),
          actions,
        ]);
        tbody.appendChild(tr);
      });
    });
  }

  // Responses tabs
  $('#responses-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#responses-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadResponses(tab.dataset.filter || '');
  });

  // ------------------------------------------------------------------
  // PROFILE
  // ------------------------------------------------------------------
  function loadProfile() {
    safeLoad(api.getHospitalProfile).then((profile) => {
      if (!profile) return;
      $('#profile-name').textContent = profile.name || '—';
      $('#profile-type').textContent = profile.type || '—';
      $('#profile-license').textContent = profile.licenseNumber || '—';
      $('#profile-established').textContent = profile.establishedYear || '—';
      $('#profile-phone').textContent = profile.phone || '—';
      $('#profile-email').textContent = profile.email || '—';
      $('#profile-address').textContent = profile.address || '—';

      // Verification status
      const vStatus = $('#verification-status');
      if (vStatus) {
        const verified = profile.verificationStatus === 'verified';
        vStatus.innerHTML = '';
        vStatus.appendChild(
          el('strong', {
            text: verified ? '✓ Verified Hospital' : profile.verificationStatus || 'Pending Verification',
          })
        );
        vStatus.appendChild(
          el('p', {
            text: verified
              ? 'Your hospital has been verified by the administration.'
              : 'Your hospital verification is pending. Please wait for the administration to review.',
          })
        );
        vStatus.appendChild(
          el('small', {
            text: profile.verifiedOn ? `Verified on: ${formatDate(profile.verifiedOn)}` : '—',
          })
        );
      }
    });

    // Stats on profile page
    safeLoad(api.getDashboardStats).then((stats) => {
      if (!stats) return;
      $('#profile-stat-total-requests').textContent = stats.totalRequests ?? '—';
      $('#profile-stat-total-responses').textContent = stats.totalResponses ?? '—';
      $('#profile-stat-completed-donations').textContent =
        stats.completedDonations ?? '—';
    });
  }

  // Edit Profile button (TODO: build an edit form/modal)
  $('#edit-profile-btn').addEventListener('click', () => {
    console.log('Edit Profile clicked');
    // TODO: Open an edit profile modal/form populated with the current
    // profile data, then call api.updateProfile(data) on submit.
    alert('Edit Profile: TODO - build the edit form/modal and call api.updateProfile().');
  });

  // ------------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------------
  function loadSettings() {
    safeLoad(api.getHospitalProfile).then((profile) => {
      if (!profile) return;
      $('#settings-name').textContent = profile.name || '—';
      $('#settings-email').textContent = profile.email || '—';
      $('#settings-phone').textContent = profile.phone || '—';
      $('#settings-contact').textContent = profile.contactPerson || '—';
    });
  }

  // Settings tabs
  $('#settings-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#settings-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const filter = tab.dataset.filter;
    const sections = {
      account: '#settings-account',
      notifications: '#settings-notifications',
      password: '#settings-password',
      security: '#settings-security',
    };
    Object.entries(sections).forEach(([key, sel]) => {
      const section = $(sel);
      if (section) section.classList.toggle('settings-hidden', key !== filter);
    });
  });

  // Update Information button
  $('#update-info-btn').addEventListener('click', () => {
    console.log('Update Information clicked');
    // TODO: Open the settings account edit form, then call
    // api.updateSettings({ account: {...} }) on save.
    alert('Update Information: TODO - build the edit form and call api.updateSettings().');
  });

  // Save notification preferences
  $('#save-prefs-btn').addEventListener('click', () => {
    const prefs = {};
    $$('#settings-notifications .switch input').forEach((input) => {
      prefs[input.dataset.pref] = input.checked;
    });
    console.log('Saving notification preferences:', prefs);
    // TODO: call api.updateSettings({ notifications: prefs }) and show a toast.
    safeLoad(() => api.updateSettings({ notifications: prefs })).then(() => {
      // TODO: show a success toast/notification.
      console.log('Preferences saved (placeholder).');
    });
  });

  // Password change form
  $('#password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const currentPassword = $('#current-password').value;
    const newPassword = $('#new-password').value;
    const confirmPassword = $('#confirm-password').value;

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // TODO: call api.updateSettings({ password: { currentPassword, newPassword } })
    console.log('Password change requested (placeholder).');
    safeLoad(() =>
      api.updateSettings({ password: { currentPassword, newPassword } })
    ).then(() => {
      // TODO: show a success toast/notification.
      $('#password-form').reset();
      console.log('Password updated (placeholder).');
    });
  });

  // ------------------------------------------------------------------
  // CREATE REQUEST FORM
  // ------------------------------------------------------------------
  $('#blood-request-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      bloodType: $('#blood-type').value,
      units: Number($('#units').value),
      urgency: $('#urgency').value,
      location: $('#location').value,
      description: $('#description').value,
    };

    // Basic validation
    if (!data.bloodType || !data.units || !data.urgency || !data.location) {
      alert('Please fill in all required fields.');
      return;
    }

    console.log('Creating blood request:', data);
    // TODO: call api.createRequest(data), then on success navigate to
    // My Requests and show a toast.
    safeLoad(() => api.createRequest(data)).then(() => {
      // TODO: show a success toast/notification.
      $('#blood-request-form').reset();
      showPage('my-requests');
      console.log('Request created (placeholder).');
    });
  });

  // ------------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------------
  $('#logout-btn').addEventListener('click', () => {
    console.log('Logout clicked');
    // TODO: call api.logout() then redirect to login.
    safeLoad(api.logout);
  });

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // Load the initial (dashboard) page data.
    loadPageData('dashboard');
  });

  // If the script is loaded after DOM is ready, init immediately.
  if (document.readyState !== 'loading') {
    loadPageData('dashboard');
  }
})();
