/**
 * FLOWBASE — Shop Management Controller (js/shop.js)
 * Manages shop business details, settings, business hours, branding, and permissions.
 */

// Global State
let currentShop = null;
let currentRole = 'OWNER';
let currentShopId = null;

// Default extended settings template (empty values show "Not added")
const DEFAULT_EXTENDED = {
  category: '',
  description: '',
  owner_name: '',
  area: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  gst_no: '',
  pan_no: '',
  reg_no: '',
  tax_info: '',
  business_type: 'Sole Proprietorship',
  billing_prefix: 'FB-',
  invoice_format: 'FB-[000000]',
  start_invoice_no: '1',
  currency: 'INR (₹)',
  tax_enabled: 'true',
  tax_rate: '18',
  payment_methods: 'Cash, UPI, Card',
  bill_footer: 'Thank you for your business!',
  terms_conditions: 'Goods once sold are covered under standard warranty.',
  return_policy: '7-day replacement for defective items with original receipt.',
  alt_phone: '',
  whatsapp: '',
  website: '',
  low_stock_threshold: '5',
  date_format: 'DD/MM/YYYY',
  number_format: 'Indian (1,00,000)',
  invoice_logo_enabled: 'true',
  business_hours: {
    mon: { open: true, from: '09:00', to: '21:00' },
    tue: { open: true, from: '09:00', to: '21:00' },
    wed: { open: true, from: '09:00', to: '21:00' },
    thu: { open: true, from: '09:00', to: '21:00' },
    fri: { open: true, from: '09:00', to: '21:00' },
    sat: { open: true, from: '09:00', to: '22:00' },
    sun: { open: false, from: '10:00', to: '18:00' }
  }
};

// Toast notification helper
function showToast(message, type = 'success') {
  const existing = document.getElementById('shop-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'shop-toast';
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'success' ? '#0f766e' : '#dc2626'};
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastSlideIn 0.25s ease-out forwards;
  `;
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

// Storage key helper
function getExtendedKey(shopId) {
  return `flowbase_shop_ext_${shopId}`;
}

function getLogoKey(shopId) {
  return `flowbase_shop_logo_${shopId}`;
}

// Load extended settings
function loadExtendedSettings(shopId) {
  try {
    const raw = localStorage.getItem(getExtendedKey(shopId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_EXTENDED, ...parsed };
    }
  } catch (e) {
    console.error('Error parsing extended shop settings:', e);
  }
  return { ...DEFAULT_EXTENDED };
}

// Save extended settings
function saveExtendedSettings(shopId, data) {
  const current = loadExtendedSettings(shopId);
  const updated = { ...current, ...data };
  localStorage.setItem(getExtendedKey(shopId), JSON.stringify(updated));
  return updated;
}

// Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initAuthGuard === 'function') {
    if (!initAuthGuard({ requireAuth: true })) return;
  }

  currentShopId = getActiveShopId();
  await loadShopData();
  initEventHandlers();
});

// Load Shop Data from API or LocalStorage
async function loadShopData() {
  const container = document.getElementById('shop-main-content');
  const emptyState = document.getElementById('shop-empty-state');

  if (!currentShopId) {
    if (container) container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  // Identify current user role
  if (typeof getCurrentUserRole === 'function') {
    currentRole = getCurrentUserRole();
  } else {
    try {
      const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
      const membership = shops.find(s => Number(s.shop_id) === Number(currentShopId));
      if (membership) {
        currentRole = membership.role || 'OWNER';
      }
    } catch (e) {
      currentRole = 'OWNER';
    }
  }

  // Fetch shop from API if online
  try {
    const res = await apiRequest(`/shops/${currentShopId}`);
    if (res && res.ok) {
      const data = await res.json();
      currentShop = data.data || data;
    }
  } catch (err) {
    console.warn('Could not fetch shop from API, using cached data:', err);
  }

  // Fallback to local storage if API didn't return
  if (!currentShop) {
    try {
      const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
      const m = shops.find(s => Number(s.shop_id) === Number(currentShopId));
      if (m && m.shops) {
        currentShop = m.shops;
      }
    } catch (_) {}
  }

  if (!currentShop) {
    currentShop = {
      id: currentShopId,
      name: `Store #${currentShopId}`,
      phone: '',
      email: '',
      address: '',
      created_at: new Date().toISOString()
    };
  }

  if (container) container.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  renderShop();
  applyPermissions();
}

