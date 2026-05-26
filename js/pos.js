document.addEventListener('DOMContentLoaded', () => {
  // SECURE SESSION VALIDATION & FILE PROTOCOL SANDBOX BYPASS
  let session = JSON.parse(sessionStorage.getItem('saas_session'));

  if (!session) {
    if (window.location.protocol === 'file:') {
      // Auto-authenticate locally to bypass browser sandboxing restrictions
      session = {
        email: 'cajero@saaspro.com',
        role: 'Cajero',
        name: 'Lucía Gómez (Modo Archivo)',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem('saas_session', JSON.stringify(session));

      // Inject notice banner at the top of the body
      const banner = document.createElement('div');
      banner.className = "bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-center py-1.5 px-4 text-xs font-semibold select-none flex items-center justify-center space-x-2 relative z-50 flex-shrink-0";
      banner.innerHTML = `
        <svg class="w-4 h-4 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Ejecutando en Modo Local (Archivo). Sesión de cajero auto-completada para evitar bloqueos del sandbox del navegador.</span>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      window.location.href = 'index.html';
      return;
    }
  }

  window.SaaSDB.setLocale(session.localeId);

  // ENFORCE ROLE ACCESS CONTROLS IN SIDEBAR (KIOSCO MODE)
  const posSidebar = document.getElementById('pos-sidebar');
  const headerLogoutBtn = document.getElementById('header-logout-btn');
  const navDashboard = document.getElementById('nav-dashboard');
  const navInventario = document.getElementById('nav-inventario');
  const lockDashboard = document.getElementById('lock-dashboard');
  const lockInventario = document.getElementById('lock-inventario');

  if (session.role === 'Cajero' || session.role === 'Vendedor') {
    // Hide entire sidebar for Kiosco Mode
    if (posSidebar) posSidebar.classList.add('hidden');
    if (headerLogoutBtn) headerLogoutBtn.classList.remove('hidden');
    
    // Prevent navigation attempts just in case
    if (navDashboard && navInventario) {
      [navDashboard, navInventario].forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
        });
      });
    }
  }

  // PREFILL PROFILE INFORMATION
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarEl = document.getElementById('user-avatar');
  const posCajaStatus = document.getElementById('pos-caja-status');

  userNameEl.textContent = session.name || 'Cajero';
  userRoleEl.textContent = session.role || 'CAJERO';
  posCajaStatus.textContent = `Caja abierta | Usuario: ${session.name.split(' ')[0]}`;

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

  if (session.name) {
    const parts = session.name.split(' ');
    const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    userAvatarEl.textContent = initials;
  }

  // LOGOUT HANDLER
  function performLogout() {
    sessionStorage.removeItem('saas_session');
    window.location.href = 'index.html';
  }
  const mainLogoutBtn = document.getElementById('logout-btn');
  if (mainLogoutBtn) mainLogoutBtn.addEventListener('click', performLogout);
  if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', performLogout);

  // DOM ELEMENTS
  const posSearch = document.getElementById('pos-search');
  const categoryFilterContainer = document.getElementById('category-filter-container');
  const posCatalogGrid = document.getElementById('pos-catalog-grid');
  const catalogEmptyState = document.getElementById('catalog-empty-state');
  
  const posCartItems = document.getElementById('pos-cart-items');
  const clearCartBtn = document.getElementById('clear-cart-btn');
  
  const posSubtotal = document.getElementById('pos-subtotal');
  const posDiscountInput = document.getElementById('pos-discount-input');
  const posDiscountContainer = document.getElementById('pos-discount-container');
  const posTax = document.getElementById('pos-tax');
  const posTotal = document.getElementById('pos-total');

  const checkoutPanel = document.getElementById('checkout-panel');
  const payMethodBtns = document.querySelectorAll('.pay-method-btn');
  const changeSection = document.getElementById('change-calculator-section');
  const posCashInput = document.getElementById('pos-cash-input');
  const posChangeOutput = document.getElementById('pos-change-output');
  const posConfirmBtn = document.getElementById('pos-confirm-btn');
  const btnIconConfirm = document.getElementById('btn-icon-confirm');
  const btnTextConfirm = document.getElementById('btn-text-confirm');
  const toastSuccess = document.getElementById('toast-success');

  // CAJERO SPECIFIC
  const cajeroScanContainer = document.getElementById('cajero-scan-container');
  const cajeroScanInput = document.getElementById('cajero-scan-input');

  // PRESALE MODAL ELEMENTS (VENDEDOR)
  const presaleModal = document.getElementById('presale-modal');
  const presaleIdDisplay = document.getElementById('presale-id-display');
  const presaleDoneBtn = document.getElementById('presale-done-btn');

  // RECEIPT MODAL ELEMENTS
  const receiptModal = document.getElementById('receipt-modal');
  const receiptId = document.getElementById('receipt-id');
  const receiptDate = document.getElementById('receipt-date');
  const receiptCashier = document.getElementById('receipt-cashier');
  const receiptItemsList = document.getElementById('receipt-items-list');
  
  const receiptSubtotal = document.getElementById('receipt-subtotal');
  const receiptDiscount = document.getElementById('receipt-discount');
  const receiptTax = document.getElementById('receipt-tax');
  const receiptTotal = document.getElementById('receipt-total');
  
  const receiptMethod = document.getElementById('receipt-method');
  const receiptCashRow = document.getElementById('receipt-cash-row');
  const receiptCashPaid = document.getElementById('receipt-cash-paid');
  const receiptChangeRow = document.getElementById('receipt-change-row');
  const receiptChangeGiven = document.getElementById('receipt-change-given');

  const receiptPrintBtn = document.getElementById('receipt-print-btn');
  const receiptDoneBtn = document.getElementById('receipt-done-btn');

  // STATE VARIABLES
  let cart = [];
  let activeCategory = 'Todos';
  let activePaymentMethod = 'Efectivo';
  let cartTotal = 0;
  let cartSubtotal = 0;
  let cartDiscountPct = 0;
  let cartTax = 0;
  let currentLoadedOrderId = null; // Track absorbed order ID for Cajero

  // ROLE SPECIFIC UI ADJUSTMENTS
  if (session.role === 'Vendedor') {
    // Hide payment & financial details
    if (posDiscountContainer) posDiscountContainer.classList.add('hidden');
    if (posTax) posTax.parentElement.classList.add('hidden');
    
    // Hide checkout methods & change calculator (keep confirm button)
    Array.from(checkoutPanel.children).forEach(child => {
      if (child.tagName !== 'BUTTON') {
        child.classList.add('hidden');
      }
    });

    // Change confirm button styling
    btnIconConfirm.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />`;
    btnTextConfirm.textContent = 'Generar Nota de Pedido';
  }

  if (session.role === 'Cajero') {
    if (cajeroScanContainer) cajeroScanContainer.classList.remove('hidden');
    
    // Listen for Order Scan
    cajeroScanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const orderId = cajeroScanInput.value.trim().toUpperCase();
        if (!orderId) return;
        
        const order = window.SaaSDB.getPendingOrder(orderId);
        if (order) {
          cart = [...order.items]; // Absorb order items into cart (overwrite or sum based on logic, let's overwrite for simplicity, or we can merge. Let's merge if there are existing items, actually replace is safer for a scan).
          currentLoadedOrderId = orderId;
          cajeroScanInput.value = '';
          updateCartDisplay();
          cajeroScanInput.blur();
          
          // Toast info
          alert(`Pedido ${orderId} cargado con éxito.`);
        } else {
          alert(`El pedido ${orderId} no existe o ya fue procesado.`);
        }
      }
    });
  }

  // LISTEN TO DATABASE EVENTS
  window.addEventListener('saas_db_update', () => {
    renderCatalog();
  });

  // INITIAL RUN
  renderCatalog();
  updateCartDisplay();

  // 1. PRODUCT CATALOG MANAGEMENT
  function renderCatalog() {
    const products = window.SaaSDB.getProducts();
    const query = posSearch.value.toLowerCase().trim();

    posCatalogGrid.innerHTML = '';

    const filteredProducts = products.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
      const matchCategory = activeCategory === 'Todos' || p.category === activeCategory;
      return matchQuery && matchCategory;
    });

    if (filteredProducts.length === 0) {
      catalogEmptyState.classList.remove('hidden');
    } else {
      catalogEmptyState.classList.add('hidden');

      filteredProducts.forEach(product => {
        const card = document.createElement('div');
        
        const isOutOfStock = product.stock <= 0;
        let stockDotColor = 'bg-emerald-400';
        let stockBadgeText = `Stock: ${product.stock}`;
        let stockBadgeClass = 'text-emerald-400 bg-emerald-950/20';

        if (isOutOfStock) {
          stockDotColor = 'bg-rose-400';
          stockBadgeText = 'Sin Stock';
          stockBadgeClass = 'text-rose-400 bg-rose-950/20 animate-pulse';
        } else if (product.stock < 5) {
          stockDotColor = 'bg-amber-400';
          stockBadgeText = `Stock: ${product.stock} (Crítico)`;
          stockBadgeClass = 'text-amber-400 bg-amber-950/20';
        }

        card.className = `glass-panel p-4 rounded-xl flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-200 select-none ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;
        
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/60 rounded font-semibold">${product.category}</span>
              <span class="text-[10px] font-mono text-slate-500 font-semibold">${product.sku}</span>
            </div>
            <h4 class="font-bold text-slate-100 text-sm mt-1 leading-snug line-clamp-2">${product.name}</h4>
          </div>
          
          <div class="mt-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-lg font-black text-cyan-400">${formatCurrency(product.price)}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${stockBadgeClass} flex items-center space-x-1">
                <span class="w-1.5 h-1.5 rounded-full ${stockDotColor}"></span>
                <span>${stockBadgeText}</span>
              </span>
            </div>
            <button class="add-to-cart-btn w-full py-2 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold rounded-lg text-xs transition-all duration-200" 
              ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Agotado' : 'Agregar'}
            </button>
          </div>
        `;

        if (!isOutOfStock) {
          card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
              addProductToCart(product);
            }
          });
          
          card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
            addProductToCart(product);
          });
        }

        posCatalogGrid.appendChild(card);
      });
    }
  }

  // FILTER CATEGORIES
  categoryFilterContainer.querySelectorAll('.category-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      categoryFilterContainer.querySelectorAll('.category-tag').forEach(t => {
        t.className = "category-tag px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-all duration-150";
      });
      tag.className = "category-tag px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-extrabold text-xs transition-all duration-150 shadow-md shadow-cyan-500/10";
      
      activeCategory = tag.getAttribute('data-category');
      renderCatalog();
    });
  });

  posSearch.addEventListener('input', () => {
    renderCatalog();
  });

  // 2. SHOPPING CART LOGIC
  function addProductToCart(product) {
    const existing = cart.find(item => item.sku === product.sku);
    
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`No hay stock suficiente. Solo quedan ${product.stock} unidades en existencia.`);
        return;
      }
      existing.quantity++;
    } else {
      cart.push({
        sku: product.sku,
        name: product.name,
        price: product.price,
        cost: product.cost,
        quantity: 1,
        maxStock: product.stock
      });
    }
    
    updateCartDisplay();
  }

  function changeQuantity(sku, delta) {
    const item = cart.find(item => item.sku === sku);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty > item.maxStock) {
      alert(`No puede agregar más unidades. Stock disponible: ${item.maxStock}`);
      return;
    }

    if (newQty <= 0) {
      removeProductFromCart(sku);
    } else {
      item.quantity = newQty;
      updateCartDisplay();
    }
  }

  function removeProductFromCart(sku) {
    cart = cart.filter(item => item.sku !== sku);
    updateCartDisplay();
  }

  clearCartBtn.addEventListener('click', () => {
    cart = [];
    updateCartDisplay();
  });

  // 3. RENDER CART AND FINANCIALS
  function updateCartDisplay() {
    posCartItems.innerHTML = '';

    if (cart.length === 0) {
      posCartItems.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center text-slate-500 text-center space-y-2 h-full">
          <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span class="text-xs font-semibold text-slate-400">Carrito de compras vacío</span>
        </div>
      `;
      
      posSubtotal.textContent = '$0.00';
      posTax.textContent = '$0.00';
      posTotal.textContent = '$0.00';
      cartTotal = 0;
      
      posConfirmBtn.disabled = true;
      posConfirmBtn.className = "w-full py-3.5 bg-slate-800 text-slate-500 font-extrabold rounded-xl transition-all duration-300 shadow-lg cursor-not-allowed flex items-center justify-center space-x-2 text-sm";
      posCashInput.value = '';
      posChangeOutput.textContent = '$0.00';
      posChangeOutput.className = "w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 font-extrabold text-sm text-right";
      return;
    }

    cart.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = "flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-xs animate-fade-in";
      
      itemEl.innerHTML = `
        <div class="flex-1 pr-3">
          <h5 class="font-bold text-slate-200 line-clamp-1">${item.name}</h5>
          <span class="text-[10px] text-cyan-400 font-semibold mt-0.5 block">${formatCurrency(item.price)} c/u</span>
        </div>
        
        <div class="flex items-center space-x-3.5">
          <div class="flex items-center bg-slate-900 border border-slate-700/60 rounded-lg overflow-hidden">
            <button class="minus-qty-btn px-2.5 py-1 text-slate-400 hover:bg-slate-800 font-bold" data-sku="${item.sku}">-</button>
            <span class="px-2 text-slate-200 font-extrabold text-xs">${item.quantity}</span>
            <button class="plus-qty-btn px-2.5 py-1 text-slate-400 hover:bg-slate-800 font-bold" data-sku="${item.sku}">+</button>
          </div>
          <span class="w-16 text-right font-extrabold text-slate-100">${formatCurrency(item.price * item.quantity)}</span>
          <button class="remove-item-btn p-1 text-slate-500 hover:text-rose-400 transition-colors duration-150" data-sku="${item.sku}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;

      itemEl.querySelector('.minus-qty-btn').addEventListener('click', () => changeQuantity(item.sku, -1));
      itemEl.querySelector('.plus-qty-btn').addEventListener('click', () => changeQuantity(item.sku, 1));
      itemEl.querySelector('.remove-item-btn').addEventListener('click', () => removeProductFromCart(item.sku));

      posCartItems.appendChild(itemEl);
    });

    calculateCartTotals();
  }

  function calculateCartTotals() {
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    cartDiscountPct = parseFloat(posDiscountSelect.value) || 0;
    const discountAmount = subtotal * (cartDiscountPct / 100);
    const taxableBase = subtotal - discountAmount;
    
    cartTax = taxableBase * 0.19; // IVA 19%
    cartTotal = taxableBase + cartTax;
    cartSubtotal = subtotal;

    posSubtotal.textContent = formatCurrency(subtotal);
    if (posTax) posTax.textContent = formatCurrency(cartTax);
    if (posTotal) posTotal.textContent = formatCurrency(cartTotal);

    updatePaymentDetails();
  }

  // Advanced Discount Logic
  if (posDiscountInput) {
    posDiscountInput.addEventListener('input', (e) => {
      const code = e.target.value.trim().toUpperCase();
      if (code === 'DESCUENTO10') cartDiscountPct = 10;
      else if (code === 'VIP20') cartDiscountPct = 20;
      else if (code === 'EMPLEADO50') cartDiscountPct = 50;
      else cartDiscountPct = 0;
      calculateCartTotals();
    });
  }

  // 4. CHECKOUT METHOD TOGGLING
  payMethodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      payMethodBtns.forEach(b => {
        b.className = "pay-method-btn py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400 font-semibold text-xs flex flex-col items-center justify-center space-y-1 transition-all duration-150";
      });
      btn.className = "pay-method-btn py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition-all duration-150";
      
      activePaymentMethod = btn.getAttribute('data-method');
      updatePaymentDetails();
    });
  });

  function updatePaymentDetails() {
    if (cart.length === 0) return;

    if (activePaymentMethod === 'Efectivo') {
      changeSection.classList.remove('opacity-50');
      posCashInput.disabled = false;
      calculateChange();
    } else {
      changeSection.classList.add('opacity-50');
      posCashInput.value = cartTotal.toFixed(2);
      posCashInput.disabled = true;

      posChangeOutput.textContent = '$0.00';
      posChangeOutput.className = "w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400 font-extrabold text-sm text-right";
      
      posConfirmBtn.disabled = false;
      if (session.role === 'Vendedor') {
        posConfirmBtn.className = "w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm transform active:scale-[0.98] cursor-pointer";
      } else {
        posConfirmBtn.className = "w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 text-sm transform active:scale-[0.98] cursor-pointer";
      }
    }
  }

  function calculateChange() {
    if (cart.length === 0 || activePaymentMethod !== 'Efectivo') return;

    const cashValue = parseFloat(posCashInput.value) || 0;
    
    if (cashValue >= cartTotal) {
      const change = cashValue - cartTotal;
      posChangeOutput.textContent = formatCurrency(change);
      posChangeOutput.className = "w-full px-3 py-2.5 bg-slate-900 border border-emerald-900/50 rounded-xl text-emerald-400 font-extrabold text-sm text-right";
      
      posConfirmBtn.disabled = false;
      if (session.role === 'Vendedor') {
        posConfirmBtn.className = "w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm transform active:scale-[0.98] cursor-pointer";
      } else {
        posConfirmBtn.className = "w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 text-sm transform active:scale-[0.98] cursor-pointer";
      }
    } else {
      const deficiency = cartTotal - cashValue;
      posChangeOutput.textContent = `Faltan: ${formatCurrency(deficiency)}`;
      posChangeOutput.className = "w-full px-3 py-2.5 bg-slate-900 border border-rose-900/50 rounded-xl text-rose-400 font-bold text-xs text-right flex items-center justify-end h-10";
      
      posConfirmBtn.disabled = true;
      posConfirmBtn.className = "w-full py-3.5 bg-slate-800 text-slate-500 font-extrabold rounded-xl transition-all duration-300 shadow-lg cursor-not-allowed flex items-center justify-center space-x-2 text-sm";
    }
  }

  posCashInput.addEventListener('input', calculateChange);

  // 5. CONFIRM ACTION (SALE OR PRESALE)
  posConfirmBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    
    posConfirmBtn.disabled = true;

    if (session.role === 'Vendedor') {
      // --- PRESALE WORKFLOW ---
      const orderItems = cart.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
        maxStock: item.maxStock
      }));

      const newOrderId = window.SaaSDB.addPendingOrder(orderItems);
      
      // Display presale modal
      presaleIdDisplay.textContent = newOrderId;
      presaleModal.classList.remove('hidden');

    } else {
      // --- CASHIER WORKFLOW (CONFIRM SALE) ---
      const saleItems = cart.map(item => {
        window.SaaSDB.updateProductStock(item.sku, item.quantity);
        return {
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          cost: item.cost,
          price: item.price
        };
      });

      const saleTransaction = {
        items: saleItems,
        discountPercent: cartDiscountPct,
        total: cartTotal,
        paymentMethod: activePaymentMethod
      };

      const returnedSaleId = window.SaaSDB.addSale(saleTransaction);

      // If this was a pending order, remove it
      if (currentLoadedOrderId) {
        window.SaaSDB.removePendingOrder(currentLoadedOrderId);
        currentLoadedOrderId = null;
      }

      showReceiptModal(returnedSaleId);
      triggerSuccessToast();
    }
  });

  // Presale Done
  if (presaleDoneBtn) {
    presaleDoneBtn.addEventListener('click', () => {
      cart = [];
      presaleModal.classList.add('hidden');
      updateCartDisplay();
    });
  }

  function triggerSuccessToast() {
    toastSuccess.classList.remove('hidden');
    setTimeout(() => {
      toastSuccess.classList.add('opacity-0');
      setTimeout(() => {
        toastSuccess.classList.add('hidden');
        toastSuccess.classList.remove('opacity-0');
      }, 300);
    }, 2800);
  }

  // 6. DETAILED RECEIPT MODAL LOGIC
  function showReceiptModal(saleId) {
    // Fill header information
    receiptId.textContent = saleId;
    receiptDate.textContent = new Date().toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    receiptCashier.textContent = session.name || 'Operador Principal';

    // Populate items list inside receipt
    receiptItemsList.innerHTML = '';
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = "flex justify-between";
      row.innerHTML = `
        <span class="max-w-[200px] truncate">${item.quantity} x ${item.name}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      `;
      receiptItemsList.appendChild(row);
    });

    // Populate financial summaries
    receiptSubtotal.textContent = formatCurrency(cartSubtotal);
    receiptDiscount.textContent = `${cartDiscountPct}%`;
    receiptTax.textContent = formatCurrency(cartTax);
    receiptTotal.textContent = formatCurrency(cartTotal);
    
    // Populate payment details
    receiptMethod.textContent = activePaymentMethod;

    if (activePaymentMethod === 'Efectivo') {
      receiptCashRow.classList.remove('hidden');
      receiptChangeRow.classList.remove('hidden');

      const cashValue = parseFloat(posCashInput.value) || 0;
      receiptCashPaid.textContent = formatCurrency(cashValue);
      receiptChangeGiven.textContent = formatCurrency(cashValue - cartTotal);
    } else {
      // Hide change segments during electronic payment
      receiptCashRow.classList.add('hidden');
      receiptChangeRow.classList.add('hidden');
    }

    // Unhide modal
    receiptModal.classList.remove('hidden');
  }

  // RECEIPT CONTROLLER BUTTONS
  receiptPrintBtn.addEventListener('click', () => {
    // Simulated print alert (Classic premium console effect)
    alert('Conectando con impresora térmica... \nImprimiendo Boleta Electrónica de Venta... \nCódigo de control fiscal OK.');
  });

  receiptDoneBtn.addEventListener('click', () => {
    // Reset state & close receipt modal
    cart = [];
    if (posDiscountInput) posDiscountInput.value = '';
    cartDiscountPct = 0;
    posCashInput.value = '';
    
    receiptModal.classList.add('hidden');
    
    updateCartDisplay();
    renderCatalog();
  });

  // UTILITY CURRENCY FORMATTER
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
});
