// ============================================
// FlowBase Purchases & Expenses — purchases_expenses.js
// ============================================
'use strict';

const LS_EXPENSES_KEY  = 'flowbase_expenses';
const LS_PURCHASES_KEY = 'flowbase_purchases';
const LS_INV_KEY       = 'flowbase_inventory';

const DEFAULT_EXPENSES = [
  {
    id: 1,
    category: 'Store Rent',
    description: 'Monthly commercial shop lease',
    amount: 18000,
    expense_date: '2026-08-01',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 2,
    category: 'Electricity & Utilities',
    description: 'Power backup and AC consumption bill',
    amount: 4200,
    expense_date: '2026-08-10',
    created_at: new Date(Date.now() - 16 * 86400000).toISOString()
  },
  {
    id: 3,
    category: 'Packaging & Bags',
    description: 'Eco-friendly branded shopping bags (500 units)',
    amount: 2500,
    expense_date: '2026-08-18',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 4,
    category: 'Internet & POS',
    description: 'High-speed broadband + billing terminal software subscription',
    amount: 1500,
    expense_date: '2026-08-22',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString()
  }
];

const DEFAULT_PURCHASES = [
  {
    id: 1,
    reference_number: 'INV-2026-801',
    description: 'Wholesale electronics & gadgets restock',
    total_cost: 32500,
    purchase_date: '2026-08-05',
    purchase_items: [
      { id: 1, product_id: 1, quantity: 20, unit_cost: 650, subtotal: 13000 },
      { id: 2, product_id: 2, quantity: 15, unit_cost: 1300, subtotal: 19500 }
    ]
  },
  {
    id: 2,
    reference_number: 'INV-2026-844',
    description: 'Accessories and peripheral stock order',
    total_cost: 14800,
    purchase_date: '2026-08-20',
    purchase_items: [
      { id: 3, product_id: 3, quantity: 40, unit_cost: 370, subtotal: 14800 }
    ]
  }
];

let expensesData = [];
let purchasesData = [];
let productsData = [];

let filteredExpenses = [];
let filteredPurchases = [];

// ============================================
// LOAD DATA FROM BACKEND & LOCAL STORAGE
// ============================================
async function loadData() {
  const shopId = await ensureActiveShop();

  // 1. Initialise local/cached state
  try {
    const cachedE = localStorage.getItem(LS_EXPENSES_KEY);
    expensesData = cachedE ? JSON.parse(cachedE) : [...DEFAULT_EXPENSES];
    const cachedP = localStorage.getItem(LS_PURCHASES_KEY);
    purchasesData = cachedP ? JSON.parse(cachedP) : [...DEFAULT_PURCHASES];
    const cachedPrd = localStorage.getItem(LS_INV_KEY);
    productsData = cachedPrd ? JSON.parse(cachedPrd) : [];
  } catch (_) {
    expensesData = [...DEFAULT_EXPENSES];
    purchasesData = [...DEFAULT_PURCHASES];
  }

  // 2. Fetch live data from FastAPI backend
  if (shopId) {
    try {
      const [rawExpenses, rawPurchases, rawProducts] = await Promise.all([
        apiRequest(`/expenses/${shopId}`).catch(() => []),
        apiRequest(`/purchases/${shopId}`).catch(() => []),
        apiRequest(`/shops/${shopId}/products`).catch(() => [])
      ]);

      if (Array.isArray(rawExpenses) && rawExpenses.length > 0) {
        expensesData = rawExpenses;
        localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(expensesData));
      }
      if (Array.isArray(rawPurchases) && rawPurchases.length > 0) {
        purchasesData = rawPurchases;
        localStorage.setItem(LS_PURCHASES_KEY, JSON.stringify(purchasesData));
      }
      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        productsData = rawProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku || `PRD-${p.id}`,
          purchasePrice: Number(p.purchase_price || 0),
          sellingPrice: Number(p.selling_price || 0),
          currentStock: Number(p.stock_quantity || 0)
        }));
      }
    } catch (err) {
      console.warn('Live purchases/expenses API note:', err.message);
    }
  }

  renderKPIs();
  applyExpensesFilter();
  applyPurchasesFilter();
}

function saveExpensesLocally() {
  try { localStorage.setItem(LS_EXPENSES_KEY, JSON.stringify(expensesData)); } catch (_) {}
}