// Render all sections of Shop Management
function renderShop() {
  const ext = loadExtendedSettings(currentShopId);
  const logo = localStorage.getItem(getLogoKey(currentShopId));

  const shopCode = `FB-STORE-${currentShop.id || currentShopId}`;

  // 1. Header & ID
  setText('header-shop-id-val', shopCode);
  setText('overview-shop-id-val', shopCode);

  // 2. Shop Logo & Avatar
  const avatarText = document.getElementById('overview-shop-initials');
  const avatarImg = document.getElementById('overview-shop-img');
  const brandingImg = document.getElementById('branding-preview-img');
  const brandingEmpty = document.getElementById('branding-preview-empty');

  const shopName = currentShop.name || 'My Shop';
  const initials = shopName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'FB';

  if (logo) {
    if (avatarImg) {
      avatarImg.src = logo;
      avatarImg.style.display = 'block';
    }
    if (avatarText) avatarText.style.display = 'none';
    if (brandingImg) {
      brandingImg.src = logo;
      brandingImg.style.display = 'block';
    }
    if (brandingEmpty) brandingEmpty.style.display = 'none';
    const removeBtn = document.getElementById('btn-remove-logo');
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    if (avatarImg) avatarImg.style.display = 'none';
    if (avatarText) {
      avatarText.textContent = initials;
      avatarText.style.display = 'block';
    }
    if (brandingImg) brandingImg.style.display = 'none';
    if (brandingEmpty) brandingEmpty.style.display = 'flex';
    const removeBtn = document.getElementById('btn-remove-logo');
    if (removeBtn) removeBtn.style.display = 'none';
  }

  // 3. Overview Card
  setText('overview-shop-name', shopName);
  setText('overview-shop-category', ext.category || 'Retail Store');
  setText('overview-owner-name', ext.owner_name || getCurrentUser()?.name || 'Shop Owner');
  
  const createdDate = currentShop.created_at ? new Date(currentShop.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  setText('overview-date-created', createdDate);

  // 4. Basic Information
  renderField('disp-basic-name', currentShop.name);
  renderField('disp-basic-category', ext.category);
  renderField('disp-basic-owner', ext.owner_name || getCurrentUser()?.name);
  renderField('disp-basic-phone', currentShop.phone);
  renderField('disp-basic-email', currentShop.email);
  renderField('disp-basic-desc', ext.description);

  // 5. Address & Location
  renderField('disp-addr-street', currentShop.address);
  renderField('disp-addr-area', ext.area);
  renderField('disp-addr-city', ext.city);
  renderField('disp-addr-state', ext.state);
  renderField('disp-addr-country', ext.country || 'India');
  renderField('disp-addr-pincode', ext.pincode);

  // 6. Business Information (Optional fields)
  renderField('disp-biz-gst', ext.gst_no);
  renderField('disp-biz-pan', ext.pan_no);
  renderField('disp-biz-reg', ext.reg_no);
  renderField('disp-biz-tax', ext.tax_info);
  renderField('disp-biz-type', ext.business_type);
  renderField('disp-biz-prefix', ext.billing_prefix);
  renderField('disp-biz-format', ext.invoice_format);

  // 7. Billing & Invoice Settings
  renderField('disp-bil-prefix', ext.invoice_prefix || ext.billing_prefix || 'FB-');
  renderField('disp-bil-startno', ext.start_invoice_no || '1');
  renderField('disp-bil-currency', ext.currency || 'INR (₹)');
  renderField('disp-bil-taxenabled', ext.tax_enabled === 'true' ? 'Enabled' : 'Disabled');
  renderField('disp-bil-taxrate', ext.tax_rate ? `${ext.tax_rate}%` : '0%');
  renderField('disp-bil-methods', ext.payment_methods || 'Cash, UPI, Card');
  renderField('disp-bil-footer', ext.bill_footer);
  renderField('disp-bil-terms', ext.terms_conditions);
  renderField('disp-bil-return', ext.return_policy);

  // 8. Contact Information
  renderField('disp-cnt-phone', currentShop.phone);
  renderField('disp-cnt-altphone', ext.alt_phone);
  renderField('disp-cnt-email', currentShop.email);
  renderField('disp-cnt-whatsapp', ext.whatsapp || currentShop.phone);
  renderField('disp-cnt-website', ext.website);

  // 9. Business Hours Schedule
  renderBusinessHours(ext.business_hours);

  // 10. Shop Preferences
  renderField('disp-pref-currency', ext.currency || 'INR (₹)');
  renderField('disp-pref-paymethod', ext.payment_methods?.split(',')[0]?.trim() || 'Cash');
  renderField('disp-pref-tax', ext.tax_enabled === 'true' ? 'Active' : 'Disabled');
  renderField('disp-pref-lowstock', ext.low_stock_threshold ? `${ext.low_stock_threshold} units` : '5 units');
  renderField('disp-pref-datefmt', ext.date_format || 'DD/MM/YYYY');
  renderField('disp-pref-numfmt', ext.number_format || 'Indian (1,00,000)');

  // 11. Shop Access Summary
  renderAccessSummary();
}

// Render helper for text
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

// Render helper for fields with "Not added" empty state
function renderField(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val && String(val).trim().length > 0) {
    el.textContent = String(val).trim();
    el.classList.remove('empty-state');
  } else {
    el.textContent = 'Not added';
    el.classList.add('empty-state');
  }
}

