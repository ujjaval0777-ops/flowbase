// ============================================
// FlowBase Inventory — inventory.js
// ============================================
'use strict';

// ============================================
// CONSTANTS
// ============================================
const LS_KEY        = 'flowbase_inventory';
const PAGE_SIZE     = 10;

// ============================================
// STATE
// ============================================
let inventoryData   = [];  // master data
let filteredData    = [];  // after search/filter/sort
let currentPage     = 1;
let activeDropdownId = null;

// ============================================
// DEFAULT DEMO DATA
// ============================================
function getDefaultData() {
  const now = Date.now();
  return [
    { id: uid(), name: 'Wireless Mouse',         sku: 'WM-001',  category: 'Electronics',  currentStock: 42,  minimumStock: 10, purchasePrice: 450,  sellingPrice: 699,  description: 'Ergonomic wireless mouse with 2.4GHz connectivity.', createdAt: now - 86400000 * 9 },
    { id: uid(), name: 'Mechanical Keyboard',    sku: 'KB-002',  category: 'Electronics',  currentStock: 7,   minimumStock: 10, purchasePrice: 800,  sellingPrice: 1199, description: 'Mechanical keyboard with RGB backlighting.', createdAt: now - 86400000 * 8 },
    { id: uid(), name: 'USB Type-C Cable',        sku: 'USB-003', category: 'Accessories',  currentStock: 0,   minimumStock: 5,  purchasePrice: 120,  sellingPrice: 199,  description: '1.5m braided USB-C cable.', createdAt: now - 86400000 * 7 },
    { id: uid(), name: 'Rice 5kg Bag',            sku: 'RCE-004', category: 'Grocery',      currentStock: 156, minimumStock: 20, purchasePrice: 280,  sellingPrice: 360,  description: 'Premium basmati rice in 5kg packs.', createdAt: now - 86400000 * 6 },
    { id: uid(), name: 'Cooking Oil 1L',          sku: 'OIL-005', category: 'Grocery',      currentStock: 8,   minimumStock: 15, purchasePrice: 90,   sellingPrice: 130,  description: 'Refined sunflower cooking oil.', createdAt: now - 86400000 * 5 },
    { id: uid(), name: 'Cotton T-Shirt (M)',      sku: 'TSH-006', category: 'Clothing',     currentStock: 35,  minimumStock: 10, purchasePrice: 180,  sellingPrice: 349,  description: '100% cotton regular-fit T-shirt.', createdAt: now - 86400000 * 5 },
    { id: uid(), name: 'Laptop Stand',            sku: 'LS-007',  category: 'Accessories',  currentStock: 22,  minimumStock: 5,  purchasePrice: 550,  sellingPrice: 899,  description: 'Adjustable aluminium laptop stand.', createdAt: now - 86400000 * 4 },
    { id: uid(), name: 'Sugar 1kg',               sku: 'SUG-008', category: 'Grocery',      currentStock: 3,   minimumStock: 10, purchasePrice: 42,   sellingPrice: 58,   description: 'Refined white sugar.', createdAt: now - 86400000 * 4 },
    { id: uid(), name: 'Bluetooth Earphones',     sku: 'BTE-009', category: 'Electronics',  currentStock: 18,  minimumStock: 8,  purchasePrice: 700,  sellingPrice: 1099, description: 'True wireless stereo earphones.', createdAt: now - 86400000 * 3 },
    { id: uid(), name: 'Denim Jeans (32W)',       sku: 'JNS-010', category: 'Clothing',     currentStock: 14,  minimumStock: 6,  purchasePrice: 650,  sellingPrice: 1199, description: 'Slim-fit denim jeans.', createdAt: now - 86400000 * 3 },
    { id: uid(), name: 'Tea 500g',                sku: 'TEA-011', category: 'Grocery',      currentStock: 5,   minimumStock: 8,  purchasePrice: 110,  sellingPrice: 160,  description: 'Premium Assam CTC tea.', createdAt: now - 86400000 * 2 },
    { id: uid(), name: 'HDMI Cable 2m',           sku: 'HDM-012', category: 'Accessories',  currentStock: 0,   minimumStock: 5,  purchasePrice: 180,  sellingPrice: 299,  description: '4K HDMI 2.0 cable.', createdAt: now - 86400000 * 2 },
    { id: uid(), name: 'Smartphone Holder',       sku: 'PHH-013', category: 'Accessories',  currentStock: 30,  minimumStock: 8,  purchasePrice: 150,  sellingPrice: 249,  description: 'Universal desk phone stand.', createdAt: now - 86400000 * 1 },
    { id: uid(), name: 'Running Shoes (UK 8)',    sku: 'SHO-014', category: 'Clothing',     currentStock: 9,   minimumStock: 10, purchasePrice: 900,  sellingPrice: 1599, description: 'Lightweight mesh running shoes.', createdAt: now - 86400000 * 1 },
    { id: uid(), name: 'Wireless Charger 15W',    sku: 'WLC-015', category: 'Electronics',  currentStock: 25,  minimumStock: 10, purchasePrice: 400,  sellingPrice: 699,  description: 'Qi-certified fast wireless charger pad.', createdAt: now },
    { id: uid(), name: 'Salt 1kg',                sku: 'SLT-016', category: 'Grocery',      currentStock: 4,   minimumStock: 10, purchasePrice: 18,   sellingPrice: 28,   description: 'Iodised table salt.', createdAt: now },
    { id: uid(), name: 'USB Hub 4-Port',          sku: 'UHB-017', category: 'Accessories',  currentStock: 11,  minimumStock: 5,  purchasePrice: 280,  sellingPrice: 499,  description: '4-port USB 3.0 hub.', createdAt: now },
    { id: uid(), name: 'Jeans Jacket (L)',        sku: 'JKT-018', category: 'Clothing',     currentStock: 6,   minimumStock: 4,  purchasePrice: 1100, sellingPrice: 1999, description: 'Classic denim jacket.', createdAt: now },
  ];
}

