// ============================================
// FlowBase Products — products.js
// Connects to FastAPI Backend & Supabase DB
// ============================================

'use strict';

// ============================================
// CONSTANTS & STORAGE KEYS
// ============================================
const LS_INV_KEY = 'flowbase_inventory';
const LS_CAT_KEY = 'flowbase_categories';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Electronics', description: 'Gadgets, audio, keyboards, and accessories' },
  { id: 2, name: 'Accessories', description: 'Cables, chargers, adapters, and cases' },
  { id: 3, name: 'Grocery', description: 'Organic teas, snacks, and beverage goods' },
  { id: 4, name: 'Clothing', description: 'Apparel, cotton tees, and wearable merchandise' },
  { id: 5, name: 'Home & Living', description: 'Office desk items, bottles, and storage' }
];

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Wireless Bluetooth Earbuds', sku: 'PRD-001', category: 'Electronics', category_id: 1, purchasePrice: 650, sellingPrice: 1299, currentStock: 45, minimumStock: 10, status: 'active', description: 'Noise isolating in-ear earphones with charging case', createdAt: Date.now() - 30 * 86400000 },
  { id: 2, name: 'Mechanical RGB Keyboard', sku: 'PRD-002', category: 'Electronics', category_id: 1, purchasePrice: 1300, sellingPrice: 2499, currentStock: 28, minimumStock: 8, status: 'active', description: 'Blue-switch tactile mechanical backlit keyboard', createdAt: Date.now() - 25 * 86400000 },
  { id: 3, name: 'Ergonomic Office Mouse', sku: 'PRD-003', category: 'Electronics', category_id: 1, purchasePrice: 450, sellingPrice: 899, currentStock: 6, minimumStock: 10, status: 'active', description: 'Silent click 2.4GHz wireless optical mouse', createdAt: Date.now() - 20 * 86400000 },
  { id: 4, name: 'Ultra-Slim Power Bank 10000mAh', sku: 'PRD-004', category: 'Accessories', category_id: 2, purchasePrice: 370, sellingPrice: 749, currentStock: 0, minimumStock: 10, status: 'active', description: 'Dual USB output fast power bank with LED gauge', createdAt: Date.now() - 15 * 86400000 },
  { id: 5, name: 'USB-C Fast Charging Cable 2m', sku: 'PRD-005', category: 'Accessories', category_id: 2, purchasePrice: 120, sellingPrice: 299, currentStock: 120, minimumStock: 25, status: 'active', description: 'Durable nylon braided 60W power delivery cable', createdAt: Date.now() - 10 * 86400000 },
  { id: 6, name: 'Organic Green Tea 250g', sku: 'PRD-006', category: 'Grocery', category_id: 3, purchasePrice: 180, sellingPrice: 320, currentStock: 50, minimumStock: 12, status: 'active', description: 'Single estate whole leaf green tea', createdAt: Date.now() - 8 * 86400000 },
  { id: 7, name: 'Heavyweight Cotton T-Shirt', sku: 'PRD-007', category: 'Clothing', category_id: 4, purchasePrice: 280, sellingPrice: 599, currentStock: 40, minimumStock: 10, status: 'active', description: '100% bio-washed breathable crew neck tee', createdAt: Date.now() - 5 * 86400000 },
  { id: 8, name: 'Stainless Steel Water Bottle 1L', sku: 'PRD-008', category: 'Home & Living', category_id: 5, purchasePrice: 220, sellingPrice: 450, currentStock: 30, minimumStock: 8, status: 'active', description: '24hr cold / 12hr hot vacuum insulated flask', createdAt: Date.now() - 2 * 86400000 }
];

// ============================================
// STATE
// ============================================
let productsData   = [];
let filteredData   = [];
let categoriesData = [];
let currentPage    = 1;
let pageSize       = 10;
let currentSort    = { key: 'name', order: 'asc' };
let activeDropdownId = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initAuthGuard === 'function') {
    initAuthGuard();
  }

  initAppShell();
  initSearchAndFilters();
  initProductForm();
  initCategoryManager();
  initDeleteModal();
  initTableActions();
  initPagination();
  initExport();

  await loadData();
});

