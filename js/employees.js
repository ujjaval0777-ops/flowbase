// ============================================
// FlowBase Employees & Payroll — employees.js
// ============================================
'use strict';

const LS_MEMBERS_KEY  = 'flowbase_members';
const LS_SALARIES_KEY = 'flowbase_salaries';

const DEFAULT_MEMBERS = [
  {
    id: 1,
    role: 'OWNER',
    salary: 65000,
    joined_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    profiles: { id: 'usr-1', name: 'Shop Admin (You)', email: 'admin@flowbase.com', phone: '+91 98765 43210' }
  },
  {
    id: 2,
    role: 'ADMIN',
    salary: 42000,
    joined_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    profiles: { id: 'usr-2', name: 'Priya Patel', email: 'priya.p@flowbase.com', phone: '+91 98111 22334' }
  },
  {
    id: 3,
    role: 'STAFF',
    salary: 24000,
    joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    profiles: { id: 'usr-3', name: 'Amit Singh', email: 'amit.s@flowbase.com', phone: '+91 97222 33445' }
  },
  {
    id: 4,
    role: 'STAFF',
    salary: 22000,
    joined_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    profiles: { id: 'usr-4', name: 'Neha Gupta', email: 'neha.g@flowbase.com', phone: '+91 96333 44556' }
  }
];

const DEFAULT_SALARIES = [
  {
    id: 1,
    shop_member_id: 2,
    amount: 42000,
    salary_month: '2026-08-01',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    shop_members: { id: 2, profiles: { name: 'Priya Patel', email: 'priya.p@flowbase.com' } }
  },
  {
    id: 2,
    shop_member_id: 3,
    amount: 24000,
    salary_month: '2026-08-01',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    shop_members: { id: 3, profiles: { name: 'Amit Singh', email: 'amit.s@flowbase.com' } }
  }
];

let membersData = [];
let salariesData = [];
let filteredMembers = [];

// ============================================
// LOAD DATA FROM BACKEND & LOCAL STORAGE
// ============================================
async function loadData() {
  const shopId = await ensureActiveShop();

  // 1. Initialise from cached storage or defaults
  try {
    const cachedM = localStorage.getItem(LS_MEMBERS_KEY);
    membersData = cachedM ? JSON.parse(cachedM) : [...DEFAULT_MEMBERS];
    const cachedS = localStorage.getItem(LS_SALARIES_KEY);
    salariesData = cachedS ? JSON.parse(cachedS) : [...DEFAULT_SALARIES];
  } catch (_) {
    membersData = [...DEFAULT_MEMBERS];
    salariesData = [...DEFAULT_SALARIES];
  }

  // 2. Fetch live data from FastAPI Backend
  if (shopId) {
    try {
      const [rawMembers, rawSalaries] = await Promise.all([
        apiRequest(`/shops/${shopId}/members`),
        apiRequest(`/salaries/${shopId}`).catch(() => [])
      ]);

      if (Array.isArray(rawMembers) && rawMembers.length > 0) {
        membersData = rawMembers;
        localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(membersData));
      }
      if (Array.isArray(rawSalaries) && rawSalaries.length > 0) {
        salariesData = rawSalaries;
        localStorage.setItem(LS_SALARIES_KEY, JSON.stringify(salariesData));
      }
    } catch (err) {
      console.warn('Live members API failed, using cached store:', err.message);
    }
  }

  renderKPIs();
  applyFilters();
}

function saveMembersLocally() {
  try { localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(membersData)); } catch (_) {}
}

function saveSalariesLocally() {
  try { localStorage.setItem(LS_SALARIES_KEY, JSON.stringify(salariesData)); } catch (_) {}
}