function savePurchasesLocally() {
  try { localStorage.setItem(LS_PURCHASES_KEY, JSON.stringify(purchasesData)); } catch (_) {}
}

// ============================================
// KPI METRICS
// ============================================
function renderKPIs() {
  const totalExp = expensesData.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const totalPur = purchasesData.reduce((acc, p) => acc + parseFloat(p.total_cost || 0), 0);
  const totalOutflow = totalExp + totalPur;
  const count = expensesData.length + purchasesData.length;

  const setVal = (id, val) => {
    const el = document.querySelector(`#${id} .kpi-value`);
    if (el) el.textContent = val;
  };

  setVal('kpi-total-expenses', formatINR(totalExp));
  setVal('kpi-total-purchases', formatINR(totalPur));
  setVal('kpi-total-outflow', formatINR(totalOutflow));
  setVal('kpi-invoice-count', count);
}

// ============================================
// EXPENSES TAB FILTER & RENDER
// ============================================
function applyExpensesFilter() {
  const q = document.getElementById('expense-search-input')?.value.trim().toLowerCase() || '';

  filteredExpenses = expensesData.filter(e => {
    const cat = (e.category || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    return !q || cat.includes(q) || desc.includes(q);
  });

  renderExpensesTable();
}

function renderExpensesTable() {
  const tbody = document.getElementById('expenses-tbody');
  if (!tbody) return;

  if (filteredExpenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="prd-empty-title">No operating expenses found</div>
            <div class="prd-empty-desc">Record utility, rent, or maintenance costs.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredExpenses.map(e => {
    const cat = e.category || 'General';
    const desc = e.description || '—';
    const amt = formatINR(e.amount || 0);
    const expDate = e.expense_date ? formatDate(e.expense_date) : '—';
    const createdAt = e.created_at ? formatDateTime(e.created_at) : '—';

    return `
      <tr>
        <td style="font-weight:600; color:var(--color-text-secondary); font-size:12px;">#${e.id}</td>
        <td><span class="badge badge-neutral">${escHtml(cat)}</span></td>
        <td style="font-size:13px; font-weight:500;">${escHtml(desc)}</td>
        <td class="prd-th-num" style="font-weight:700; color:var(--color-danger); font-size:13px;">${amt}</td>
        <td style="font-size:12px;">${expDate}</td>
        <td style="font-size:12px; color:var(--color-text-secondary);">${createdAt}</td>
      </tr>`;
  }).join('');
}

// ============================================
// PURCHASES TAB FILTER & RENDER
// ============================================
function applyPurchasesFilter() {
  const q = document.getElementById('purchase-search-input')?.value.trim().toLowerCase() || '';

  filteredPurchases = purchasesData.filter(p => {
    const ref = (p.reference_number || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    return !q || ref.includes(q) || desc.includes(q) || String(p.id).includes(q);
  });

  renderPurchasesTable();
}

function renderPurchasesTable() {
  const tbody = document.getElementById('purchases-tbody');
  if (!tbody) return;

  if (filteredPurchases.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            </div>
            <div class="prd-empty-title">No stock purchases found</div>
            <div class="prd-empty-desc">Create vendor purchases to restock items.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filteredPurchases.map(p => {
    const ref = p.reference_number || `PUR-${String(p.id).padStart(5, '0')}`;
    const desc = p.description || 'Stock restock';
    const itemsCount = (p.purchase_items || []).length;
    const totalCost = formatINR(p.total_cost || 0);
    const date = p.purchase_date ? formatDate(p.purchase_date) : '—';

    return `
      <tr>
        <td><strong style="font-size:13px; color:var(--color-text);">${escHtml(ref)}</strong></td>
        <td style="font-size:13px;">${escHtml(desc)}</td>
        <td><span class="badge badge-neutral">${itemsCount} item${itemsCount !== 1 ? 's' : ''}</span></td>
        <td class="prd-th-num" style="font-weight:700; color:var(--color-primary); font-size:13px;">${totalCost}</td>
        <td style="font-size:12px; color:var(--color-text-secondary);">${date}</td>
        <td class="prd-th-actions">
          <button class="prd-action-btn" type="button" data-view-purchase="${p.id}" style="font-size:11px; padding:4px 8px;">View Items</button>
        </td>
      </tr>`;
  }).join('');
}

// ============================================
// RECORD EXPENSE MODAL
// ============================================
function initExpenseModal() {
  const addBtn = document.getElementById('add-expense-btn');
  const form = document.getElementById('expense-form');

  addBtn?.addEventListener('click', () => {
    form?.reset();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById('exp-date').value = `${yyyy}-${mm}-${dd}`;
    openModal('expense-modal');
  });

  document.getElementById('expense-modal-close')?.addEventListener('click', () => closeModal('expense-modal'));
  document.getElementById('expense-cancel')?.addEventListener('click', () => closeModal('expense-modal'));

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const shopId = await ensureActiveShop();

    const category = document.getElementById('exp-category').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const expense_date = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-desc').value.trim() || undefined;

    if (!category || isNaN(amount) || amount <= 0 || !expense_date) {
      showToast('Please fill out all required expense fields.', 'warning');
      return;
    }

    try {
      if (shopId) {
        await apiRequest('/expenses', {
          method: 'POST',
          body: { shop_id: shopId, category, amount, expense_date, description }
        });
      }
    } catch (err) {
      console.warn('API expense creation note:', err.message);
    }

    const newId = expensesData.length > 0 ? Math.max(...expensesData.map(e => e.id)) + 1 : 1;
    expensesData.unshift({
      id: newId,
      category,
      amount,
      expense_date,
      description: description || 'General expense',
      created_at: new Date().toISOString()
    });
    saveExpensesLocally();

    showToast('Expense recorded successfully.', 'success');
    closeModal('expense-modal');
    renderKPIs();
    applyExpensesFilter();
  });
}

// ============================================
// NEW STOCK PURCHASE MODAL
// ============================================
function initPurchaseModal() {
  const addBtn = document.getElementById('add-purchase-btn');
  const form = document.getElementById('purchase-form');
  const addRowBtn = document.getElementById('add-purchase-item-row');

  addBtn?.addEventListener('click', () => {
    form?.reset();
    const container = document.getElementById('purchase-items-container');
    if (container) {
      container.innerHTML = '';
      addPurchaseItemRow();
    }
    updatePurchaseEstimate();
    openModal('purchase-modal');
  });

  document.getElementById('purchase-modal-close')?.addEventListener('click', () => closeModal('purchase-modal'));
  document.getElementById('purchase-cancel')?.addEventListener('click', () => closeModal('purchase-modal'));

  addRowBtn?.addEventListener('click', () => {
    addPurchaseItemRow();
  });

  document.getElementById('purchase-items-container')?.addEventListener('input', () => {
    updatePurchaseEstimate();
  });

  document.getElementById('purchase-items-container')?.addEventListener('click', e => {
    const removeBtn = e.target.closest('[data-remove-row]');
    if (removeBtn) {
      const row = removeBtn.closest('.purchase-item-row');
      const allRows = document.querySelectorAll('.purchase-item-row');
      if (allRows.length > 1) {
        row?.remove();
        updatePurchaseEstimate();
      } else {
        showToast('At least one product item is required.', 'warning');
      }
    }
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const shopId = await ensureActiveShop();

    const ref = document.getElementById('pur-ref').value.trim() || undefined;
    const desc = document.getElementById('pur-desc').value.trim() || undefined;

    const rows = document.querySelectorAll('.purchase-item-row');
    const items = [];
    let totalCost = 0;

    for (const r of rows) {
      const selectPrd = r.querySelector('.purchase-prd-select');
      const qtyInput = r.querySelector('.purchase-qty-input');
      const costInput = r.querySelector('.purchase-cost-input');

      const product_id = parseInt(selectPrd?.value, 10);
      const quantity = parseFloat(qtyInput?.value);
      const unit_cost = parseFloat(costInput?.value);

      if (!product_id || isNaN(quantity) || quantity <= 0 || isNaN(unit_cost) || unit_cost < 0) {
        showToast('Please check all product quantities and unit costs.', 'warning');
        return;
      }

      const subtotal = quantity * unit_cost;
      totalCost += subtotal;
      items.push({ product_id, quantity, unit_cost, subtotal });
    }

    if (items.length === 0) {
      showToast('Please add at least one product item.', 'warning');
      return;
    }

    try {
      if (shopId) {
        await apiRequest('/purchases', {
          method: 'POST',
          body: {
            shop_id: shopId,
            reference_number: ref,
            description: desc,
            items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost }))
          }
        });
      }
    } catch (err) {
      console.warn('API purchase creation note:', err.message);
    }

    const newId = purchasesData.length > 0 ? Math.max(...purchasesData.map(p => p.id)) + 1 : 1;
    purchasesData.unshift({
      id: newId,
      reference_number: ref || `PUR-${String(newId).padStart(5, '0')}`,
      description: desc || 'Stock purchase',
      total_cost: totalCost,
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_items: items
    });
    savePurchasesLocally();

    showToast('Stock purchase recorded. Inventory restocked!', 'success');
    closeModal('purchase-modal');
    renderKPIs();
    applyPurchasesFilter();
  });
}