// ============================================
// LOAD PRODUCTS & CATEGORIES
// ============================================
async function loadData() {
  const shopId = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;

  // 1. Load from local cache first for instant rendering
  try {
    const cachedC = localStorage.getItem(LS_CAT_KEY);
    categoriesData = cachedC ? JSON.parse(cachedC) : [...DEFAULT_CATEGORIES];
    const cachedP = localStorage.getItem(LS_INV_KEY);
    productsData = cachedP ? JSON.parse(cachedP) : [...DEFAULT_PRODUCTS];
  } catch (_) {
    categoriesData = [...DEFAULT_CATEGORIES];
    productsData = [...DEFAULT_PRODUCTS];
  }

  updateCategoryDropdowns();
  applyFilters();
  renderKPIs();

  // 2. Fetch live data from FastAPI Backend if connected
  if (shopId) {
    try {
      const [rawProducts, rawCats] = await Promise.all([
        apiRequest(`/shops/${shopId}/products`).catch(() => null),
        apiRequest(`/shops/${shopId}/categories`).catch(() => null),
      ]);

      if (Array.isArray(rawCats) && rawCats.length > 0) {
        categoriesData = rawCats;
        localStorage.setItem(LS_CAT_KEY, JSON.stringify(categoriesData));
      }

      const catMap = {};
      categoriesData.forEach(c => { catMap[c.id] = c.name; });

      if (Array.isArray(rawProducts) && rawProducts.length > 0) {
        productsData = rawProducts.map(p => {
          const stock = Number(p.stock_quantity || 0);
          const minStock = Number(p.low_stock_threshold || 5);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku || `PRD-${String(p.id).padStart(3, '0')}`,
            category: (p.category_id && catMap[p.category_id]) ? catMap[p.category_id] : (p.category || 'General'),
            category_id: p.category_id || null,
            purchasePrice: Number(p.purchase_price || 0),
            sellingPrice: Number(p.selling_price || 0),
            currentStock: stock,
            minimumStock: minStock,
            status: stock > 0 ? 'active' : 'inactive',
            description: p.description || '',
            createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
          };
        });
        localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData));
      }

      updateCategoryDropdowns();
      applyFilters();
      renderKPIs();
    } catch (err) {
      console.warn('Backend products fetch notice:', err.message);
    }
  }
}

// ============================================
// CATEGORY DROPDOWNS & LIST
// ============================================
function updateCategoryDropdowns() {
  const filterSelect = document.getElementById('prd-filter-category');
  const formSelect   = document.getElementById('prd-field-category');

  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      categoriesData.map(c => `<option value="${escHtml(c.name)}">${escHtml(c.name)}</option>`).join('');
    filterSelect.value = currentVal;
  }

  if (formSelect) {
    const currentFormVal = formSelect.value;
    formSelect.innerHTML = '<option value="">Select category</option>' +
      categoriesData.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    formSelect.value = currentFormVal;
  }

  renderCategoryList();
}

function renderCategoryList() {
  const listEl = document.getElementById('category-items-list');
  if (!listEl) return;

  if (categoriesData.length === 0) {
    listEl.innerHTML = '<div style="padding:12px; color:var(--color-text-secondary); text-align:center; font-size:12px;">No categories created yet.</div>';
    return;
  }

  listEl.innerHTML = categoriesData.map(c => `
    <div class="category-item-row">
      <div class="category-item-info">
        <div class="category-item-name">${escHtml(c.name)}</div>
        <div class="category-item-desc">${escHtml(c.description || 'No description')}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="prd-action-btn" type="button" data-edit-cat="${c.id}" style="font-size:11px; padding:3px 7px;">Edit</button>
        <button class="prd-action-btn" type="button" data-delete-cat="${c.id}" style="font-size:11px; padding:3px 7px; color:var(--color-danger); border-color:var(--color-danger);">Delete</button>
      </div>
    </div>
  `).join('');
}

