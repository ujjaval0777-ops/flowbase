// ============================================
// FlowBase Billing — billing.js
// Reads products from: 'flowbase_inventory'
// Saves sales to:      'flowbase_sales'
// ============================================
'use strict';

// ============================================
// CONSTANTS
// ============================================
const LS_INV_KEY   = 'flowbase_inventory'; // shared with inventory.js + products.js
const LS_SALES_KEY = 'flowbase_sales';

// ============================================
// STATE
// ============================================
let productsData    = [];  // from flowbase_inventory
let salesData       = [];  // from flowbase_sales
let currentBill     = [];  // active bill items [{productId, name, sku, price, qty, discount, total}]
let currentBillNo   = null;
let viewingSaleId   = null;

// ============================================
// LOCAL STORAGE
// ============================================
function loadProducts() {
  try {
    const stored = localStorage.getItem(LS_INV_KEY);
    productsData = stored ? JSON.parse(stored) : [];
  } catch (e) { productsData = []; }
}

function saveProducts() {
  try { localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData)); } catch (e) {}
}

function loadSales() {
  try {
    const stored = localStorage.getItem(LS_SALES_KEY);
    salesData = stored ? JSON.parse(stored) : [];
  } catch (e) { salesData = []; }
}

function saveSales() {
  try { localStorage.setItem(LS_SALES_KEY, JSON.stringify(salesData)); } catch (e) {}
}

// ============================================
// UTILITIES
// ============================================
function uid() { return Math.random().toString(36).slice(2, 11); }

