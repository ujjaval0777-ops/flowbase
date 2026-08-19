// ============================================
// FlowBase Dashboard — dashboard.js
// ============================================

'use strict';

// --- Mock Data ---
const MOCK = {
  kpi: {
    todaySales:  18450,
    todayBills:  42,
    todayProfit: 4250,
    lowStock:    8,
    salesDelta:  12.4,
    billsDelta:  8.2,
    profitDelta: 10.6,
  },

  salesData: {
    '7days': [
      { label: 'Mon', value: 8200 },
      { label: 'Tue', value: 10400 },
      { label: 'Wed', value: 9800 },
      { label: 'Thu', value: 13200 },
      { label: 'Fri', value: 11500 },
      { label: 'Sat', value: 16800 },
      { label: 'Sun', value: 18450 },
    ],
    'today': [
      { label: '8am',  value: 1200 },
      { label: '9am',  value: 2450 },
      { label: '10am', value: 3800 },
      { label: '11am', value: 5200 },
      { label: '12pm', value: 7100 },
      { label: '1pm',  value: 9400 },
      { label: '2pm',  value: 11600 },
      { label: '3pm',  value: 14200 },
      { label: '4pm',  value: 16800 },
      { label: '5pm',  value: 18450 },
    ],
    '30days': [
      { label: 'Aug 1',  value: 9200 },
      { label: 'Aug 3',  value: 11400 },
      { label: 'Aug 5',  value: 8600 },
      { label: 'Aug 7',  value: 13200 },
      { label: 'Aug 9',  value: 10800 },
      { label: 'Aug 11', value: 15200 },
      { label: 'Aug 13', value: 12400 },
      { label: 'Aug 15', value: 17600 },
      { label: 'Aug 17', value: 14200 },
      { label: 'Aug 19', value: 18450 },
    ],
  },

  topProducts: [
    { name: 'Rice 5kg',          units: 128, revenue: 40960, profit: 5120 },
    { name: 'Cooking Oil 1L',    units: 96,  revenue: 12480, profit: 1920 },
    { name: 'Soap',              units: 74,  revenue: 2590,  profit: 740  },
    { name: 'Tea 500g',          units: 61,  revenue: 7320,  profit: 1220 },
    { name: 'Basmati Rice 1kg',  units: 54,  revenue: 8640,  profit: 1080 },
  ],

  lowStock: [
    { name: 'Cooking Oil 1L',  current: 7,  minimum: 10, status: 'low'      },
    { name: 'Sugar 1kg',       current: 4,  minimum: 10, status: 'critical' },
    { name: 'Tea 500g',        current: 6,  minimum: 8,  status: 'low'      },
    { name: 'Salt 1kg',        current: 3,  minimum: 8,  status: 'critical' },
    { name: 'Biscuits Parle-G',current: 12, minimum: 20, status: 'low'      },
  ],

  recentBills: [
    { no: '#10482', time: '10:42 AM', items: 6, amount: 850,  status: 'Completed' },
    { no: '#10481', time: '10:18 AM', items: 3, amount: 540,  status: 'Completed' },
    { no: '#10480', time: '09:56 AM', items: 4, amount: 1250, status: 'Completed' },
    { no: '#10479', time: '09:30 AM', items: 2, amount: 340,  status: 'Completed' },
    { no: '#10478', time: '09:14 AM', items: 7, amount: 1890, status: 'Completed' },
    { no: '#10477', time: '08:52 AM', items: 1, amount: 125,  status: 'Completed' },
  ],
};

// --- State ---
let salesChartInstance = null;
let currentFilter = 'today';

// --- Utility: format Indian currency ---
function formatINR(val) {
  return '₹' + val.toLocaleString('en-IN');
}

// --- Utility: get greeting based on current time ---
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// --- Utility: format today's date ---
function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ============================================
// RENDER: KPI Cards
// ============================================
function renderKPI() {
  const d = MOCK.kpi;

  const kpiConfig = [
    {
      id:    'kpi-sales',
      label: "Today's Sales",
      value: formatINR(d.todaySales),
      delta: `↑ ${d.salesDelta}%`,
      dir:   'up',
      cmp:   'from yesterday',
      icon:  'trending-up',
      iconClass: '',
    },
    {
      id:    'kpi-bills',
      label: "Bills Today",
      value: d.todayBills,
      delta: `↑ ${d.billsDelta}%`,
      dir:   'up',
      cmp:   'from yesterday',
      icon:  'receipt',
      iconClass: '',
    },
    {
      id:    'kpi-profit',
      label: "Today's Profit",
      value: formatINR(d.todayProfit),
      delta: `↑ ${d.profitDelta}%`,
      dir:   'up',
      cmp:   'from yesterday',
      icon:  'bar-chart',
      iconClass: '',
    },
    {
      id:    'kpi-stock',
      label: "Low Stock",
      value: `${d.lowStock} Products`,
      delta: 'Needs attention',
      dir:   'warn',
      cmp:   '',
      icon:  'alert-triangle',
      iconClass: 'danger',
    },
  ];

  kpiConfig.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    el.innerHTML = `
      <div class="kpi-card-header">
        <span class="kpi-label">${cfg.label}</span>
        <span class="kpi-icon ${cfg.iconClass}" aria-hidden="true">
          ${getIcon(cfg.icon)}
        </span>
      </div>
      <div class="kpi-value">${cfg.value}</div>
      <div class="kpi-footer">
        <span class="kpi-delta ${cfg.dir}" aria-label="${cfg.delta}">
          ${cfg.delta}
        </span>
        ${cfg.cmp ? `<span class="kpi-compare">${cfg.cmp}</span>` : ''}
      </div>
    `;
  });
}

