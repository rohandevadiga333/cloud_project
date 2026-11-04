// frontend/js/api.js
// Centralised fetch helper – all API calls go through here

const API_BASE = '/api';

/**
 * Make an authenticated API request.
 * Cookies (including the JWT) are sent automatically.
 */
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    credentials: 'include',   // send HTTP-only cookie
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + endpoint, options);
  const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response.' }));

  // Auto-redirect to login on session expiry
  // Suppress on: login page itself, /auth/me (silent check), /auth/login
  const onLoginPage = window.location.pathname.includes('login') || window.location.pathname === '/';
  const isSilentCheck = endpoint.includes('/auth/me') || endpoint.includes('/auth/login');

  if (res.status === 401 && !onLoginPage && !isSilentCheck) {
    showToast('Session expired. Please log in again.', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    throw new Error('Unauthenticated');
  }

  return { ok: res.ok, status: res.status, data };
}

const api = {
  get:    (url)        => apiRequest('GET',    url),
  post:   (url, body)  => apiRequest('POST',   url, body),
  put:    (url, body)  => apiRequest('PUT',    url, body),
  delete: (url)        => apiRequest('DELETE', url),
};

// ─── Toast notification ────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill',
                  warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Logout ────────────────────────────────────────────────────────────
async function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  await api.post('/auth/logout');
  window.location.href = '/login.html';
}

// ─── Utility ───────────────────────────────────────────────────────────
function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dt) {
  if (!dt) return 'N/A';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dt) {
  if (!dt) return 'N/A';
  return new Date(dt).toLocaleString('en-IN');
}

function gradeColorClass(grade) {
  const map = { 'O': 'grade-O', 'A+': 'grade-Ap', 'A': 'grade-A', 'B+': 'grade-Bp', 'B': 'grade-B', 'C': 'grade-C', 'F': 'grade-F' };
  return map[grade] || '';
}

// Set sidebar user info
function setSidebarUser(user) {
  const initEl = document.getElementById('sidebar-initials');
  const nameEl = document.getElementById('sidebar-name');
  const roleEl = document.getElementById('sidebar-role');
  if (initEl) initEl.textContent = getInitials(user.name || user.full_name);
  if (nameEl) nameEl.textContent  = user.name || user.full_name;
  if (roleEl) roleEl.textContent  = user.role?.toUpperCase();
}

// Navigate to section
function showSection(id) {
  document.querySelectorAll('.section-panel').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById(id);
  if (panel) panel.classList.add('active');
  const navBtn = document.querySelector(`[data-section="${id}"]`);
  if (navBtn) navBtn.classList.add('active');
}

// Sidebar toggle (mobile)
function initSidebarToggle() {
  const btn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}