// ============================================
// UTILITIES
// ============================================
function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function formatINR(val) {
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStockStatus(item) {
  if (item.currentStock === 0)                       return 'Out of Stock';
  if (item.currentStock <= item.minimumStock)        return 'Low Stock';
  return 'In Stock';
}

function getBadgeClass(status) {
  if (status === 'In Stock')    return 'badge-success';
  if (status === 'Low Stock')   return 'badge-warning';
  return 'badge-danger';
}

function getStockNumClass(status) {
  if (status === 'Out of Stock') return 'danger';
  if (status === 'Low Stock')    return 'warning';
  return '';
}

// ============================================
// LOCAL STORAGE
// ============================================
function loadData() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      inventoryData = JSON.parse(stored);
    } else {
      inventoryData = getDefaultData();
      saveData();
    }
  } catch (e) {
    inventoryData = getDefaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(inventoryData));
  } catch (e) { /* storage unavailable */ }
}

// ============================================
// KPI CARDS
// ============================================
function renderKPIs() {
  const total    = inventoryData.length;
  const units    = inventoryData.reduce((sum, i) => sum + i.currentStock, 0);
  const lowStock = inventoryData.filter(i => getStockStatus(i) === 'Low Stock').length;
  const outStock = inventoryData.filter(i => getStockStatus(i) === 'Out of Stock').length;

  const configs = [
    {
      id: 'inv-kpi-total', label: 'Total Products', value: total, iconClass: '',
      footer: 'Items in inventory',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    },
    {
      id: 'inv-kpi-units', label: 'Total Stock Units', value: units.toLocaleString('en-IN'), iconClass: '',
      footer: 'Units across all products',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    },
    {
      id: 'inv-kpi-low', label: 'Low Stock', value: lowStock, iconClass: 'warning',
      footer: 'Products need restocking',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      id: 'inv-kpi-out', label: 'Out of Stock', value: outStock, iconClass: 'danger',
      footer: 'Products unavailable',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
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
function applyFilters() {
  const q         = document.getElementById('inv-search-input').value.trim().toLowerCase();
  const cat       = document.getElementById('filter-category').value;
  const status    = document.getElementById('filter-status').value;
  const sort      = document.getElementById('filter-sort').value;

  filteredData = inventoryData.filter(item => {
    const matchQ      = !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchCat    = !cat    || item.category === cat;
    const matchStatus = !status || getStockStatus(item) === status;
    return matchQ && matchCat && matchStatus;
  });

  // Sort
  filteredData.sort((a, b) => {
    if (sort === 'name-asc')    return a.name.localeCompare(b.name);
    if (sort === 'stock-desc')  return b.currentStock - a.currentStock;
    if (sort === 'stock-asc')   return a.currentStock - b.currentStock;
    if (sort === 'date-desc')   return b.createdAt - a.createdAt;
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
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    const q      = document.getElementById('inv-search-input').value.trim();
    const hasFilter = q ||
      document.getElementById('filter-category').value ||
      document.getElementById('filter-status').value;

    const title = hasFilter
      ? 'No inventory found'
      : 'Your inventory is empty';
    const desc = hasFilter
      ? 'Try changing your search or filters.'
      : 'Add your first inventory item to start managing stock.';

    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="inv-empty-state">
            <div class="inv-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <div class="inv-empty-title">${title}</div>
            <div class="inv-empty-desc">${desc}</div>
            ${!hasFilter ? `<button class="btn inv-btn-primary" type="button" onclick="openAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Inventory
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const start  = (currentPage - 1) * PAGE_SIZE;
  const end    = start + PAGE_SIZE;
  const page   = filteredData.slice(start, end);

  tbody.innerHTML = page.map(item => {
    const status     = getStockStatus(item);
    const badgeClass = getBadgeClass(status);
    const numClass   = getStockNumClass(status);

    return `
      <tr>
        <td><span class="product-name">${escHtml(item.name)}</span></td>
        <td><span class="inv-sku">${escHtml(item.sku)}</span></td>
        <td><span class="inv-category">${escHtml(item.category)}</span></td>
        <td><span class="inv-stock-num ${numClass}">${item.currentStock}</span></td>
        <td class="text-mono text-muted">${item.minimumStock}</td>
        <td class="text-mono">${formatINR(item.purchasePrice)}</td>
        <td class="text-mono">${formatINR(item.sellingPrice)}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td>
          <div class="inv-actions-wrap" data-item-id="${item.id}">
            <button class="inv-action-btn" type="button" data-toggle-dropdown="${item.id}" aria-haspopup="true" aria-expanded="false">
              Actions
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="inv-dropdown" id="dropdown-${item.id}" role="menu">
              <button class="inv-dropdown-item" type="button" data-action="view" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View
              </button>
              <button class="inv-dropdown-item" type="button" data-action="edit" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="inv-dropdown-item" type="button" data-action="adjust" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Adjust Stock
              </button>
              <div class="inv-dropdown-divider"></div>
              <button class="inv-dropdown-item danger" type="button" data-action="delete" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// PAGINATION
// ============================================
function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const start      = filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end        = Math.min(currentPage * PAGE_SIZE, filteredData.length);

  const infoEl   = document.getElementById('pagination-info');
  const numsEl   = document.getElementById('page-numbers');
  const prevBtn  = document.getElementById('prev-page-btn');
  const nextBtn  = document.getElementById('next-page-btn');

  if (infoEl) infoEl.textContent = filteredData.length > 0
    ? `Showing ${start}–${end} of ${filteredData.length} items`
    : 'No items';

  // Page number buttons
  if (numsEl) {
    numsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className  = 'inv-page-num' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.type       = 'button';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `Page ${p}`);
      btn.setAttribute('aria-current', p === currentPage ? 'page' : 'false');
      btn.addEventListener('click', () => {
        currentPage = p;
        renderTable();
        renderPagination();
      });
      numsEl.appendChild(btn);
    }
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function initPagination() {
  document.getElementById('prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); renderPagination(); }
  });
  document.getElementById('next-page-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
    if (currentPage < totalPages) { currentPage++; renderTable(); renderPagination(); }
  });
}

// ============================================
// DROPDOWN ACTIONS
// ============================================
function initTableActions() {
  document.getElementById('inventory-tbody')?.addEventListener('click', e => {
    // Toggle dropdown
    const toggleBtn = e.target.closest('[data-toggle-dropdown]');
    if (toggleBtn) {
      const id = toggleBtn.dataset.toggleDropdown;
      closeAllDropdowns(id);
      const dd = document.getElementById('dropdown-' + id);
      if (dd) {
        const isOpen = dd.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          dd.classList.add('open');
          toggleBtn.setAttribute('aria-expanded', 'true');
          activeDropdownId = id;
        }
      }
      return;
    }

    // Action items
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const id     = actionBtn.dataset.id;
      closeAllDropdowns();

      if (action === 'view')   openViewModal(id);
      if (action === 'edit')   openEditModal(id);
      if (action === 'adjust') openAdjustModal(id);
      if (action === 'delete') openDeleteModal(id);
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.inv-actions-wrap')) closeAllDropdowns();
  });
}

function closeAllDropdowns(except) {
  document.querySelectorAll('.inv-dropdown.open').forEach(dd => {
    if (!except || dd.id !== 'dropdown-' + except) {
      dd.classList.remove('open');
      const parentWrap = dd.closest('.inv-actions-wrap');
      parentWrap?.querySelector('[data-toggle-dropdown]')?.setAttribute('aria-expanded', 'false');
    }
  });
  if (!except) activeDropdownId = null;
}

// ============================================
// FIND ITEM
// ============================================
function findItem(id) {
  return inventoryData.find(i => i.id === id);
}

// ============================================
// ADD MODAL
// ============================================
function openAddModal() {
  clearFormErrors();
  document.getElementById('inv-form-id').value    = '';
  document.getElementById('inv-form-title').textContent = 'Add Inventory';
  document.getElementById('inv-form-submit').textContent = 'Add Inventory';
  document.getElementById('field-name').value          = '';
  document.getElementById('field-sku').value           = '';
  document.getElementById('field-category').value      = '';
  document.getElementById('field-purchase-price').value = '';
  document.getElementById('field-selling-price').value  = '';
  document.getElementById('field-stock').value          = '';
  document.getElementById('field-min-stock').value      = '';
  document.getElementById('field-description').value    = '';
  openModal('inv-form-modal');
  setTimeout(() => document.getElementById('field-name')?.focus(), 80);
}

function initAddInventoryBtn() {
  document.getElementById('add-inventory-btn')?.addEventListener('click', openAddModal);
}

// ============================================
// EDIT MODAL
// ============================================
function openEditModal(id) {
  const item = findItem(id);
  if (!item) return;
  clearFormErrors();
  document.getElementById('inv-form-id').value          = item.id;
  document.getElementById('inv-form-title').textContent = 'Edit Inventory';
  document.getElementById('inv-form-submit').textContent = 'Save Changes';
  document.getElementById('field-name').value           = item.name;
  document.getElementById('field-sku').value            = item.sku;
  document.getElementById('field-category').value       = item.category;
  document.getElementById('field-purchase-price').value = item.purchasePrice;
  document.getElementById('field-selling-price').value  = item.sellingPrice;
  document.getElementById('field-stock').value          = item.currentStock;
  document.getElementById('field-min-stock').value      = item.minimumStock;
  document.getElementById('field-description').value    = item.description || '';

  // Close view modal if open
  closeModal('inv-view-modal');
  openModal('inv-form-modal');
  setTimeout(() => document.getElementById('field-name')?.focus(), 80);
}

// ============================================
// FORM SUBMIT (Add / Edit)
// ============================================
function initFormSubmit() {
  document.getElementById('inv-form')?.addEventListener('submit', e => {
    e.preventDefault();
    clearFormErrors();

    const id            = document.getElementById('inv-form-id').value;
    const name          = document.getElementById('field-name').value.trim();
    const sku           = document.getElementById('field-sku').value.trim().toUpperCase();
    const category      = document.getElementById('field-category').value;
    const purchasePrice = parseFloat(document.getElementById('field-purchase-price').value);
    const sellingPrice  = parseFloat(document.getElementById('field-selling-price').value);
    const currentStock  = parseInt(document.getElementById('field-stock').value, 10);
    const minimumStock  = parseInt(document.getElementById('field-min-stock').value, 10);
    const description   = document.getElementById('field-description').value.trim();

    let valid = true;

    if (!name) {
      setFieldError('err-name', 'field-name', 'Product name is required.');
      valid = false;
    }
    if (!sku) {
      setFieldError('err-sku', 'field-sku', 'SKU is required.');
      valid = false;
    } else {
      // Uniqueness check (skip current item when editing)
      const duplicate = inventoryData.find(i => i.sku === sku && i.id !== id);
      if (duplicate) {
        setFieldError('err-sku', 'field-sku', 'This SKU already exists.');
        valid = false;
      }
    }
    if (!category) {
      setFieldError('err-category', 'field-category', 'Please select a category.');
      valid = false;
    }
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      setFieldError('err-purchase-price', 'field-purchase-price', 'Enter a valid positive price.');
      valid = false;
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setFieldError('err-selling-price', 'field-selling-price', 'Enter a valid positive price.');
      valid = false;
    }
    if (isNaN(currentStock) || currentStock < 0) {
      setFieldError('err-stock', 'field-stock', 'Stock must be 0 or more.');
      valid = false;
    }
    if (isNaN(minimumStock) || minimumStock < 0) {
      setFieldError('err-min-stock', 'field-min-stock', 'Minimum stock must be 0 or more.');
      valid = false;
    }

    if (!valid) return;

    if (id) {
      // Edit
      const item = findItem(id);
      if (item) {
        item.name          = name;
        item.sku           = sku;
        item.category      = category;
        item.purchasePrice = purchasePrice;
        item.sellingPrice  = sellingPrice;
        item.currentStock  = currentStock;
        item.minimumStock  = minimumStock;
        item.description   = description;
        item.updatedAt     = Date.now();
      }
      showToast('Inventory updated successfully.', 'success');
    } else {
      // Add
      inventoryData.unshift({
        id: uid(), name, sku, category,
        purchasePrice, sellingPrice, currentStock, minimumStock, description,
        createdAt: Date.now(),
      });
      showToast('Inventory added successfully.', 'success');
    }

    saveData();
    closeModal('inv-form-modal');
    applyFilters();
    renderKPIs();
  });

  // Cancel / close
  document.getElementById('inv-form-cancel')?.addEventListener('click', () => closeModal('inv-form-modal'));
  document.getElementById('inv-form-close')?.addEventListener('click',  () => closeModal('inv-form-modal'));
}

function setFieldError(errId, fieldId, msg) {
  const errEl   = document.getElementById(errId);
  const fieldEl = document.getElementById(fieldId);
  if (errEl)   errEl.textContent = msg;
  if (fieldEl) fieldEl.classList.add('inv-error');
}

function clearFormErrors() {
  document.querySelectorAll('.inv-form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.inv-form-input').forEach(el => el.classList.remove('inv-error'));
}

// ============================================
// VIEW MODAL
// ============================================
function openViewModal(id) {
  const item = findItem(id);
  if (!item) return;

  const status     = getStockStatus(item);
  const badgeClass = getBadgeClass(status);
  const pct        = item.minimumStock > 0 ? Math.round((item.currentStock / item.minimumStock) * 100) : 100;
  const fillPct    = Math.min(pct, 100);
  const healthCls  = status === 'In Stock' ? 'success' : status === 'Low Stock' ? 'warning' : 'danger';

  document.getElementById('inv-view-content').innerHTML = `
    <div class="inv-view-product-name">${escHtml(item.name)}</div>
    <div class="inv-view-sku-row">
      <span class="inv-sku">${escHtml(item.sku)}</span>
      <span class="badge ${badgeClass}">${status}</span>
    </div>
    <div class="inv-view-fields">
      <div class="inv-view-field">
        <span class="inv-view-field-label">Category</span>
        <span class="inv-view-field-value">${escHtml(item.category)}</span>
      </div>
      <div class="inv-view-field">
        <span class="inv-view-field-label">Current Stock</span>
        <span class="inv-view-field-value">${item.currentStock} units</span>
      </div>
      <div class="inv-view-field">
        <span class="inv-view-field-label">Minimum Stock</span>
        <span class="inv-view-field-value">${item.minimumStock} units</span>
      </div>
      <div class="inv-view-field">
        <span class="inv-view-field-label">Purchase Price</span>
        <span class="inv-view-field-value">${formatINR(item.purchasePrice)}</span>
      </div>
      <div class="inv-view-field">
        <span class="inv-view-field-label">Selling Price</span>
        <span class="inv-view-field-value">${formatINR(item.sellingPrice)}</span>
      </div>
      <div class="inv-view-field">
        <span class="inv-view-field-label">Last Updated</span>
        <span class="inv-view-field-value muted">${formatDate(item.updatedAt || item.createdAt)}</span>
      </div>
    </div>
    ${item.description ? `
    <div class="inv-view-field" style="margin-bottom:14px;">
      <span class="inv-view-field-label">Description</span>
      <span class="inv-view-field-value muted">${escHtml(item.description)}</span>
    </div>` : ''}
    <div class="inv-health-card">
      <div class="inv-health-title">Stock Health</div>
      <div class="inv-health-bar-wrap">
        <div class="inv-health-bar-track">
          <div class="inv-health-bar-fill ${healthCls}" style="width:${fillPct}%"></div>
        </div>
        <span class="inv-health-label">${fillPct}%</span>
      </div>
      <div class="inv-health-nums">
        <span>Current: ${item.currentStock}</span>
        <span>Minimum: ${item.minimumStock}</span>
      </div>
    </div>
  `;

  // Wire up view modal action buttons
  document.getElementById('inv-view-edit-btn').onclick   = () => openEditModal(id);
  document.getElementById('inv-view-adjust-btn').onclick = () => { closeModal('inv-view-modal'); openAdjustModal(id); };

  openModal('inv-view-modal');
}

function initViewModal() {
  document.getElementById('inv-view-close')?.addEventListener('click',     () => closeModal('inv-view-modal'));
  document.getElementById('inv-view-close-btn')?.addEventListener('click', () => closeModal('inv-view-modal'));
}

// ============================================
// ADJUST STOCK MODAL
// ============================================
function openAdjustModal(id) {
  const item = findItem(id);
  if (!item) return;

  document.getElementById('adjust-item-id').value = item.id;
  document.getElementById('adjust-quantity').value = '';
  document.getElementById('adjust-reason').value   = '';
  document.getElementById('err-adjust-qty').textContent    = '';
  document.getElementById('err-adjust-reason').textContent = '';
  document.getElementById('adjust-add').checked = true;

  document.getElementById('inv-adjust-info').innerHTML = `
    <div>
      <div class="inv-adjust-product-name">${escHtml(item.name)}</div>
      <div class="inv-adjust-current-stock">SKU: ${escHtml(item.sku)}</div>
    </div>
    <div class="inv-adjust-stock-badge">${item.currentStock}</div>
  `;

  openModal('inv-adjust-modal');
  setTimeout(() => document.getElementById('adjust-quantity')?.focus(), 80);
}

function initAdjustModal() {
  document.getElementById('inv-adjust-form')?.addEventListener('submit', e => {
    e.preventDefault();

    const id       = document.getElementById('adjust-item-id').value;
    const type     = document.querySelector('input[name="adjust-type"]:checked')?.value;
    const qty      = parseInt(document.getElementById('adjust-quantity').value, 10);
    const reason   = document.getElementById('adjust-reason').value;

    let valid = true;

    if (isNaN(qty) || qty <= 0) {
      document.getElementById('err-adjust-qty').textContent = 'Enter a valid quantity (at least 1).';
      valid = false;
    }
    if (!reason) {
      document.getElementById('err-adjust-reason').textContent = 'Please select a reason.';
      valid = false;
    }

    if (!valid) return;

    const item = findItem(id);
    if (!item) return;

    if (type === 'remove') {
      const newStock = item.currentStock - qty;
      if (newStock < 0) {
        document.getElementById('err-adjust-qty').textContent =
          `Cannot remove more than current stock (${item.currentStock}).`;
        return;
      }
      item.currentStock = newStock;
    } else {
      item.currentStock = item.currentStock + qty;
    }

    item.updatedAt = Date.now();
    saveData();
    closeModal('inv-adjust-modal');
    applyFilters();
    renderKPIs();
    showToast('Stock updated successfully.', 'success');
  });

  document.getElementById('inv-adjust-cancel')?.addEventListener('click', () => closeModal('inv-adjust-modal'));
  document.getElementById('inv-adjust-close')?.addEventListener('click',  () => closeModal('inv-adjust-modal'));
}

// ============================================
// DELETE MODAL
// ============================================
function openDeleteModal(id) {
  document.getElementById('delete-item-id').value = id;
  openModal('inv-delete-modal');
}

function initDeleteModal() {
  document.getElementById('inv-delete-confirm')?.addEventListener('click', () => {
    const id = document.getElementById('delete-item-id').value;
    inventoryData = inventoryData.filter(i => i.id !== id);
    saveData();
    closeModal('inv-delete-modal');
    applyFilters();
    renderKPIs();
    showToast('Inventory item deleted.', 'danger');
  });
  document.getElementById('inv-delete-cancel')?.addEventListener('click', () => closeModal('inv-delete-modal'));
}

// ============================================
// MODAL OPEN/CLOSE HELPERS
// ============================================
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  // Only restore scroll if no other modal open
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.style.overflow = '';
  }
}