function initCategoryManager() {
  document.getElementById('manage-categories-btn')?.addEventListener('click', () => {
    renderCategoryList();
    openModal('category-manage-modal');
  });

  document.getElementById('cat-manage-close')?.addEventListener('click', () => closeModal('category-manage-modal'));
  document.getElementById('cat-manage-close-btn')?.addEventListener('click', () => closeModal('category-manage-modal'));

  // Add Category form
  const addForm = document.getElementById('cat-add-form');
  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-cat-name');
    const descInput = document.getElementById('new-cat-desc');
    const name = nameInput ? nameInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';

    if (!name) return;

    const shopId = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;

    try {
      if (shopId) {
        const created = await apiRequest(`/shops/${shopId}/categories`, {
          method: 'POST',
          body: { name, description: desc }
        });
        if (created) categoriesData.push(created);
      } else {
        categoriesData.push({ id: Date.now(), name, description: desc });
      }

      localStorage.setItem(LS_CAT_KEY, JSON.stringify(categoriesData));
      updateCategoryDropdowns();
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      showToast('Category created successfully!', 'success');
      renderKPIs();
    } catch (err) {
      console.error('Failed to create category:', err);
      showToast(err.message || 'Failed to create category', 'danger');
    }
  });

  // Edit / Delete in category list
  document.getElementById('category-items-list')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit-cat]');
    if (editBtn) {
      const catId = parseInt(editBtn.dataset.editCat, 10);
      const cat = categoriesData.find(c => c.id === catId);
      if (cat) {
        document.getElementById('edit-cat-id').value = cat.id;
        document.getElementById('edit-cat-name').value = cat.name;
        document.getElementById('edit-cat-desc').value = cat.description || '';
        openModal('category-edit-modal');
      }
      return;
    }

    const delBtn = e.target.closest('[data-delete-cat]');
    if (delBtn) {
      const catId = parseInt(delBtn.dataset.deleteCat, 10);
      const shopId = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;

      if (!confirm('Are you sure you want to delete this category?')) return;

      try {
        if (shopId) {
          await apiRequest(`/shops/${shopId}/categories/${catId}`, { method: 'DELETE' });
        }
        categoriesData = categoriesData.filter(c => c.id !== catId);
        localStorage.setItem(LS_CAT_KEY, JSON.stringify(categoriesData));
        updateCategoryDropdowns();
        showToast('Category deleted', 'success');
        renderKPIs();
      } catch (err) {
        console.error('Failed to delete category:', err);
        showToast(err.message || 'Failed to delete category', 'danger');
      }
    }
  });

  // Edit category form submit
  document.getElementById('cat-edit-close')?.addEventListener('click', () => closeModal('category-edit-modal'));
  document.getElementById('edit-cat-cancel')?.addEventListener('click', () => closeModal('category-edit-modal'));
  document.getElementById('cat-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const shopId = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;
    const catId = parseInt(document.getElementById('edit-cat-id').value, 10);
    const name = document.getElementById('edit-cat-name').value.trim();
    const desc = document.getElementById('edit-cat-desc').value.trim();

    if (!name || !catId) return;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/categories/${catId}`, {
          method: 'PATCH',
          body: { name, description: desc }
        });
      }

      const idx = categoriesData.findIndex(c => c.id === catId);
      if (idx !== -1) {
        categoriesData[idx].name = name;
        categoriesData[idx].description = desc;
        localStorage.setItem(LS_CAT_KEY, JSON.stringify(categoriesData));
      }

      updateCategoryDropdowns();
      closeModal('category-edit-modal');
      showToast('Category updated', 'success');
    } catch (err) {
      console.error('Failed to update category:', err);
      showToast(err.message || 'Failed to update category', 'danger');
    }
  });
}

// ============================================
// KPI CARDS RENDER
// ============================================
function renderKPIs() {
  const total     = productsData.length;
  const catsCount = categoriesData.length || new Set(productsData.map(p => p.category)).size;
  const lowStock  = productsData.filter(p => {
    const s = getStockStatus(p);
    return s === 'Low Stock';
  }).length;
  const outStock  = productsData.filter(p => {
    const s = getStockStatus(p);
    return s === 'Out of Stock';
  }).length;

  const totalEl    = document.getElementById('kpi-val-total');
  const catEl      = document.getElementById('kpi-val-categories');
  const lowEl      = document.getElementById('kpi-val-lowstock');
  const outEl      = document.getElementById('kpi-val-outstock');

  if (totalEl) totalEl.textContent = total.toLocaleString('en-IN');
  if (catEl)   catEl.textContent   = catsCount.toLocaleString('en-IN');
  if (lowEl)   lowEl.textContent   = lowStock.toLocaleString('en-IN');
  if (outEl)   outEl.textContent   = outStock.toLocaleString('en-IN');
}

// ============================================
// FILTERS & SEARCH
// ============================================
function initSearchAndFilters() {
  const searchInput  = document.getElementById('prd-search-input');
  const catFilter    = document.getElementById('prd-filter-category');
  const stockFilter  = document.getElementById('prd-filter-stock');
  const sortFilter   = document.getElementById('prd-filter-sort');
  const clearBtn     = document.getElementById('prd-clear-filters-btn');

  searchInput?.addEventListener('input', () => { currentPage = 1; applyFilters(); });
  catFilter?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  stockFilter?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  sortFilter?.addEventListener('change', () => {
    const val = sortFilter.value;
    if (val === 'name-asc') currentSort = { key: 'name', order: 'asc' };
    else if (val === 'name-desc') currentSort = { key: 'name', order: 'desc' };
    else if (val === 'price-asc') currentSort = { key: 'sellingPrice', order: 'asc' };
    else if (val === 'price-desc') currentSort = { key: 'sellingPrice', order: 'desc' };
    else if (val === 'stock-asc') currentSort = { key: 'currentStock', order: 'asc' };
    else if (val === 'stock-desc') currentSort = { key: 'currentStock', order: 'desc' };
    applyFilters();
  });

  clearBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (catFilter) catFilter.value = '';
    if (stockFilter) stockFilter.value = '';
    if (sortFilter) sortFilter.value = 'name-asc';
    currentSort = { key: 'name', order: 'asc' };
    currentPage = 1;
    applyFilters();
  });

  // Table header click-to-sort
  document.querySelectorAll('.prd-th-sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.dataset.sort;
      if (!sortKey) return;
      if (currentSort.key === sortKey) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.key = sortKey;
        currentSort.order = 'asc';
      }
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = document.getElementById('prd-search-input')?.value.trim().toLowerCase() || '';
  const cat   = document.getElementById('prd-filter-category')?.value || '';
  const stock = document.getElementById('prd-filter-stock')?.value || '';

  filteredData = productsData.filter(p => {
    // Search
    if (query) {
      const name = (p.name || '').toLowerCase();
      const sku  = (p.sku || '').toLowerCase();
      const c    = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (!name.includes(query) && !sku.includes(query) && !c.includes(query) && !desc.includes(query)) {
        return false;
      }
    }
    // Category filter
    if (cat && p.category !== cat) {
      return false;
    }
    // Stock status filter
    if (stock) {
      const status = getStockStatus(p);
      if (status !== stock) return false;
    }
    return true;
  });

  // Sort
  filteredData.sort((a, b) => {
    let valA = a[currentSort.key];
    let valB = b[currentSort.key];

    if (typeof valA === 'string') {
      const cmp = valA.localeCompare(valB);
      return currentSort.order === 'asc' ? cmp : -cmp;
    }
    valA = Number(valA || 0);
    valB = Number(valB || 0);
    return currentSort.order === 'asc' ? valA - valB : valB - valA;
  });

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
    const hasFilter = q || document.getElementById('prd-filter-category')?.value || document.getElementById('prd-filter-stock')?.value;

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="prd-empty-state">
            <div class="prd-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div class="prd-empty-title">${hasFilter ? 'No matching products' : 'No products in catalog'}</div>
            <div class="prd-empty-desc">${hasFilter ? 'Try clearing your search or adjusting filters.' : 'Add your first product to start managing inventory and sales.'}</div>
            ${!hasFilter ? `
              <button class="btn prd-btn-primary" type="button" onclick="openAddProductModal()" style="margin-top:8px;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Product
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const page  = filteredData.slice(start, start + pageSize);

  tbody.innerHTML = page.map(item => {
    const status     = getStockStatus(item);
    const badgeClass = getStockBadgeClass(status);
    const numClass   = status === 'Out of Stock' ? 'danger' : (status === 'Low Stock' ? 'warning' : '');

    return `
      <tr>
        <td>
          <div class="product-name" style="cursor:pointer;" onclick="openViewModal('${item.id}')">${escHtml(item.name)}</div>
        </td>
        <td><span class="prd-sku">${escHtml(item.sku)}</span></td>
        <td><span class="prd-category">${escHtml(item.category)}</span></td>
        <td class="text-right text-mono text-muted">${formatINR(item.purchasePrice)}</td>
        <td class="text-right text-mono font-medium">${formatINR(item.sellingPrice)}</td>
        <td class="text-right text-mono"><span class="prd-stock-num ${numClass}">${item.currentStock}</span></td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td class="text-right" style="padding-right:20px;">
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
// TABLE ACTIONS & DROPDOWNS
// ============================================
function initTableActions() {
  document.getElementById('products-tbody')?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-dropdown]');
    if (toggleBtn) {
      const id = toggleBtn.dataset.toggleDropdown;
      const dd = document.getElementById(`prd-dropdown-${id}`);
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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.prd-actions-wrap')) {
      closeAllDropdowns();
    }
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.prd-dropdown.open').forEach(dd => dd.classList.remove('open'));
  document.querySelectorAll('[data-toggle-dropdown]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  activeDropdownId = null;
}

// ============================================
// PAGINATION
// ============================================
function initPagination() {
  document.getElementById('prd-prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      renderPagination();
    }
  });

  document.getElementById('prd-next-page-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      renderPagination();
    }
  });

  document.getElementById('prd-page-size')?.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10) || 10;
    currentPage = 1;
    renderTable();
    renderPagination();
  });
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const start = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, filteredData.length);

  const infoEl  = document.getElementById('prd-pagination-info');
  const numsEl  = document.getElementById('prd-page-numbers');
  const prevBtn = document.getElementById('prd-prev-page-btn');
  const nextBtn = document.getElementById('prd-next-page-btn');

  if (infoEl) {
    infoEl.textContent = filteredData.length > 0
      ? `Showing ${start}–${end} of ${filteredData.length} products`
      : 'No products to display';
  }

  if (numsEl) {
    numsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.className = 'prd-page-num' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.type = 'button';
      btn.setAttribute('aria-label', `Page ${p}`);
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

// ============================================
// ADD / EDIT PRODUCT MODAL
// ============================================
function initProductForm() {
  const addBtn = document.getElementById('add-product-btn');
  addBtn?.addEventListener('click', openAddProductModal);

  const closeBtn = document.getElementById('prd-form-close');
  closeBtn?.addEventListener('click', () => closeModal('prd-form-modal'));

  const cancelBtn = document.getElementById('prd-form-cancel');
  cancelBtn?.addEventListener('click', () => closeModal('prd-form-modal'));

  const form = document.getElementById('prd-product-form');
  form?.addEventListener('submit', handleProductFormSubmit);
}

function openAddProductModal() {
  const modalTitle = document.getElementById('prd-modal-title');
  const submitBtn  = document.getElementById('prd-form-submit');
  if (modalTitle) modalTitle.textContent = 'Add Product';
  if (submitBtn)  submitBtn.textContent  = 'Add Product';

  document.getElementById('prd-field-id').value = '';
  document.getElementById('prd-field-name').value = '';
  document.getElementById('prd-field-sku').value = '';
  document.getElementById('prd-field-category').value = categoriesData[0]?.id || '';
  document.getElementById('prd-field-purchase-price').value = '';
  document.getElementById('prd-field-selling-price').value = '';
  document.getElementById('prd-field-stock').value = '0';
  document.getElementById('prd-field-min-stock').value = '5';
  document.getElementById('prd-field-description').value = '';

  clearFormErrors();
  openModal('prd-form-modal');
  document.getElementById('prd-field-name')?.focus();
}

function openEditModal(productId) {
  const item = productsData.find(p => String(p.id) === String(productId));
  if (!item) return;

  const modalTitle = document.getElementById('prd-modal-title');
  const submitBtn  = document.getElementById('prd-form-submit');
  if (modalTitle) modalTitle.textContent = 'Edit Product';
  if (submitBtn)  submitBtn.textContent  = 'Save Changes';

  document.getElementById('prd-field-id').value = item.id;
  document.getElementById('prd-field-name').value = item.name;
  document.getElementById('prd-field-sku').value = item.sku;
  document.getElementById('prd-field-category').value = item.category_id || (categoriesData.find(c => c.name === item.category)?.id || '');
  document.getElementById('prd-field-purchase-price').value = item.purchasePrice;
  document.getElementById('prd-field-selling-price').value = item.sellingPrice;
  document.getElementById('prd-field-stock').value = item.currentStock;
  document.getElementById('prd-field-min-stock').value = item.minimumStock;
  document.getElementById('prd-field-description').value = item.description || '';

  clearFormErrors();
  openModal('prd-form-modal');
  document.getElementById('prd-field-name')?.focus();
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const idVal         = document.getElementById('prd-field-id').value;
  const name          = document.getElementById('prd-field-name').value.trim();
  const sku           = document.getElementById('prd-field-sku').value.trim();
  const categoryIdVal = document.getElementById('prd-field-category').value;
  const purchasePrice = parseFloat(document.getElementById('prd-field-purchase-price').value);
  const sellingPrice  = parseFloat(document.getElementById('prd-field-selling-price').value);
  const stock         = parseInt(document.getElementById('prd-field-stock').value, 10) || 0;
  const minStock      = parseInt(document.getElementById('prd-field-min-stock').value, 10) || 5;
  const description   = document.getElementById('prd-field-description').value.trim();

  let hasError = false;
  if (!name) {
    showFormError('name', 'Product name is required');
    hasError = true;
  }
  if (!categoryIdVal) {
    showFormError('category', 'Please select a category');
    hasError = true;
  }
  if (isNaN(purchasePrice) || purchasePrice < 0) {
    showFormError('purchase-price', 'Enter a valid cost price');
    hasError = true;
  }
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    showFormError('selling-price', 'Enter a valid selling price');
    hasError = true;
  }

  if (hasError) return;

  const categoryId = parseInt(categoryIdVal, 10);
  const catObj     = categoriesData.find(c => c.id === categoryId);
  const catName    = catObj ? catObj.name : 'General';
  const shopId     = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;

  const payload = {
    name,
    category_id: categoryId,
    purchase_price: purchasePrice,
    selling_price: sellingPrice,
    stock_quantity: stock,
    low_stock_threshold: minStock,
    description: description || null,
  };

  try {
    if (idVal) {
      // EDIT
      const productId = parseInt(idVal, 10);
      if (shopId) {
        await apiRequest(`/shops/${shopId}/products/${productId}`, {
          method: 'PATCH',
          body: payload
        });
      }

      const idx = productsData.findIndex(p => String(p.id) === String(productId));
      if (idx !== -1) {
        productsData[idx] = {
          ...productsData[idx],
          name,
          sku: sku || productsData[idx].sku,
          category: catName,
          category_id: categoryId,
          purchasePrice,
          sellingPrice,
          currentStock: stock,
          minimumStock: minStock,
          description,
        };
      }
      showToast('Product updated successfully!', 'success');
    } else {
      // ADD
      let newId = Date.now();
      if (shopId) {
        const created = await apiRequest(`/shops/${shopId}/products`, {
          method: 'POST',
          body: payload
        });
        if (created && created.id) newId = created.id;
      }

      const newProduct = {
        id: newId,
        name,
        sku: sku || `PRD-${String(newId).slice(-3)}`,
        category: catName,
        category_id: categoryId,
        purchasePrice,
        sellingPrice,
        currentStock: stock,
        minimumStock: minStock,
        status: stock > 0 ? 'active' : 'inactive',
        description,
        createdAt: Date.now(),
      };

      productsData.unshift(newProduct);
      showToast('Product added successfully!', 'success');
    }

    localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData));
    closeModal('prd-form-modal');
    applyFilters();
    renderKPIs();
  } catch (err) {
    console.error('Save product error:', err);
    showToast(err.message || 'Failed to save product', 'danger');
  }
}

function clearFormErrors() {
  ['name', 'sku', 'category', 'purchase-price', 'selling-price', 'stock', 'min-stock'].forEach(k => {
    const el = document.getElementById(`prd-err-${k}`);
    if (el) el.textContent = '';
  });
}

function showFormError(fieldKey, message) {
  const el = document.getElementById(`prd-err-${fieldKey}`);
  if (el) el.textContent = message;
}

// ============================================
// VIEW PRODUCT MODAL
// ============================================
function openViewModal(productId) {
  const item = productsData.find(p => String(p.id) === String(productId));
  if (!item) return;

  const contentEl = document.getElementById('prd-view-content');
  if (!contentEl) return;

  const margin = item.sellingPrice > 0
    ? (((item.sellingPrice - item.purchasePrice) / item.sellingPrice) * 100).toFixed(1)
    : 0;
  const status = getStockStatus(item);
  const badgeClass = getStockBadgeClass(status);

  contentEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h3 style="font-size:16px; font-weight:700; color:var(--color-text); margin-bottom:4px;">${escHtml(item.name)}</h3>
        <span class="prd-sku" style="font-size:12px;">SKU: ${escHtml(item.sku)}</span>
      </div>
      <span class="badge ${badgeClass}">${status}</span>
    </div>

    <div class="prd-view-grid">
      <div class="prd-view-field">
        <span class="prd-view-label">Category</span>
        <span class="prd-view-value">${escHtml(item.category)}</span>
      </div>
      <div class="prd-view-field">
        <span class="prd-view-label">Profit Margin</span>
        <span class="prd-view-value" style="color:var(--color-success); font-weight:600;">${margin}% (₹${(item.sellingPrice - item.purchasePrice).toFixed(2)})</span>
      </div>
      <div class="prd-view-field">
        <span class="prd-view-label">Cost Price</span>
        <span class="prd-view-value text-mono">${formatINR(item.purchasePrice)}</span>
      </div>
      <div class="prd-view-field">
        <span class="prd-view-label">Selling Price</span>
        <span class="prd-view-value text-mono font-medium">${formatINR(item.sellingPrice)}</span>
      </div>
      <div class="prd-view-field">
        <span class="prd-view-label">Stock Quantity</span>
        <span class="prd-view-value text-mono font-medium">${item.currentStock} units</span>
      </div>
      <div class="prd-view-field">
        <span class="prd-view-label">Low Stock Threshold</span>
        <span class="prd-view-value text-mono">${item.minimumStock} units</span>
      </div>
    </div>

    ${item.description ? `
      <div class="prd-view-desc">
        <div style="font-weight:600; font-size:11px; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:4px;">Notes / Description</div>
        <div>${escHtml(item.description)}</div>
      </div>
    ` : ''}
  `;

  const editBtn = document.getElementById('prd-view-edit-btn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('prd-view-modal');
      openEditModal(item.id);
    };
  }

  const closeBtn = document.getElementById('prd-view-close');
  if (closeBtn) closeBtn.onclick = () => closeModal('prd-view-modal');

  const closeBtn2 = document.getElementById('prd-view-close-btn');
  if (closeBtn2) closeBtn2.onclick = () => closeModal('prd-view-modal');

  openModal('prd-view-modal');
}

// ============================================
// DELETE PRODUCT MODAL
// ============================================
function initDeleteModal() {
  document.getElementById('prd-delete-cancel')?.addEventListener('click', () => closeModal('prd-delete-modal'));
  document.getElementById('prd-delete-confirm')?.addEventListener('click', async () => {
    const idVal = document.getElementById('prd-delete-item-id').value;
    if (!idVal) return;

    const productId = parseInt(idVal, 10);
    const shopId = (typeof ensureActiveShop === 'function') ? await ensureActiveShop() : 1;

    try {
      if (shopId) {
        await apiRequest(`/shops/${shopId}/products/${productId}`, { method: 'DELETE' });
      }

      productsData = productsData.filter(p => String(p.id) !== String(productId));
      localStorage.setItem(LS_INV_KEY, JSON.stringify(productsData));

      closeModal('prd-delete-modal');
      showToast('Product deleted from catalog', 'success');
      applyFilters();
      renderKPIs();
    } catch (err) {
      console.error('Delete product error:', err);
      showToast(err.message || 'Failed to delete product', 'danger');
    }
  });
}

function openDeleteModal(productId) {
  const item = productsData.find(p => String(p.id) === String(productId));
  if (!item) return;

  document.getElementById('prd-delete-item-id').value = item.id;
  const descEl = document.getElementById('prd-delete-desc');
  if (descEl) {
    descEl.textContent = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  }
  openModal('prd-delete-modal');
}

// ============================================
// CSV EXPORT
// ============================================
function initExport() {
  document.getElementById('prd-export-btn')?.addEventListener('click', () => {
    if (filteredData.length === 0) {
      showToast('No products to export', 'warning');
      return;
    }

    const headers = ['ID', 'Product Name', 'SKU', 'Category', 'Cost Price (INR)', 'Selling Price (INR)', 'Current Stock', 'Min Stock Threshold', 'Stock Status'];
    const rows = filteredData.map(p => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      p.purchasePrice,
      p.sellingPrice,
      p.currentStock,
      p.minimumStock,
      `"${getStockStatus(p)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `flowbase_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Products catalog exported to CSV', 'success');
  });
}

// ============================================
// APP SHELL & UTILITIES
// ============================================
function initAppShell() {
  // Mobile Hamburger Toggle
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebar-overlay');

  hamburgerBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  });

  // Dark Theme Toggle
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('flowbase_theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  themeToggleBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('flowbase_theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('flowbase_theme', 'dark');
    }
  });

  // User Profile Modal
  const userBtn     = document.getElementById('header-user-btn');
  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-modal-close');
  const profileCloseBtn = document.getElementById('profile-close-btn');

  userBtn?.addEventListener('click', () => {
    try {
      const user = JSON.parse(localStorage.getItem('flowbase_user') || '{}');
      const prof = JSON.parse(localStorage.getItem('flowbase_profile') || '{}');
      const name = prof.name || user.name || 'Shop Admin';
      const email = user.email || prof.email || 'admin@flowbase.com';
      const role = prof.role || 'OWNER';

      const avatarEl = document.getElementById('modal-user-avatar');
      const nameEl   = document.getElementById('modal-user-name');
      const emailEl  = document.getElementById('modal-user-email');
      const roleEl   = document.getElementById('modal-user-role');

      if (avatarEl) avatarEl.textContent = name.slice(0, 2).toUpperCase();
      if (nameEl)   nameEl.textContent   = name;
      if (emailEl)  emailEl.textContent  = email;
      if (roleEl)   roleEl.textContent   = role;
    } catch (_) {}
    openModal('profile-modal');
  });

  profileClose?.addEventListener('click', () => closeModal('profile-modal'));
  profileCloseBtn?.addEventListener('click', () => closeModal('profile-modal'));

  // Logout Modal
  const logoutBtn       = document.getElementById('logout-btn');
  const profileLogoutBtn = document.getElementById('profile-logout-btn');
  const logoutCancel    = document.getElementById('logout-cancel');
  const logoutConfirm   = document.getElementById('logout-confirm');

  const triggerLogout = () => {
    closeModal('profile-modal');
    openModal('logout-modal');
  };

  logoutBtn?.addEventListener('click', triggerLogout);
  profileLogoutBtn?.addEventListener('click', triggerLogout);
  logoutCancel?.addEventListener('click', () => closeModal('logout-modal'));

  logoutConfirm?.addEventListener('click', () => {
    if (typeof handleLogout === 'function') {
      handleLogout();
    } else {
      localStorage.removeItem('flowbase_access_token');
      localStorage.removeItem('flowbase_refresh_token');
      localStorage.removeItem('flowbase_user');
      window.location.href = 'login.html';
    }
  });

  // Modal backdrop click close
  document.querySelectorAll('.modal-overlay').forEach(overlayEl => {
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        overlayEl.classList.remove('open');
      }
    });
  });
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('open');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('open');
}

// ============================================
// HELPERS
// ============================================
function getStockStatus(item) {
  const stock = Number(item.currentStock || 0);
  const min   = Number(item.minimumStock || 5);
  if (stock <= 0) return 'Out of Stock';
  if (stock <= min) return 'Low Stock';
  return 'In Stock';
}

function getStockBadgeClass(status) {
  if (status === 'In Stock') return 'badge-success';
  if (status === 'Low Stock') return 'badge-warning';
  return 'badge-danger';
}

function formatINR(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast-${type}` : ''}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
