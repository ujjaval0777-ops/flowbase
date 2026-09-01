// ============================================
// FlowBase Login — login.js
// FlowBase Management System Authentication
// ============================================
// ARCHITECTURE NOTE:
// Structured cleanly with separated functions:
//   - switchAuthMode()
//   - validateLogin()
//   - handleLogin()
//   - validateRegistration()
//   - createAccount()
//   - handleLogout()
//
// Easy 1-to-1 replacement of demo functions with
// real FastAPI + Supabase POST endpoints in the future.
// ============================================

'use strict';

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY_SESSION  = 'flowbase_demo_session';
const STORAGE_KEY_EMAIL    = 'flowbase_remembered_email';
const STORAGE_KEY_ACCOUNTS = 'flowbase_accounts';

// Demo admin credentials
const DEMO_CREDENTIALS = {
  email:    'admin@flowbase.com',
  password: 'admin123',
};

// ============================================
// STATE
// ============================================
let isSubmitting = false;
let currentAuthMode = 'login'; // 'login' | 'signup'

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (typeof isAuthenticated === 'function' && isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }
  initRememberMe();
  initPasswordToggles();
  initAuthSwitching();
  initLoginForm();
  initSignupForm();
  initModals();
  initRealTimeValidation();
});

// ============================================
// AUTH MODE SWITCHER (LOGIN <-> CREATE ACCOUNT)
// ============================================
function initAuthSwitching() {
  const gotoSignupBtn = document.getElementById('goto-signup-btn');
  const gotoLoginBtn  = document.getElementById('goto-login-btn');

  gotoSignupBtn && gotoSignupBtn.addEventListener('click', () => switchAuthMode('signup'));
  gotoLoginBtn  && gotoLoginBtn.addEventListener('click',  () => switchAuthMode('login'));
}

function switchAuthMode(mode) {
  currentAuthMode = mode;

  const loginView  = document.getElementById('login-view');
  const signupView = document.getElementById('signup-view');

  if (mode === 'signup') {
    loginView  && loginView.classList.remove('active');
    signupView && signupView.classList.add('active');
    // Clear errors
    hideFormError('login');
    hideFormError('signup');
    // Focus first input
    const firstInput = signupView ? signupView.querySelector('input') : null;
    firstInput && firstInput.focus();
  } else {
    signupView && signupView.classList.remove('active');
    loginView  && loginView.classList.add('active');
    // Clear errors
    hideFormError('login');
    hideFormError('signup');
    // Focus first input
    const firstInput = loginView ? loginView.querySelector('input') : null;
    firstInput && firstInput.focus();
  }
}

// ============================================
// REMEMBER ME — Pre-fill saved email
// ============================================
function initRememberMe() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EMAIL);
    const emailInput = document.getElementById('login-email');
    const rememberCheckbox = document.getElementById('remember-me');

    if (saved && emailInput) {
      emailInput.value = saved;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
  } catch (e) { /* ignore */ }
}

function saveRememberMe(email) {
  try {
    const rememberCheckbox = document.getElementById('remember-me');
    if (rememberCheckbox && rememberCheckbox.checked) {
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
    } else {
      localStorage.removeItem(STORAGE_KEY_EMAIL);
    }
  } catch (e) { /* ignore */ }
}

// ============================================
// PASSWORD VISIBILITY TOGGLES
// ============================================
function initPasswordToggles() {
  const toggles = [
    { btnId: 'login-password-toggle',  inputId: 'login-password' },
    { btnId: 'signup-password-toggle', inputId: 'signup-password' },
    { btnId: 'signup-confirm-toggle',  inputId: 'signup-confirm' },
  ];

  toggles.forEach(({ btnId, inputId }) => {
    const btn   = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      const svg = btn.querySelector('svg');
      if (svg) svg.innerHTML = isHidden ? getEyeOffSVG() : getEyeSVG();
    });
  });
}

function getEyeSVG() {
  return `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
}

function getEyeOffSVG() {
  return `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;
}

// ============================================
// REAL-TIME VALIDATION (Clear errors on input)
// ============================================
function initRealTimeValidation() {
  // Login fields
  ['login-email', 'login-password'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', () => {
      clearFieldError(id);
      hideFormError('login');
    });
  });

  // Signup fields
  ['signup-fullname', 'signup-email', 'signup-password', 'signup-confirm'].forEach(id => {
    const el = document.getElementById(id);
    el && el.addEventListener('input', () => {
      clearFieldError(id);
      hideFormError('signup');
    });
  });
}

// ============================================
// LOGIN FORM HANDLING
// ============================================
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    await handleLogin();
  });
}

async function handleLogin() {
  const emailInput    = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  const email    = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  // 1. Validate fields
  const isValid = validateLogin(email, password);
  if (!isValid) return;

  // 2. Set loading state
  setLoadingState('login', true);
  hideFormError('login');

  try {
    // 3. Authenticate with FastAPI Backend
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (result && result.session) {
      saveRememberMe(email);
      setSession(result);
      
      // Load user profile and shop
      await ensureActiveShop();

      showToast('Welcome back!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      setLoadingState('login', false);
      showFormError('login', 'Login failed. Please check your credentials.');
    }
  } catch (err) {
    console.error('Backend auth request error:', err);
    setLoadingState('login', false);
    const msg = err.message || 'Invalid email or password.';
    showFormError('login', msg);
  }
}

function validateLogin(email, password) {
  let valid = true;

  if (!email) {
    showFieldError('login-email', 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('login-email', 'Please enter a valid email address.');
    valid = false;
  } else {
    clearFieldError('login-email');
  }

  if (!password) {
    showFieldError('login-password', 'Password is required.');
    valid = false;
  } else {
    clearFieldError('login-password');
  }

  return valid;
}

// ============================================
// CREATE ACCOUNT FORM HANDLING
// ============================================
function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    await createAccount();
  });
}