// Overlay click closes modal
function initModalOverlayClose() {
  ['inv-form-modal', 'inv-view-modal', 'inv-adjust-modal', 'inv-delete-modal', 'logout-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) closeModal(id);
    });
  });
}

// Escape key closes topmost open modal
function initEscClose() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal-overlay.open');
    if (open) closeModal(open.id);
  });
}

// ============================================
// SEARCH & FILTER EVENTS
// ============================================
function initSearchAndFilters() {
  document.getElementById('inv-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('filter-category')?.addEventListener('change', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('filter-sort')?.addEventListener('change', applyFilters);

  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    document.getElementById('inv-search-input').value  = '';
    document.getElementById('filter-category').value   = '';
    document.getElementById('filter-status').value     = '';
    document.getElementById('filter-sort').value       = 'name-asc';
    applyFilters();
  });
}

// ============================================
// EXPORT CSV
// ============================================
function initExport() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const data = filteredData.length > 0 ? filteredData : inventoryData;
    if (data.length === 0) { showToast('No data to export.', 'warning'); return; }

    const headers = ['Product', 'SKU', 'Category', 'Current Stock', 'Min. Stock', 'Purchase Price (INR)', 'Selling Price (INR)', 'Status'];
    const rows = data.map(item => [
      `"${item.name.replace(/"/g, '""')}"`,
      item.sku,
      item.category,
      item.currentStock,
      item.minimumStock,
      item.purchasePrice,
      item.sellingPrice,
      getStockStatus(item),
    ]);

    const csv   = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'flowbase-inventory.csv';
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV exported successfully.', 'success');
  });
}

