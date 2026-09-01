// ============================================
// FlowBase API & Integration Layer — api.js
// Connects FlowBase frontend to FastAPI backend
// ============================================

'use strict';

// --- API Configuration ---
function resolveApiBaseUrl() {
  const custom = localStorage.getItem('flowbase_api_base_url');
  if (custom) return custom;
  if (window.location.port === '8000') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
}
const API_BASE_URL = resolveApiBaseUrl();

// --- Storage Keys ---
const STORAGE_ACCESS_TOKEN  = 'flowbase_access_token';
const STORAGE_REFRESH_TOKEN = 'flowbase_refresh_token';
const STORAGE_USER          = 'flowbase_user';
const STORAGE_PROFILE       = 'flowbase_profile';
const STORAGE_ACTIVE_SHOP   = 'flowbase_active_shop_id';
const STORAGE_SHOPS         = 'flowbase_shops';

// ============================================
// CORE API REQUEST FUNCTION
// ============================================
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If body is not a string, stringify it
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // If we are not on login page, clear session and redirect
      if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
        console.warn('Session expired or unauthorized. Redirecting to login.');
        clearSession();
        window.location.href = 'login.html';
      }
      const errorData = await parseResponseError(response);
      throw new Error(errorData || 'Authentication expired. Please log in again.');
    }

    if (!response.ok) {
      const errorDetail = await parseResponseError(response);
      throw new Error(errorDetail || `Request failed with status ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (err) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, err.message);
    throw err;
  }
}

async function parseResponseError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      // Pydantic validation error format: [{loc: [...], msg: "..."}]
      return data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
    }
    if (data.message) {
      return data.message;
    }
    return JSON.stringify(data);
  } catch (e) {
    try {
      return await response.text();
    } catch (_) {
      return response.statusText;
    }
  }
}

// ============================================
// AUTH & TOKEN HELPERS
// ============================================
function getAccessToken() {
  return localStorage.getItem(STORAGE_ACCESS_TOKEN);
}

function getRefreshToken() {
  return localStorage.getItem(STORAGE_REFRESH_TOKEN);
}

function getCurrentUser() {
  try {
    const user = localStorage.getItem(STORAGE_USER);
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

function getStoredProfile() {
  try {
    const profile = localStorage.getItem(STORAGE_PROFILE);
    return profile ? JSON.parse(profile) : null;
  } catch (e) {
    return null;
  }
}

function isAuthenticated() {
  return !!getAccessToken();
}

function setSession(authData) {
  if (authData.session) {
    if (authData.session.access_token) {
      localStorage.setItem(STORAGE_ACCESS_TOKEN, authData.session.access_token);
    }
    if (authData.session.refresh_token) {
      localStorage.setItem(STORAGE_REFRESH_TOKEN, authData.session.refresh_token);
    }
  } else if (authData.access_token) {
    localStorage.setItem(STORAGE_ACCESS_TOKEN, authData.access_token);
    if (authData.refresh_token) {
      localStorage.setItem(STORAGE_REFRESH_TOKEN, authData.refresh_token);
    }
  }

  if (authData.user) {
    localStorage.setItem(STORAGE_USER, JSON.stringify(authData.user));
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  localStorage.removeItem(STORAGE_PROFILE);
  localStorage.removeItem(STORAGE_ACTIVE_SHOP);
  localStorage.removeItem(STORAGE_SHOPS);
  localStorage.removeItem('flowbase_demo_session');
}

// ============================================
// SHOP & MEMBERSHIP MANAGEMENT
// ============================================
function getActiveShopId() {
  const shopId = localStorage.getItem(STORAGE_ACTIVE_SHOP);
  return shopId ? parseInt(shopId, 10) : null;
}

function setActiveShopId(shopId) {
  if (shopId) {
    localStorage.setItem(STORAGE_ACTIVE_SHOP, String(shopId));
  } else {
    localStorage.removeItem(STORAGE_ACTIVE_SHOP);
  }
}

async function loadUserMemberships() {
  try {
    const meData = await apiRequest('/auth/me');
    if (meData) {
      if (meData.profile) {
        localStorage.setItem(STORAGE_PROFILE, JSON.stringify(meData.profile));
      }
      if (meData.memberships) {
        localStorage.setItem(STORAGE_SHOPS, JSON.stringify(meData.memberships));
        
        // If no active shop selected or active shop no longer in memberships, pick first one
        const currentActive = getActiveShopId();
        const found = meData.memberships.find(m => m.shop_id === currentActive);
        if (!found && meData.memberships.length > 0) {
          setActiveShopId(meData.memberships[0].shop_id);
        }
      }
      return meData;
    }
  } catch (err) {
    console.error('Failed to load user memberships:', err);
  }
  return null;
}

async function ensureActiveShop() {
  let shopId = getActiveShopId();
  if (shopId) return shopId;

  const meData = await loadUserMemberships();
  shopId = getActiveShopId();
  if (shopId) return shopId;

  // If the user has no shops, create a default shop for them
  try {
    console.log('No shops found for user. Creating initial shop...');
    const user = getCurrentUser();
    const shopName = user && user.email ? `${user.email.split('@')[0]}'s Store` : 'My FlowBase Store';
    const newShop = await apiRequest('/shops', {
      method: 'POST',
      body: {
        name: shopName,
        phone: '',
        email: user ? user.email : null,
        address: 'Main Store'
      }
    });
    if (newShop && newShop.id) {
      setActiveShopId(newShop.id);
      await loadUserMemberships();
      return newShop.id;
    }
  } catch (e) {
    console.error('Failed to create default shop:', e);
  }

  return null;
}

