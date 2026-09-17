// ============================================
// FlowBase API & Integration Layer — api.js
// Connects FlowBase frontend to FastAPI backend
// ============================================

'use strict';

// --- API Configuration ---
function resolveApiBaseUrl() {
  const custom = localStorage.getItem('flowbase_api_base_url');
  if (custom) return custom;

  // Auto-detect local development
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:8000/api/v1';
  }
  if (host === '10.0.2.2') {
    return 'http://10.0.2.2:8000/api/v1';
  }

  return 'https://backend-x6ay.onrender.com/api/v1';
}
const API_BASE_URL = resolveApiBaseUrl();

// --- Storage Keys ---
const STORAGE_ACCESS_TOKEN  = 'flowbase_access_token';
const STORAGE_REFRESH_TOKEN = 'flowbase_refresh_token';
const STORAGE_USER          = 'flowbase_user';
const STORAGE_PROFILE       = 'flowbase_profile';
const STORAGE_ROLE          = 'flowbase_role';
const STORAGE_ACTIVE_SHOP   = 'flowbase_active_shop_id';
const STORAGE_SHOPS         = 'flowbase_shops';

// ============================================
// ROLE & PERMISSION HELPERS
// ============================================
function getCurrentUserRole() {
  const directRole = localStorage.getItem(STORAGE_ROLE);
  if (directRole) return directRole.toUpperCase();

  try {
    const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
    const activeShopId = getActiveShopId();
    const current = shops.find(s => s.shop_id === activeShopId);
    if (current && current.role) return current.role.toUpperCase();
    if (shops.length > 0 && shops[0].role) return shops[0].role.toUpperCase();
  } catch (_) {}

  const user = getCurrentUser();
  if (user && user.role) return user.role.toUpperCase();

  return 'OWNER';
}

function isStaffUser() {
  const role = getCurrentUserRole();
  return role === 'STAFF' || role === 'EMPLOYEE';
}

function isOwnerOrAdmin() {
  const role = getCurrentUserRole();
  return role === 'OWNER' || role === 'ADMIN';
}

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

  if (authData.role) {
    localStorage.setItem(STORAGE_ROLE, authData.role);
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_USER);
  localStorage.removeItem(STORAGE_PROFILE);
  localStorage.removeItem(STORAGE_ROLE);
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
      if (meData.role) {
        localStorage.setItem(STORAGE_ROLE, meData.role);
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

  await loadUserMemberships();
  shopId = getActiveShopId();
  if (shopId) return shopId;

  // If the user has no shops and is on an internal page, direct to onboarding
  const path = window.location.pathname;
  if (!path.endsWith('onboarding.html') && !path.endsWith('login.html') && !path.endsWith('index.html')) {
    console.log('No active shop found. Directing to onboarding...');
    window.location.href = 'onboarding.html';
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
    // If user is already logged in on login page, redirect to billing (staff) or dashboard/onboarding (owner)
    if (isStaffUser()) {
      window.location.href = 'billing.html';
      return false;
    }
    const shop = getActiveShopId();
    window.location.href = shop ? 'dashboard.html' : 'onboarding.html';
    return false;
  }

  // Direct URL Access Guard for STAFF
  // Permitted pages: billing.html, products.html, inventory.html, employees.html, shop.html, login.html, onboarding.html
  if (options.requireAuth && authed && isStaffUser()) {
    const rawPath = window.location.pathname.toLowerCase();
    const currentPage = rawPath.split('/').pop() || '';
    const permittedStaffPages = [
      'billing.html',
      'products.html',
      'inventory.html',
      'employees.html',
      'shop.html',
      'login.html',
      'onboarding.html'
    ];
    if (currentPage && !permittedStaffPages.includes(currentPage)) {
      console.warn(`[FlowBase RBAC] Direct URL access denied to '${currentPage}' for STAFF role. Redirecting to billing.html.`);
      window.location.replace('billing.html');
      return false;
    }
  }

  // If user is logged in but has no shop and is on a dashboard/internal page, guide to onboarding
  const path = window.location.pathname;
  if (options.requireAuth && authed && !path.endsWith('onboarding.html')) {
    const currentShop = getActiveShopId();
    if (!currentShop) {
      loadUserMemberships().then(() => {
        if (!getActiveShopId() && !window.location.pathname.endsWith('onboarding.html')) {
          window.location.href = 'onboarding.html';
        }
      });
    }
  }

  // Apply staff UI restrictions immediately
  applyStaffUIRestrictions();

  // Update header profile info with current authenticated user
  syncHeaderUser();
  setupGlobalLogout();
  return true;
}

