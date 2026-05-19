/* =============================================
   MediBook - Doctors Page Logic (Redesign)
   File: js/doctors.js
============================================= */

const DOCTORS = [
  { id: 1, name: 'Dr. Sarah Johnson',    spec: 'Cardiology',   emoji: '👩‍⚕️', exp: '12 years', rating: 4.9, reviews: 128, fee: 80,  avail: true,  color: '#dbeafe', desc: 'Board-certified cardiologist specializing in preventive care and heart disease management.' },
  { id: 2, name: 'Dr. Michael Chen',     spec: 'Neurology',    emoji: '👨‍⚕️', exp: '9 years',  rating: 4.8, reviews: 94,  fee: 90,  avail: true,  color: '#ede9fe', desc: 'Expert in neurological disorders with a focus on migraines, epilepsy, and stroke care.' },
  { id: 3, name: 'Dr. Emily Rodriguez',  spec: 'Dentistry',    emoji: '👩‍⚕️', exp: '7 years',  rating: 4.7, reviews: 76,  fee: 60,  avail: false, color: '#fce7f3', desc: 'Experienced dentist offering comprehensive dental care including cosmetic procedures.' },
  { id: 4, name: 'Dr. James Williams',   spec: 'Pediatrics',   emoji: '👨‍⚕️', exp: '15 years', rating: 5.0, reviews: 210, fee: 75,  avail: true,  color: '#d1fae5', desc: 'Compassionate pediatrician dedicated to child health from newborns through adolescence.' },
  { id: 5, name: 'Dr. Aisha Patel',      spec: 'Orthopedics',  emoji: '👩‍⚕️', exp: '11 years', rating: 4.9, reviews: 143, fee: 95,  avail: true,  color: '#fef3c7', desc: 'Renowned for advanced orthopedic surgical techniques and patient-first rehabilitation.' },
  { id: 6, name: 'Dr. Robert Kim',       spec: 'Dermatology',  emoji: '👨‍⚕️', exp: '8 years',  rating: 4.6, reviews: 88,  fee: 70,  avail: false, color: '#ffedd5', desc: 'Skin specialist covering medical and cosmetic dermatology for all skin types.' },
  { id: 7, name: 'Dr. Lisa Thompson',    spec: 'Cardiology',   emoji: '👩‍⚕️', exp: '14 years', rating: 4.8, reviews: 162, fee: 85,  avail: true,  color: '#dbeafe', desc: 'Focuses on electrophysiology and heart rhythm management for all age groups.' },
  { id: 8, name: 'Dr. David Okafor',     spec: 'Neurology',    emoji: '👨‍⚕️', exp: '6 years',  rating: 4.7, reviews: 55,  fee: 85,  avail: true,  color: '#ede9fe', desc: 'Specializes in movement disorders, Parkinson\'s disease, and cognitive neurology.' },
];

const TIME_SLOTS = ['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'];
const NEXT_TIMES = ['Today, 2:30 PM','Today, 4:00 PM','Tomorrow, 9:00 AM','Tomorrow, 10:00 AM','Tomorrow, 3:30 PM','Oct 24, 9:00 AM','Today, 11:00 AM','Tomorrow, 1:00 PM'];

let activeSpec   = 'All';
let minRating    = 0;
let selectedDoctor = null;
let selectedSlot   = null;
let visibleCount   = 6;

