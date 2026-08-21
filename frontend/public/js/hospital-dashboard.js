import api from '../../src/js/api/api.js';

/**
 * hospital-dashboard.js
 * ------------------------------------------------------------------
 * Controller for the Hospital Dashboard single-page app.
 * Connected to LifeLink Backend REST API via ApiClient (api).
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // AUTH GUARD
  // ------------------------------------------------------------------
  if (!api.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const currentUser = api.getUser();
  if (currentUser && currentUser.role && currentUser.role !== 'HOSPITAL') {
    window.location.href = api.getDashboardUrl(currentUser.role);
    return;
  }

  // ------------------------------------------------------------------
  // DOM HELPERS & TOAST
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
      else if (c) node.appendChild(c);
    });
    return node;
  };

  const showToast = (message, type = 'info') => {
    const container = $('#toast-container') || document.body;
    const toast = el('div', { class: `toast ${type}`, text: message });
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const loadingRow = (colspan, message) => {
    const tr = el('tr');
    const td = el('td', { colspan, class: 'loading-hint', text: message });
    tr.appendChild(td);
    return tr;
  };

  const emptyRow = (colspan, message) => {
    const tr = el('tr', { class: 'empty-state-row' });
    const td = el('td', { colspan, text: message || 'No data available.' });
    tr.appendChild(td);
    return tr;
  };

  // ------------------------------------------------------------------
  // ENUM CONVERTERS & FORMATTERS
  // ------------------------------------------------------------------
  const UI_TO_DB_BLOOD = {
    'O+': 'O_POS',
    'O-': 'O_NEG',
    'A+': 'A_POS',
    'A-': 'A_NEG',
    'B+': 'B_POS',
    'B-': 'B_NEG',
    'AB+': 'AB_POS',
    'AB-': 'AB_NEG',
  };

  const DB_TO_UI_BLOOD = {
    'O_POS': 'O+',
    'O_NEG': 'O-',
    'A_POS': 'A+',
    'A_NEG': 'A-',
    'B_POS': 'B+',
    'B_NEG': 'B-',
    'AB_POS': 'AB+',
    'AB_NEG': 'AB-',
  };

  const UI_TO_DB_URGENCY = {
    'Emergency': 'CRITICAL_EMERGENCY',
    'High': 'URGENT',
    'Medium': 'NORMAL',
  };

  const DB_TO_UI_URGENCY = {
    'CRITICAL_EMERGENCY': 'Emergency',
    'URGENT': 'High',
    'NORMAL': 'Normal',
  };

  const formatBloodType = (val) => DB_TO_UI_BLOOD[val] || val || '—';
  const formatUrgency = (val) => DB_TO_UI_URGENCY[val] || val || '—';

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const badgeFor = (status) => {
    const s = String(status || '').toUpperCase();
    let cls = 'active';
    let label = status || '—';

    if (s === 'PENDING') {
      cls = 'pending';
      label = 'Pending';
    } else if (s === 'APPROVED' || s === 'PROCESSING') {
      cls = 'approved';
      label = 'In Progress';
    } else if (s === 'FULFILLED') {
      cls = 'fulfilled';
      label = 'Fulfilled';
    } else if (s === 'CANCELLED') {
      cls = 'cancelled';
      label = 'Cancelled';
    } else if (s === 'REJECTED') {
      cls = 'rejected';
      label = 'Rejected';
    } else if (s === 'ACCEPTED') {
      cls = 'accepted';
      label = 'Accepted';
    } else if (s === 'DECLINED') {
      cls = 'declined';
      label = 'Declined';
    }

    return el('span', { class: `badge ${cls}`, text: label });
  };

  // ------------------------------------------------------------------
  // REAL API CALLS
  // ------------------------------------------------------------------
  let cachedProfile = null;

  async function fetchHospitalProfile() {
    const res = await api.get('/hospitals/profile');
    if (!res.success) {
      throw new Error(res.message || 'Failed to load hospital profile');
    }
    cachedProfile = res.data;
    return res.data;
  }

  async function fetchDashboardStats() {
    const res = await api.get('/hospitals/dashboard');
    if (!res.success) {
      throw new Error(res.message || 'Failed to load dashboard data');
    }
    return res.data;
  }

  async function fetchMyRequests(statusFilter = '') {
    const params = {};
    if (statusFilter === 'active') params.status = 'PENDING';
    else if (statusFilter === 'inProgress') params.status = 'APPROVED';
    else if (statusFilter === 'completed') params.status = 'FULFILLED';
    else if (statusFilter === 'cancelled') params.status = 'CANCELLED';

    const res = await api.get('/hospitals/requests', params);
    if (!res.success) {
      throw new Error(res.message || 'Failed to load requests');
    }
    return res.data.requests || [];
  }

  async function fetchDonationsApi() {
    const res = await api.get('/hospitals/donations');
    if (!res.success) {
      throw new Error(res.message || 'Failed to load donations history');
    }
    return res.data?.donations || [];
  }

  async function fetchHospitalStatsApi() {
    const res = await api.get('/hospitals/stats');
    if (!res.success) {
      throw new Error(res.message || 'Failed to load hospital statistics');
    }
    return res.data || {};
  }

  async function createBloodRequestApi(data) {
    const res = await api.post('/hospitals/requests', data);
    if (!res.success) {
      const errDetail = res.errors ? res.errors.map(e => e.msg).join(', ') : res.message;
      throw new Error(errDetail || 'Failed to create blood request');
    }
    return res.data;
  }

  async function updateProfileApi(data) {
    const res = await api.put('/hospitals/profile', data);
    if (!res.success) {
      const errDetail = res.errors ? res.errors.map(e => e.msg).join(', ') : res.message;
      throw new Error(errDetail || 'Failed to update profile');
    }
    return res.data;
  }

  async function cancelRequestApi(id) {
    const res = await api.put(`/hospitals/requests/${id}/cancel`, { notes: 'Cancelled by hospital' });
    if (!res.success) {
      throw new Error(res.message || 'Failed to cancel request');
    }
    return res.data;
  }

  // ------------------------------------------------------------------
  // MOBILE SIDEBAR HAMBURGER NAVIGATION
  // ------------------------------------------------------------------
  const hamburgerBtn = $('#hamburger-btn');
  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebar-overlay');

  function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('open');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('open');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
  }

  hamburgerBtn?.addEventListener('click', toggleSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);

  // Topbar hospital account navigation to profile
  const topbarAccount = $('#topbar-hospital-account');
  topbarAccount?.addEventListener('click', () => showPage('profile'));

  // ------------------------------------------------------------------
  // NAVIGATION & PAGE ROUTING
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

    $$('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    $$('.page').forEach((p) => {
      p.classList.toggle('active-page', p.id === pageId);
    });

    closeSidebar();
    loadPageData(pageId);
    window.scrollTo(0, 0);
  }

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  $$('[data-page-target]').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.pageTarget));
  });

  function safeLoad(fn, onError) {
    return fn().catch((err) => {
      console.error(err);
      if (onError) onError(err);
      else showToast(err.message || 'An error occurred', 'error');
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
  // DASHBOARD PAGE
  // ------------------------------------------------------------------
  function loadDashboard() {
    // 1. Profile header update
    safeLoad(fetchHospitalProfile).then((profile) => {
      if (!profile) return;
      const hospitalName = profile.hospitalName || profile.user?.name || 'Hospital';
      $('#hospital-name').textContent = hospitalName;
      $('#welcome-hospital-name').textContent = hospitalName;
      $('#hospital-avatar').textContent = hospitalName.charAt(0).toUpperCase();

      // Default location in create request form if empty
      const locInput = $('#location');
      if (locInput && !locInput.value) {
        locInput.value = profile.city || profile.address || '';
      }
    });

    // 2. Dashboard Stats & Lists
    safeLoad(fetchDashboardStats).then((data) => {
      if (!data) return;
      const stats = data.stats || {};
      const recentRequests = data.recentRequests || [];

      // Stat cards
      $('#stat-total-requests').textContent = stats.totalRequests ?? 0;
      $('#stat-active-requests').textContent = stats.activeRequests ?? 0;
      $('#stat-total-responses').textContent = stats.approvedRequests ?? 0;
      $('#stat-completed-donations').textContent = stats.totalDonations ?? 0;

      // Status Overview breakdown
      const active = stats.pendingRequests || 0;
      const inProgress = stats.approvedRequests || 0;
      const completed = stats.fulfilledRequests || 0;
      const total = active + inProgress + completed;

      $('#status-total').textContent = total;

      const activePct = total ? Math.round((active / total) * 100) : 0;
      const inProgressPct = total ? Math.round((inProgress / total) * 100) : 0;
      const completedPct = total ? Math.round((completed / total) * 100) : 0;

      $('#status-active').textContent = `${active} (${activePct}%)`;
      $('#status-inProgress').textContent = `${inProgress} (${inProgressPct}%)`;
      $('#status-completed').textContent = `${completed} (${completedPct}%)`;

      const chart = $('.donut-chart');
      if (chart) {
        if (total > 0) {
          const actDeg = (active / total) * 100;
          const progDeg = actDeg + (inProgress / total) * 100;
          chart.style.background = `conic-gradient(
            #d71920 0% ${actDeg}%,
            #f59e0b ${actDeg}% ${progDeg}%,
            #16a34a ${progDeg}% 100%
          )`;
        } else {
          chart.style.background = '#e5e7eb';
        }
      }

      // Recent Requests List
      const list = $('#recent-requests-list');
      if (list) {
        list.innerHTML = '';
        if (recentRequests.length === 0) {
          list.appendChild(el('p', { class: 'loading-hint', text: 'No recent requests.' }));
        } else {
          recentRequests.forEach((r) => {
            const row = el('div', { class: 'request-row' }, [
              el('span', { class: 'blood', text: formatBloodType(r.bloodType) }),
              el('span', { text: `${r.unitsRequired ?? '—'} Units • ${formatUrgency(r.urgency)}` }),
              el('span', { text: r.location || '—' }),
              el('span', { text: formatDate(r.createdAt) }),
              badgeFor(r.status)
            ]);
            list.appendChild(row);
          });
        }
      }

      // Urgent Requests Table
      const urgentRequests = recentRequests.filter(
        (r) => r.urgency === 'URGENT' || r.urgency === 'CRITICAL_EMERGENCY'
      );
      const tbody = $('#urgent-requests-body');
      if (tbody) {
        tbody.innerHTML = '';
        if (urgentRequests.length === 0) {
          tbody.appendChild(emptyRow(7, 'No urgent requests right now.'));
        } else {
          urgentRequests.forEach((r) => {
            const tr = el('tr');
            tr.appendChild(el('td', { text: formatBloodType(r.bloodType) }));
            tr.appendChild(el('td', { text: `${r.unitsRequired || '—'} Units` }));
            tr.appendChild(el('td', { text: formatUrgency(r.urgency) }));
            tr.appendChild(el('td', { text: cachedProfile?.hospitalName || 'My Hospital' }));
            tr.appendChild(el('td', { text: r.location || '—' }));
            tr.appendChild(el('td', { text: formatDate(r.createdAt) }));
            
            const actTd = el('td');
            if (['PENDING', 'APPROVED'].includes(r.status)) {
              const cancelBtn = el('button', { class: 'btn-danger btn-sm', text: 'Cancel' });
              cancelBtn.addEventListener('click', () => handleCancelRequest(r.id));
              actTd.appendChild(cancelBtn);
            } else {
              actTd.appendChild(el('span', { text: '—' }));
            }
            tr.appendChild(actTd);

            tbody.appendChild(tr);
          });
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // MY REQUESTS PAGE
  // ------------------------------------------------------------------
  let cachedMyRequests = [];
  let currentMyRequestsTab = '';

  function renderMyRequestsTable() {
    const tbody = $('#my-requests-body');
    if (!tbody) return;

    const query = ($('#my-requests-search')?.value || '').trim().toLowerCase();

    let filtered = cachedMyRequests;

    if (currentMyRequestsTab === 'active') {
      filtered = filtered.filter(r => r.status === 'PENDING');
    } else if (currentMyRequestsTab === 'inProgress') {
      filtered = filtered.filter(r => r.status === 'APPROVED' || r.status === 'PROCESSING');
    } else if (currentMyRequestsTab === 'completed') {
      filtered = filtered.filter(r => r.status === 'FULFILLED');
    } else if (currentMyRequestsTab === 'cancelled') {
      filtered = filtered.filter(r => r.status === 'CANCELLED');
    }

    if (query) {
      filtered = filtered.filter(r => {
        const bloodUI = formatBloodType(r.bloodType).toLowerCase();
        const bloodDB = String(r.bloodType || '').toLowerCase();
        const urgencyUI = formatUrgency(r.urgency).toLowerCase();
        const urgencyDB = String(r.urgency || '').toLowerCase();
        const location = String(r.location || '').toLowerCase();
        const description = String(r.description || '').toLowerCase();
        const patientInfo = String(r.patientInfo || '').toLowerCase();

        return bloodUI.includes(query) ||
               bloodDB.includes(query) ||
               urgencyUI.includes(query) ||
               urgencyDB.includes(query) ||
               location.includes(query) ||
               description.includes(query) ||
               patientInfo.includes(query);
      });
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.appendChild(emptyRow(7, 'No matching requests found.'));
      return;
    }

    filtered.forEach((r) => {
      const actTd = el('td');
      if (['PENDING', 'APPROVED'].includes(r.status)) {
        const cancelBtn = el('button', { class: 'btn-danger btn-sm', text: 'Cancel' });
        cancelBtn.addEventListener('click', () => handleCancelRequest(r.id));
        actTd.appendChild(cancelBtn);
      } else {
        actTd.appendChild(el('span', { text: '—' }));
      }

      const tr = el('tr', {}, [
        el('td', { text: formatBloodType(r.bloodType) }),
        el('td', { text: `${r.unitsRequired || '—'} Units` }),
        el('td', { text: formatUrgency(r.urgency) }),
        el('td', { text: r.location || '—' }),
        el('td').appendChild(badgeFor(r.status)),
        el('td', { text: formatDate(r.createdAt) }),
        actTd
      ]);

      tbody.appendChild(tr);
    });
  }

  function loadMyRequests(filter) {
    currentMyRequestsTab = filter;
    const tbody = $('#my-requests-body');
    if (!tbody) return;

    if (cachedMyRequests.length === 0) {
      tbody.innerHTML = '';
      tbody.appendChild(loadingRow(7, 'Loading requests...'));
    }

    safeLoad(() => fetchMyRequests('')).then((requests) => {
      cachedMyRequests = requests || [];
      renderMyRequestsTable();
    });
  }

  $('#my-requests-search')?.addEventListener('input', renderMyRequestsTable);

  function handleCancelRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this blood request?')) return;
    safeLoad(() => cancelRequestApi(requestId)).then(() => {
      showToast('Blood request cancelled successfully.', 'success');
      cachedMyRequests = [];
      loadMyRequests(currentMyRequestsTab);
      loadDashboard();
    });
  }

  // Wire filter tabs for My Requests
  $('#my-requests-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#my-requests-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadMyRequests(tab.dataset.filter || '');
  });

  // ------------------------------------------------------------------
  // RESPONSES & DONATIONS PAGE
  // ------------------------------------------------------------------
  let cachedResponses = [];
  let currentResponsesTab = '';

  function renderResponsesTable() {
    const tbody = $('#responses-body');
    if (!tbody) return;

    const query = ($('#responses-search')?.value || '').trim().toLowerCase();

    let filtered = cachedResponses;

    if (currentResponsesTab === 'new') filtered = cachedResponses.filter(r => r.status === 'ACCEPTED');
    else if (currentResponsesTab === 'declined') filtered = cachedResponses.filter(r => r.status === 'DECLINED');
    else if (currentResponsesTab === 'confirmed') filtered = cachedResponses.filter(r => r.status === 'CONFIRMED');

    if (query) {
      filtered = filtered.filter(r => {
        const donorName = String(r.donorName || '').toLowerCase();
        const donorEmail = String(r.donorEmail || '').toLowerCase();
        const donorPhone = String(r.donorPhone || '').toLowerCase();
        const status = String(r.status || '').toLowerCase();
        const bloodType = String(r.bloodType || '').toLowerCase();

        return donorName.includes(query) ||
               donorEmail.includes(query) ||
               donorPhone.includes(query) ||
               status.includes(query) ||
               bloodType.includes(query);
      });
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.appendChild(emptyRow(5, 'No matching responses recorded.'));
      return;
    }

    filtered.forEach((r) => {
      const donorCell = el('div', {}, [
        el('strong', { text: r.donorName }),
        el('div', { text: `📞 ${r.donorPhone}`, style: 'font-size: 12px; color: #4b5563;' }),
        el('div', { text: `✉ ${r.donorEmail}`, style: 'font-size: 11px; color: #6b7280;' })
      ]);

      const tr = el('tr', {}, [
        el('td').appendChild(donorCell),
        el('td', { text: r.bloodType }),
        el('td', { text: r.request }),
        el('td', { text: formatDate(r.respondedOn) }),
        el('td').appendChild(badgeFor(r.status))
      ]);

      tbody.appendChild(tr);
    });
  }

  function loadResponses(filterTab) {
    currentResponsesTab = filterTab;
    const tbody = $('#responses-body');
    if (!tbody) return;

    if (cachedResponses.length === 0) {
      tbody.innerHTML = '';
      tbody.appendChild(loadingRow(5, 'Loading responses...'));
    }

    safeLoad(() => fetchMyRequests('')).then((requests) => {
      const allResponses = [];
      (requests || []).forEach((reqItem) => {
        if (reqItem.donorResponses && Array.isArray(reqItem.donorResponses)) {
          reqItem.donorResponses.forEach((resp) => {
            allResponses.push({
              donorName: resp.donor?.user?.name || 'Anonymous Donor',
              donorPhone: resp.donor?.user?.phone || 'N/A',
              donorEmail: resp.donor?.user?.email || 'N/A',
              bloodType: formatBloodType(reqItem.bloodType),
              request: `${reqItem.unitsRequired} units (${formatUrgency(reqItem.urgency)})`,
              respondedOn: resp.respondedAt || resp.createdAt,
              status: resp.response || 'ACCEPTED',
            });
          });
        }
      });
      cachedResponses = allResponses;
      renderResponsesTable();
    });

    loadCompletedDonations();
  }

  $('#responses-search')?.addEventListener('input', renderResponsesTable);

  function loadCompletedDonations() {
    const tbody = $('#donations-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    tbody.appendChild(loadingRow(6, 'Loading completed donations...'));

    safeLoad(fetchDonationsApi).then((donations) => {
      tbody.innerHTML = '';
      if (!donations || donations.length === 0) {
        tbody.appendChild(emptyRow(6, 'No completed donations recorded yet.'));
        return;
      }

      donations.forEach((d) => {
        const donorCell = el('div', {}, [
          el('strong', { text: d.donor?.user?.name || 'Donor' }),
          el('div', { text: `📞 ${d.donor?.user?.phone || 'N/A'}`, style: 'font-size: 12px; color: #4b5563;' }),
          el('div', { text: `✉ ${d.donor?.user?.email || 'N/A'}`, style: 'font-size: 11px; color: #6b7280;' })
        ]);

        const tr = el('tr', {}, [
          el('td').appendChild(donorCell),
          el('td', { text: formatBloodType(d.bloodType) }),
          el('td', { text: `${d.units || 1} Units` }),
          el('td', { text: formatDate(d.donationDate || d.createdAt) }),
          el('td', { text: d.bloodBank?.user?.name || 'Blood Bank' }),
          el('td').appendChild(badgeFor(d.status || 'COMPLETED'))
        ]);

        tbody.appendChild(tr);
      });
    });
  }

  $('#responses-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#responses-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    loadResponses(tab.dataset.filter || '');
  });

  // ------------------------------------------------------------------
  // PROFILE PAGE
  // ------------------------------------------------------------------
  function loadProfile() {
    safeLoad(fetchHospitalProfile).then((profile) => {
      if (!profile) return;
      $('#profile-name').textContent = profile.hospitalName || profile.user?.name || '—';
      $('#profile-type').textContent = profile.hospitalType || 'Hospital';
      $('#profile-license').textContent = profile.licenseNumber || '—';
      $('#profile-established').textContent = profile.createdAt ? new Date(profile.createdAt).getFullYear() : '—';
      $('#profile-phone').textContent = profile.phone || profile.user?.phone || '—';
      $('#profile-emergency').textContent = profile.emergencyContact || '—';
      $('#profile-email').textContent = profile.user?.email || '—';
      $('#profile-address').textContent = profile.address || '—';
      $('#profile-city').textContent = profile.city || '—';
      $('#profile-state-country').textContent = `${profile.state || ''}, ${profile.country || ''}`.trim().replace(/^,|,$/g, '') || '—';

      const vStatus = $('#verification-status');
      if (vStatus) {
        const verified = profile.verificationStatus === 'VERIFIED';
        vStatus.innerHTML = '';
        vStatus.appendChild(
          el('strong', {
            text: verified ? '✓ Verified Hospital' : profile.verificationStatus || 'Pending Verification',
          })
        );
        vStatus.appendChild(
          el('p', {
            text: verified
              ? 'Your hospital profile has been verified by the LifeLink administration.'
              : 'Your hospital verification is pending. Admin review required.',
          })
        );
        vStatus.appendChild(
          el('small', {
            text: profile.verifiedAt ? `Verified on: ${formatDate(profile.verifiedAt)}` : 'Status: ' + (profile.verificationStatus || 'PENDING'),
          })
        );
      }
    });

    safeLoad(fetchDashboardStats).then((data) => {
      if (!data) return;
      const stats = data.stats || {};
      $('#profile-stat-total-requests').textContent = stats.totalRequests ?? '—';
      $('#profile-stat-total-responses').textContent = stats.approvedRequests ?? '—';
      $('#profile-stat-completed-donations').textContent = stats.totalDonations ?? '—';

      // Fulfillment Rate calculated from stats
      const total = stats.totalRequests || 0;
      const fulfilled = stats.fulfilledRequests || 0;
      if (total > 0) {
        const rate = Math.round((fulfilled / total) * 100);
        $('#profile-stat-fulfillment-rate').textContent = `${rate}% (${fulfilled}/${total})`;
      } else {
        $('#profile-stat-fulfillment-rate').textContent = '0% (0/0)';
      }
    });

    // Average Response Time calculated from hospital request history
    safeLoad(() => fetchMyRequests('')).then((requests) => {
      if (!requests || requests.length === 0) {
        $('#profile-stat-avg-response').textContent = 'N/A';
        return;
      }

      let totalDiffSec = 0;
      let approvedCount = 0;

      requests.forEach((r) => {
        let approvedTime = r.approvedAt;
        if (!approvedTime && Array.isArray(r.statusHistory)) {
          const appEntry = r.statusHistory.find((s) => s.status === 'APPROVED');
          if (appEntry && appEntry.timestamp) approvedTime = appEntry.timestamp;
        }

        if (approvedTime && r.createdAt) {
          const tCreated = new Date(r.createdAt).getTime();
          const tApproved = new Date(approvedTime).getTime();
          if (!isNaN(tCreated) && !isNaN(tApproved) && tApproved >= tCreated) {
            totalDiffSec += (tApproved - tCreated) / 1000;
            approvedCount++;
          }
        }
      });

      if (approvedCount > 0) {
        const avgSec = totalDiffSec / approvedCount;
        if (avgSec < 60) {
          $('#profile-stat-avg-response').textContent = `${Math.round(avgSec)} secs`;
        } else if (avgSec < 3600) {
          $('#profile-stat-avg-response').textContent = `${Math.round(avgSec / 60)} mins`;
        } else {
          $('#profile-stat-avg-response').textContent = `${(avgSec / 3600).toFixed(1)} hrs`;
        }
      } else {
        $('#profile-stat-avg-response').textContent = 'N/A';
      }
    });

    // Also attempt backend stats endpoint if available
    fetchHospitalStatsApi().then((statsData) => {
      if (!statsData) return;
      const fulfillment = statsData.fulfillmentRate;
      if (fulfillment && fulfillment.total > 0) {
        const rate = Math.round((fulfillment.fulfilled / fulfillment.total) * 100);
        $('#profile-stat-fulfillment-rate').textContent = `${rate}% (${fulfillment.fulfilled}/${fulfillment.total})`;
      }

      const avgSec = statsData.avgResponseTime;
      if (avgSec && avgSec > 0) {
        if (avgSec < 60) {
          $('#profile-stat-avg-response').textContent = `${Math.round(avgSec)} secs`;
        } else if (avgSec < 3600) {
          $('#profile-stat-avg-response').textContent = `${Math.round(avgSec / 60)} mins`;
        } else {
          $('#profile-stat-avg-response').textContent = `${(avgSec / 3600).toFixed(1)} hrs`;
        }
      }
    }).catch(() => {
      // Suppress error if raw query stats API endpoint fails on backend
    });
  }

  // ------------------------------------------------------------------
  // EDIT PROFILE MODAL
  // ------------------------------------------------------------------
  const profileModal = $('#edit-profile-modal');
  
  function openEditProfileModal() {
    if (!profileModal) return;
    if (cachedProfile) {
      $('#edit-hospital-name').value = cachedProfile.hospitalName || '';
      $('#edit-phone').value = cachedProfile.phone || '';
      $('#edit-emergency-contact').value = cachedProfile.emergencyContact || '';
      $('#edit-address').value = cachedProfile.address || '';
      $('#edit-city').value = cachedProfile.city || '';
    }
    profileModal.style.display = 'flex';
  }

  function closeEditProfileModal() {
    if (profileModal) profileModal.style.display = 'none';
  }

  $('#edit-profile-btn')?.addEventListener('click', openEditProfileModal);
  $('#close-profile-modal')?.addEventListener('click', closeEditProfileModal);
  $('#cancel-profile-modal')?.addEventListener('click', closeEditProfileModal);

  $('#edit-profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      hospitalName: $('#edit-hospital-name').value,
      phone: $('#edit-phone').value,
      emergencyContact: $('#edit-emergency-contact').value,
      address: $('#edit-address').value,
      city: $('#edit-city').value,
    };

    safeLoad(() => updateProfileApi(data)).then(() => {
      showToast('Profile updated successfully!', 'success');
      closeEditProfileModal();
      loadProfile();
      loadDashboard();
    });
  });

  // ------------------------------------------------------------------
  // SETTINGS PAGE
  // ------------------------------------------------------------------
  function loadSettings() {
    safeLoad(fetchHospitalProfile).then((profile) => {
      if (!profile) return;
      $('#settings-name').textContent = profile.hospitalName || '—';
      $('#settings-email').textContent = profile.user?.email || '—';
      $('#settings-phone').textContent = profile.phone || '—';
      $('#settings-contact').textContent = profile.emergencyContact || profile.user?.name || '—';
    });

    // Load saved notification preferences from localStorage
    const savedPrefs = localStorage.getItem('hospital_notification_prefs');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        $$('#settings-notifications .switch input').forEach((input) => {
          if (prefs[input.dataset.pref] !== undefined) {
            input.checked = prefs[input.dataset.pref];
          }
        });
      } catch (err) {
        console.error('Error parsing notification prefs:', err);
      }
    }
  }

  $('#settings-tabs')?.addEventListener('click', (e) => {
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

  $('#update-info-btn')?.addEventListener('click', openEditProfileModal);

  $('#save-prefs-btn')?.addEventListener('click', () => {
    const prefs = {};
    $$('#settings-notifications .switch input').forEach((input) => {
      prefs[input.dataset.pref] = input.checked;
    });
    localStorage.setItem('hospital_notification_prefs', JSON.stringify(prefs));
    showToast('Notification preferences saved.', 'success');
  });

  $('#password-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPassword = $('#new-password').value;
    const confirmPassword = $('#confirm-password').value;

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    showToast('Password change API is not supported in current backend version.', 'info');
    $('#password-form').reset();
  });

  // ------------------------------------------------------------------
  // CREATE REQUEST FORM
  // ------------------------------------------------------------------
  $('#blood-request-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const rawBlood = $('#blood-type').value;
    const rawUrgency = $('#urgency').value;
    const units = parseInt($('#units').value, 10);
    const location = $('#location').value;
    const description = $('#description').value;

    if (!rawBlood || !rawUrgency || isNaN(units) || units < 1 || !location) {
      showToast('Please fill in all required fields accurately.', 'error');
      return;
    }

    const payload = {
      bloodType: UI_TO_DB_BLOOD[rawBlood] || rawBlood,
      unitsRequired: units,
      urgency: UI_TO_DB_URGENCY[rawUrgency] || rawUrgency,
      location: location,
      description: description || undefined,
      contactInformation: cachedProfile?.phone || undefined,
    };

    safeLoad(() => createBloodRequestApi(payload)).then(() => {
      showToast('Blood request created successfully!', 'success');
      $('#blood-request-form').reset();
      showPage('my-requests');
    });
  });

  // ------------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------------
  $('#logout-btn')?.addEventListener('click', () => {
    api.logout();
  });

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadPageData('dashboard'));
  } else {
    loadPageData('dashboard');
  }
})();