// ============================================
// RENDER: Sales Chart
// ============================================
function renderSalesChart(filter) {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;

  const data = MOCK.salesData[filter] || MOCK.salesData['7days'];

  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);

  if (salesChartInstance) {
    salesChartInstance.destroy();
    salesChartInstance = null;
  }

  const ctx = canvas.getContext('2d');

  // Subtle green gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 220);
  gradient.addColorStop(0, 'rgba(26, 122, 74, 0.12)');
  gradient.addColorStop(1, 'rgba(26, 122, 74, 0.0)');

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sales (₹)',
        data: values,
        borderColor: '#1a7a4a',
        borderWidth: 2,
        pointBackgroundColor: '#1a7a4a',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        fill: true,
        backgroundColor: gradient,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c1c1e',
          titleColor: '#fff',
          bodyColor: '#d1d1d1',
          padding: 10,
          borderRadius: 6,
          displayColors: false,
          titleFont: { family: "'Inter', sans-serif", size: 12, weight: '500' },
          bodyFont:  { family: "'Inter', sans-serif", size: 13, weight: '600' },
          callbacks: {
            label: ctx => formatINR(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#9a9a9a',
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
        y: {
          grid: {
            color: '#ece9e3',
            drawBorder: false,
            lineWidth: 1,
          },
          border: { display: false, dash: [3, 3] },
          ticks: {
            color: '#9a9a9a',
            font: { family: "'Inter', sans-serif", size: 11 },
            maxTicksLimit: 5,
            callback: val => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val),
          },
        },
      },
    },
  });
}

// ============================================
// RENDER: Top Selling Products
// ============================================
function renderTopProducts() {
  const tbody = document.getElementById('top-products-body');
  if (!tbody) return;

  if (MOCK.topProducts.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="state-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>
          <div class="state-title">No products found</div>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = MOCK.topProducts.map((p, i) => `
    <tr>
      <td>
        <span class="product-name">${p.name}</span>
      </td>
      <td class="text-mono">${p.units}</td>
      <td class="text-mono">${formatINR(p.revenue)}</td>
      <td class="text-mono">${formatINR(p.profit)}</td>
    </tr>
  `).join('');
}

// ============================================
// RENDER: Low Stock
// ============================================
function renderLowStock() {
  const tbody = document.getElementById('low-stock-body');
  if (!tbody) return;

  if (MOCK.lowStock.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4">
        <div class="state-container">
          <div class="state-title">All products are adequately stocked</div>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = MOCK.lowStock.map(item => {
    const pct = Math.round((item.current / item.minimum) * 100);
    const fillPct = Math.min(pct, 100);
    const badgeClass = item.status === 'critical' ? 'badge-danger' : 'badge-warning';
    const badgeText  = item.status === 'critical' ? 'Critical' : 'Low Stock';

    return `
      <tr>
        <td><span class="product-name">${item.name}</span></td>
        <td class="text-mono">
          <div class="stock-bar-wrap">
            <span>${item.current}</span>
            <div class="stock-bar">
              <div class="stock-bar-fill" style="width:${fillPct}%"></div>
            </div>
          </div>
        </td>
        <td class="text-mono">${item.minimum}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
      </tr>
    `;
  }).join('');
}

// ============================================
// RENDER: Recent Bills
// ============================================
function renderRecentBills() {
  const tbody = document.getElementById('recent-bills-body');
  if (!tbody) return;

  if (MOCK.recentBills.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="state-container">
          <div class="state-title">No bills today</div>
          <div class="state-desc">Create your first bill to get started.</div>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = MOCK.recentBills.map(b => `
    <tr>
      <td><span class="bill-no">${b.no}</span></td>
      <td class="text-muted">${b.time}</td>
      <td>${b.items} item${b.items !== 1 ? 's' : ''}</td>
      <td class="text-mono">${formatINR(b.amount)}</td>
      <td><span class="badge badge-success">${b.status}</span></td>
    </tr>
  `).join('');
}

// ============================================
// SEARCH
// ============================================
function initSearch() {
  const input   = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  // Build searchable index from visible mock data
  const searchIndex = [
    ...MOCK.topProducts.map(p => ({ type: 'Product', name: p.name, meta: formatINR(p.revenue) })),
    ...MOCK.lowStock.map(p => ({ type: 'Low Stock', name: p.name, meta: `Stock: ${p.current}` })),
    ...MOCK.recentBills.map(b => ({ type: 'Bill', name: b.no, meta: formatINR(b.amount) })),
  ];

  function doSearch(q) {
    if (!q.trim()) {
      results.classList.remove('visible');
      return;
    }

    const lower = q.toLowerCase();
    const matches = searchIndex.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower)
    ).slice(0, 6);

    if (matches.length === 0) {
      results.innerHTML = `<div class="search-no-results">No results for "${q}"</div>`;
    } else {
      results.innerHTML = `
        <div class="search-results-header">Results</div>
        ${matches.map(m => `
          <div class="search-result-item" role="option">
            <div>
              <div class="search-result-name">${m.name}</div>
              <div class="search-result-meta">${m.type}</div>
            </div>
            <div class="search-result-meta">${m.meta}</div>
          </div>
        `).join('')}
      `;
    }
    results.classList.add('visible');
  }

  input.addEventListener('input', e => doSearch(e.target.value));

  // Close on outside click
  document.addEventListener('click', e => {
    if (!input.closest('.search-wrapper').contains(e.target)) {
      results.classList.remove('visible');
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) doSearch(input.value);
  });
}

// ============================================
// CHART FILTER BUTTONS
// ============================================
function initChartFilters() {
  const btns = document.querySelectorAll('.chart-filter-btn');

  // Sync initial state: read whichever button is already .active in HTML
  const initialActive = document.querySelector('.chart-filter-btn.active');
  if (initialActive) currentFilter = initialActive.dataset.filter;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.filter;
      renderSalesChart(currentFilter);
    });
  });
}