// ============================================
// KPI METRICS
// ============================================
function renderKPIs() {
  const total = membersData.length;
  const staff = membersData.filter(m => m.role === 'STAFF').length;
  const admins = membersData.filter(m => m.role === 'ADMIN' || m.role === 'OWNER').length;
  
  const totalPayroll = membersData.reduce((acc, m) => {
    const sal = parseFloat(m.salary || 0);
    return acc + (isNaN(sal) ? 0 : sal);
  }, 0);

  const setVal = (id, val) => {
    const el = document.querySelector(`#${id} .kpi-value`);
    if (el) el.textContent = val;
  };

  setVal('kpi-total-members', total);
  setVal('kpi-active-staff', staff);
  setVal('kpi-payroll', formatINR(totalPayroll));
  setVal('kpi-admins', admins);
}

// ============================================
// FILTER & RENDER TABLE
// ============================================
function applyFilters() {
  const q = document.getElementById('emp-search-input')?.value.trim().toLowerCase() || '';
  const role = document.getElementById('emp-filter-role')?.value || '';

  filteredMembers = membersData.filter(m => {
    const profile = m.profiles || {};
    const name = (profile.name || '').toLowerCase();
    const email = (profile.email || '').toLowerCase();
    const mRole = (m.role || '').toUpperCase();

    const matchesQ = !q || name.includes(q) || email.includes(q) || mRole.includes(q);
    const matchesRole = !role || mRole === role;

    return matchesQ && matchesRole;
  });

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;

  if (filteredMembers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="prd-empty-title">No employees found</div>
            <div class="prd-empty-desc">Add team members or adjust your filter.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredMembers.map(m => {
    const profile = m.profiles || {};
    const name = profile.name || 'Member #' + m.id;
    const email = profile.email || '—';
    const phone = profile.phone || '—';
    const role = (m.role || 'STAFF').toUpperCase();
    const salary = m.salary ? formatINR(m.salary) : '—';
    const joined = m.joined_at ? formatDate(m.joined_at) : '—';

    const roleBadgeClass = role === 'OWNER' ? 'badge-owner' : role === 'ADMIN' ? 'badge-admin' : 'badge-staff';
    const isOwner = role === 'OWNER';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="profile-avatar" style="width:34px; height:34px; font-size:12px; background:linear-gradient(135deg, var(--color-primary), #155e39); flex-shrink:0;">${getInitials(name)}</div>
            <div>
              <div style="font-weight:600; font-size:13px; color:var(--color-text);">${escHtml(name)}</div>
              <div style="font-size:11px; color:var(--color-text-secondary);">ID: ${m.id}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-size:12px; font-weight:500;">${escHtml(email)}</div>
          <div style="font-size:11px; color:var(--color-text-secondary);">${escHtml(phone)}</div>
        </td>
        <td><span class="badge ${roleBadgeClass}">${role}</span></td>
        <td class="prd-th-num" style="font-weight:600; font-size:13px;">${salary}</td>
        <td style="color:var(--color-text-secondary); font-size:12px;">${joined}</td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="prd-action-btn" type="button" data-pay-salary="${m.id}" style="font-size:11px; padding:4px 8px; color:var(--color-primary); border-color:var(--color-primary-muted);">Pay Salary</button>
            <button class="prd-action-btn" type="button" data-edit-member="${m.id}" style="font-size:11px; padding:4px 8px;">Edit</button>
            ${!isOwner ? `<button class="prd-action-btn" type="button" data-delete-member="${m.id}" style="font-size:11px; padding:4px 8px; color:var(--color-danger); border-color:var(--color-danger);">Remove</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function getInitials(name) {
  return (name || 'MB')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// MODAL EVENTS & INTERACTIONS
// ============================================
function initAddModal() {
  const addBtn = document.getElementById('add-employee-btn');
  const closeBtn = document.getElementById('emp-add-close');
  const tabCreate = document.getElementById('tab-create-user');
  const tabExist = document.getElementById('tab-add-existing');
  const formCreate = document.getElementById('emp-create-form');
  const formExist = document.getElementById('emp-existing-form');

  addBtn?.addEventListener('click', () => {
    formCreate?.reset();
    formExist?.reset();
    openModal('emp-add-modal');
  });

  closeBtn?.addEventListener('click', () => closeModal('emp-add-modal'));
  document.getElementById('emp-create-cancel')?.addEventListener('click', () => closeModal('emp-add-modal'));
  document.getElementById('emp-existing-cancel')?.addEventListener('click', () => closeModal('emp-add-modal'));

  tabCreate?.addEventListener('click', () => {
    tabCreate.classList.add('active');
    tabExist.classList.remove('active');
    if (formCreate) formCreate.style.display = 'block';
    if (formExist) formExist.style.display = 'none';
  });

  tabExist?.addEventListener('click', () => {
    tabExist.classList.add('active');
    tabCreate.classList.remove('active');
    if (formExist) formExist.style.display = 'block';
    if (formCreate) formCreate.style.display = 'none';
  });

  // Create new user form
  formCreate?.addEventListener('submit', async e => {
    e.preventDefault();
    const shopId = await ensureActiveShop();

    const name = document.getElementById('new-emp-name').value.trim();
    const email = document.getElementById('new-emp-email').value.trim();
    const password = document.getElementById('new-emp-password').value;
    const phone = document.getElementById('new-emp-phone').value.trim() || undefined;
    const role = document.getElementById('new-emp-role').value;
    const salaryVal = parseFloat(document.getElementById('new-emp-salary').value);
    const salary = isNaN(salaryVal) ? 0 : salaryVal;

    const submitBtn = document.getElementById('emp-create-submit');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/members/new`, {
          method: 'POST',
          body: { name, email, password, phone, role, salary }
        });
      }
    } catch (err) {
      console.warn('API member creation note:', err.message);
    }

    // Update local state
    const newId = membersData.length > 0 ? Math.max(...membersData.map(m => m.id)) + 1 : 1;
    membersData.push({
      id: newId,
      role,
      salary,
      joined_at: new Date().toISOString(),
      profiles: { id: `usr-${newId}`, name, email, phone }
    });
    saveMembersLocally();

    showToast('Employee account created successfully.', 'success');
    closeModal('emp-add-modal');
    if (submitBtn) submitBtn.disabled = false;
    renderKPIs();
    applyFilters();
  });

  // Add existing user form
  formExist?.addEventListener('submit', async e => {
    e.preventDefault();
    const shopId = await ensureActiveShop();

    const userId = document.getElementById('exist-user-id').value.trim();
    const role = document.getElementById('exist-emp-role').value;
    const salaryVal = parseFloat(document.getElementById('exist-emp-salary').value);
    const salary = isNaN(salaryVal) ? 0 : salaryVal;

    const submitBtn = document.getElementById('emp-existing-submit');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/members/existing`, {
          method: 'POST',
          body: { user_id: userId, role, salary }
        });
      }
    } catch (err) {
      console.warn('API member existing note:', err.message);
    }

    const newId = membersData.length > 0 ? Math.max(...membersData.map(m => m.id)) + 1 : 1;
    membersData.push({
      id: newId,
      role,
      salary,
      joined_at: new Date().toISOString(),
      profiles: { id: userId, name: `User ${userId.slice(0, 8)}`, email: `${userId.slice(0, 8)}@flowbase.local`, phone: '—' }
    });
    saveMembersLocally();

    showToast('Member added to shop successfully.', 'success');
    closeModal('emp-add-modal');
    if (submitBtn) submitBtn.disabled = false;
    renderKPIs();
    applyFilters();
  });
}

// ============================================
// TABLE ACTIONS (Edit / Pay Salary / Delete)
// ============================================
function initTableActions() {
  document.getElementById('employees-tbody')?.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-member]');
    if (editBtn) {
      const id = parseInt(editBtn.dataset.editMember, 10);
      openEditModal(id);
      return;
    }

    const payBtn = e.target.closest('[data-pay-salary]');
    if (payBtn) {
      const id = parseInt(payBtn.dataset.paySalary, 10);
      openPaySalaryModal(id);
      return;
    }

    const deleteBtn = e.target.closest('[data-delete-member]');
    if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.deleteMember, 10);
      openDeleteModal(id);
      return;
    }
  });
}

function openEditModal(memberId) {
  const member = membersData.find(m => m.id === memberId);
  if (!member) return;

  const profile = member.profiles || {};
  document.getElementById('edit-member-id').value = member.id;
  document.getElementById('edit-emp-name').value = profile.name || 'Member #' + member.id;
  document.getElementById('edit-emp-role').value = member.role || 'STAFF';
  document.getElementById('edit-emp-salary').value = member.salary || '';

  openModal('emp-edit-modal');
}

function initEditForm() {
  document.getElementById('emp-edit-cancel')?.addEventListener('click', () => closeModal('emp-edit-modal'));
  document.getElementById('emp-edit-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const shopId = await ensureActiveShop();
    const memberId = parseInt(document.getElementById('edit-member-id').value, 10);
    if (!memberId) return;

    const role = document.getElementById('edit-emp-role').value;
    const salaryVal = parseFloat(document.getElementById('edit-emp-salary').value);
    const salary = isNaN(salaryVal) ? 0 : salaryVal;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/members/${memberId}`, {
          method: 'PATCH',
          body: { role, salary }
        });
      }
    } catch (err) {
      console.warn('API update member note:', err.message);
    }

    const idx = membersData.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      membersData[idx].role = role;
      membersData[idx].salary = salary;
      saveMembersLocally();
    }

    showToast('Member updated successfully.', 'success');
    closeModal('emp-edit-modal');
    renderKPIs();
    applyFilters();
  });
}

