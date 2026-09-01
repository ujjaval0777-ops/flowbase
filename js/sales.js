// ============================================
// FlowBase Sales — sales.js
// Reads sales from:    'flowbase_sales'
// Reads/writes stock:  'flowbase_inventory'
// ============================================
'use strict';

// ============================================
// CONSTANTS
// ============================================
const LS_SALES_KEY = 'flowbase_sales';
const LS_INV_KEY   = 'flowbase_inventory';
const PAGE_SIZE    = 10;

// ============================================
// STATE
// ============================================
let salesData    = [];
let productsData = [];
let filteredData = [];
let currentPage  = 1;
let activeDateFilter = 'today';
let viewingSaleId    = null;

// ============================================
// LOAD DATA FROM BACKEND
// ============================================
async function loadData() {
  const shopId = await ensureActiveShop();
  if (!shopId) return;

  try {
    const [rawProducts, rawSales] = await Promise.all([
      apiRequest(`/shops/${shopId}/products`),
      apiRequest(`/sales/${shopId}`).catch(() => [])
    ]);

    productsData = (rawProducts || []).map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || `PRD-${String(p.id).padStart(3, '0')}`,
      category_id: p.category_id,
      purchasePrice: Number(p.purchase_price || 0),
      sellingPrice: Number(p.selling_price || 0),
      currentStock: Number(p.stock_quantity || 0),
      minimumStock: Number(p.low_stock_threshold || 5),
    }));

    try {
      localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData));
    } catch (_) {}

    salesData = (rawSales || []).map(s => {
      const items = (s.sale_items || []).map(si => {
        const prd = productsData.find(p => p.id === si.product_id);
        return {
          productId: si.product_id,
          name: si.product_name || (prd ? prd.name : `Product #${si.product_id}`),
          sku: si.product_sku || (prd ? prd.sku : ''),
          price: Number(si.unit_price || 0),
          qty: Number(si.quantity || 0),
          discount: Number(si.discount || 0),
          total: Number(si.total_price || (si.quantity * si.unit_price))
        };
      });

      const subtotal = Number(s.subtotal || items.reduce((acc, i) => acc + i.total, 0));
      const discountAmt = Number(s.discount || 0);
      const taxAmt = Number(s.tax || 0);
      const grandTotal = Number(s.total_amount || (subtotal - discountAmt + taxAmt));

      return {
        id: s.id,
        billNo: s.bill_number || `FB-${String(s.id).padStart(6, '0')}`,
        createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
        items,
        subtotal,
        discountType: 'fixed',
        discountValue: discountAmt,
        discountAmt,
        taxPercent: 0,
        taxAmt,
        grandTotal,
        paymentMethod: s.payment_method || 'Cash',
        amountReceived: grandTotal,
        change: 0,
        status: s.status === 'cancelled' ? 'Cancelled' : 'Completed'
      };
    });

    try {
      localStorage.setItem(LS_SALES_KEY, JSON.stringify(salesData));
    } catch (_) {}

    renderKPIs();
    applyFilters();
  } catch (err) {
    console.error('Failed to load sales data:', err);
    showToast(err.message || 'Failed to load sales data', 'warning');
  }
}

function findProduct(id) { return productsData.find(p => String(p.id) === String(id)); }