// ============================================
// SIDEBAR
// ============================================
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');

  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger && hamburger.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay && overlay.addEventListener('click', closeSidebar);

  // Close sidebar on nav item click on mobile
  const navItems = sidebar.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
}

// ============================================
// LOGOUT MODAL
// ============================================
function initLogout() {
  const logoutBtn    = document.getElementById('logout-btn');
  const modal        = document.getElementById('logout-modal');
  const cancelBtn    = document.getElementById('logout-cancel');
  const confirmBtn   = document.getElementById('logout-confirm');

  if (!logoutBtn || !modal) return;

  logoutBtn.addEventListener('click', () => {
    modal.classList.add('open');
  });

  cancelBtn && cancelBtn.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  confirmBtn && confirmBtn.addEventListener('click', () => {
    modal.classList.remove('open');
    // Clear demo session and redirect to login page
    try { localStorage.removeItem('flowbase_demo_session'); } catch(e) {}
    showToast('Logged out successfully.', 'success');
    setTimeout(() => window.location.href = 'login.html', 800);
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

// ============================================
// QUICK ACTIONS
// ============================================
function initQuickActions() {
  const actions = {
    'qa-new-bill':      () => showToast('Redirecting to New Bill...', 'success'),
    'qa-add-product':   () => showToast('Redirecting to Add Product...', 'success'),
    'qa-view-sales':    () => showToast('Redirecting to Sales...'),
    'qa-check-inventory': () => window.location.href = 'inventory.html',
    'view-inventory-link': () => window.location.href = 'inventory.html',
    'view-all-sales-link': () => showToast('Redirecting to All Sales...'),
  };

  Object.entries(actions).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    el && el.addEventListener('click', fn);
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

  const iconMap = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  toast.innerHTML = (iconMap[type] || iconMap.default) + `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ============================================
// WELCOME & DATE
// ============================================
function renderWelcome() {
  const greetEl = document.getElementById('welcome-greeting');
  const dateEl  = document.getElementById('welcome-date');
  if (greetEl) greetEl.textContent = `${getGreeting()}, Shop Admin`;
  if (dateEl)  dateEl.textContent  = formatDate();
}

// ============================================
// LOAD DATA from localStorage (or use defaults)
// ============================================
function loadData() {
  // Persist mock data to localStorage for reuse
  try {
    const stored = localStorage.getItem('flowbase_dashboard');
    if (!stored) {
      localStorage.setItem('flowbase_dashboard', JSON.stringify(MOCK));
    }
  } catch(e) {
    // localStorage unavailable — use in-memory MOCK data
  }
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderWelcome();
  renderKPI();
  renderTopProducts();
  renderLowStock();
  renderRecentBills();

  // Chart renders after DOM is ready
  requestAnimationFrame(() => {
    renderSalesChart(currentFilter);
  });

  initChartFilters();
  initSidebar();
  initLogout();
  initQuickActions();
  initSearch();
});

// ============================================
// ICON HELPER — minimal inline SVG icons
// ============================================
function getIcon(name) {
  const icons = {
    'trending-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    'receipt':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
    'bar-chart':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    'alert-triangle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    'dashboard':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    'billing':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
    'products':    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    'inventory':   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    'sales':       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    'settings':    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    'logout':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    'search':      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'bell':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    'plus':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'arrow-right': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    'menu':        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    'eye':         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    'box':         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    'flowbase-logo': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h3v3h-3v-3zm4 4h3v3h-3v-3zm-4 0h3v3h-3v-3z"/></svg>`,
  };
  return icons[name] || icons['box'];
}
