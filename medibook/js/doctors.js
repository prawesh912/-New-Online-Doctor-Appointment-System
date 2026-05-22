/* =============================================
   MediBook - Doctors Page Logic
   File: js/doctors.js
   Requires: app.js
============================================= */

/* ── DOCTOR DATA ─────────────────────────── */
const DOCTORS = [
  { id: 1, name: 'Dr. Sarah Johnson',    spec: 'Cardiology',   emoji: '👩‍⚕️', exp: '12 years', rating: 4.9, reviews: 128, fee: 80,  avail: true,  color: '#dbeafe' },
  { id: 2, name: 'Dr. Michael Chen',     spec: 'Neurology',    emoji: '👨‍⚕️', exp: '9 years',  rating: 4.8, reviews: 94,  fee: 90,  avail: true,  color: '#ede9fe' },
  { id: 3, name: 'Dr. Emily Rodriguez',  spec: 'Dentistry',    emoji: '👩‍⚕️', exp: '7 years',  rating: 4.7, reviews: 76,  fee: 60,  avail: false, color: '#fce7f3' },
  { id: 4, name: 'Dr. James Williams',   spec: 'Pediatrics',   emoji: '👨‍⚕️', exp: '15 years', rating: 5.0, reviews: 210, fee: 75,  avail: true,  color: '#d1fae5' },
  { id: 5, name: 'Dr. Aisha Patel',      spec: 'Orthopedics',  emoji: '👩‍⚕️', exp: '11 years', rating: 4.9, reviews: 143, fee: 95,  avail: true,  color: '#fef3c7' },
  { id: 6, name: 'Dr. Robert Kim',       spec: 'Dermatology',  emoji: '👨‍⚕️', exp: '8 years',  rating: 4.6, reviews: 88,  fee: 70,  avail: false, color: '#ffedd5' },
  { id: 7, name: 'Dr. Lisa Thompson',    spec: 'Cardiology',   emoji: '👩‍⚕️', exp: '14 years', rating: 4.8, reviews: 162, fee: 85,  avail: true,  color: '#dbeafe' },
  { id: 8, name: 'Dr. David Okafor',     spec: 'Neurology',    emoji: '👨‍⚕️', exp: '6 years',  rating: 4.7, reviews: 55,  fee: 85,  avail: true,  color: '#ede9fe' },
];

const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:00 PM',  '3:00 PM',
  '4:00 PM', '5:00 PM',
];

/* ── STATE ───────────────────────────────── */
let activeSpec     = 'All';
let selectedDoctor = null;
let selectedSlot   = null;

/* ── RENDER DOCTORS ──────────────────────── */
function renderDoctors(list) {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="big">🔍</div>
        <p>No doctors found matching your search.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(d => `
    <div class="doc-card" onclick="openBookingModal(${d.id})">
      <div class="doc-img" style="background:${d.color}">
        <span>${d.emoji}</span>
        <span class="doc-avail ${d.avail ? '' : 'busy'}">${d.avail ? 'Available' : 'Busy'}</span>
      </div>
      <div class="doc-body">
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec">${d.spec}</div>
        <div class="doc-info">
          <span>🎓 ${d.exp}</span>
          <span><span class="stars">★</span> ${d.rating} (${d.reviews})</span>
        </div>
        <div class="doc-footer">
          <div class="doc-fee">$${d.fee} / visit</div>
          <button class="btn sm"
            onclick="event.stopPropagation(); openBookingModal(${d.id})">
            Book Now
          </button>
        </div>
      </div>
    </div>`).join('');
}

/* ── FILTER ──────────────────────────────── */
function filterSpec(el, spec) {
  activeSpec = spec;
  document.querySelectorAll('.spec-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterDoctors();
}

function filterDoctors() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  let list = DOCTORS;
  if (activeSpec !== 'All') list = list.filter(d => d.spec === activeSpec);
  if (q) list = list.filter(d =>
    d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q)
  );
  renderDoctors(list);
}

/* ── BOOKING MODAL ───────────────────────── */
function openBookingModal(id) {
  if (!Auth.isLoggedIn()) {
    showToast('Please sign in to book an appointment', '🔒');
    setTimeout(() => (window.location.href = 'login.html'), 800);
    return;
  }

  selectedDoctor = DOCTORS.find(d => d.id === id);
  selectedSlot   = null;

  document.getElementById('modalAvatar').textContent  = selectedDoctor.emoji;
  document.getElementById('modalSpec').textContent    = selectedDoctor.spec;
  document.getElementById('modalName').textContent    = selectedDoctor.name;
  document.getElementById('modalExp').textContent     = 'Experience: ' + selectedDoctor.exp;
  document.getElementById('modalFee').textContent     = 'Consultation fee: $' + selectedDoctor.fee;
  document.getElementById('modalRating').innerHTML    =
    `<span class="stars">★</span> ${selectedDoctor.rating} (${selectedDoctor.reviews} reviews)`;

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('bookDate');
  dateInput.value = today;
  dateInput.min   = today;

  document.getElementById('visitReason').value = '';

  // Render time slots
  document.getElementById('timeSlots').innerHTML = TIME_SLOTS.map(s =>
    `<div class="slot" onclick="selectSlot(this, '${s}')">${s}</div>`
  ).join('');

  document.getElementById('bookModal').classList.add('open');
}

function selectSlot(el, time) {
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('sel'));
  el.classList.add('sel');
  selectedSlot = time;
}

function closeModal() {
  document.getElementById('bookModal').classList.remove('open');
}

function confirmBook() {
  if (!selectedSlot) {
    showToast('Please select a time slot', '⏰');
    return;
  }

  const date   = document.getElementById('bookDate').value;
  const reason = document.getElementById('visitReason').value.trim() || 'General consultation';

  Appointments.add({
    doctor: selectedDoctor,
    date,
    time:   selectedSlot,
    reason,
    status: 'Confirmed',
  });

  closeModal();
  showToast('Appointment booked successfully!', '🎉');
}

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors(DOCTORS);
});