// ============================================
// KPI CARDS
// ============================================
function renderKPIs() {
  const todayStart = startOfDay(new Date());
  const todayEnd   = todayStart + 86400000;

  const todaySales = salesData.filter(s =>
    s.status === 'Completed' && s.createdAt >= todayStart && s.createdAt < todayEnd
  );

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalTxns    = salesData.filter(s => s.status === 'Completed').length;

  // Profit = sum of (sellingPrice - purchasePrice) * qty for today's completed sales
  let todayProfit = 0;
  todaySales.forEach(sale => {
    sale.items.forEach(item => {
      const product = findProduct(item.productId);
      const purchasePrice = product ? product.purchasePrice : 0;
      todayProfit += (item.price - purchasePrice) * item.qty - (item.discount || 0);
    });
  });

  const configs = [
    {
      id: 'sal-kpi-today-sales', label: "Today's Sales", value: todaySales.length,
      footer: 'Bills completed today',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
      iconClass: '',
    },
    {
      id: 'sal-kpi-today-revenue', label: "Today's Revenue", value: formatINR(todayRevenue),
      footer: 'Revenue from today\'s bills',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
      iconClass: '',
    },
    {
      id: 'sal-kpi-transactions', label: 'Total Transactions', value: totalTxns,
      footer: 'All completed transactions',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
      iconClass: '',
    },
    {
      id: 'sal-kpi-today-profit', label: "Today's Profit", value: formatINR(Math.max(0, todayProfit)),
      footer: 'Estimated profit today',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      iconClass: todayProfit < 0 ? 'danger' : '',
    },
  ];

  configs.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    el.innerHTML = `
      <div class="kpi-card-header">
        <span class="kpi-label">${cfg.label}</span>
        <span class="kpi-icon ${cfg.iconClass}" aria-hidden="true">${cfg.icon}</span>
      </div>
      <div class="kpi-value">${cfg.value}</div>
      <div class="kpi-footer">
        <span class="kpi-compare">${cfg.footer}</span>
      </div>
    `;
  });
}

// ============================================
// FILTER / SORT / SEARCH
// ============================================
function getDateRange(filter) {
  const now   = Date.now();
  const today = startOfDay(new Date());

  if (filter === 'today')     return { from: today,             to: today + 86400000 };
  if (filter === 'yesterday') return { from: today - 86400000,  to: today };
  if (filter === '7days')     return { from: today - 86400000 * 6, to: now + 1 };
  if (filter === '30days')    return { from: today - 86400000 * 29, to: now + 1 };
  return { from: 0, to: Infinity };
}

function applyFilters() {
  const q       = document.getElementById('sal-search-input')?.value.trim().toLowerCase() || '';
  const payment = document.getElementById('sal-filter-payment')?.value || '';
  const status  = document.getElementById('sal-filter-status')?.value || '';
  const sort    = document.getElementById('sal-filter-sort')?.value || 'newest';
  const { from, to } = getDateRange(activeDateFilter);

  filteredData = salesData.filter(sale => {
    // Date range
    if (sale.createdAt < from || sale.createdAt >= to) return false;

    // Search
    if (q) {
      const matchBill = sale.billNo.toLowerCase().includes(q);
      const matchItem = sale.items.some(i => i.name.toLowerCase().includes(q));
      if (!matchBill && !matchItem) return false;
    }

    // Payment
    if (payment && sale.paymentMethod !== payment) return false;

    // Status
    if (status && sale.status !== status) return false;

    return true;
  });

  filteredData.sort((a, b) => {
    if (sort === 'newest')  return b.createdAt - a.createdAt;
    if (sort === 'oldest')  return a.createdAt - b.createdAt;
    if (sort === 'highest') return b.grandTotal - a.grandTotal;
    if (sort === 'lowest')  return a.grandTotal - b.grandTotal;
    return 0;
  });

  currentPage = 1;
  renderTable();
  renderPagination();
}