// Render Business Hours Schedule
function renderBusinessHours(hoursObj) {
  const hours = hoursObj || DEFAULT_EXTENDED.business_hours;
  const days = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ];

  const list = document.getElementById('business-hours-list');
  if (!list) return;

  list.innerHTML = days.map(day => {
    const item = hours[day.key] || { open: true, from: '09:00', to: '21:00' };
    const isOpen = item.open !== false;
    return `
      <div class="business-hour-row" data-day="${day.key}">
        <div class="hour-day-name">${day.label}</div>
        <div class="hour-controls">
          <select class="hour-status-select" data-day="${day.key}" aria-label="${day.label} status">
            <option value="open" ${isOpen ? 'selected' : ''}>Open</option>
            <option value="closed" ${!isOpen ? 'selected' : ''}>Closed</option>
          </select>
          <div class="hour-time-range" id="time-range-${day.key}" style="display: ${isOpen ? 'flex' : 'none'};">
            <input type="time" class="hour-time-input" data-day="${day.key}" data-type="from" value="${item.from || '09:00'}" aria-label="${day.label} opening time" />
            <span class="hour-separator">to</span>
            <input type="time" class="hour-time-input" data-day="${day.key}" data-type="to" value="${item.to || '21:00'}" aria-label="${day.label} closing time" />
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire up status toggle
  list.querySelectorAll('.hour-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const day = e.target.getAttribute('data-day');
      const timeRange = document.getElementById(`time-range-${day}`);
      if (timeRange) {
        timeRange.style.display = e.target.value === 'open' ? 'flex' : 'none';
      }
    });
  });
}

// Render Shop Access Summary
function renderAccessSummary() {
  let totalEmployees = 0;
  let activeEmployees = 0;

  try {
    const localEmps = JSON.parse(localStorage.getItem('flowbase_employees') || '[]');
    totalEmployees = localEmps.length;
    activeEmployees = localEmps.filter(e => e.status !== 'Inactive').length;
  } catch (_) {}

  setText('stat-total-employees', totalEmployees > 0 ? String(totalEmployees) : '1');
  setText('stat-active-employees', activeEmployees > 0 ? String(activeEmployees) : '1');
  setText('stat-owner-name', loadExtendedSettings(currentShopId).owner_name || getCurrentUser()?.name || 'Store Owner');
  setText('stat-shop-id', `FB-STORE-${currentShopId}`);
}

// Role-based Permissions Handler
function applyPermissions() {
  const isStaff = (typeof isStaffUser === 'function' && isStaffUser()) || (currentRole !== 'OWNER' && currentRole !== 'ADMIN');
  const isOwnerOrAdmin = !isStaff;
  const banner = document.getElementById('employee-view-banner');

  if (banner) {
    banner.style.display = isOwnerOrAdmin ? 'none' : 'flex';
  }

  if (isStaff) {
    // Hide or disable all edit buttons, forms, and admin actions for staff
    document.querySelectorAll('.btn-card-edit, #btn-overview-edit, .shop-edit-form, #btn-save-hours, #logo-dropzone, #btn-remove-logo, #btn-manage-employees, #act-manage-employees, #act-edit-shop, #act-update-logo, #act-manage-billing, #btn-deactivate-shop, .owner-only-action, .owner-only, .admin-only').forEach(el => {
      el.style.display = 'none';
    });
    // Disable inputs inside forms
    document.querySelectorAll('.hour-status-select, .hour-time-input, .shop-form-input, .shop-form-select, .shop-form-textarea').forEach(input => {
      input.disabled = true;
    });
  }
}

// Wire up All Event Handlers
function initEventHandlers() {
  // 1. Copy Shop ID buttons
  document.querySelectorAll('.btn-copy-id, #btn-overview-copy-id, #act-copy-id').forEach(btn => {
    btn.addEventListener('click', () => {
      const shopCode = `FB-STORE-${currentShopId}`;
      navigator.clipboard.writeText(shopCode).then(() => {
        showToast(`Shop ID "${shopCode}" copied to clipboard!`);
      }).catch(() => {
        showToast(`Shop ID: ${shopCode}`);
      });
    });
  });

  // 2. Overview "Edit Shop Details" button
  document.getElementById('btn-overview-edit')?.addEventListener('click', () => {
    openCardEdit('card-basic');
  });

  // 3. Setup Edit / Cancel / Save for each Card
  setupCardEditor('card-basic', {
    onOpen: (ext) => {
      setValue('input-basic-name', currentShop.name);
      setValue('input-basic-category', ext.category);
      setValue('input-basic-owner', ext.owner_name || getCurrentUser()?.name);
      setValue('input-basic-phone', currentShop.phone);
      setValue('input-basic-email', currentShop.email);
      setValue('input-basic-desc', ext.description);
    },
    onSave: async () => {
      const name = getValue('input-basic-name');
      const phone = getValue('input-basic-phone');
      const email = getValue('input-basic-email');
      const category = getValue('input-basic-category');
      const owner_name = getValue('input-basic-owner');
      const description = getValue('input-basic-desc');

      // Update backend
      await syncShopCoreToBackend({ name, phone, email });
      // Update extended
      saveExtendedSettings(currentShopId, { category, owner_name, description });
      renderShop();
      showToast('Shop details updated successfully.');
    }
  });

  setupCardEditor('card-address', {
    onOpen: (ext) => {
      setValue('input-addr-street', currentShop.address);
      setValue('input-addr-area', ext.area);
      setValue('input-addr-city', ext.city);
      setValue('input-addr-state', ext.state);
      setValue('input-addr-country', ext.country || 'India');
      setValue('input-addr-pincode', ext.pincode);
    },
    onSave: async () => {
      const address = getValue('input-addr-street');
      const area = getValue('input-addr-area');
      const city = getValue('input-addr-city');
      const state = getValue('input-addr-state');
      const country = getValue('input-addr-country');
      const pincode = getValue('input-addr-pincode');

      await syncShopCoreToBackend({ address });
      saveExtendedSettings(currentShopId, { area, city, state, country, pincode });
      renderShop();
      showToast('Address & location updated successfully.');
    }
  });

  setupCardEditor('card-business', {
    onOpen: (ext) => {
      setValue('input-biz-gst', ext.gst_no);
      setValue('input-biz-pan', ext.pan_no);
      setValue('input-biz-reg', ext.reg_no);
      setValue('input-biz-tax', ext.tax_info);
      setValue('input-biz-type', ext.business_type || 'Sole Proprietorship');
      setValue('input-biz-prefix', ext.billing_prefix || 'FB-');
      setValue('input-biz-format', ext.invoice_format || 'FB-[000000]');
    },
    onSave: async () => {
      const gst_no = getValue('input-biz-gst');
      const pan_no = getValue('input-biz-pan');
      const reg_no = getValue('input-biz-reg');
      const tax_info = getValue('input-biz-tax');
      const business_type = getValue('input-biz-type');
      const billing_prefix = getValue('input-biz-prefix');
      const invoice_format = getValue('input-biz-format');

      saveExtendedSettings(currentShopId, {
        gst_no, pan_no, reg_no, tax_info, business_type, billing_prefix, invoice_format
      });
      renderShop();
      showToast('Business & legal details updated successfully.');
    }
  });

  setupCardEditor('card-billing', {
    onOpen: (ext) => {
      setValue('input-bil-prefix', ext.invoice_prefix || ext.billing_prefix || 'FB-');
      setValue('input-bil-startno', ext.start_invoice_no || '1');
      setValue('input-bil-currency', ext.currency || 'INR (₹)');
      setValue('input-bil-taxenabled', ext.tax_enabled || 'true');
      setValue('input-bil-taxrate', ext.tax_rate || '18');
      setValue('input-bil-methods', ext.payment_methods || 'Cash, UPI, Card');
      setValue('input-bil-footer', ext.bill_footer);
      setValue('input-bil-terms', ext.terms_conditions);
      setValue('input-bil-return', ext.return_policy);
    },
    onSave: async () => {
      const invoice_prefix = getValue('input-bil-prefix');
      const start_invoice_no = getValue('input-bil-startno');
      const currency = getValue('input-bil-currency');
      const tax_enabled = getValue('input-bil-taxenabled');
      const tax_rate = getValue('input-bil-taxrate');
      const payment_methods = getValue('input-bil-methods');
      const bill_footer = getValue('input-bil-footer');
      const terms_conditions = getValue('input-bil-terms');
      const return_policy = getValue('input-bil-return');

      saveExtendedSettings(currentShopId, {
        invoice_prefix, start_invoice_no, currency, tax_enabled, tax_rate,
        payment_methods, bill_footer, terms_conditions, return_policy
      });
      renderShop();
      showToast('Billing & invoice settings updated successfully.');
    }
  });

  setupCardEditor('card-contact', {
    onOpen: (ext) => {
      setValue('input-cnt-phone', currentShop.phone);
      setValue('input-cnt-altphone', ext.alt_phone);
      setValue('input-cnt-email', currentShop.email);
      setValue('input-cnt-whatsapp', ext.whatsapp || currentShop.phone);
      setValue('input-cnt-website', ext.website);
    },
    onSave: async () => {
      const phone = getValue('input-cnt-phone');
      const alt_phone = getValue('input-cnt-altphone');
      const email = getValue('input-cnt-email');
      const whatsapp = getValue('input-cnt-whatsapp');
      const website = getValue('input-cnt-website');

      await syncShopCoreToBackend({ phone, email });
      saveExtendedSettings(currentShopId, { alt_phone, whatsapp, website });
      renderShop();
      showToast('Contact information updated successfully.');
    }
  });

  setupCardEditor('card-preferences', {
    onOpen: (ext) => {
      setValue('input-pref-currency', ext.currency || 'INR (₹)');
      setValue('input-pref-paymethod', ext.payment_methods?.split(',')[0]?.trim() || 'Cash');
      setValue('input-pref-tax', ext.tax_enabled || 'true');
      setValue('input-pref-lowstock', ext.low_stock_threshold || '5');
      setValue('input-pref-datefmt', ext.date_format || 'DD/MM/YYYY');
      setValue('input-pref-numfmt', ext.number_format || 'Indian (1,00,000)');
    },
    onSave: async () => {
      const currency = getValue('input-pref-currency');
      const tax_enabled = getValue('input-pref-tax');
      const low_stock_threshold = getValue('input-pref-lowstock');
      const date_format = getValue('input-pref-datefmt');
      const number_format = getValue('input-pref-numfmt');

      saveExtendedSettings(currentShopId, {
        currency, tax_enabled, low_stock_threshold, date_format, number_format
      });
      renderShop();
      showToast('Shop preferences updated successfully.');
    }
  });

  // 4. Save Business Hours
  document.getElementById('btn-save-hours')?.addEventListener('click', () => {
    const hours = {};
    const rows = document.querySelectorAll('.business-hour-row');
    rows.forEach(row => {
      const day = row.getAttribute('data-day');
      const sel = row.querySelector('.hour-status-select');
      const fromInput = row.querySelector('[data-type="from"]');
      const toInput = row.querySelector('[data-type="to"]');

      hours[day] = {
        open: sel ? sel.value === 'open' : true,
        from: fromInput ? fromInput.value : '09:00',
        to: toInput ? toInput.value : '21:00'
      };
    });

    saveExtendedSettings(currentShopId, { business_hours: hours });
    showToast('Business hours saved successfully.');
  });

  // 5. Logo / Branding Handlers
  const fileInput = document.getElementById('shop-logo-file');
  const dropzone = document.getElementById('logo-dropzone');
  const removeBtn = document.getElementById('btn-remove-logo');

  dropzone?.addEventListener('click', () => fileInput?.click());
  document.getElementById('act-update-logo')?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleLogoUpload(file);
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleLogoUpload(file);
    });
  }

  removeBtn?.addEventListener('click', () => {
    localStorage.removeItem(getLogoKey(currentShopId));
    renderShop();
    showToast('Shop logo removed successfully.');
  });

  // 6. Action Navigation Buttons
  document.getElementById('act-edit-shop')?.addEventListener('click', () => {
    openCardEdit('card-basic');
    document.getElementById('card-basic')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('act-manage-billing')?.addEventListener('click', () => {
    openCardEdit('card-billing');
    document.getElementById('card-billing')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('btn-manage-employees')?.addEventListener('click', () => {
    window.location.href = 'employees.html';
  });
  document.getElementById('act-manage-employees')?.addEventListener('click', () => {
    window.location.href = 'employees.html';
  });

  // 7. Deactivate confirmation modal
  const deactBtn = document.getElementById('btn-deactivate-shop');
  const deactModal = document.getElementById('deactivate-modal');
  const deactConfirmBtn = document.getElementById('modal-deactivate-confirm');
  const deactCancelBtn = document.getElementById('modal-deactivate-cancel');

  deactBtn?.addEventListener('click', () => {
    if (deactModal) deactModal.classList.add('open');
  });

  deactCancelBtn?.addEventListener('click', () => {
    if (deactModal) deactModal.classList.remove('open');
  });

  deactConfirmBtn?.addEventListener('click', () => {
    if (deactModal) deactModal.classList.remove('open');
    showToast('Shop deactivation request logged.', 'default');
  });

  // 8. Mobile drawer & header hamburger
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
  });
}

// Logo file reader helper
function handleLogoUpload(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Image file size must be less than 2MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    localStorage.setItem(getLogoKey(currentShopId), dataUrl);
    renderShop();
    showToast('Shop logo uploaded successfully.');
  };
  reader.readAsDataURL(file);
}

// Card Editor helper
function setupCardEditor(cardId, callbacks) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const editBtn = card.querySelector('[data-edit-btn]');
  const cancelBtn = card.querySelector('[data-cancel-btn]');
  const saveBtn = card.querySelector('[data-save-btn]');

  editBtn?.addEventListener('click', () => {
    const ext = loadExtendedSettings(currentShopId);
    if (callbacks.onOpen) callbacks.onOpen(ext);
    card.classList.add('is-editing');
  });

  cancelBtn?.addEventListener('click', () => {
    card.classList.remove('is-editing');
  });

  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      if (callbacks.onSave) await callbacks.onSave();
      card.classList.remove('is-editing');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });
}

function openCardEdit(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const editBtn = card.querySelector('[data-edit-btn]');
  if (editBtn) editBtn.click();
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

// Sync Core Shop details to backend if online
async function syncShopCoreToBackend(updates) {
  // Update local currentShop object
  currentShop = { ...currentShop, ...updates };

  // Update membership cache in localStorage
  try {
    const shops = JSON.parse(localStorage.getItem(STORAGE_SHOPS) || '[]');
    const idx = shops.findIndex(s => Number(s.shop_id) === Number(currentShopId));
    if (idx !== -1) {
      shops[idx].shops = { ...(shops[idx].shops || {}), ...updates };
      localStorage.setItem(STORAGE_SHOPS, JSON.stringify(shops));
    }
  } catch (_) {}

  // Attempt backend PATCH
  try {
    await apiRequest(`/shops/${currentShopId}`, {
      method: 'PATCH',
      body: updates
    });
  } catch (err) {
    console.warn('Backend patch failed, saved locally:', err);
  }
}