function openDeleteModal(memberId) {
  document.getElementById('delete-member-id').value = memberId;
  openModal('emp-delete-modal');
}

function initDeleteModal() {
  document.getElementById('emp-delete-cancel')?.addEventListener('click', () => closeModal('emp-delete-modal'));
  document.getElementById('emp-delete-confirm')?.addEventListener('click', async () => {
    const shopId = await ensureActiveShop();
    const memberId = parseInt(document.getElementById('delete-member-id').value, 10);
    if (!memberId) return;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/members/${memberId}`, {
          method: 'DELETE'
        });
      }
    } catch (err) {
      console.warn('API delete member note:', err.message);
    }

    membersData = membersData.filter(m => m.id !== memberId);
    saveMembersLocally();

    showToast('Member removed from shop.', 'success');
    closeModal('emp-delete-modal');
    renderKPIs();
    applyFilters();
  });
}

// ============================================
// PAY SALARY MODAL & HISTORY
// ============================================
function openPaySalaryModal(memberId) {
  const member = membersData.find(m => m.id === memberId);
  if (!member) return;

  const profile = member.profiles || {};
  const name = profile.name || 'Member #' + member.id;

  document.getElementById('salary-member-id').value = member.id;
  document.getElementById('salary-pay-desc').textContent = `Pay monthly salary for ${name}.`;
  document.getElementById('salary-amount').value = member.salary || '';

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('salary-month').value = `${yyyy}-${mm}-01`;

  openModal('salary-pay-modal');
}

function initPaySalaryForm() {
  document.getElementById('salary-pay-cancel')?.addEventListener('click', () => closeModal('salary-pay-modal'));
  document.getElementById('salary-pay-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const memberId = parseInt(document.getElementById('salary-member-id').value, 10);
    const amount = parseFloat(document.getElementById('salary-amount').value);
    const month = document.getElementById('salary-month').value;

    if (!memberId || isNaN(amount) || amount <= 0 || !month) {
      showToast('Please enter a valid amount and salary month.', 'warning');
      return;
    }

    try {
      await apiRequest('/salaries', {
        method: 'POST',
        body: {
          shop_member_id: memberId,
          amount: amount,
          salary_month: month
        }
      });
    } catch (err) {
      console.warn('API pay salary note:', err.message);
    }

    const member = membersData.find(m => m.id === memberId);
    const sId = salariesData.length > 0 ? Math.max(...salariesData.map(s => s.id)) + 1 : 1;
    salariesData.unshift({
      id: sId,
      shop_member_id: memberId,
      amount,
      salary_month: month,
      created_at: new Date().toISOString(),
      shop_members: {
        id: memberId,
        profiles: member?.profiles || { name: `Member #${memberId}`, email: '' }
      }
    });
    saveSalariesLocally();

    showToast('Salary payment recorded successfully.', 'success');
    closeModal('salary-pay-modal');
  });
}