// ============================================
// TABLE RENDER
// ============================================
function renderTable() {
  const tbody = document.getElementById('sales-tbody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
            </div>
            <div class="prd-empty-title">No sales yet</div>
            <div class="prd-empty-desc">Completed bills will appear here.</div>
            <a href="billing.html" class="btn sal-btn-primary" style="margin-top:8px">
              Create New Sale
            </a>
          </div>
        </td>
      </tr>`;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredData.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page.map(sale => {
    const statusBadge = sale.status === 'Completed' ? 'badge-success' : 'badge-danger';
    const discStr = sale.discountAmt > 0 ? '−' + formatINR(sale.discountAmt) : '—';
    const taxStr  = sale.taxAmt > 0 ? '+' + formatINR(sale.taxAmt) : '—';

    return `
      <tr>
        <td><span class="bill-no">${escHtml(sale.billNo)}</span></td>
        <td class="text-muted" style="font-size:12px;white-space:nowrap">${formatDateTime(sale.createdAt)}</td>
        <td>${sale.items.length}</td>
        <td class="text-mono">${formatINR(sale.subtotal)}</td>
        <td class="text-mono" style="color:var(--color-danger)">${discStr}</td>
        <td class="text-mono">${taxStr}</td>
        <td class="text-mono"><strong>${formatINR(sale.grandTotal)}</strong></td>
        <td><span class="badge badge-neutral">${escHtml(sale.paymentMethod)}</span></td>
        <td><span class="badge ${statusBadge}">${escHtml(sale.status)}</span></td>
        <td>
          <div style="display:flex;gap:5px;align-items:center">
            <button class="prd-action-btn" type="button" data-view-sale="${sale.id}" style="font-size:12px;padding:4px 8px">View</button>
            <button class="prd-action-btn" type="button" data-print-sale="${sale.id}" style="font-size:12px;padding:4px 8px">Print</button>
            ${sale.status === 'Completed' ? `<button class="prd-action-btn" type="button" data-cancel-sale="${sale.id}" style="font-size:12px;padding:4px 8px;color:var(--color-danger);border-color:var(--color-danger)">Cancel</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ============================================
// PAGINATION
// ============================================
function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const start = filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, filteredData.length);

  const infoEl  = document.getElementById('sal-pagination-info');
  const numsEl  = document.getElementById('sal-page-numbers');
  const prevBtn = document.getElementById('sal-prev-page-btn');
  const nextBtn = document.getElementById('sal-next-page-btn');

  if (infoEl) infoEl.textContent = filteredData.length > 0
    ? `Showing ${start}–${end} of ${filteredData.length} sales`
    : 'No sales';

  if (numsEl) {
    numsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className   = 'prd-page-num' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.type        = 'button';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `Page ${p}`);
      btn.addEventListener('click', () => { currentPage = p; renderTable(); renderPagination(); });
      numsEl.appendChild(btn);
    }
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function initPagination() {
  document.getElementById('sal-prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); renderPagination(); }
  });
  document.getElementById('sal-next-page-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
    if (currentPage < totalPages) { currentPage++; renderTable(); renderPagination(); }
  });
}

// ============================================
// TABLE ACTIONS
// ============================================
function initTableActions() {
  document.getElementById('sales-tbody')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('[data-view-sale]');
    if (viewBtn) { openViewSale(viewBtn.dataset.viewSale); return; }

    const printBtn = e.target.closest('[data-print-sale]');
    if (printBtn) { printSale(printBtn.dataset.printSale); return; }

    const cancelBtn = e.target.closest('[data-cancel-sale]');
    if (cancelBtn) { openCancelModal(cancelBtn.dataset.cancelSale); }
  });
}

// ============================================
// SEARCH & FILTERS INIT
// ============================================
function initSearchAndFilters() {
  document.getElementById('sal-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('sal-filter-payment')?.addEventListener('change', applyFilters);
  document.getElementById('sal-filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('sal-filter-sort')?.addEventListener('change', applyFilters);

  // Date pills
  document.querySelectorAll('.sal-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sal-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDateFilter = btn.dataset.date;
      applyFilters();
    });
  });

  document.getElementById('sal-clear-filters-btn')?.addEventListener('click', () => {
    document.getElementById('sal-search-input').value    = '';
    document.getElementById('sal-filter-payment').value  = '';
    document.getElementById('sal-filter-status').value   = '';
    document.getElementById('sal-filter-sort').value     = 'newest';
    activeDateFilter = 'all';
    document.querySelectorAll('.sal-date-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.sal-date-btn[data-date="all"]')?.classList.add('active');
    applyFilters();
  });
}

// ============================================
// VIEW SALE MODAL
// ============================================
function openViewSale(saleId) {
  const sale = salesData.find(s => String(s.id) === String(saleId) || s.billNo === saleId);
  if (!sale) return;
  viewingSaleId = saleId;

  const content = document.getElementById('sal-view-content');
  if (!content) return;

  const itemRows = sale.items.map(i => `
    <tr>
      <td>${escHtml(i.name)}</td>
      <td class="text-right">${i.qty}</td>
      <td class="text-right">${formatINR(i.price)}</td>
      <td class="text-right">${i.discount > 0 ? '−' + formatINR(i.discount) : '—'}</td>
      <td class="text-right">${formatINR(i.total)}</td>
    </tr>`).join('');

  const statusBadge = sale.status === 'Completed' ? 'badge-success' : 'badge-danger';
  const discStr = sale.discountValue > 0
    ? (sale.discountType === 'percent' ? `${sale.discountValue}%` : formatINR(sale.discountValue))
    : '—';

  content.innerHTML = `
    <div class="bil-invoice">
      <div class="bil-invoice-header">
        <div class="bil-invoice-brand">FLOWBASE</div>
        <div class="bil-invoice-meta">
          <span><strong>${escHtml(sale.billNo)}</strong></span>
          <span>${formatDate(sale.createdAt)} · ${formatTime(sale.createdAt)}</span>
          <span class="badge ${statusBadge}" style="align-self:flex-end">${escHtml(sale.status)}</span>
        </div>
      </div>
      <table class="bil-invoice-items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Disc</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="bil-invoice-totals">
        <div class="bil-invoice-total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
        <div class="bil-invoice-total-row"><span>Discount ${discStr !== '—' ? '(' + discStr + ')' : ''}</span><span>−${formatINR(sale.discountAmt)}</span></div>
        <div class="bil-invoice-total-row"><span>Tax (${sale.taxPercent || 0}%)</span><span>+${formatINR(sale.taxAmt)}</span></div>
        <div class="bil-invoice-grand-row"><span>Grand Total</span><span>${formatINR(sale.grandTotal)}</span></div>
        ${sale.paymentMethod === 'Cash' ? `
        <div class="bil-invoice-total-row"><span>Amount Received</span><span>${formatINR(sale.amountReceived)}</span></div>
        <div class="bil-invoice-total-row"><span>Change</span><span>${formatINR(sale.change)}</span></div>
        ` : ''}
        <div class="bil-invoice-total-row"><span>Payment Method</span><span><strong>${escHtml(sale.paymentMethod)}</strong></span></div>
      </div>
      <div class="bil-invoice-footer">Thank you for your purchase!</div>
    </div>`;

  openModal('sal-view-modal');
}

function initViewSaleModal() {
  document.getElementById('sal-view-close')?.addEventListener('click',    () => closeModal('sal-view-modal'));
  document.getElementById('sal-view-close-btn')?.addEventListener('click', () => closeModal('sal-view-modal'));
  document.getElementById('sal-print-btn')?.addEventListener('click', () => {
    if (viewingSaleId) printSale(viewingSaleId);
  });
}

// ============================================
// PRINT SALE
// ============================================
function printSale(saleId) {
  const sale = salesData.find(s => String(s.id) === String(saleId) || s.billNo === saleId);
  if (!sale) return;

  const printArea = document.getElementById('sal-print-area');
  if (!printArea) return;

  const rows = sale.items.map(i => `
    <tr>
      <td>${escHtml(i.name)}</td>
      <td class="text-right">${i.qty}</td>
      <td class="text-right">${formatINR(i.price)}</td>
      <td class="text-right">${formatINR(i.total)}</td>
    </tr>`).join('');

  printArea.innerHTML = `
    <div class="bill-print-brand">FLOWBASE</div>
    <div class="bill-print-meta">
      Bill No: ${escHtml(sale.billNo)}<br>
      Date: ${formatDate(sale.createdAt)} &nbsp; Time: ${formatTime(sale.createdAt)}<br>
      Status: ${escHtml(sale.status)}
    </div>
    <hr class="bill-print-divider" />
    <table class="bill-print-table">
      <thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="bill-print-total-section">
      <div class="bill-print-total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
      <div class="bill-print-total-row"><span>Discount</span><span>−${formatINR(sale.discountAmt)}</span></div>
      <div class="bill-print-total-row"><span>Tax (${sale.taxPercent || 0}%)</span><span>+${formatINR(sale.taxAmt)}</span></div>
      <div class="bill-print-total-row bill-print-grand"><span>Grand Total</span><span>${formatINR(sale.grandTotal)}</span></div>
      ${sale.paymentMethod === 'Cash' ? `
      <div class="bill-print-total-row"><span>Received</span><span>${formatINR(sale.amountReceived)}</span></div>
      <div class="bill-print-total-row"><span>Change</span><span>${formatINR(sale.change)}</span></div>
      ` : ''}
      <div class="bill-print-total-row"><span>Payment</span><span>${escHtml(sale.paymentMethod)}</span></div>
    </div>
    <div class="bill-print-footer">Thank you for your purchase!<br>Powered by FlowBase</div>
  `;

  window.print();
}

// ============================================
// CANCEL SALE
// ============================================
function openCancelModal(saleId) {
  document.getElementById('sal-cancel-sale-id').value = saleId;
  openModal('sal-cancel-modal');
}

function initCancelModal() {
  document.getElementById('sal-cancel-modal-cancel')?.addEventListener('click', () => closeModal('sal-cancel-modal'));
  document.getElementById('sal-cancel-modal-confirm')?.addEventListener('click', () => {
    const saleId = document.getElementById('sal-cancel-sale-id').value;
    const sale   = salesData.find(s => s.id === saleId);
    if (!sale || sale.status !== 'Completed') {
      closeModal('sal-cancel-modal');
      return;
    }

    // Mark as cancelled
    sale.status     = 'Cancelled';
    sale.cancelledAt = Date.now();

    // Restore stock to flowbase_inventory
    loadProducts(); // reload fresh copy
    sale.items.forEach(item => {
      const product = findProduct(item.productId);
      if (product) product.currentStock += item.qty;
    });
    saveProducts();
    saveSales();

    closeModal('sal-cancel-modal');
    applyFilters();
    renderKPIs();
    showToast('Sale cancelled successfully. Stock restored.', 'success');
  });
}

// ============================================
// EXPORT CSV
// ============================================
function initExport() {
  document.getElementById('sal-export-btn')?.addEventListener('click', () => {
    if (filteredData.length === 0) { showToast('No sales to export.', 'warning'); return; }

    const headers = ['Bill No.', 'Date', 'Time', 'Items', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment', 'Status'];
    const rows = filteredData.map(s => [
      `"${s.billNo}"`,
      `"${formatDate(s.createdAt)}"`,
      `"${formatTime(s.createdAt)}"`,
      s.items.length,
      s.subtotal,
      s.discountAmt,
      s.taxAmt,
      s.grandTotal,
      `"${s.paymentMethod}"`,
      `"${s.status}"`,
    ]);

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'flowbase-sales.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
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
// SIDEBAR
// ============================================
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger-btn');
  const overlay   = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  function openSidebar()  { sidebar.classList.add('open'); overlay?.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeSidebar() { sidebar.classList.remove('open'); overlay?.classList.remove('open'); if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = ''; }
  hamburger?.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  overlay?.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); }));
}

// ============================================
// LOGOUT
// ============================================
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click',    () => openModal('logout-modal'));
  document.getElementById('logout-cancel')?.addEventListener('click',  () => closeModal('logout-modal'));
}

// ============================================
// TOAST
// ============================================
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

  initSearchAndFilters();
  initTableActions();
  initPagination();
  initViewSaleModal();
  initCancelModal();
  initExport();
  initSidebar();
  initLogout();
  initModalOverlayClose();
  initEscClose();

  await loadData();
});