// ============================================
// PAGE AUTH GUARD & HEADER SYNC
// ============================================
function initAuthGuard(options = { requireAuth: true }) {
  const authed = isAuthenticated();

  if (options.requireAuth && !authed) {
    window.location.href = 'login.html';
    return false;
  }

  if (!options.requireAuth && authed) {
    // If user is already logged in on login page, redirect to dashboard
    window.location.href = 'dashboard.html';
    return false;
  }

  // Update header profile info with current authenticated user
  syncHeaderUser();
  setupGlobalLogout();
  return true;
}

function syncHeaderUser() {
  const profile = getStoredProfile();
  const user = getCurrentUser();

  const name = (profile && profile.name) || (user && user.name) || (user && user.email ? user.email.split('@')[0] : 'Shop Admin');
  const email = (user && user.email) || '';
  
  // Calculate initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SA';

  const avatarEls = document.querySelectorAll('.profile-avatar');
  avatarEls.forEach(el => { el.textContent = initials; });

  const nameEls = document.querySelectorAll('.profile-name');
  nameEls.forEach(el => { el.textContent = name; });

  const greetingEl = document.getElementById('welcome-greeting');
  if (greetingEl) {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    greetingEl.textContent = `${greet}, ${name}`;
  }
}

function setupGlobalLogout() {
  const confirmBtn = document.getElementById('logout-confirm');
  if (confirmBtn) {
    // Clone and replace to prevent duplicate listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async () => {
      const modal = document.getElementById('logout-modal');
      if (modal) modal.classList.remove('open');

      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch (_) {
        // Continue clearing session even if API call fails
      }

      clearSession();
      if (typeof showToast === 'function') {
        showToast('Logged out successfully.', 'success');
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    });
  }
}

// ============================================
// THEME MANAGEMENT (DARK / LIGHT MODE)
// ============================================
const STORAGE_THEME = 'flowbase_theme';

function getStoredTheme() {
  return localStorage.getItem(STORAGE_THEME) || 'light';
}

function applyTheme(theme) {
  const targetTheme = theme || getStoredTheme();
  document.documentElement.setAttribute('data-theme', targetTheme);
  if (document.body) {
    document.body.classList.toggle('dark-theme', targetTheme === 'dark');
  }
  localStorage.setItem(STORAGE_THEME, targetTheme);
  updateThemeToggleButtons(targetTheme);
}