function addPurchaseItemRow() {
  const container = document.getElementById('purchase-items-container');
  if (!container) return;

  const productOptions = (productsData.length > 0 ? productsData : [
    { id: 1, name: 'Wireless Bluetooth Earbuds', sku: 'PRD-001', purchasePrice: 650 },
    { id: 2, name: 'Mechanical RGB Keyboard', sku: 'PRD-002', purchasePrice: 1300 },
    { id: 3, name: 'Ultra-Slim Power Bank 10000mAh', sku: 'PRD-003', purchasePrice: 370 },
  ]).map(p => `
    <option value="${p.id}" data-cost="${p.purchasePrice || 0}">
      ${escHtml(p.name)} (${escHtml(p.sku || 'ID:' + p.id)})
    </option>
  `).join('');

  const rowHtml = `
    <div class="purchase-item-row">
      <select class="prd-form-select purchase-prd-select" required>
        <option value="" disabled selected>Select Product...</option>
        ${productOptions}
      </select>
      <input type="number" class="prd-form-input purchase-qty-input" placeholder="Qty" min="1" step="1" value="1" required />
      <input type="number" class="prd-form-input purchase-cost-input" placeholder="Unit Cost (₹)" min="0" step="0.01" value="" required />
      <button type="button" class="purchase-remove-btn" data-remove-row title="Remove item">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', rowHtml);

  const newRow = container.lastElementChild;
  const sel = newRow?.querySelector('.purchase-prd-select');
  const costInp = newRow?.querySelector('.purchase-cost-input');

  sel?.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    const defaultCost = opt?.dataset?.cost;
    if (defaultCost && (!costInp.value || costInp.value === '0')) {
      costInp.value = defaultCost;
      updatePurchaseEstimate();
    }
  });
}

function updatePurchaseEstimate() {
  const rows = document.querySelectorAll('.purchase-item-row');
  let total = 0;

  rows.forEach(r => {
    const qty = parseFloat(r.querySelector('.purchase-qty-input')?.value || 0);
    const cost = parseFloat(r.querySelector('.purchase-cost-input')?.value || 0);
    if (!isNaN(qty) && !isNaN(cost)) {
      total += qty * cost;
    }
  });

  const estimateEl = document.getElementById('purchase-total-estimate');
  if (estimateEl) estimateEl.textContent = formatINR(total);
}

// ============================================
// VIEW PURCHASE MODAL
// ============================================
function initViewPurchase() {
  document.getElementById('purchases-tbody')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('[data-view-purchase]');
    if (viewBtn) {
      const id = parseInt(viewBtn.dataset.viewPurchase, 10);
      openViewPurchaseModal(id);
    }
  });

  document.getElementById('purchase-view-close')?.addEventListener('click', () => closeModal('purchase-view-modal'));
  document.getElementById('purchase-view-close-btn')?.addEventListener('click', () => closeModal('purchase-view-modal'));
}

function openViewPurchaseModal(purchaseId) {
  const purchase = purchasesData.find(p => p.id === purchaseId);
  if (!purchase) return;

  const content = document.getElementById('purchase-view-content');
  if (!content) return;

  const items = purchase.purchase_items || [];
  const itemRows = items.map(i => {
    const prd = productsData.find(p => p.id === i.product_id);
    const name = prd ? prd.name : (i.name || `Product #${i.product_id}`);
    const qty = i.quantity || 0;
    const unitCost = formatINR(i.unit_cost || 0);
    const subtotal = formatINR(i.subtotal || (qty * i.unit_cost));

    return `
      <tr>
        <td style="font-weight:600;">${escHtml(name)}</td>
        <td class="prd-th-num">${qty}</td>
        <td class="prd-th-num">${unitCost}</td>
        <td class="prd-th-num" style="font-weight:700; color:var(--color-primary);">${subtotal}</td>
      </tr>`;
  }).join('');

  content.innerHTML = `
    <div style="padding:14px; background-color:var(--color-bg); border-radius:var(--radius-md); margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="font-weight:700; font-size:14px;">${escHtml(purchase.reference_number || `PUR-${purchase.id}`)}</span>
        <span style="font-size:12px; color:var(--color-text-secondary);">${formatDate(purchase.purchase_date)}</span>
      </div>
      <div style="font-size:12px; color:var(--color-text-secondary);">${escHtml(purchase.description || 'Stock restock')}</div>
    </div>
    <div class="prd-table-responsive" style="max-height:280px; overflow-y:auto; margin-bottom:14px;">
      <table class="prd-table">
        <thead>
          <tr>
            <th>Product</th>
            <th class="prd-th-num">Qty</th>
            <th class="prd-th-num">Unit Cost</th>
            <th class="prd-th-num">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-top:1px solid var(--color-border);">
      <span style="font-weight:700; font-size:14px;">Grand Total Cost:</span>
      <span style="font-weight:700; font-size:16px; color:var(--color-primary);">${formatINR(purchase.total_cost || 0)}</span>
    </div>
  `;

  openModal('purchase-view-modal');
}