function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Generate next sequential bill number */
function generateBillNo() {
  const maxNo = salesData.reduce((max, s) => {
    const num = parseInt((s.billNo || 'FB-000000').replace('FB-', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return 'FB-' + String(maxNo + 1).padStart(6, '0');
}

function findProduct(id) { return productsData.find(p => p.id === id); }

function getProductStock(id) {
  const p = findProduct(id);
  return p ? (p.currentStock || 0) : 0;
}

// ============================================
// PRODUCT LIST RENDER
// ============================================
function renderProductList(query = '') {
  const listEl = document.getElementById('bil-product-list');
  if (!listEl) return;

  const q = query.toLowerCase().trim();
  const visible = productsData.filter(p => {
    if ((p.status || 'active') === 'inactive') return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
  });

  if (visible.length === 0) {
    listEl.innerHTML = `
      <div class="bil-no-products">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>${q ? 'No products found for "' + escHtml(query) + '"' : 'No products available.'}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = visible.map(p => {
    const stock    = p.currentStock || 0;
    const isOut    = stock === 0;
    const isLow    = stock > 0 && stock <= (p.minimumStock || 0);
    const stockCls = isOut ? 'out' : isLow ? 'low' : '';
    const stockTxt = isOut ? 'Out of stock' : `${stock} in stock`;

    return `
      <div class="bil-product-item${isOut ? ' out-of-stock' : ''}" role="listitem">
        <div class="bil-product-info">
          <div class="bil-product-name">${escHtml(p.name)}</div>
          <div class="bil-product-meta">
            <span class="bil-product-sku">${escHtml(p.sku || '')}</span>
            <span class="bil-product-stock ${stockCls}">${stockTxt}</span>
          </div>
        </div>
        <div class="bil-product-price-col">
          <div class="bil-product-price">${formatINR(p.sellingPrice)}</div>
        </div>
        <button class="bil-add-btn" type="button" data-product-id="${p.id}" aria-label="Add ${escHtml(p.name)} to bill" ${isOut ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>`;
  }).join('');
}

// ============================================
// BILL META (number + date/time)
// ============================================
function renderBillMeta() {
  const el = document.getElementById('bil-bill-meta');
  if (!el) return;
  const now   = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `<strong>${currentBillNo}</strong> &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; ${timeStr}`;
}

// ============================================
// BILL ITEMS RENDER
// ============================================
function renderBillItems() {
  const tbody   = document.getElementById('bil-items-tbody');
  const emptyEl = document.getElementById('bil-empty-bill');
  const tableEl = document.getElementById('bil-items-table');
  if (!tbody) return;

  const hasItems = currentBill.length > 0;
  emptyEl && (emptyEl.style.display = hasItems ? 'none' : '');
  tableEl && (tableEl.style.display = hasItems ? 'table' : 'none');

  if (!hasItems) { updateTotals(); return; }

  tbody.innerHTML = currentBill.map((item, idx) => {
    const stock = getProductStock(item.productId);
    return `
      <tr data-bill-idx="${idx}">
        <td>
          <span class="bil-item-name">${escHtml(item.name)}</span>
          <span class="bil-item-sku">${escHtml(item.sku || '')}</span>
        </td>
        <td class="text-center">
          <div class="bil-qty-ctrl">
            <button class="bil-qty-btn" type="button" data-qty-dec="${idx}" aria-label="Decrease quantity" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
            <input class="bil-qty-input" type="number" value="${item.qty}" min="1" max="${stock + item.qty}" data-qty-input="${idx}" aria-label="Quantity" />
            <button class="bil-qty-btn" type="button" data-qty-inc="${idx}" aria-label="Increase quantity" ${item.qty >= stock + item.qty ? 'disabled' : ''}>+</button>
          </div>
        </td>
        <td class="text-right">${formatINR(item.price)}</td>
        <td class="text-right">
          <input class="bil-item-discount" type="number" value="${item.discount || 0}" min="0" max="${item.price * item.qty}" data-disc-input="${idx}" aria-label="Item discount in rupees" />
        </td>
        <td class="text-right">
          <span class="bil-item-total">${formatINR(item.total)}</span>
        </td>
        <td>
          <button class="bil-remove-btn" type="button" data-remove-idx="${idx}" aria-label="Remove ${escHtml(item.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </td>
      </tr>`;
  }).join('');

  updateTotals();
}

// ============================================
// TOTALS
// ============================================
function calcTotals() {
  const subtotal     = currentBill.reduce((s, i) => s + i.total, 0);
  const discValue    = parseFloat(document.getElementById('bil-discount-value')?.value || 0) || 0;
  const discType     = document.getElementById('bil-discount-type')?.value || 'percent';
  const taxPct       = parseFloat(document.getElementById('bil-tax-percent')?.value || 0) || 0;

  let discountAmt = discType === 'percent'
    ? Math.min(subtotal * discValue / 100, subtotal)
    : Math.min(discValue, subtotal);

  const taxableAmt = Math.max(0, subtotal - discountAmt);
  const taxAmt     = taxableAmt * taxPct / 100;
  const grandTotal = Math.max(0, taxableAmt + taxAmt);

  return { subtotal, discountAmt, taxAmt, grandTotal };
}

function updateTotals() {
  const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals();

  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('bil-subtotal',       formatINR(subtotal));
  setTxt('bil-discount-amount', '−' + formatINR(discountAmt));
  setTxt('bil-tax-amount',     '+' + formatINR(taxAmt));
  setTxt('bil-grand-total',    formatINR(grandTotal));

  updateCashChange();
}

function updateCashChange() {
  const { grandTotal } = calcTotals();
  const payMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'Cash';
  const cashSec   = document.getElementById('bil-cash-section');
  if (cashSec) cashSec.style.display = payMethod === 'Cash' ? '' : 'none';

  if (payMethod === 'Cash') {
    const received = parseFloat(document.getElementById('bil-amount-received')?.value || 0) || 0;
    const change   = Math.max(0, received - grandTotal);
    const el       = document.getElementById('bil-change-amount');
    if (el) el.textContent = formatINR(change);
  }
}

// ============================================
// ADD PRODUCT TO BILL
// ============================================
function addProductToBill(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const stock      = product.currentStock || 0;
  const existing   = currentBill.find(i => i.productId === productId);

  if (existing) {
    if (existing.qty >= stock) {
      showToast(`Only ${stock} units available.`, 'warning');
      return;
    }
    existing.qty++;
    existing.total = recalcItemTotal(existing);
  } else {
    if (stock === 0) { showToast('This product is out of stock.', 'warning'); return; }
    currentBill.push({
      productId: product.id,
      name:     product.name,
      sku:      product.sku || '',
      price:    product.sellingPrice,
      qty:      1,
      discount: 0,
      total:    product.sellingPrice,
    });
  }

  renderBillItems();
}

function recalcItemTotal(item) {
  return Math.max(0, item.price * item.qty - (item.discount || 0));
}

// ============================================
// BILL ITEM INTERACTIONS (qty / discount / remove)
// ============================================
function initBillItemActions() {
  document.getElementById('bil-items-tbody')?.addEventListener('click', e => {
    // Quantity decrement
    const decBtn = e.target.closest('[data-qty-dec]');
    if (decBtn) {
      const idx = parseInt(decBtn.dataset.qtyDec, 10);
      if (currentBill[idx] && currentBill[idx].qty > 1) {
        currentBill[idx].qty--;
        currentBill[idx].total = recalcItemTotal(currentBill[idx]);
        renderBillItems();
      }
      return;
    }

    // Quantity increment
    const incBtn = e.target.closest('[data-qty-inc]');
    if (incBtn) {
      const idx  = parseInt(incBtn.dataset.qtyInc, 10);
      const item = currentBill[idx];
      if (item) {
        const stock = getProductStock(item.productId);
        if (item.qty >= stock) {
          showToast(`Only ${stock} units available.`, 'warning');
          return;
        }
        item.qty++;
        item.total = recalcItemTotal(item);
        renderBillItems();
      }
      return;
    }

    // Remove
    const removeBtn = e.target.closest('[data-remove-idx]');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.removeIdx, 10);
      currentBill.splice(idx, 1);
      renderBillItems();
    }
  });

  // Quantity input change
  document.getElementById('bil-items-tbody')?.addEventListener('change', e => {
    const qtyInput = e.target.closest('[data-qty-input]');
    if (qtyInput) {
      const idx  = parseInt(qtyInput.dataset.qtyInput, 10);
      const item = currentBill[idx];
      if (item) {
        const stock = getProductStock(item.productId);
        let   val   = parseInt(qtyInput.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > stock)           val = stock;
        item.qty   = val;
        item.total = recalcItemTotal(item);
        renderBillItems();
      }
      return;
    }

    // Discount input change
    const discInput = e.target.closest('[data-disc-input]');
    if (discInput) {
      const idx  = parseInt(discInput.dataset.discInput, 10);
      const item = currentBill[idx];
      if (item) {
        let val = parseFloat(discInput.value) || 0;
        if (val < 0) val = 0;
        const maxDisc = item.price * item.qty;
        if (val > maxDisc) val = maxDisc;
        item.discount = val;
        item.total    = recalcItemTotal(item);
        renderBillItems();
      }
    }
  });
}

// ============================================
// PRODUCT SEARCH
// ============================================
function initProductSearch() {
  document.getElementById('bil-product-search')?.addEventListener('input', e => {
    renderProductList(e.target.value);
  });
}

// ============================================
// ADD TO BILL (product list click)
// ============================================
function initProductListClick() {
  document.getElementById('bil-product-list')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-product-id]');
    if (btn && !btn.disabled) addProductToBill(btn.dataset.productId);
  });
}

// ============================================
// TOTALS INPUTS
// ============================================
function initTotalsInputs() {
  document.getElementById('bil-discount-value')?.addEventListener('input', updateTotals);
  document.getElementById('bil-discount-type')?.addEventListener('change', updateTotals);
  document.getElementById('bil-tax-percent')?.addEventListener('input', updateTotals);

  document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
    radio.addEventListener('change', updateCashChange);
  });
  document.getElementById('bil-amount-received')?.addEventListener('input', updateCashChange);
}

// ============================================
// NEW BILL
// ============================================
function initNewBill() {
  document.getElementById('new-bill-btn')?.addEventListener('click', () => {
    if (currentBill.length > 0) {
      openModal('bil-new-bill-modal');
    } else {
      resetBill();
    }
  });
  document.getElementById('bil-new-bill-cancel')?.addEventListener('click', () => closeModal('bil-new-bill-modal'));
  document.getElementById('bil-new-bill-confirm')?.addEventListener('click', () => {
    closeModal('bil-new-bill-modal');
    resetBill();
  });
}

function resetBill() {
  currentBill   = [];
  currentBillNo = generateBillNo();

  // Reset inputs
  const resetEl = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  resetEl('bil-discount-value', '0');
  resetEl('bil-tax-percent', '0');
  resetEl('bil-amount-received', '');
  document.getElementById('pay-cash') && (document.getElementById('pay-cash').checked = true);

  renderBillMeta();
  renderBillItems();
  updateTotals();
}

// ============================================
// COMPLETE BILL
// ============================================
function initCompleteBill() {
  document.getElementById('bil-complete-btn')?.addEventListener('click', completeBill);
}

function completeBill() {
  if (currentBill.length === 0) {
    showToast('Add at least one product to the bill.', 'warning');
    return;
  }

  for (const item of currentBill) {
    if (item.qty <= 0) {
      showToast('All item quantities must be valid.', 'warning');
      return;
    }
  }

  const payMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
  if (!payMethod) {
    showToast('Please select a payment method.', 'warning');
    return;
  }

  const { grandTotal, subtotal, discountAmt, taxAmt } = calcTotals();

  if (payMethod === 'Cash') {
    const received = parseFloat(document.getElementById('bil-amount-received')?.value || 0) || 0;
    if (received < grandTotal) {
      showToast(`Amount received (${formatINR(received)}) is less than total (${formatINR(grandTotal)}).`, 'danger');
      return;
    }
  }

  // Check stock availability again
  for (const item of currentBill) {
    const product = findProduct(item.productId);
    if (!product) { showToast(`Product "${item.name}" no longer exists.`, 'danger'); return; }
    if (product.currentStock < item.qty) {
      showToast(`Insufficient stock for "${item.name}". Available: ${product.currentStock}.`, 'danger');
      return;
    }
  }

  // Deduct stock from flowbase_inventory
  for (const item of currentBill) {
    const product = findProduct(item.productId);
    if (product) product.currentStock -= item.qty;
  }
  saveProducts();

  // Build sale record
  const now      = Date.now();
  const received = parseFloat(document.getElementById('bil-amount-received')?.value || 0) || grandTotal;
  const change   = payMethod === 'Cash' ? Math.max(0, received - grandTotal) : 0;

  const discType  = document.getElementById('bil-discount-type')?.value || 'percent';
  const discValue = parseFloat(document.getElementById('bil-discount-value')?.value || 0) || 0;
  const taxPct    = parseFloat(document.getElementById('bil-tax-percent')?.value || 0) || 0;

  const sale = {
    id:          uid(),
    billNo:      currentBillNo,
    createdAt:   now,
    items:       currentBill.map(i => ({ ...i })),
    subtotal,
    discountType: discType,
    discountValue: discValue,
    discountAmt,
    taxPercent:  taxPct,
    taxAmt,
    grandTotal,
    paymentMethod: payMethod,
    amountReceived: payMethod === 'Cash' ? received : grandTotal,
    change,
    status:      'Completed',
  };

  salesData.unshift(sale);
  saveSales();

  // Refresh recent bills
  renderRecentBills();

  // Show toast + reset
  showToast('Bill completed successfully.', 'success');
  resetBill();
  renderProductList();
}

// ============================================
// RECENT BILLS
// ============================================
function renderRecentBills() {
  const tbody = document.getElementById('bil-recent-tbody');
  if (!tbody) return;

  const recent = salesData.slice(0, 15);

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/></svg>
            </div>
            <div class="prd-empty-title">No bills yet</div>
            <div class="prd-empty-desc">Completed bills will appear here.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = recent.map(sale => {
    const statusBadge = sale.status === 'Completed' ? 'badge-success' : 'badge-danger';
    return `
      <tr>
        <td><span class="bill-no">${escHtml(sale.billNo)}</span></td>
        <td class="text-muted" style="font-size:12px">${formatDateTime(sale.createdAt)}</td>
        <td>${sale.items.length} item${sale.items.length !== 1 ? 's' : ''}</td>
        <td class="text-mono">${formatINR(sale.grandTotal)}</td>
        <td><span class="badge badge-neutral">${escHtml(sale.paymentMethod)}</span></td>
        <td><span class="badge ${statusBadge}">${escHtml(sale.status)}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="prd-action-btn" type="button" data-view-bill="${sale.id}" style="font-size:12px;padding:4px 8px">View</button>
            <button class="prd-action-btn" type="button" data-print-bill="${sale.id}" style="font-size:12px;padding:4px 8px">Print</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function initRecentBillActions() {
  document.getElementById('bil-recent-tbody')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('[data-view-bill]');
    if (viewBtn) { openViewBill(viewBtn.dataset.viewBill); return; }

    const printBtn = e.target.closest('[data-print-bill]');
    if (printBtn) { printBill(printBtn.dataset.printBill); }
  });
}

// ============================================
// VIEW BILL MODAL
// ============================================
function openViewBill(saleId) {
  const sale = salesData.find(s => s.id === saleId);
  if (!sale) return;
  viewingSaleId = saleId;

  const content = document.getElementById('bil-view-content');
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
        <div class="bil-invoice-total-row"><span>Discount ${discStr !== '—' ? '('+discStr+')' : ''}</span><span>−${formatINR(sale.discountAmt)}</span></div>
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

  openModal('bil-view-modal');
}

function initViewBillModal() {
  document.getElementById('bil-view-close')?.addEventListener('click',    () => closeModal('bil-view-modal'));
  document.getElementById('bil-view-close-btn')?.addEventListener('click', () => closeModal('bil-view-modal'));
  document.getElementById('bil-print-btn')?.addEventListener('click', () => {
    if (viewingSaleId) printBill(viewingSaleId);
  });
}

// ============================================
// PRINT BILL
// ============================================
function printBill(saleId) {
  const sale = salesData.find(s => s.id === saleId);
  if (!sale) return;

  const printArea = document.getElementById('bil-print-area');
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
      Date: ${formatDate(sale.createdAt)} &nbsp; Time: ${formatTime(sale.createdAt)}
    </div>
    <hr class="bill-print-divider" />
    <table class="bill-print-table">
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
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
  document.getElementById('logout-confirm')?.addEventListener('click', () => { closeModal('logout-modal'); showToast('Logged out successfully.', 'success'); });
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
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadSales();

  currentBillNo = generateBillNo();

  renderBillMeta();
  renderProductList();
  renderBillItems();
  updateTotals();
  renderRecentBills();

  initProductSearch();
  initProductListClick();
  initBillItemActions();
  initTotalsInputs();
  initNewBill();
  initCompleteBill();
  initRecentBillActions();
  initViewBillModal();
  initSidebar();
  initLogout();
  initModalOverlayClose();
  initEscClose();
});