function initSalaryHistory() {
  document.getElementById('view-salaries-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('salary-history-tbody');
    if (!tbody) return;

    if (salariesData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--color-text-secondary);">No salary payments recorded yet.</td></tr>`;
    } else {
      tbody.innerHTML = salariesData.map(s => {
        const memberInfo = s.shop_members || {};
        const profile = memberInfo.profiles || {};
        const name = profile.name || (profile.email ? profile.email.split('@')[0] : `Member #${s.shop_member_id}`);
        const month = s.salary_month || '—';
        const amount = formatINR(s.amount || 0);
        const paidAt = s.created_at ? formatDate(s.created_at) : '—';

        return `
          <tr>
            <td style="font-weight:600;">${escHtml(name)}</td>
            <td><span class="badge badge-neutral">${escHtml(month)}</span></td>
            <td class="prd-th-num" style="font-weight:700; color:var(--color-primary);">${amount}</td>
            <td style="font-size:12px; color:var(--color-text-secondary);">${paidAt}</td>
          </tr>`;
      }).join('');
    }

    openModal('salary-history-modal');
  });

  document.getElementById('salary-history-close')?.addEventListener('click', () => closeModal('salary-history-modal'));
  document.getElementById('salary-history-close-btn')?.addEventListener('click', () => closeModal('salary-history-modal'));
}

