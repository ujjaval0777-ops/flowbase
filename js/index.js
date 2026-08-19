// ============================================
// FlowBase Landing Page — index.js
// ============================================

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initScrollReveals();
  initStatCounters();
  initDemoSimulation();
  initLandingChart();
  initSmoothScroll();
});

// ============================================
// NAVBAR SCROLL & BLUR EFFECT
// ============================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

// ============================================
// MOBILE DRAWER MENU
// ============================================
function initMobileDrawer() {
  const toggleBtn = document.getElementById('hamburger-toggle');
  const drawer    = document.getElementById('mobile-drawer');
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      drawer.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close drawer on link click
  const drawerLinks = drawer.querySelectorAll('a');
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================================
// INTERSECTION OBSERVER FOR SCROLL REVEALS
// ============================================
function initScrollReveals() {
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, unobserve to avoid re-animating unless desired
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

// ============================================
// ANIMATED NUMBER COUNTERS
// ============================================
function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(numEl => animateCounter(numEl));
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.getElementById('insights');
  if (statsSection) observer.observe(statsSection);
}

function animateCounter(el) {
  const target = parseFloat(el.getAttribute('data-target'));
  const prefix = el.getAttribute('data-prefix') || '';
  const suffix = el.getAttribute('data-suffix') || '';
  const duration = 1600; // ms
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quad formula
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const currentVal = target * easeProgress;

    if (target % 1 !== 0) {
      el.textContent = prefix + currentVal.toFixed(1) + suffix;
    } else {
      el.textContent = prefix + Math.floor(currentVal).toLocaleString() + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (target % 1 !== 0) {
        el.textContent = prefix + target.toFixed(1) + suffix;
      } else {
        el.textContent = prefix + target.toLocaleString() + suffix;
      }
    }
  }

  requestAnimationFrame(update);
}

// ============================================
// INTERACTIVE DEMO SIMULATION
// ============================================
function initDemoSimulation() {
  const stepBtns    = document.querySelectorAll('.demo-step-btn');
  const prodItem1   = document.getElementById('demo-prod-1');
  const prodItem2   = document.getElementById('demo-prod-2');
  const stockValEl  = document.getElementById('demo-stock-val');
  const billItemsEl = document.getElementById('demo-bill-items');
  const subtotalEl  = document.getElementById('demo-subtotal');
  const grandtotalEl= document.getElementById('demo-grandtotal');
  const checkoutBtn = document.getElementById('demo-checkout-btn');
  const statusText  = document.getElementById('demo-status-text');

  if (!stepBtns.length) return;

  let currentStep = 1;
  let stock = 15;

  function setStep(step) {
    currentStep = step;
    stepBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-demostep')) === step);
    });

    if (step === 1) {
      statusText.textContent = "Step 1: Select a product from the catalog (Basmati Rice 1kg selected).";
      prodItem1 && prodItem1.classList.add('active');
      prodItem2 && prodItem2.classList.remove('active');
      billItemsEl.innerHTML = `<div class="bill-empty-state">Product ready. Click Step 2 or Add to Bill.</div>`;
      subtotalEl.textContent = "₹0.00";
      grandtotalEl.textContent = "₹0.00";
    } else if (step === 2) {
      statusText.textContent = "Step 2: Item added to POS Terminal & Subtotal calculated.";
      prodItem1 && prodItem1.classList.add('active');
      billItemsEl.innerHTML = `
        <div class="pos-item" style="font-weight:600; color:var(--color-text);">
          <span>1x Basmati Rice 1kg</span>
          <span>₹160.00</span>
        </div>
      `;
      subtotalEl.textContent = "₹160.00";
      grandtotalEl.textContent = "₹160.00";
    } else if (step === 3) {
      statusText.textContent = "Step 3: Ready for checkout. Click 'Complete Transaction'.";
    } else if (step === 4) {
      stock = Math.max(0, stock - 1);
      if (stockValEl) stockValEl.textContent = stock;
      statusText.textContent = `Step 4: Transaction Complete! Stock decreased to ${stock}, ₹160 logged in Sales!`;
      billItemsEl.innerHTML = `
        <div style="text-align:center; color:var(--color-success); font-weight:700; padding:10px;">
          ✓ Transaction #10483 Saved Successfully!
        </div>
      `;
    }
  }

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseInt(btn.getAttribute('data-demostep'));
      setStep(step);
    });
  });

  checkoutBtn && checkoutBtn.addEventListener('click', () => {
    setStep(4);
  });
}

// ============================================
// LANDING ANALYTICS CHART (Chart.js)
// ============================================
function initLandingChart() {
  const canvas = document.getElementById('landingSalesChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');

  const chartData = {
    '7days': {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      sales:  [8200, 10400, 9800, 13200, 11500, 16800, 18450],
      profit: [2100, 2600,  2450, 3300,  2850,  4100,  4250],
    },
    '30days': {
      labels: ['Aug 1', 'Aug 5', 'Aug 9', 'Aug 13', 'Aug 17', 'Aug 21', 'Aug 25'],
      sales:  [45000, 52000, 48000, 64000, 59000, 71000, 84500],
      profit: [11200, 13000, 12000, 16000, 14750, 17750, 21100],
    },
    '90days': {
      labels: ['June', 'July', 'August'],
      sales:  [180000, 220000, 265000],
      profit: [45000,  55000,  66250],
    }
  };

  let currentPeriod = '7days';

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData[currentPeriod].labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: chartData[currentPeriod].sales,
          borderColor: '#1a7a4a',
          backgroundColor: 'rgba(26, 122, 74, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Profit (₹)',
          data: chartData[currentPeriod].profit,
          borderColor: '#0284c7',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          padding: 10,
          backgroundColor: '#1c1c1e',
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: '#ece9e3' },
          ticks: {
            callback: (val) => '₹' + val.toLocaleString()
          }
        }
      }
    }
  });

  // Filter tab buttons
  const filterTabs = document.querySelectorAll('.chart-filter-group .filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentPeriod = tab.getAttribute('data-period');
      if (chartData[currentPeriod]) {
        chart.data.labels = chartData[currentPeriod].labels;
        chart.data.datasets[0].data = chartData[currentPeriod].sales;
        chart.data.datasets[1].data = chartData[currentPeriod].profit;
        chart.update();
      }
    });
  });
}

// ============================================
// SMOOTH SCROLLING FOR NAV LINKS
// ============================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 70;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