/* ── RENDER ──────────────────────────────── */
function renderDoctors(list) {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;

  const count = document.getElementById('resultCount');
  if (count) {
    const specLabel = activeSpec === 'All' ? 'specialists' : activeSpec + ' specialists';
    count.textContent = `Showing ${list.length} ${specLabel}`;
  }

  const loadBtn = document.getElementById('loadMoreBtn');

  if (!list.length) {
    if (loadBtn) loadBtn.style.display = 'none';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="big">🔍</div>
        <p>No doctors found matching your filters.</p>
      </div>`;
    return;
  }

  const shown = list.slice(0, visibleCount);
  if (loadBtn) loadBtn.style.display = list.length > visibleCount ? 'inline-block' : 'none';

  grid.innerHTML = shown.map((d, i) => `
    <div class="doc-card" onclick="openBookingModal(${d.id})">
      <div class="doc-photo" style="background:${d.color}">
        <span>${d.emoji}</span>
        <div class="doc-verified-badge">✓ VERIFIED</div>
      </div>
      <div class="doc-body">
        <div class="doc-name">${d.name}</div>
        <div class="doc-spec-tag">${d.spec}</div>
        <div class="doc-desc">${d.desc}</div>
        <div class="doc-meta-row">
          <div class="doc-rating-pill">
            <span class="star-icon">★</span> ${d.rating}
          </div>
          <span style="color:var(--sub); font-size:13px;">(${d.reviews} reviews)</span>
          <span style="color:var(--sub); font-size:13px;">🎓 ${d.exp}</span>
          <div class="doc-next">
            <span>📅 Next:</span>
            <strong>${NEXT_TIMES[i % NEXT_TIMES.length]}</strong>
          </div>
        </div>
      </div>
      <div class="doc-right">
        <span class="doc-avail-badge ${d.avail ? 'available' : 'busy'}">${d.avail ? 'Available' : 'Busy'}</span>
        <div style="font-size:13px; color:var(--sub); font-weight:500;">$${d.fee} / visit</div>
        <button class="doc-book-btn" onclick="event.stopPropagation(); openBookingModal(${d.id})">
          Book Appointment
        </button>
      </div>
    </div>`).join('');
}

/* ── FILTER ──────────────────────────────── */
function filterSpec(el, spec) {
  activeSpec = spec;
  visibleCount = 6;
  document.querySelectorAll('.spec-tab').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  // sync sidebar checkboxes
  document.querySelectorAll('.filter-check input').forEach(cb => {
    cb.checked = spec !== 'All' && cb.value === spec;
  });
  filterDoctors();
}

function filterDoctors() {
  const q       = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const sort    = document.getElementById('sortSelect')?.value || 'recommended';
  const availEl = document.querySelector('input[name="avail"]:checked');
  const availVal = availEl ? availEl.value : 'all';

  // Specialty from checkboxes
  const checkedSpecs = [...document.querySelectorAll('.filter-check input:checked')].map(c => c.value);

  let list = [...DOCTORS];

  // spec from chips
  if (activeSpec !== 'All') {
    list = list.filter(d => d.spec === activeSpec);
  }

  // spec from checkboxes
  if (checkedSpecs.length) {
    list = list.filter(d => checkedSpecs.includes(d.spec));
  }

  // availability
  if (availVal === 'avail') list = list.filter(d => d.avail);
  if (availVal === 'busy')  list = list.filter(d => !d.avail);

  // rating
  if (minRating > 0) list = list.filter(d => d.rating >= minRating);

  // search
  if (q) list = list.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.spec.toLowerCase().includes(q) ||
    d.desc.toLowerCase().includes(q)
  );

  // sort
  if (sort === 'rating')   list.sort((a, b) => b.rating - a.rating);
  if (sort === 'fee_asc')  list.sort((a, b) => a.fee - b.fee);
  if (sort === 'fee_desc') list.sort((a, b) => b.fee - a.fee);

  renderDoctors(list);
}

function setRating(el, val) {
  minRating = val;
  document.querySelectorAll('.rating-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filterDoctors();
}

function clearAllFilters() {
  activeSpec   = 'All';
  minRating    = 0;
  visibleCount = 6;
  document.querySelectorAll('.filter-check input').forEach(cb => cb.checked = false);
  document.querySelectorAll('.filter-radio input').forEach(rb => rb.checked = rb.value === 'all');
  document.querySelectorAll('.rating-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.rating-pill')?.classList.add('active');
  document.querySelectorAll('.spec-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.spec-tab')?.classList.add('active');
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
  filterDoctors();
}

function loadMore() {
  visibleCount += 4;
  filterDoctors();
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
  if (!selectedSlot) { showToast('Please select a time slot', '⏰'); return; }

  const date   = document.getElementById('bookDate').value;
  const reason = document.getElementById('visitReason').value.trim() || 'General consultation';
  const user   = Auth.getUser();

  Appointments.add({
    doctor:  selectedDoctor,
    patient: {
      name:     user?.name     || 'Unknown Patient',
      email:    user?.email    || '',
      initials: user?.initials || 'PT',
    },
    date,
    time:   selectedSlot,
    reason,
    status: 'Pending',
  });

  closeModal();
  showToast('Appointment requested! Awaiting doctor confirmation.', '🎉');
}

/* ── INIT ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors(DOCTORS);
});