// ============================================
// SIDEBAR (same as dashboard)
// ============================================
function initSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const overlay    = document.getElementById('sidebar-overlay');
  const hamburger  = document.getElementById('hamburger-btn');
  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
    if (!document.querySelector('.modal-overlay.open')) {
      document.body.style.overflow = '';
    }
  }

  hamburger && hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay && overlay.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
  });
}

// ============================================
// LOGOUT MODAL
// ============================================
function initLogout() {
  const logoutBtn  = document.getElementById('logout-btn');
  const modal      = document.getElementById('logout-modal');
  const cancelBtn  = document.getElementById('logout-cancel');
  const confirmBtn = document.getElementById('logout-confirm');
  if (!logoutBtn || !modal) return;

  logoutBtn.addEventListener('click',  () => openModal('logout-modal'));
  cancelBtn?.addEventListener('click', () => closeModal('logout-modal'));
  confirmBtn?.addEventListener('click', () => {
    closeModal('logout-modal');
    showToast('Logged out successfully.', 'success');
  });
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

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyFilters();
  renderKPIs();

  initSidebar();
  initLogout();
  initSearchAndFilters();
  initAddInventoryBtn();
  initFormSubmit();
  initViewModal();
  initAdjustModal();
  initDeleteModal();
  initPagination();
  initTableActions();
  initExport();
  initModalOverlayClose();
  initEscClose();
});