// ============================================
// TAB NAVIGATION
// ============================================
function initTabSwitch() {
  const tabExp = document.getElementById('tab-expenses-view');
  const tabPur = document.getElementById('tab-purchases-view');
  const cardExp = document.getElementById('expenses-card');
  const cardPur = document.getElementById('purchases-card');

  tabExp?.addEventListener('click', () => {
    tabExp.classList.add('active');
    tabPur.classList.remove('active');
    if (cardExp) cardExp.style.display = 'block';
    if (cardPur) cardPur.style.display = 'none';
  });

  tabPur?.addEventListener('click', () => {
    tabPur.classList.add('active');
    tabExp.classList.remove('active');
    if (cardPur) cardPur.style.display = 'block';
    if (cardExp) cardExp.style.display = 'none';
  });
}

// ============================================
// EXPORTS
// ============================================
function initExports() {
  document.getElementById('expense-export-btn')?.addEventListener('click', () => {
    if (filteredExpenses.length === 0) {
      showToast('No expenses to export.', 'warning');
      return;
    }
    const headers = ['ID', 'Category', 'Description', 'Amount (INR)', 'Expense Date', 'Created At'];
    const rows = filteredExpenses.map(e => [
      e.id,
      `"${e.category || ''}"`,
      `"${e.description || ''}"`,
      e.amount || 0,
      `"${formatDate(e.expense_date)}"`,
      `"${formatDate(e.created_at)}"`,
    ]);
    downloadCSV('flowbase-expenses.csv', headers, rows);
  });

  document.getElementById('purchase-export-btn')?.addEventListener('click', () => {
    if (filteredPurchases.length === 0) {
      showToast('No purchases to export.', 'warning');
      return;
    }
    const headers = ['ID', 'Reference', 'Description', 'Items Count', 'Total Cost (INR)', 'Date'];
    const rows = filteredPurchases.map(p => [
      p.id,
      `"${p.reference_number || ''}"`,
      `"${p.description || ''}"`,
      (p.purchase_items || []).length,
      p.total_cost || 0,
      `"${formatDate(p.purchase_date)}"`,
    ]);
    downloadCSV('flowbase-purchases.csv', headers, rows);
  });
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully.', 'success');
}

// ============================================
// UTILITIES & MODAL HELPERS
// ============================================
function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
  initTabSwitch();
  initExpenseModal();
  initPurchaseModal();
  initViewPurchase();
  initExports();
  initModalOverlayClose();
  initEscClose();

  document.getElementById('expense-search-input')?.addEventListener('input', applyExpensesFilter);
  document.getElementById('purchase-search-input')?.addEventListener('input', applyPurchasesFilter);

  await loadData();
});
