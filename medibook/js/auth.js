/* =============================================
   MediBook - Authentication Logic
   File: js/auth.js
   Requires: app.js
============================================= */

/* ── LOGIN ───────────────────────────────── */
function doLogin(event) {
  if (event) event.preventDefault();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  const alertEl  = document.getElementById('loginAlert');

  // Clear previous alerts
  alertEl.className = 'alert';
  alertEl.textContent = '';

  // Validation
  if (!email || !password) {
    alertEl.textContent = 'Please fill in all fields.';
    alertEl.classList.add('show', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    alertEl.textContent = 'Please enter a valid email address.';
    alertEl.classList.add('show', 'error');
    return;
  }

  // Build user object
  const name     = email.split('@')[0].replace(/[^a-zA-Z ]/g, ' ').trim();
  const initials = name.slice(0, 2).toUpperCase();

  Auth.setUser({ name, email, initials });

  alertEl.textContent = 'Login successful! Redirecting...';
  alertEl.classList.add('show', 'success');
  showToast('Welcome back, ' + name + '!', '👋');

  setTimeout(() => (window.location.href = 'index.html'), 900);
}

/* ── REGISTER ────────────────────────────── */
function doRegister(event) {
  if (event) event.preventDefault();

  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const phone    = document.getElementById('regPhone').value.trim();
  const alertEl  = document.getElementById('registerAlert');

  alertEl.className   = 'alert';
  alertEl.textContent = '';

  if (!name || !email || !password) {
    alertEl.textContent = 'Please fill in all required fields.';
    alertEl.classList.add('show', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    alertEl.textContent = 'Please enter a valid email address.';
    alertEl.classList.add('show', 'error');
    return;
  }

  if (password.length < 8) {
    alertEl.textContent = 'Password must be at least 8 characters.';
    alertEl.classList.add('show', 'error');
    return;
  }

  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  Auth.setUser({ name, email, phone, initials });

  alertEl.textContent = 'Account created! Redirecting...';
  alertEl.classList.add('show', 'success');
  showToast('Welcome to MediBook, ' + name + '!', '🎉');

  setTimeout(() => (window.location.href = 'index.html'), 900);
}

/* ── PASSWORD STRENGTH ───────────────────── */
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (!bar || !label) return;

  const levels = [
    { pct: '0%',   color: '',        text: '' },
    { pct: '25%',  color: '#ef4444', text: 'Weak' },
    { pct: '50%',  color: '#f59e0b', text: 'Fair' },
    { pct: '75%',  color: '#0ea5e9', text: 'Good' },
    { pct: '100%', color: '#10b981', text: 'Strong' },
  ];

  bar.style.width      = levels[score].pct;
  bar.style.background = levels[score].color;
  label.textContent    = levels[score].text;
}

/* ── HELPERS ─────────────────────────────── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── REDIRECT IF ALREADY LOGGED IN ──────── */
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn() &&
      (window.location.pathname.includes('login') ||
       window.location.pathname.includes('register'))) {
    window.location.href = 'index.html';
  }
});
