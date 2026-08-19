// ============================================
// FlowBase Products — products.js
// Shares localStorage key with Inventory:
//   'flowbase_inventory'
// ============================================
'use strict';

// ============================================
// CONSTANTS
// ============================================
const LS_INV_KEY  = 'flowbase_inventory'; // shared with inventory.js
const PAGE_SIZE   = 10;

// ============================================
// STATE
// ============================================
let productsData    = [];  // master data (same array as inventory)
let filteredData    = [];  // after search/filter/sort
let currentPage     = 1;
let activeDropdownId = null;

// ============================================
// LOCAL STORAGE — reads/writes flowbase_inventory
// ============================================
function loadData() {
  try {
    const stored = localStorage.getItem(LS_INV_KEY);
    if (stored) {
      productsData = JSON.parse(stored);
    } else {
      productsData = getDefaultData();
      saveData();
    }
  } catch (e) {
    productsData = getDefaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData));
  } catch (e) { /* storage unavailable */ }
}

// ============================================
// DEFAULT DEMO PRODUCTS (same as inventory)
// ============================================
function getDefaultData() {
  const now = Date.now();
  return [
    { id: uid(), name: 'Wireless Mouse',       sku: 'WM-001',  category: 'Electronics',  currentStock: 42,  minimumStock: 10, purchasePrice: 450,  sellingPrice: 699,  description: 'Ergonomic wireless mouse with 2.4GHz connectivity.', createdAt: now - 86400000 * 9, status: 'active' },
    { id: uid(), name: 'Mechanical Keyboard',  sku: 'KB-002',  category: 'Electronics',  currentStock: 7,   minimumStock: 10, purchasePrice: 800,  sellingPrice: 1199, description: 'Mechanical keyboard with RGB backlighting.',          createdAt: now - 86400000 * 8, status: 'active' },
    { id: uid(), name: 'USB Type-C Cable',     sku: 'USB-003', category: 'Accessories',  currentStock: 0,   minimumStock: 5,  purchasePrice: 120,  sellingPrice: 199,  description: '1.5m braided USB-C cable.',                          createdAt: now - 86400000 * 7, status: 'active' },
    { id: uid(), name: 'Rice 5kg Bag',         sku: 'RCE-004', category: 'Grocery',      currentStock: 156, minimumStock: 20, purchasePrice: 280,  sellingPrice: 360,  description: 'Premium basmati rice in 5kg packs.',                 createdAt: now - 86400000 * 6, status: 'active' },
    { id: uid(), name: 'Cooking Oil 1L',       sku: 'OIL-005', category: 'Grocery',      currentStock: 8,   minimumStock: 15, purchasePrice: 90,   sellingPrice: 130,  description: 'Refined sunflower cooking oil.',                     createdAt: now - 86400000 * 5, status: 'active' },
    { id: uid(), name: 'Cotton T-Shirt (M)',   sku: 'TSH-006', category: 'Clothing',     currentStock: 35,  minimumStock: 10, purchasePrice: 180,  sellingPrice: 349,  description: '100% cotton regular-fit T-shirt.',                   createdAt: now - 86400000 * 5, status: 'active' },
    { id: uid(), name: 'Laptop Stand',         sku: 'LS-007',  category: 'Accessories',  currentStock: 22,  minimumStock: 5,  purchasePrice: 550,  sellingPrice: 899,  description: 'Adjustable aluminium laptop stand.',                  createdAt: now - 86400000 * 4, status: 'active' },
    { id: uid(), name: 'Sugar 1kg',            sku: 'SUG-008', category: 'Grocery',      currentStock: 3,   minimumStock: 10, purchasePrice: 42,   sellingPrice: 58,   description: 'Refined white sugar.',                               createdAt: now - 86400000 * 4, status: 'active' },
    { id: uid(), name: 'Bluetooth Earphones',  sku: 'BTE-009', category: 'Electronics',  currentStock: 18,  minimumStock: 8,  purchasePrice: 700,  sellingPrice: 1099, description: 'True wireless stereo earphones.',                    createdAt: now - 86400000 * 3, status: 'active' },
    { id: uid(), name: 'Denim Jeans (32W)',    sku: 'JNS-010', category: 'Clothing',     currentStock: 14,  minimumStock: 6,  purchasePrice: 650,  sellingPrice: 1199, description: 'Slim-fit denim jeans.',                              createdAt: now - 86400000 * 3, status: 'active' },
    { id: uid(), name: 'Tea 500g',             sku: 'TEA-011', category: 'Grocery',      currentStock: 5,   minimumStock: 8,  purchasePrice: 110,  sellingPrice: 160,  description: 'Premium Assam CTC tea.',                             createdAt: now - 86400000 * 2, status: 'active' },
    { id: uid(), name: 'HDMI Cable 2m',        sku: 'HDM-012', category: 'Accessories',  currentStock: 0,   minimumStock: 5,  purchasePrice: 180,  sellingPrice: 299,  description: '4K HDMI 2.0 cable.',                                 createdAt: now - 86400000 * 2, status: 'active' },
    { id: uid(), name: 'Smartphone Holder',    sku: 'PHH-013', category: 'Accessories',  currentStock: 30,  minimumStock: 8,  purchasePrice: 150,  sellingPrice: 249,  description: 'Universal desk phone stand.',                        createdAt: now - 86400000 * 1, status: 'active' },
    { id: uid(), name: 'Running Shoes (UK 8)', sku: 'SHO-014', category: 'Clothing',     currentStock: 9,   minimumStock: 10, purchasePrice: 900,  sellingPrice: 1599, description: 'Lightweight mesh running shoes.',                    createdAt: now - 86400000 * 1, status: 'active' },
    { id: uid(), name: 'Wireless Charger 15W', sku: 'WLC-015', category: 'Electronics',  currentStock: 25,  minimumStock: 10, purchasePrice: 400,  sellingPrice: 699,  description: 'Qi-certified fast wireless charger pad.',            createdAt: now,               status: 'active' },
    { id: uid(), name: 'Salt 1kg',             sku: 'SLT-016', category: 'Grocery',      currentStock: 4,   minimumStock: 10, purchasePrice: 18,   sellingPrice: 28,   description: 'Iodised table salt.',                                createdAt: now,               status: 'active' },
    { id: uid(), name: 'USB Hub 4-Port',       sku: 'UHB-017', category: 'Accessories',  currentStock: 11,  minimumStock: 5,  purchasePrice: 280,  sellingPrice: 499,  description: '4-port USB 3.0 hub.',                                createdAt: now,               status: 'active' },
    { id: uid(), name: 'Jeans Jacket (L)',     sku: 'JKT-018', category: 'Clothing',     currentStock: 6,   minimumStock: 4,  purchasePrice: 1100, sellingPrice: 1999, description: 'Classic denim jacket.',                              createdAt: now,               status: 'active' },
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
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Derive stock status from item */
function getStockStatus(item) {
  if (item.currentStock === 0)                    return 'Out of Stock';
  if (item.currentStock <= (item.minimumStock || 0)) return 'Low Stock';
  return 'In Stock';
}

/** Derive badge class from stock status */
function getStockBadgeClass(stockStatus) {
  if (stockStatus === 'In Stock')    return 'badge-success';
  if (stockStatus === 'Low Stock')   return 'badge-warning';
  return 'badge-danger';
}

/** Product-level status (active / inactive) */
function getProductStatus(item) {
  if (item.status === 'inactive') return 'Inactive';
  const stock = getStockStatus(item);
  if (stock === 'Out of Stock') return 'Out of Stock';
  if (stock === 'Low Stock')    return 'Low Stock';
  return 'Active';
}

function getProductStatusBadgeClass(pStatus) {
  if (pStatus === 'Active')      return 'badge-success';
  if (pStatus === 'Low Stock')   return 'badge-warning';
  if (pStatus === 'Out of Stock') return 'badge-danger';
  return 'badge-inactive';
}

function getStockNumClass(item) {
  const s = getStockStatus(item);
  if (s === 'Out of Stock') return 'danger';
  if (s === 'Low Stock')    return 'warning';
  return '';
}

// ============================================
// KPI CARDS
// ============================================
function renderKPIs() {
  const total      = productsData.length;
  const active     = productsData.filter(p => (p.status || 'active') === 'active').length;
  const cats       = new Set(productsData.map(p => p.category)).size;
  const lowStock   = productsData.filter(p => {
    const s = getStockStatus(p);
    return s === 'Low Stock' || s === 'Out of Stock';
  }).length;

  const configs = [
    {
      id: 'prd-kpi-total', label: 'Total Products', value: total,
      footer: 'Items in catalog',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      iconClass: '',
    },
    {
      id: 'prd-kpi-active', label: 'Active Products', value: active,
      footer: 'Currently available',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      iconClass: '',
    },
    {
      id: 'prd-kpi-categories', label: 'Categories', value: cats,
      footer: 'Product categories',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
      iconClass: '',
    },
    {
      id: 'prd-kpi-lowstock', label: 'Low Stock', value: lowStock,
      footer: 'Need attention',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      iconClass: 'warning',
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
  const q      = document.getElementById('prd-search-input')?.value.trim().toLowerCase() || '';
  const cat    = document.getElementById('prd-filter-category')?.value || '';
  const status = document.getElementById('prd-filter-status')?.value || '';
  const stock  = document.getElementById('prd-filter-stock')?.value || '';
  const sort   = document.getElementById('prd-filter-sort')?.value || 'name-asc';

  filteredData = productsData.filter(item => {
    const matchQ   = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchCat = !cat || item.category === cat;
    const pStatus  = getProductStatus(item);
    const sStatus  = getStockStatus(item);
    const matchStatus = !status || pStatus.toLowerCase() === status.toLowerCase();
    const matchStock  = !stock  || sStatus === stock;
    return matchQ && matchCat && matchStatus && matchStock;
  });

  filteredData.sort((a, b) => {
    if (sort === 'name-asc')    return a.name.localeCompare(b.name);
    if (sort === 'name-desc')   return b.name.localeCompare(a.name);
    if (sort === 'price-asc')   return a.sellingPrice - b.sellingPrice;
    if (sort === 'price-desc')  return b.sellingPrice - a.sellingPrice;
    if (sort === 'date-desc')   return (b.createdAt || 0) - (a.createdAt || 0);
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
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (filteredData.length === 0) {
    const q = document.getElementById('prd-search-input')?.value.trim() || '';
    const hasFilter = q ||
      document.getElementById('prd-filter-category')?.value ||
      document.getElementById('prd-filter-status')?.value ||
      document.getElementById('prd-filter-stock')?.value;

    const title = hasFilter ? 'No products found' : 'No products yet';
    const desc  = hasFilter ? 'Try changing your search or filters.' : 'Add your first product to start managing your catalog.';

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div class="prd-empty-title">${title}</div>
            <div class="prd-empty-desc">${desc}</div>
            ${!hasFilter ? `<button class="btn prd-btn-primary" type="button" style="margin-top:8px" onclick="openAddModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Product
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredData.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page.map(item => {
    const stockStatus  = getStockStatus(item);
    const pStatus      = getProductStatus(item);
    const pBadgeClass  = getProductStatusBadgeClass(pStatus);
    const numClass     = getStockNumClass(item);

    return `
      <tr>
        <td><span class="product-name">${escHtml(item.name)}</span></td>
        <td><span class="prd-sku">${escHtml(item.sku)}</span></td>
        <td><span class="prd-category">${escHtml(item.category)}</span></td>
        <td class="text-mono">${formatINR(item.purchasePrice)}</td>
        <td class="text-mono">${formatINR(item.sellingPrice)}</td>
        <td><span class="prd-stock-num ${numClass}">${item.currentStock}</span></td>
        <td><span class="badge ${pBadgeClass}">${pStatus}</span></td>
        <td>
          <div class="prd-actions-wrap" data-item-id="${item.id}">
            <button class="prd-action-btn" type="button" data-toggle-dropdown="${item.id}" aria-haspopup="true" aria-expanded="false">
              Actions
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="prd-dropdown" id="prd-dropdown-${item.id}" role="menu">
              <button class="prd-dropdown-item" type="button" data-action="view" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View
              </button>
              <button class="prd-dropdown-item" type="button" data-action="edit" data-id="${item.id}" role="menuitem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <div class="prd-dropdown-divider"></div>
              <button class="prd-dropdown-item danger" type="button" data-action="delete" data-id="${item.id}" role="menuitem">
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

// ============================================
// PAGINATION
// ============================================
function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const start = filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, filteredData.length);

  const infoEl  = document.getElementById('prd-pagination-info');
  const numsEl  = document.getElementById('prd-page-numbers');
  const prevBtn = document.getElementById('prd-prev-page-btn');
  const nextBtn = document.getElementById('prd-next-page-btn');

  if (infoEl) infoEl.textContent = filteredData.length > 0
    ? `Showing ${start}–${end} of ${filteredData.length} products`
    : 'No products';

  if (numsEl) {
    numsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className   = 'prd-page-num' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.type        = 'button';
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', `Page ${p}`);
      btn.setAttribute('aria-current', p === currentPage ? 'page' : 'false');
      btn.addEventListener('click', () => { currentPage = p; renderTable(); renderPagination(); });
      numsEl.appendChild(btn);
    }
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function initPagination() {
  document.getElementById('prd-prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); renderPagination(); }
  });
  document.getElementById('prd-next-page-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
    if (currentPage < totalPages) { currentPage++; renderTable(); renderPagination(); }
  });
}

// ============================================
// DROPDOWN ACTIONS
// ============================================
function initTableActions() {
  document.getElementById('products-tbody')?.addEventListener('click', e => {
    const toggleBtn = e.target.closest('[data-toggle-dropdown]');
    if (toggleBtn) {
      const id = toggleBtn.dataset.toggleDropdown;
      const dd = document.getElementById('prd-dropdown-' + id);
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

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const id     = actionBtn.dataset.id;
      closeAllDropdowns();
      if (action === 'view')   openViewModal(id);
      if (action === 'edit')   openEditModal(id);
      if (action === 'delete') openDeleteModal(id);
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.prd-actions-wrap')) closeAllDropdowns();
  });
}

function closeAllDropdowns(except) {
  document.querySelectorAll('.prd-dropdown.open').forEach(dd => {
    if (!except || dd.id !== 'prd-dropdown-' + except) {
      dd.classList.remove('open');
      const wrap = dd.closest('.prd-actions-wrap');
      wrap?.querySelector('[data-toggle-dropdown]')?.setAttribute('aria-expanded', 'false');
    }
  });
  if (!except) activeDropdownId = null;
}

function findItem(id) {
  return productsData.find(p => p.id === id);
}

// ============================================
// SEARCH & FILTER INIT
// ============================================
function initSearchAndFilters() {
  document.getElementById('prd-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('prd-filter-category')?.addEventListener('change', applyFilters);
  document.getElementById('prd-filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('prd-filter-stock')?.addEventListener('change', applyFilters);
  document.getElementById('prd-filter-sort')?.addEventListener('change', applyFilters);
  document.getElementById('prd-clear-filters-btn')?.addEventListener('click', () => {
    document.getElementById('prd-search-input').value    = '';
    document.getElementById('prd-filter-category').value = '';
    document.getElementById('prd-filter-status').value   = '';
    document.getElementById('prd-filter-stock').value    = '';
    document.getElementById('prd-filter-sort').value     = 'name-asc';
    applyFilters();
  });
}

// ============================================
// ADD MODAL
// ============================================
function openAddModal() {
  clearFormErrors();
  document.getElementById('prd-form-id').value         = '';
  document.getElementById('prd-form-title').textContent = 'Add Product';
  document.getElementById('prd-form-submit').textContent = 'Add Product';
  document.getElementById('prd-field-name').value         = '';
  document.getElementById('prd-field-sku').value          = '';
  document.getElementById('prd-field-category').value     = '';
  document.getElementById('prd-field-purchase-price').value = '';
  document.getElementById('prd-field-selling-price').value  = '';
  document.getElementById('prd-field-stock').value          = '';
  document.getElementById('prd-field-min-stock').value      = '';
  document.getElementById('prd-field-status').value         = 'active';
  document.getElementById('prd-field-description').value    = '';
  openModal('prd-form-modal');
  setTimeout(() => document.getElementById('prd-field-name')?.focus(), 80);
}

function initAddProductBtn() {
  document.getElementById('add-product-btn')?.addEventListener('click', openAddModal);
}

// ============================================
// EDIT MODAL
// ============================================
function openEditModal(id) {
  const item = findItem(id);
  if (!item) return;
  clearFormErrors();
  document.getElementById('prd-form-id').value           = item.id;
  document.getElementById('prd-form-title').textContent  = 'Edit Product';
  document.getElementById('prd-form-submit').textContent = 'Save Changes';
  document.getElementById('prd-field-name').value          = item.name;
  document.getElementById('prd-field-sku').value           = item.sku;
  document.getElementById('prd-field-category').value      = item.category;
  document.getElementById('prd-field-purchase-price').value = item.purchasePrice;
  document.getElementById('prd-field-selling-price').value  = item.sellingPrice;
  document.getElementById('prd-field-stock').value          = item.currentStock;
  document.getElementById('prd-field-min-stock').value      = item.minimumStock || 0;
  document.getElementById('prd-field-status').value         = item.status || 'active';
  document.getElementById('prd-field-description').value    = item.description || '';
  closeModal('prd-view-modal');
  openModal('prd-form-modal');
  setTimeout(() => document.getElementById('prd-field-name')?.focus(), 80);
}

// ============================================
// FORM SUBMIT (Add / Edit)
// ============================================
function initFormSubmit() {
  document.getElementById('prd-form')?.addEventListener('submit', e => {
    e.preventDefault();
    clearFormErrors();

    const id            = document.getElementById('prd-form-id').value;
    const name          = document.getElementById('prd-field-name').value.trim();
    const sku           = document.getElementById('prd-field-sku').value.trim().toUpperCase();
    const category      = document.getElementById('prd-field-category').value;
    const purchasePrice = parseFloat(document.getElementById('prd-field-purchase-price').value);
    const sellingPrice  = parseFloat(document.getElementById('prd-field-selling-price').value);
    const stockRaw      = document.getElementById('prd-field-stock').value;
    const minStockRaw   = document.getElementById('prd-field-min-stock').value;
    const currentStock  = stockRaw    === '' ? 0 : parseInt(stockRaw, 10);
    const minimumStock  = minStockRaw === '' ? 0 : parseInt(minStockRaw, 10);
    const status        = document.getElementById('prd-field-status').value;
    const description   = document.getElementById('prd-field-description').value.trim();

    let valid = true;

    if (!name) { setFieldError('prd-err-name', 'prd-field-name', 'Product name is required.'); valid = false; }
    if (!sku)  { setFieldError('prd-err-sku',  'prd-field-sku',  'SKU is required.'); valid = false; }
    else {
      const dup = productsData.find(p => p.sku === sku && p.id !== id);
      if (dup) { setFieldError('prd-err-sku', 'prd-field-sku', 'This SKU already exists.'); valid = false; }
    }
    if (!category) { setFieldError('prd-err-category', 'prd-field-category', 'Please select a category.'); valid = false; }
    if (isNaN(purchasePrice) || purchasePrice < 0) { setFieldError('prd-err-purchase-price', 'prd-field-purchase-price', 'Enter a valid positive price.'); valid = false; }
    if (isNaN(sellingPrice)  || sellingPrice < 0)  { setFieldError('prd-err-selling-price',  'prd-field-selling-price',  'Enter a valid positive price.'); valid = false; }
    if (isNaN(currentStock)  || currentStock < 0)  { setFieldError('prd-err-stock', 'prd-field-stock', 'Stock must be 0 or more.'); valid = false; }
    if (isNaN(minimumStock)  || minimumStock < 0)  { setFieldError('prd-err-min-stock', 'prd-field-min-stock', 'Minimum stock must be 0 or more.'); valid = false; }

    if (!valid) return;

    if (id) {
      // Edit existing
      const item = findItem(id);
      if (item) {
        item.name          = name;
        item.sku           = sku;
        item.category      = category;
        item.purchasePrice = purchasePrice;
        item.sellingPrice  = sellingPrice;
        item.currentStock  = currentStock;
        item.minimumStock  = minimumStock;
        item.status        = status;
        item.description   = description;
        item.updatedAt     = Date.now();
      }
      showToast('Product updated successfully.', 'success');
    } else {
      // Add new
      productsData.unshift({
        id: uid(), name, sku, category,
        purchasePrice, sellingPrice, currentStock, minimumStock,
        status, description,
        createdAt: Date.now(),
      });
      showToast('Product added successfully.', 'success');
    }

    saveData();
    closeModal('prd-form-modal');
    applyFilters();
    renderKPIs();
  });

  document.getElementById('prd-form-cancel')?.addEventListener('click', () => closeModal('prd-form-modal'));
  document.getElementById('prd-form-close')?.addEventListener('click',  () => closeModal('prd-form-modal'));
}

function setFieldError(errId, fieldId, msg) {
  const errEl   = document.getElementById(errId);
  const fieldEl = document.getElementById(fieldId);
  if (errEl)   errEl.textContent = msg;
  if (fieldEl) fieldEl.classList.add('prd-error');
}

function clearFormErrors() {
  document.querySelectorAll('.prd-form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.prd-form-input').forEach(el => el.classList.remove('prd-error'));
}

// ============================================
// VIEW MODAL
// ============================================
function openViewModal(id) {
  const item = findItem(id);
  if (!item) return;

  const pStatus = getProductStatus(item);
  const content = document.getElementById('prd-view-content');
  if (!content) return;

  content.innerHTML = `
    <div class="prd-view-grid">
      <div class="prd-view-field prd-span-full">
        <div class="prd-view-label">Product Name</div>
        <div class="prd-view-value" style="font-size:15px">${escHtml(item.name)}</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">SKU</div>
        <div class="prd-view-value"><span class="prd-sku">${escHtml(item.sku)}</span></div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Category</div>
        <div class="prd-view-value"><span class="prd-category">${escHtml(item.category)}</span></div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Purchase Price</div>
        <div class="prd-view-value">${formatINR(item.purchasePrice)}</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Selling Price</div>
        <div class="prd-view-value">${formatINR(item.sellingPrice)}</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Current Stock</div>
        <div class="prd-view-value">${item.currentStock} units</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Minimum Stock</div>
        <div class="prd-view-value">${item.minimumStock || 0} units</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Status</div>
        <div class="prd-view-value"><span class="badge ${getProductStatusBadgeClass(pStatus)}">${pStatus}</span></div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Created</div>
        <div class="prd-view-value" style="font-weight:400;color:var(--color-text-secondary)">${formatDate(item.createdAt)}</div>
      </div>
      <div class="prd-view-field">
        <div class="prd-view-label">Last Updated</div>
        <div class="prd-view-value" style="font-weight:400;color:var(--color-text-secondary)">${formatDate(item.updatedAt) || '—'}</div>
      </div>
      ${item.description ? `<div class="prd-view-field" style="grid-column:1/-1">
        <div class="prd-view-label">Description</div>
        <div class="prd-view-desc">${escHtml(item.description)}</div>
      </div>` : ''}
    </div>
  `;

  document.getElementById('prd-view-edit-btn').dataset.id = item.id;
  openModal('prd-view-modal');
}

function initViewModal() {
  document.getElementById('prd-view-close')?.addEventListener('click',    () => closeModal('prd-view-modal'));
  document.getElementById('prd-view-close-btn')?.addEventListener('click', () => closeModal('prd-view-modal'));
  document.getElementById('prd-view-edit-btn')?.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    openEditModal(id);
  });
}

// ============================================
// DELETE MODAL
// ============================================
function openDeleteModal(id) {
  document.getElementById('prd-delete-item-id').value = id;
  openModal('prd-delete-modal');
}

function initDeleteModal() {
  document.getElementById('prd-delete-cancel')?.addEventListener('click', () => closeModal('prd-delete-modal'));
  document.getElementById('prd-delete-confirm')?.addEventListener('click', () => {
    const id = document.getElementById('prd-delete-item-id').value;
    productsData = productsData.filter(p => p.id !== id);
    saveData();
    closeModal('prd-delete-modal');
    applyFilters();
    renderKPIs();
    showToast('Product deleted successfully.', 'success');
  });
}

// ============================================
// EXPORT CSV
// ============================================
function initExport() {
  document.getElementById('prd-export-btn')?.addEventListener('click', () => {
    if (filteredData.length === 0) { showToast('No products to export.', 'warning'); return; }

    const headers = ['Name', 'SKU', 'Category', 'Purchase Price', 'Selling Price', 'Current Stock', 'Min Stock', 'Status', 'Description', 'Created'];
    const rows    = filteredData.map(p => [
      `"${p.name}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      p.purchasePrice,
      p.sellingPrice,
      p.currentStock,
      p.minimumStock || 0,
      `"${getProductStatus(p)}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      `"${formatDate(p.createdAt)}"`,
    ]);

    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'flowbase-products.csv';
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
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    if (!document.querySelector('.modal-overlay.open')) {
      document.body.style.overflow = '';
    }
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
      closeAllDropdowns();
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

  function openSidebar()  {
    sidebar.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
    if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
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
// LOGOUT
// ============================================
function initLogout() {
  const logoutBtn  = document.getElementById('logout-btn');
  const modal      = document.getElementById('logout-modal');
  const cancelBtn  = document.getElementById('logout-cancel');
  const confirmBtn = document.getElementById('logout-confirm');
  if (!logoutBtn || !modal) return;
  logoutBtn.addEventListener('click',   () => openModal('logout-modal'));
  cancelBtn?.addEventListener('click',  () => closeModal('logout-modal'));
  confirmBtn?.addEventListener('click', () => { closeModal('logout-modal'); showToast('Logged out successfully.', 'success'); });
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
  loadData();
  applyFilters();
  renderKPIs();

  initSidebar();
  initLogout();
  initSearchAndFilters();
  initAddProductBtn();
  initFormSubmit();
  initViewModal();
  initDeleteModal();
  initPagination();
  initTableActions();
  initExport();
  initModalOverlayClose();
  initEscClose();
});
