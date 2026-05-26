document.addEventListener('DOMContentLoaded', () => {
  // SECURE SESSION VALIDATION & FILE PROTOCOL SANDBOX BYPASS
  let session = JSON.parse(sessionStorage.getItem('saas_session'));

  if (!session) {
    if (window.location.protocol === 'file:') {
      // Auto-authenticate locally to bypass browser sandboxing restrictions
      session = {
        email: 'admin@saaspro.com',
        role: 'Administrador',
        name: 'Carlos Mendoza (Modo Archivo)',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem('saas_session', JSON.stringify(session));

      // Inject sleek notice banner
      const banner = document.createElement('div');
      banner.className = "bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-center py-1.5 px-4 text-xs font-semibold select-none flex items-center justify-center space-x-2 relative z-50 flex-shrink-0";
      banner.innerHTML = `
        <svg class="w-4 h-4 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Ejecutando en Modo Local (Archivo). Sesión de administrador simulada para evitar bloqueos por restricciones del sandbox del navegador.</span>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      window.location.href = 'index.html';
      return;
    }
  }

  if (session.role === 'Cajero') {
    window.location.href = 'pos.html';
    return;
  }

  window.SaaSDB.setLocale(session.localeId);


  // PREFILL PROFILE INFORMATION
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarEl = document.getElementById('user-avatar');
  const welcomeGreetingEl = document.getElementById('welcome-greeting');

  userNameEl.textContent = session.name || 'Administrador';
  userRoleEl.textContent = session.role || 'ADMINISTRADOR';
  
  if (session.name) {
    const parts = session.name.split(' ');
    const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    userAvatarEl.textContent = initials;
  }

  const hour = new Date().getHours();
  let timeGreeting = 'Buenos días';
  if (hour >= 12 && hour < 20) timeGreeting = 'Buenas tardes';
  if (hour >= 20 || hour < 5) timeGreeting = 'Buenas noches';
  welcomeGreetingEl.textContent = `¡${timeGreeting}, ${session.name.split(' ')[0]}! Aquí está el rendimiento comercial de hoy.`;

  // LOCALE SWITCHER (For Administrador)
  const localeSwitcher = document.getElementById('locale-switcher');
  if (session.role === 'Administrador' && localeSwitcher) {
    const allLocales = window.SaaSDB.getLocales();
    const myLocales = allLocales.filter(l => l.clientId === session.clientId);
    
    // Global Option
    const optGlobal = document.createElement('option');
    optGlobal.value = 'GLOBAL';
    optGlobal.textContent = 'Visión Global (Consolidado)';
    if (session.localeId === 'GLOBAL') optGlobal.selected = true;
    localeSwitcher.appendChild(optGlobal);

    // Specific Locales
    myLocales.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.name} (${l.id})`;
      if (session.localeId === l.id) opt.selected = true;
      localeSwitcher.appendChild(opt);
    });

    localeSwitcher.classList.remove('hidden');

    localeSwitcher.addEventListener('change', (e) => {
      session.localeId = e.target.value;
      sessionStorage.setItem('saas_session', JSON.stringify(session));
      window.location.reload();
    });
  }

  // LOGOUT HANDLER
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('saas_session');
    window.location.href = 'index.html';
  });

  // DB RESET HANDLER
  document.getElementById('reset-db-btn').addEventListener('click', () => {
    if (confirm('¿Está seguro de que desea restablecer los datos de demostración? Se borrarán las ventas nuevas.')) {
      window.SaaSDB.resetDB();
      calculateAndRenderDashboard();
    }
  });

  // FIXED OPERATIVE COST EDIT CONTROLLER
  const fixedCostInput = document.getElementById('fixed-cost-input');
  const saveFixedCostBtn = document.getElementById('save-fixed-cost-btn');

  // Fill default input fixed costs on start
  fixedCostInput.value = window.SaaSDB.getFixedCosts();

  saveFixedCostBtn.addEventListener('click', () => {
    const cost = parseFloat(fixedCostInput.value);
    if (!isNaN(cost) && cost >= 0) {
      window.SaaSDB.setFixedCosts(cost);
      alert('Gastos operativos fijos actualizados.');
      calculateAndRenderDashboard();
    } else {
      alert('Por favor ingrese un valor de costo válido.');
    }
  });

  // GLOBAL VARIABLES FOR CHARTS
  let trendChart = null;
  let profitabilityChart = null;

  // LISTEN TO DATABASE EVENTS
  window.addEventListener('saas_db_update', () => {
    calculateAndRenderDashboard();
  });

  // MAIN RUN
  calculateAndRenderDashboard();

  // CALCULATIONS & RENDERING
  function calculateAndRenderDashboard() {
    const products = window.SaaSDB.getProducts();
    const sales = window.SaaSDB.getSales();
    const fixedMonthlyCost = window.SaaSDB.getFixedCosts();

    // Fill the input box again to keep synchronized
    fixedCostInput.value = fixedMonthlyCost;

    // 1. Calculate General Metrics
    let totalSales = 0;
    let totalCogs = 0;
    
    sales.forEach(sale => {
      totalSales += sale.total;
      sale.items.forEach(item => {
        totalCogs += (item.cost || 0) * (item.quantity || 1);
      });
    });

    const uniqueMonths = new Set();
    sales.forEach(sale => {
      const dateStr = sale.date || new Date().toISOString();
      uniqueMonths.add(dateStr.substring(0, 7)); // 'YYYY-MM'
    });
    const monthsCount = Math.max(1, uniqueMonths.size);
    const totalFixedCosts = fixedMonthlyCost * monthsCount;
    
    const netProfit = totalSales - totalCogs - totalFixedCosts;
    const netMarginPercentage = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    let inventoryValue = 0;
    products.forEach(p => {
      inventoryValue += (p.stock || 0) * (p.cost || 0);
    });

    // Write DOM values
    document.getElementById('metric-gross-revenue').textContent = formatCurrency(totalSales);
    document.getElementById('metric-cogs').textContent = formatCurrency(totalCogs);
    
    const netProfitEl = document.getElementById('metric-net-profit');
    netProfitEl.textContent = formatCurrency(netProfit);
    if (netProfit < 0) {
      netProfitEl.className = "text-3xl font-extrabold tracking-tight text-rose-400";
    } else {
      netProfitEl.className = "text-3xl font-extrabold tracking-tight text-emerald-400";
    }

    const netPercentageEl = document.getElementById('metric-net-percentage');
    netPercentageEl.textContent = `${netMarginPercentage.toFixed(1)}%`;
    const netBadgeEl = document.getElementById('net-margin-badge');
    if (netMarginPercentage < 0) {
      netBadgeEl.className = "px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center space-x-1";
      netPercentageEl.previousElementSibling.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      `;
    } else {
      netBadgeEl.className = "px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center space-x-1";
      netPercentageEl.previousElementSibling.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      `;
    }

    document.getElementById('metric-inventory-value').textContent = formatCurrency(inventoryValue);
    document.getElementById('fixed-cost-label').textContent = `Deducido Costo Fijo ($${fixedMonthlyCost}/mes)`;

    // 2. Prepare Line Chart
    const monthlyData = {};
    const monthNames = {
      '12': 'Dic', '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May',
      '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov'
    };

    const sortedMonthsKeys = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = d.toISOString().substring(0, 7);
      sortedMonthsKeys.push(k);
      monthlyData[k] = { label: `${monthNames[k.substring(5, 7)]} ${k.substring(2, 4)}`, sales: 0, costs: 0 };
    }

    sales.forEach(sale => {
      const dateStr = sale.date || new Date().toISOString();
      const monthKey = dateStr.substring(0, 7);
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].sales += sale.total;
        sale.items.forEach(item => {
          monthlyData[monthKey].costs += (item.cost || 0) * (item.quantity || 1);
        });
      }
    });

    sortedMonthsKeys.forEach(k => {
      if (monthlyData[k].sales > 0 || monthlyData[k].costs > 0) {
        monthlyData[k].costs += fixedMonthlyCost;
      }
    });

    const labels = sortedMonthsKeys.map(k => monthlyData[k].label);
    const revenueSeries = sortedMonthsKeys.map(k => monthlyData[k].sales);
    const costSeries = sortedMonthsKeys.map(k => monthlyData[k].costs);

    renderLineChart(labels, revenueSeries, costSeries);

    // 3. Prepare Bar Chart
    const sortedProducts = [...products]
      .map(p => {
        const marginVal = p.price - p.cost;
        const marginPct = p.price > 0 ? (marginVal / p.price) * 100 : 0;
        return { ...p, marginVal, marginPct };
      })
      .sort((a, b) => b.marginVal - a.marginVal)
      .slice(0, 5);

    const prodNames = sortedProducts.map(p => p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1] || ''));
    const prodMargins = sortedProducts.map(p => p.marginVal);

    renderBarChart(prodNames, prodMargins);

    // 4. Populate Recent Sales Ledger
    populateRecentSales(sales);
  }

  function populateRecentSales(sales) {
    const recentSalesBody = document.getElementById('recent-sales-body');
    recentSalesBody.innerHTML = '';

    // Sort chronologically descending
    const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    if (sortedSales.length === 0) {
      recentSalesBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-5 py-8 text-center text-slate-500 font-semibold">
            No se han registrado transacciones comerciales aún.
          </td>
        </tr>
      `;
      return;
    }

    sortedSales.forEach(sale => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-900/30 transition-colors duration-150";

      // Date Format
      const saleDate = new Date(sale.date);
      const timeStr = saleDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const dateStr = saleDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

      // Product Summary string
      const productsStr = sale.items.map(item => `${item.name} (x${item.quantity})`).join(', ');

      // Payment Badge Style
      let payMethodStyle = 'bg-slate-800 text-slate-300 border border-slate-700/60';
      if (sale.paymentMethod === 'Efectivo') payMethodStyle = 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30';
      if (sale.paymentMethod === 'Tarjeta') payMethodStyle = 'bg-blue-950/20 text-blue-400 border border-blue-900/30';
      if (sale.paymentMethod === 'Transferencia') payMethodStyle = 'bg-cyan-950/20 text-cyan-400 border border-cyan-900/30';

      tr.innerHTML = `
        <td class="px-5 py-3.5 font-mono text-cyan-400 font-bold">${sale.id}</td>
        <td class="px-5 py-3.5 text-slate-400">${dateStr} - <span class="text-[10px] text-slate-500 font-medium">${timeStr}</span></td>
        <td class="px-5 py-3.5 font-bold text-slate-200 line-clamp-1 truncate max-w-xs" title="${productsStr}">${productsStr}</td>
        <td class="px-5 py-3.5 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${payMethodStyle}">${sale.paymentMethod}</span>
        </td>
        <td class="px-5 py-3.5 text-right font-black text-white">${formatCurrency(sale.total)}</td>
      `;

      recentSalesBody.appendChild(tr);
    });
  }

  // LINE CHART CONFIG
  function renderLineChart(labels, revenueData, costData) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
      trendChart.destroy();
    }

    const revenueGradient = ctx.createLinearGradient(0, 0, 0, 300);
    revenueGradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
    revenueGradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');

    const costGradient = ctx.createLinearGradient(0, 0, 0, 300);
    costGradient.addColorStop(0, 'rgba(244, 63, 94, 0.15)');
    costGradient.addColorStop(1, 'rgba(244, 63, 94, 0.01)');

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ingresos',
            data: revenueData,
            borderColor: '#06b6d4',
            borderWidth: 3,
            backgroundColor: revenueGradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#06b6d4',
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#ffffff'
          },
          {
            label: 'Costos Operativos',
            data: costData,
            borderColor: '#f43f5e',
            borderWidth: 2.5,
            backgroundColor: costGradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#f43f5e',
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#ffffff',
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 },
              callback: function(value) { return '$' + value; }
            },
            border: { dash: [5, 5] }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 }
            }
          }
        }
      }
    });
  }

  // BAR CHART CONFIG
  function renderBarChart(productNames, productMargins) {
    const ctx = document.getElementById('profitabilityChart').getContext('2d');
    
    if (profitabilityChart) {
      profitabilityChart.destroy();
    }

    const barGradient = ctx.createLinearGradient(0, 0, 300, 0);
    barGradient.addColorStop(0, 'rgba(6, 182, 212, 0.85)');
    barGradient.addColorStop(1, 'rgba(59, 130, 246, 0.85)');

    profitabilityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: productNames,
        datasets: [{
          data: productMargins,
          backgroundColor: barGradient,
          borderColor: 'rgba(6, 182, 212, 0.3)',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                return ` Margen Unitario: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10 },
              callback: function(value) { return '$' + value; }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#f1f5f9',
              font: { family: 'Outfit', size: 10, weight: '600' }
            }
          }
        }
      }
    });
  }

  // UTILITY CURRENCY FORMATTER
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
});
