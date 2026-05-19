/* =============================================
   MediBook - Appointments Page Logic
   File: js/appointments.js
   Requires: app.js
============================================= */

/* ── RENDER APPOINTMENTS ─────────────────── */
function renderAppointments() {
  const list = document.getElementById('apptList');
  if (!list) return;

  // Must be logged in
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const appointments = Appointments.getAll();

  if (!appointments.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="big">📅</div>
        <p>You have no appointments yet.<br>Find a doctor and book one!</p>
        <a href="index.html" class="btn">Browse Doctors</a>
      </div>`;
    return;
  }

  list.innerHTML = appointments.map(a => `
    <div class="appt-card" id="appt-${a.id}">
      <div class="appt-avatar">${a.doctor.emoji}</div>
      <div class="appt-info">
        <div class="appt-name">${a.doctor.name}</div>
        <div class="appt-spec">${a.doctor.spec}</div>
        <div class="appt-time">
          ${formatDate(a.date)} &nbsp;|&nbsp;
          ${a.time} &nbsp;|&nbsp;
          ${a.reason}
        </div>
      </div>
      <div class="appt-right">
        <span class="appt-status ${a.status.toLowerCase()}">${a.status}</span>
        <div class="appt-fee">$${a.doctor.fee}</div>
        ${(a.status === 'Confirmed' || a.status === 'Pending')
          ? `<button class="btn-cancel" onclick="cancelAppointment(${a.id})">Cancel</button>`
          : ''}
      </div>
    </div>`).join('');
}

/* ── CANCEL ──────────────────────────────── */
function cancelAppointment(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  Appointments.cancel(id);
  showToast('Appointment cancelled.');
  renderAppointments();
}

/* ── DATE FORMATTER ──────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderAppointments();
});