// ============================================
// COMPLETE STAFF UI RESTRICTION
// ============================================
function applyStaffUIRestrictions() {
  if (!isAuthenticated() || !isStaffUser()) return;

  if (document.body) {
    document.body.classList.add('role-staff');
  }

  // Inject critical CSS to ensure unauthorized items NEVER flash or render
  if (!document.getElementById('staff-ui-restrictions-style')) {
    const style = document.createElement('style');
    style.id = 'staff-ui-restrictions-style';
    style.textContent = `
      body.role-staff #nav-dashboard,
      body.role-staff #nav-sales,
      body.role-staff #nav-expenses,
      body.role-staff #nav-settings,
      body.role-staff .admin-only,
      body.role-staff .owner-only,
      body.role-staff .admin-control,
      body.role-staff .owner-control,
      body.role-staff [data-role="admin"],
      body.role-staff [data-role="owner"],
      body.role-staff [data-admin-only="true"],
      body.role-staff #view-salaries-btn,
      body.role-staff #kpi-payroll,
      body.role-staff #add-employee-btn,
      body.role-staff [data-pay-salary],
      body.role-staff [data-edit-member],
      body.role-staff [data-delete-member],
      body.role-staff #add-product-btn,
      body.role-staff [data-action="edit"],
      body.role-staff [data-action="delete"],
      body.role-staff [data-action="adjust"],
      body.role-staff #prd-view-edit-btn,
      body.role-staff #cat-add-form,
      body.role-staff [data-edit-cat],
      body.role-staff [data-delete-cat],
      body.role-staff #add-inventory-btn,
      body.role-staff #inv-view-adjust-btn,
      body.role-staff #inv-view-edit-btn,
      body.role-staff #btn-overview-edit,
      body.role-staff .btn-card-edit,
      body.role-staff .shop-edit-form,
      body.role-staff #btn-save-hours,
      body.role-staff #logo-dropzone,
      body.role-staff #btn-remove-logo,
      body.role-staff #btn-manage-employees,
      body.role-staff #act-edit-shop,
      body.role-staff #act-update-logo,
      body.role-staff #act-manage-employees,
      body.role-staff #act-manage-billing,
      body.role-staff #btn-deactivate-shop {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Hide unauthorized sidebar navigation items
  const unauthorizedNavIds = ['nav-dashboard', 'nav-sales', 'nav-expenses', 'nav-settings'];
  unauthorizedNavIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Ensure sidebar logo routes to billing.html for staff
  document.querySelectorAll('.sidebar-logo').forEach(link => {
    link.setAttribute('href', 'billing.html');
  });

  // Hide add category form if on products page
  const catAddForm = document.getElementById('cat-add-form');
  if (catAddForm) catAddForm.style.display = 'none';
}

function syncHeaderUser() {
  const profile = getStoredProfile();
  const user = getCurrentUser();
  const isStaff = isStaffUser();

  const name = (profile && profile.name) || (user && user.name) || (user && user.email ? user.email.split('@')[0] : (isStaff ? 'Staff' : 'Shop Admin'));
  const email = (user && user.email) || '';
  
  // Calculate initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || (isStaff ? 'ST' : 'SA');

  const avatarEls = document.querySelectorAll('.profile-avatar');
  avatarEls.forEach(el => { el.textContent = initials; });

  const nameEls = document.querySelectorAll('.profile-name');
  nameEls.forEach(el => { el.textContent = name; });

  // Sync role badge/text
  let role = isStaff ? 'Staff' : 'Administrator';
  try {
    const r = getCurrentUserRole();
    if (r === 'OWNER') role = 'Owner';
    else if (r === 'ADMIN') role = 'Administrator';
    else if (r === 'STAFF' || r === 'EMPLOYEE') role = 'Staff';
  } catch (_) {}

  const roleEls = document.querySelectorAll('.profile-role');
  roleEls.forEach(el => { el.textContent = role; });

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

        <!-- VIEW MODE -->
        <div id="profile-modal-view-mode">
          <div style="display:flex; align-items:center; gap:16px; padding:16px; background-color:var(--color-bg); border-radius:var(--radius-lg); margin-bottom:18px;">
            <div class="profile-avatar" id="modal-profile-avatar" style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, var(--color-primary), #155e39); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; flex-shrink:0;">SA</div>
            <div style="overflow:hidden;">
              <div id="modal-profile-name" style="font-weight:700; font-size:16px; color:var(--color-text); margin-bottom:2px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">Shop User</div>
              <div id="modal-profile-email" style="font-size:12px; color:var(--color-text-secondary); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">user@flowbase.local</div>
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

          <div style="padding:12px; border:1px solid var(--color-border); border-radius:var(--radius-md); background-color:var(--color-surface); margin-bottom:18px;">
            <div style="font-size:11px; color:var(--color-text-secondary); margin-bottom:4px;">Contact Phone</div>
            <div id="modal-profile-phone" style="font-size:13px; font-weight:500; color:var(--color-text);">—</div>
          </div>

          <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
            <button class="btn btn-ghost" id="modal-profile-logout" type="button" style="color:var(--color-danger);">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" style="margin-right:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" id="modal-profile-edit-btn" type="button">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right:4px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Edit Profile
              </button>
              <button class="btn btn-primary" id="modal-profile-close-btn" type="button">Close</button>
            </div>
          </div>
        </div>

        <!-- EDIT MODE (GET + PATCH) -->
        <form id="profile-modal-edit-form" style="display:none;" onsubmit="return false;">
          <div style="margin-bottom:14px;">
            <label class="form-label" for="edit-profile-name" style="display:block; font-size:12px; font-weight:600; margin-bottom:6px;">Full Name *</label>
            <input type="text" id="edit-profile-name" class="form-input" style="width:100%;" required />
          </div>
          <div style="margin-bottom:18px;">
            <label class="form-label" for="edit-profile-phone" style="display:block; font-size:12px; font-weight:600; margin-bottom:6px;">Phone Number</label>
            <input type="tel" id="edit-profile-phone" class="form-input" style="width:100%;" placeholder="+91 9876543210" />
          </div>
          <div id="edit-profile-error" style="color:var(--color-danger); font-size:12px; margin-bottom:14px; display:none;"></div>
          <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-ghost" id="edit-profile-cancel-btn" type="button">Cancel</button>
            <button class="btn btn-primary" id="edit-profile-save-btn" type="submit">Save Changes</button>
          </div>
        </form>

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

  // Switch to Edit Mode
  document.getElementById('modal-profile-edit-btn')?.addEventListener('click', () => {
    const profile = getStoredProfile() || {};
    const user = getCurrentUser() || {};
    const currentName = profile.name || user.name || '';
    const currentPhone = profile.phone || '';

    const nameInput = document.getElementById('edit-profile-name');
    const phoneInput = document.getElementById('edit-profile-phone');
    if (nameInput) nameInput.value = currentName;
    if (phoneInput) phoneInput.value = currentPhone;

    document.getElementById('profile-modal-view-mode').style.display = 'none';
    document.getElementById('profile-modal-edit-form').style.display = 'block';
    const errEl = document.getElementById('edit-profile-error');
    if (errEl) errEl.style.display = 'none';
    nameInput?.focus();
  });

  // Cancel Edit Mode
  document.getElementById('edit-profile-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('profile-modal-edit-form').style.display = 'none';
    document.getElementById('profile-modal-view-mode').style.display = 'block';
  });

  // Save Profile (PATCH /profile)
  document.getElementById('profile-modal-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('edit-profile-name');
    const phoneInput = document.getElementById('edit-profile-phone');
    const saveBtn = document.getElementById('edit-profile-save-btn');
    const errEl = document.getElementById('edit-profile-error');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name) {
      if (errEl) {
        errEl.textContent = 'Name is required.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      // Call PATCH /profile
      const updated = await apiRequest('/profile', {
        method: 'PATCH',
        body: { name, phone }
      });

      // Update local storage profile and user
      const currentProfile = getStoredProfile() || {};
      const newProfile = { ...currentProfile, ...(updated || { name, phone }) };
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(newProfile));

      const currentUser = getCurrentUser();
      if (currentUser) {
        currentUser.name = name;
        localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser));
      }

      // Update UI displays
      syncHeaderUser();
      openProfileModal(); // Refresh modal view
      document.getElementById('profile-modal-edit-form').style.display = 'none';
      document.getElementById('profile-modal-view-mode').style.display = 'block';

      if (typeof showToast === 'function') {
        showToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (errEl) {
        errEl.textContent = err.message || 'Failed to update profile. Please try again.';
        errEl.style.display = 'block';
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
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

  // Reset to view mode
  const editForm = document.getElementById('profile-modal-edit-form');
  const viewMode = document.getElementById('profile-modal-view-mode');
  if (editForm) editForm.style.display = 'none';
  if (viewMode) viewMode.style.display = 'block';

  const profile = getStoredProfile();
  const user = getCurrentUser();
  const isStaff = isStaffUser();
  const name = (profile && profile.name) || (user && user.name) || (user && user.email ? user.email.split('@')[0] : (isStaff ? 'Staff' : 'Shop Admin'));
  const email = (user && user.email) || 'staff@flowbase.local';
  const phone = (profile && profile.phone) || '—';
  
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || (isStaff ? 'ST' : 'SA');

  const avatarEl = document.getElementById('modal-profile-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('modal-profile-name');
  if (nameEl) nameEl.textContent = name;

  const emailEl = document.getElementById('modal-profile-email');
  if (emailEl) emailEl.textContent = email;

  const phoneEl = document.getElementById('modal-profile-phone');
  if (phoneEl) phoneEl.textContent = phone;

  // Resolve shop and role
  let role = isStaff ? 'STAFF' : 'OWNER';
  let shopName = 'Main Store';
  try {
    const roleCode = getCurrentUserRole();
    if (roleCode) role = roleCode;

    const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
    const activeShopId = getActiveShopId();
    const current = shops.find(s => s.shop_id === activeShopId);
    if (current) {
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

// Immediate check for staff route protection
(function enforceImmediateRouteGuard() {
  if (typeof isAuthenticated === 'function' && isAuthenticated() && typeof isStaffUser === 'function' && isStaffUser()) {
    const rawPath = window.location.pathname.toLowerCase();
    const currentPage = rawPath.split('/').pop() || '';
    const permittedStaffPages = [
      'billing.html',
      'products.html',
      'inventory.html',
      'employees.html',
      'shop.html',
      'login.html',
      'onboarding.html'
    ];
    if (currentPage && !permittedStaffPages.includes(currentPage)) {
      window.location.replace('billing.html');
    }
  }
})();

// Apply theme immediately on script execution
applyTheme();

// Automatically sync user profile, theme toggle, and profile modal on DOM load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  initThemeToggle();
  if (isAuthenticated()) {
    applyStaffUIRestrictions();
    syncHeaderUser();
    initProfileModal();
  }
});

