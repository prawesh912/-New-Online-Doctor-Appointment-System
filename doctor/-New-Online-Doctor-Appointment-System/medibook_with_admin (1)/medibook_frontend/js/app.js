/* =============================================
   MediBook - App Utilities & Shared Logic
   File: js/app.js
   Include this on EVERY page.
============================================= */

/* ── DARK MODE ───────────────────────────── */
(function () {
  const saved = localStorage.getItem('medibook_theme');
  if (saved === 'dark') document.body.classList.add('dark');
})();

function initDarkToggle() {
  const btn = document.getElementById('darkToggle');
  if (!btn) return;

  const isDark = () => document.body.classList.contains('dark');
  btn.textContent = isDark() ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = isDark();
    localStorage.setItem('medibook_theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀️' : '🌙';
  });
}

/* ── TOAST NOTIFICATION ──────────────────── */
function showToast(msg, icon = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = (icon ? icon + '  ' : '') + msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ── AUTH STATE (localStorage) ───────────── */
const Auth = {
  KEY: 'medibook_user',

  getUser() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(this.KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(this.KEY);
  },

  isLoggedIn() {
    return !!this.getUser();
  }
};

/* ── NAVBAR: inject auth-aware nav links ──── */
function initNavbar() {
  const guestNav  = document.getElementById('guestNav');
  const userNav   = document.getElementById('userNav');
  const avatarBtn = document.getElementById('userAvatarBtn');

  if (!guestNav || !userNav) return;

  const user = Auth.getUser();
  if (user) {
    guestNav.style.display = 'none';
    userNav.style.display  = 'flex';
    if (avatarBtn) avatarBtn.textContent = user.initials;
  } else {
    guestNav.style.display = 'flex';
    userNav.style.display  = 'none';
  }
}

/* ── USER DROPDOWN ───────────────────────── */
function toggleDropdown() {
  document.getElementById('userDropdown')?.classList.toggle('open');
}

document.addEventListener('click', function (e) {
  const menu = document.querySelector('.user-menu');
  if (menu && !menu.contains(e.target)) {
    document.getElementById('userDropdown')?.classList.remove('open');
  }
});

/* ── SIGN OUT ────────────────────────────── */
function signOut() {
  Auth.clearUser();
  showToast('Signed out successfully');
  setTimeout(() => (window.location.href = 'index.html'), 800);
}

/* ── APPOINTMENTS (localStorage) ─────────── */
const Appointments = {
  KEY: 'medibook_appointments',

  getAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add(appt) {
    const list = this.getAll();
    list.unshift({ ...appt, id: Date.now() });
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },

  cancel(id) {
    const list = this.getAll().map(a =>
      a.id === id ? { ...a, status: 'Cancelled' } : a
    );
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },

  setStatus(id, status) {
    const list = this.getAll().map(a =>
      a.id === id ? { ...a, status } : a
    );
    localStorage.setItem(this.KEY, JSON.stringify(list));
  },

  saveNote(id, notes) {
    const list = this.getAll().map(a =>
      a.id === id ? { ...a, notes } : a
    );
    localStorage.setItem(this.KEY, JSON.stringify(list));
  }
};

/* ── INIT ON LOAD ────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initDarkToggle();
  initNavbar();
});