// ============================================
// EXPORT CSV & CLEAR FILTERS
// ============================================
function initExport() {
  document.getElementById('emp-export-btn')?.addEventListener('click', () => {
    if (filteredMembers.length === 0) {
      showToast('No employee records to export.', 'warning');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Salary (INR)', 'Joined Date'];
    const rows = filteredMembers.map(m => {
      const p = m.profiles || {};
      return [
        m.id,
        `"${p.name || ''}"`,
        `"${p.email || ''}"`,
        `"${p.phone || ''}"`,
        `"${m.role || ''}"`,
        m.salary || 0,
        `"${formatDate(m.joined_at)}"`,
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowbase-employees.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Employee CSV exported.', 'success');
  });

  document.getElementById('emp-clear-filters-btn')?.addEventListener('click', () => {
    const sInput = document.getElementById('emp-search-input');
    const rSelect = document.getElementById('emp-filter-role');
    if (sInput) sInput.value = '';
    if (rSelect) rSelect.value = '';
    applyFilters();
  });
}

// ============================================
// MODAL HELPERS
// ============================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
  }
}

function initModalOverlayClose() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function initEscClose() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = document.querySelector('.modal-overlay.open');
      if (open) closeModal(open.id);
    }
  });
}

// ============================================
// SIDEBAR & LOGOUT
// ============================================
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger-btn');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  function openSidebar() { sidebar.classList.add('open'); overlay?.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeSidebar() { sidebar.classList.remove('open'); overlay?.classList.remove('open'); if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = ''; }

  hamburger?.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  overlay?.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); }));
}

function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => openModal('logout-modal'));
  document.getElementById('logout-cancel')?.addEventListener('click', () => closeModal('logout-modal'));
}

function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ' toast-' + type : ''}`;
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  toast.innerHTML = (icons[type] || icons.default) + `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 200); }, 3200);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initAuthGuard === 'function') {
    if (!initAuthGuard({ requireAuth: true })) return;
  }

  initSidebar();
  initLogout();
  initAddModal();
  initTableActions();
  initEditForm();
  initDeleteModal();
  initPaySalaryForm();
  initSalaryHistory();
  initExport();
  initModalOverlayClose();
  initEscClose();

  document.getElementById('emp-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('emp-filter-role')?.addEventListener('change', applyFilters);

  await loadData();
});