async function createAccount() {
  const nameInput    = document.getElementById('signup-fullname');
  const emailInput   = document.getElementById('signup-email');
  const passInput    = document.getElementById('signup-password');
  const confirmInput = document.getElementById('signup-confirm');

  const fullname = nameInput ? nameInput.value.trim() : '';
  const email    = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const confirm  = confirmInput ? confirmInput.value : '';

  // 1. Validate registration inputs
  const isValid = validateRegistration(fullname, email, password, confirm);
  if (!isValid) return;

  // 2. Set loading state
  setLoadingState('signup', true);
  hideFormError('signup');

  try {
    // 3. Create account with FastAPI Backend
    const result = await apiRequest('/auth/signup', {
      method: 'POST',
      body: {
        name: fullname,
        email: email,
        password: password
      }
    });

    setLoadingState('signup', false);

    if (result && result.session) {
      // Auto-logged in
      setSession(result);
      await ensureActiveShop();
      showToast('Account created successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      const msg = result?.message || 'Account created! Please sign in.';
      showToast(msg, 'success');
      switchAuthMode('login');
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.value = email;
    }
  } catch (err) {
    console.error('Backend signup error:', err);
    setLoadingState('signup', false);
    showFormError('signup', err.message || 'Failed to create account.');
  }
}

function validateRegistration(fullname, email, password, confirm) {
  let valid = true;

  if (!fullname) {
    showFieldError('signup-fullname', 'Full name is required.');
    valid = false;
  } else {
    clearFieldError('signup-fullname');
  }

  if (!email) {
    showFieldError('signup-email', 'Please enter a valid email address.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('signup-email', 'Please enter a valid email address.');
    valid = false;
  } else {
    clearFieldError('signup-email');
  }

  if (!password) {
    showFieldError('signup-password', 'Password must be at least 8 characters.');
    valid = false;
  } else if (password.length < 8) {
    showFieldError('signup-password', 'Password must be at least 8 characters.');
    valid = false;
  } else {
    clearFieldError('signup-password');
  }

  if (!confirm) {
    showFieldError('signup-confirm', 'Passwords do not match.');
    valid = false;
  } else if (confirm !== password) {
    showFieldError('signup-confirm', 'Passwords do not match.');
    valid = false;
  } else {
    clearFieldError('signup-confirm');
  }

  return valid;
}

function getStoredAccounts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// ============================================
// HELPER VALIDATION FUNCTIONS
// ============================================
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  const errorText = document.getElementById(`${fieldId}-error-text`);

  if (input) input.classList.add('has-error');
  if (errorText) errorText.textContent = message;
  if (errorEl) errorEl.classList.add('visible');
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) input.classList.remove('has-error');
  if (errorEl) errorEl.classList.remove('visible');
}

function showFormError(mode, message) {
  const errorEl   = document.getElementById(`${mode}-form-error`);
  const errorText = document.getElementById(`${mode}-form-error-text`);

  if (errorText) errorText.textContent = message;
  if (errorEl) errorEl.classList.add('visible');
}

function hideFormError(mode) {
  const errorEl = document.getElementById(`${mode}-form-error`);
  if (errorEl) errorEl.classList.remove('visible');
}

// ============================================
// LOADING STATE HELPER
// ============================================
function setLoadingState(mode, loading) {
  isSubmitting = loading;
  const submitBtn = document.getElementById(`${mode}-submit-btn`);
  const btnText   = document.getElementById(`${mode}-btn-text`);

  if (!submitBtn || !btnText) return;

  if (loading) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    btnText.textContent = mode === 'login' ? 'Signing in...' : 'Creating Account...';
  } else {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    btnText.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  }
}

// ============================================
// SESSION PERSISTENCE
// ============================================
function storeSession(email, user) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
      email,
      name: user ? user.name : 'Shop Admin',
      loginTime: new Date().toISOString(),
    }));
  } catch (e) { /* ignore */ }
}

function handleLogout() {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  } catch (e) { /* ignore */ }
  window.location.href = 'login.html';
}

// ============================================
// MODALS (Forgot Password)
// ============================================
function initModals() {
  const forgotBtn   = document.getElementById('forgot-password-btn');
  const forgotModal = document.getElementById('forgot-modal');
  const forgotClose = document.getElementById('forgot-modal-close');

  forgotBtn   && forgotBtn.addEventListener('click',   () => openModal(forgotModal));
  forgotClose && forgotClose.addEventListener('click', () => closeModal(forgotModal));
  forgotModal && forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) closeModal(forgotModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && forgotModal) closeModal(forgotModal);
  });
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add('open');
  const closeBtn = modal.querySelector('.btn');
  closeBtn && closeBtn.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast-${type}` : ''}`;

  const icon = type === 'success'
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3200);
}
