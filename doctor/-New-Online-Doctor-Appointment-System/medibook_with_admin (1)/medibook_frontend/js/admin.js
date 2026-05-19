/* =============================================
   MediBook - Admin Dashboard Logic
   File: js/admin.js
   Requires: app.js
============================================= */

/* ── STATE ───────────────────────────────── */
let currentTab      = 'pending';
let currentDocFilter = 'All';
let selectedApptId  = null;

/* ── SEED DEMO DATA (if localStorage is empty) ── */
function seedDemoData() {
  const existing = Appointments.getAll();
  if (existing.length > 0) return; // already has data

  const demo = [
    {
      id: 1001,
      patient: { name: 'Ravi Sharma',    email: 'ravi@example.com',    initials: 'RS' },
      doctor:  { id: 1, name: 'Dr. Sarah Johnson',   spec: 'Cardiology',  emoji: '👩‍⚕️', fee: 80 },
      date:    new Date().toISOString().split('T')[0],
      time:    '10:00 AM',
      reason:  'Chest pain and shortness of breath',
      status:  'Pending',
    },
    {
      id: 1002,
      patient: { name: 'Priya Thapa',    email: 'priya@example.com',   initials: 'PT' },
      doctor:  { id: 4, name: 'Dr. James Williams',  spec: 'Pediatrics',  emoji: '👨‍⚕️', fee: 75 },
      date:    new Date().toISOString().split('T')[0],
      time:    '2:00 PM',
      reason:  'Child fever and rash',
      status:  'Pending',
    },
    {
      id: 1003,
      patient: { name: 'Arjun Rai',      email: 'arjun@example.com',   initials: 'AR' },
      doctor:  { id: 2, name: 'Dr. Michael Chen',    spec: 'Neurology',   emoji: '👨‍⚕️', fee: 90 },
      date:    getTomorrow(),
      time:    '11:00 AM',
      reason:  'Recurring migraines',
      status:  'Confirmed',
    },
    {
      id: 1004,
      patient: { name: 'Sita Gurung',    email: 'sita@example.com',    initials: 'SG' },
      doctor:  { id: 5, name: 'Dr. Aisha Patel',     spec: 'Orthopedics', emoji: '👩‍⚕️', fee: 95 },
      date:    getTomorrow(),
      time:    '9:00 AM',
      reason:  'Knee pain after injury',
      status:  'Pending',
    },
    {
      id: 1005,
      patient: { name: 'Bikash Karki',   email: 'bikash@example.com',  initials: 'BK' },
      doctor:  { id: 1, name: 'Dr. Sarah Johnson',   spec: 'Cardiology',  emoji: '👩‍⚕️', fee: 80 },
      date:    getYesterday(),
      time:    '3:00 PM',
      reason:  'Routine heart checkup',
      status:  'Confirmed',
    },
    {
      id: 1006,
      patient: { name: 'Meera Shrestha', email: 'meera@example.com',   initials: 'MS' },
      doctor:  { id: 7, name: 'Dr. Lisa Thompson',   spec: 'Cardiology',  emoji: '👩‍⚕️', fee: 85 },
      date:    getYesterday(),
      time:    '1:00 PM',
      reason:  'Palpitations',
      status:  'Cancelled',
    },
  ];

  localStorage.setItem(Appointments.KEY, JSON.stringify(demo));
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/* ── TAB NAVIGATION ──────────────────────── */
function showTab(tab, linkEl) {
  currentTab = tab;
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');

  const titles = {
    pending:   'Pending Appointments',
    confirmed: 'Confirmed Appointments',
    cancelled: 'Cancelled Appointments',
    all:       'All Appointments',
  };
  document.getElementById('adminTitle').textContent    = titles[tab] || 'Appointments';
  document.getElementById('adminSearch').value = '';
  renderAdminList();
}

/* ── DOCTOR FILTER ───────────────────────── */
function filterByDoctor(el, docName) {
  currentDocFilter = docName;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderAdminList();
}

/* ── RENDER ──────────────────────────────── */
function renderAdminList() {
  const list   = document.getElementById('adminList');
  const search = (document.getElementById('adminSearch')?.value || '').toLowerCase();

  let appts = Appointments.getAll();

  // filter by tab
  if (currentTab !== 'all') {
    appts = appts.filter(a => a.status.toLowerCase() === currentTab);
  }

  // filter by doctor chip
  if (currentDocFilter !== 'All') {
    appts = appts.filter(a => a.doctor?.name === currentDocFilter);
  }

  // search
  if (search) {
    appts = appts.filter(a =>
      (a.patient?.name  || '').toLowerCase().includes(search) ||
      (a.reason         || '').toLowerCase().includes(search) ||
      (a.doctor?.name   || '').toLowerCase().includes(search)
    );
  }

  updateCounts();
  buildDoctorChips();

  if (!appts.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="big">🗓</div>
        <p>No appointments found.</p>
      </div>`;
    return;
  }

  list.innerHTML = appts.map(a => {
    const status    = a.status || 'Pending';
    const statusCls = status.toLowerCase();
    const patient   = a.patient?.name || 'Patient';
    const initials  = a.patient?.initials || patient.slice(0, 2).toUpperCase();

    return `
    <div class="admin-appt-card ${statusCls}" onclick="openDetail(${a.id})">
      <div class="admin-card-avatar">${initials}</div>
      <div class="admin-card-info">
        <div class="admin-card-patient">${patient}</div>
        <div class="admin-card-doc">${a.doctor?.spec || ''} · ${a.doctor?.name || ''}</div>
        <div class="admin-card-meta">
          <span>📅 ${formatDate(a.date)}</span>
          <span>⏰ ${a.time}</span>
          <span>💬 ${a.reason || '—'}</span>
        </div>
      </div>
      <div class="admin-card-right">
        <span class="status-badge ${statusCls}">${status}</span>
        <div class="admin-card-actions" onclick="event.stopPropagation()">
          ${status === 'Pending' ? `
            <button class="btn-approve" onclick="approveAppt(${a.id})">✓ Approve</button>
            <button class="btn-reject"  onclick="rejectAppt(${a.id})">✗ Reject</button>
          ` : `
            <button class="btn-view" onclick="openDetail(${a.id})">View Details</button>
          `}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── COUNTS & CHIPS ──────────────────────── */
function updateCounts() {
  const all  = Appointments.getAll();
  const by   = s => all.filter(a => a.status.toLowerCase() === s).length;

  document.getElementById('countPending').textContent   = by('pending');
  document.getElementById('countConfirmed').textContent = by('confirmed');
  document.getElementById('countCancelled').textContent = by('cancelled');
  document.getElementById('countAll').textContent       = all.length;

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  document.getElementById('statToday').textContent =
    all.filter(a => a.date === today).length;
  document.getElementById('statWeek').textContent  =
    all.filter(a => new Date(a.date) >= weekAgo).length;
}

function buildDoctorChips() {
  const all     = Appointments.getAll();
  const doctors = [...new Set(all.map(a => a.doctor?.name).filter(Boolean))];
  const wrap    = document.getElementById('adminFilters');

  // preserve All chip's active state
  const activeName = currentDocFilter;

  wrap.innerHTML = `<div class="filter-chip ${activeName === 'All' ? 'active' : ''}"
    onclick="filterByDoctor(this, 'All')">All Doctors</div>` +
    doctors.map(name => `
      <div class="filter-chip ${activeName === name ? 'active' : ''}"
        onclick="filterByDoctor(this, '${name}')">${name}</div>
    `).join('');
}

/* ── APPROVE / REJECT ────────────────────── */
function approveAppt(id) {
  Appointments.setStatus(id, 'Confirmed');
  showToast('Appointment confirmed! ✅');
  renderAdminList();
}

function rejectAppt(id) {
  if (!confirm('Reject this appointment?')) return;
  Appointments.setStatus(id, 'Cancelled');
  showToast('Appointment rejected.', '❌');
  renderAdminList();
}

/* ── DETAIL MODAL ────────────────────────── */
function openDetail(id) {
  selectedApptId = id;
  const a = Appointments.getAll().find(x => x.id === id);
  if (!a) return;

  const status    = a.status || 'Pending';
  const patient   = a.patient?.name || 'Patient';
  const initials  = a.patient?.initials || patient.slice(0, 2).toUpperCase();

  document.getElementById('detailAvatar').textContent  = initials;
  document.getElementById('detailPatient').textContent = patient;
  document.getElementById('detailDoc').textContent     = `${a.doctor?.name} · ${a.doctor?.spec}`;
  document.getElementById('detailDate').textContent    = formatDate(a.date);
  document.getElementById('detailTime').textContent    = a.time;
  document.getElementById('detailReason').textContent  = a.reason || '—';
  document.getElementById('detailFee').textContent     = `$${a.doctor?.fee}`;
  document.getElementById('detailId').textContent      = `#${a.id}`;
  document.getElementById('detailNotes').value         = a.notes || '';

  document.getElementById('detailStatus').innerHTML =
    `<span class="status-badge ${status.toLowerCase()}">${status}</span>`;

  const actions = document.getElementById('detailActions');
  if (status === 'Pending') {
    actions.innerHTML = `
      <button class="modal-btn-approve" onclick="modalApprove()">✓ Approve</button>
      <button class="modal-btn-reject"  onclick="modalReject()">✗ Reject</button>
      <button class="modal-btn-close"   onclick="closeDetailModal()">Close</button>`;
  } else {
    actions.innerHTML = `
      <button class="modal-btn-close" style="flex:1" onclick="closeDetailModal()">Close</button>`;
  }

  document.getElementById('detailModal').classList.add('open');
}

function modalApprove() {
  Appointments.saveNote(selectedApptId, document.getElementById('detailNotes').value);
  approveAppt(selectedApptId);
  closeDetailModal();
}

function modalReject() {
  Appointments.saveNote(selectedApptId, document.getElementById('detailNotes').value);
  rejectAppt(selectedApptId);
  closeDetailModal();
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
  selectedApptId = null;
}

/* ── DATE FORMATTER ──────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Must be logged in
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = Auth.getUser();
  document.getElementById('sidebarDocName').textContent =
    'Dr. ' + (user.name || 'Admin');

  seedDemoData();
  updateCounts();
  buildDoctorChips();
  renderAdminList();
});