function toggleTheme() {
  const current = getStoredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (typeof showToast === 'function') {
    showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} theme`, 'default');
  }
  return next;
}

function updateThemeToggleButtons(theme) {
  const currentTheme = theme || getStoredTheme();
  const isDark = currentTheme === 'dark';

  document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn').forEach(btn => {
    btn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    const labelSpan = btn.querySelector('.theme-toggle-label');
    if (labelSpan) {
      labelSpan.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
    const iconSvg = btn.querySelector('.theme-toggle-icon');
    if (iconSvg) {
      iconSvg.innerHTML = isDark
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  });
}

function initThemeToggle() {
  updateThemeToggleButtons();
  document.querySelectorAll('#theme-toggle-btn, .theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      toggleTheme();
    });
  });
}

// ============================================
// PROFILE MODAL HANDLER
// ============================================
function injectProfileModal() {
  if (document.getElementById('global-profile-modal')) return;

  const modalHtml = `
    <div class="modal-overlay" id="global-profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div class="modal" style="max-width: 440px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h2 class="modal-title" id="profile-modal-title" style="margin-bottom:0;">User Profile</h2>
          <button class="prd-modal-close" id="profile-modal-close" type="button" aria-label="Close modal" style="background:none; border:none; cursor:pointer; color:var(--color-text-secondary);">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:16px; padding:16px; background-color:var(--color-bg); border-radius:var(--radius-lg); margin-bottom:18px;">
          <div class="profile-avatar" id="modal-profile-avatar" style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, var(--color-primary), #155e39); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; flex-shrink:0;">SA</div>
          <div style="overflow:hidden;">
            <div id="modal-profile-name" style="font-weight:700; font-size:16px; color:var(--color-text); margin-bottom:2px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">Shop Admin</div>
            <div id="modal-profile-email" style="font-size:12px; color:var(--color-text-secondary); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">admin@flowbase.local</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
          <div style="padding:12px; border:1px solid var(--color-border); border-radius:var(--radius-md); background-color:var(--color-surface);">
            <div style="font-size:11px; color:var(--color-text-secondary); margin-bottom:4px;">Current Role</div>
            <div id="modal-profile-role" style="font-size:13px; font-weight:600;"><span class="badge badge-success">OWNER</span></div>
          </div>
          <div style="padding:12px; border:1px solid var(--color-border); border-radius:var(--radius-md); background-color:var(--color-surface);">
            <div style="font-size:11px; color:var(--color-text-secondary); margin-bottom:4px;">Active Store</div>
            <div id="modal-profile-shop" style="font-size:13px; font-weight:600; color:var(--color-text); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">Main Store</div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
          <button class="btn btn-ghost" id="modal-profile-logout" type="button" style="color:var(--color-danger);">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" style="margin-right:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
          <button class="btn btn-primary" id="modal-profile-close-btn" type="button">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Wire up close buttons
  document.getElementById('profile-modal-close')?.addEventListener('click', closeProfileModal);
  document.getElementById('modal-profile-close-btn')?.addEventListener('click', closeProfileModal);
  document.getElementById('global-profile-modal')?.addEventListener('click', e => {
    if (e.target.id === 'global-profile-modal') closeProfileModal();
  });

  // Wire up sign out from profile
  document.getElementById('modal-profile-logout')?.addEventListener('click', () => {
    closeProfileModal();
    const logoutModal = document.getElementById('logout-modal');
    if (logoutModal) {
      logoutModal.classList.add('open');
    } else {
      clearSession();
      window.location.href = 'login.html';
    }
  });
}

function openProfileModal() {
  injectProfileModal();
  const modal = document.getElementById('global-profile-modal');
  if (!modal) return;

  const profile = getStoredProfile();
  const user = getCurrentUser();
  const name = (profile && profile.name) || (user && user.name) || (user && user.email ? user.email.split('@')[0] : 'Shop Admin');
  const email = (user && user.email) || 'admin@flowbase.local';
  
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SA';

  const avatarEl = document.getElementById('modal-profile-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('modal-profile-name');
  if (nameEl) nameEl.textContent = name;

  const emailEl = document.getElementById('modal-profile-email');
  if (emailEl) emailEl.textContent = email;

  // Resolve shop and role
  let role = 'OWNER';
  let shopName = 'Main Store';
  try {
    const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
    const activeShopId = getActiveShopId();
    const current = shops.find(s => s.shop_id === activeShopId);
    if (current) {
      role = current.role || 'OWNER';
      shopName = (current.shops && current.shops.name) || `Store #${activeShopId}`;
    }
  } catch (_) {}

  const roleEl = document.getElementById('modal-profile-role');
  if (roleEl) {
    const roleCls = role === 'OWNER' ? 'badge-owner' : role === 'ADMIN' ? 'badge-admin' : 'badge-staff';
    roleEl.innerHTML = `<span class="badge ${roleCls}">${role}</span>`;
  }

  const shopEl = document.getElementById('modal-profile-shop');
  if (shopEl) shopEl.textContent = shopName;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  const modal = document.getElementById('global-profile-modal');
  if (modal) modal.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.style.overflow = '';
  }
}

function initProfileModal() {
  injectProfileModal();
  document.querySelectorAll('#header-user-btn, #topbar-profile-btn, .header-user, .profile-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openProfileModal();
    });
  });
}

// Apply theme immediately on script execution
applyTheme();

// Automatically sync user profile, theme toggle, and profile modal on DOM load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  initThemeToggle();
  if (isAuthenticated()) {
    syncHeaderUser();
    initProfileModal();
  }
});

