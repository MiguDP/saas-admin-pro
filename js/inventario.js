document.addEventListener('DOMContentLoaded', () => {
  // SECURE SESSION VALIDATION & FILE PROTOCOL SANDBOX BYPASS
  let session = JSON.parse(sessionStorage.getItem('saas_session'));

  if (!session) {
    if (window.location.protocol === 'file:') {
      session = {
        email: 'admin@saaspro.com',
        role: 'Administrador',
        name: 'Carlos Mendoza (Modo Archivo)',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem('saas_session', JSON.stringify(session));

      // Inject notice banner
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

  userNameEl.textContent = session.name || 'Administrador';
  userRoleEl.textContent = session.role || 'ADMINISTRADOR';

  if (session.name) {
    const parts = session.name.split(' ');
    const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    userAvatarEl.textContent = initials;
  }

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

  // STATE VARIABLES
  let isEditMode = false;
  let editingSku = '';

  // DOM ELEMENTS
  const inventorySearch = document.getElementById('inventory-search');
  const inventoryTableBody = document.getElementById('inventory-table-body');
  const tableEmptyState = document.getElementById('table-empty-state');
  
  const summaryTotalSkus = document.getElementById('summary-total-skus');
  const summaryCriticalStock = document.getElementById('summary-critical-stock');

  // MODAL ELEMENTS
  const productModal = document.getElementById('product-modal');
  const openModalBtn = document.getElementById('open-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const closeModalX = document.getElementById('close-modal-x');
  const productForm = document.getElementById('product-form');
  
  const modalTitle = productModal.querySelector('h3');
  const modalSubtitle = productModal.querySelector('p');

  const modalSku = document.getElementById('modal-sku');
  const modalCategory = document.getElementById('modal-category');
  const modalName = document.getElementById('modal-name');
  const modalCost = document.getElementById('modal-cost');
  const modalPrice = document.getElementById('modal-price');
  const modalStock = document.getElementById('modal-stock');
  const modalMarginPreview = document.getElementById('modal-margin-preview');

  // LISTEN TO DATABASE EVENTS
  window.addEventListener('saas_db_update', () => {
    renderInventory();
  });

  // INITIAL RUN
  renderInventory();

  // 1. RENDER INVENTORY TABLE
  function renderInventory() {
    const products = window.SaaSDB.getProducts();
    const query = inventorySearch.value.toLowerCase().trim();

    // Clear Table Body
    inventoryTableBody.innerHTML = '';

    // Filter Products
    const filteredProducts = products.filter(p => {
      return p.name.toLowerCase().includes(query) ||
             p.sku.toLowerCase().includes(query) ||
             p.category.toLowerCase().includes(query);
    });

    // Populate summary numbers
    summaryTotalSkus.textContent = products.length;
    const criticalCount = products.filter(p => p.stock < 5).length;
    summaryCriticalStock.textContent = criticalCount;

    if (filteredProducts.length === 0) {
      tableEmptyState.classList.remove('hidden');
    } else {
      tableEmptyState.classList.add('hidden');
      
      filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-900/40 transition-colors duration-150 border-b border-slate-800/50";

        // Margen calculation
        const marginPct = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;

        // Stock tags traffic light
        let stockBadgeClass = '';
        let stockLabel = '';

        if (product.stock === 0) {
          stockBadgeClass = 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold px-2.5 py-1 rounded-full text-xs flex items-center space-x-1 animate-pulse';
          stockLabel = 'Agotado';
        } else if (product.stock < 5) {
          stockBadgeClass = 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2.5 py-1 rounded-full text-xs flex items-center space-x-1';
          stockLabel = `Crítico: ${product.stock}`;
        } else {
          stockBadgeClass = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full text-xs flex items-center space-x-1';
          stockLabel = `Óptimo: ${product.stock}`;
        }

        row.innerHTML = `
          <td class="px-6 py-4.5 font-mono text-xs text-cyan-400 font-semibold">${product.sku}</td>
          <td class="px-6 py-4.5 font-bold text-slate-100">${product.name}</td>
          <td class="px-6 py-4.5"><span class="px-2.5 py-1 bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300">${product.category}</span></td>
          <td class="px-6 py-4.5">
            <span class="${stockBadgeClass}">
              <span class="w-1.5 h-1.5 rounded-full ${product.stock === 0 ? 'bg-rose-400' : product.stock < 5 ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
              <span>${stockLabel}</span>
            </span>
          </td>
          <td class="px-6 py-4.5 text-right font-semibold text-slate-300">${formatCurrency(product.cost)}</td>
          <td class="px-6 py-4.5 text-right font-bold text-slate-100">${formatCurrency(product.price)}</td>
          <td class="px-6 py-4.5 text-right font-extrabold text-cyan-400">${marginPct.toFixed(1)}%</td>
          <td class="px-6 py-4.5 text-center">
            <div class="flex items-center justify-center space-x-2">
              <!-- Edit product button -->
              <button class="edit-btn p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950/40 hover:text-cyan-400 border border-slate-700 hover:border-cyan-900/50 transition-colors duration-150 text-slate-400" data-sku="${product.sku}" title="Editar Producto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <!-- Delete product button -->
              <button class="delete-btn p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 transition-colors duration-150 text-slate-400" data-sku="${product.sku}" title="Eliminar Producto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        `;

        inventoryTableBody.appendChild(row);
      });

      // Bind delete buttons
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sku = btn.getAttribute('data-sku');
          deleteProduct(sku);
        });
      });

      // Bind edit buttons
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sku = btn.getAttribute('data-sku');
          openEditModal(sku);
        });
      });
    }
  }

  // 2. FILTER SEARCH RESULTS
  inventorySearch.addEventListener('input', () => {
    renderInventory();
  });

  // 3. DELETE PRODUCT ACTION
  function deleteProduct(sku) {
    if (confirm(`¿Está seguro de que desea eliminar el producto con SKU: ${sku}?`)) {
      const products = window.SaaSDB.getProducts();
      const filtered = products.filter(p => p.sku !== sku);
      window.SaaSDB.saveProducts(filtered);
    }
  }

  // 4. OPEN CREATE / EDIT MODAL
  function toggleModal(show, editMode = false) {
    isEditMode = editMode;
    
    if (show) {
      if (!isEditMode) {
        // Create Mode Setup
        productForm.reset();
        modalTitle.textContent = 'Agregar Nuevo Producto';
        modalSubtitle.textContent = 'Complete la ficha técnica para registrar el artículo en el inventario.';
        modalSku.disabled = false;
        
        // Suggest SKU
        const products = window.SaaSDB.getProducts();
        const nextSkuNum = products.length + 1;
        modalSku.value = `PROD-${String(nextSkuNum).padStart(3, '0')}`;
        modalMarginPreview.textContent = '0.0%';
        modalMarginPreview.className = "px-4 py-2 bg-slate-800 border border-slate-700 text-cyan-400 font-extrabold text-sm rounded-lg shadow-inner";
      }
      productModal.classList.remove('hidden');
    } else {
      productModal.classList.add('hidden');
    }
  }

  function openEditModal(sku) {
    const products = window.SaaSDB.getProducts();
    const product = products.find(p => p.sku === sku);
    
    if (!product) return;

    editingSku = sku;
    
    // Fill values
    modalSku.value = product.sku;
    modalSku.disabled = true; // Protect SKU key during edit
    modalCategory.value = product.category;
    modalName.value = product.name;
    modalCost.value = product.cost;
    modalPrice.value = product.price;
    modalStock.value = product.stock;

    modalTitle.textContent = 'Editar Producto Existente';
    modalSubtitle.textContent = `Modifique los valores para el SKU: ${product.sku} en el catálogo.`;
    
    calculateMarginPreview();
    toggleModal(true, true);
  }

  openModalBtn.addEventListener('click', () => toggleModal(true, false));
  closeModalBtn.addEventListener('click', () => toggleModal(false));
  closeModalX.addEventListener('click', () => toggleModal(false));
  
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) toggleModal(false);
  });

  // DYNAMIC MARGIN PREVIEW
  function calculateMarginPreview() {
    const cost = parseFloat(modalCost.value) || 0;
    const price = parseFloat(modalPrice.value) || 0;

    if (price <= 0) {
      modalMarginPreview.textContent = '0.0%';
      modalMarginPreview.className = "px-4 py-2 bg-slate-800 border border-slate-700 text-cyan-400 font-extrabold text-sm rounded-lg shadow-inner";
      return;
    }

    const marginVal = price - cost;
    const marginPct = (marginVal / price) * 100;

    modalMarginPreview.textContent = `${marginPct.toFixed(1)}%`;
    
    if (marginPct < 30) {
      modalMarginPreview.className = "px-4 py-2 bg-slate-800 border border-rose-900/30 text-rose-400 font-extrabold text-sm rounded-lg shadow-inner";
    } else if (marginPct < 50) {
      modalMarginPreview.className = "px-4 py-2 bg-slate-800 border border-amber-900/30 text-amber-400 font-extrabold text-sm rounded-lg shadow-inner";
    } else {
      modalMarginPreview.className = "px-4 py-2 bg-slate-800 border border-emerald-900/30 text-emerald-400 font-extrabold text-sm rounded-lg shadow-inner";
    }
  }

  modalCost.addEventListener('input', calculateMarginPreview);
  modalPrice.addEventListener('input', calculateMarginPreview);

  // PRODUCT SUBMISSION AND VALIDATIONS
  productForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const sku = modalSku.value.trim().toUpperCase();
    const category = modalCategory.value;
    const name = modalName.value.trim();
    const cost = parseFloat(modalCost.value) || 0;
    const price = parseFloat(modalPrice.value) || 0;
    const stock = parseInt(modalStock.value) || 0;

    // Reset styles
    [modalSku, modalName, modalCost, modalPrice, modalStock].forEach(el => {
      el.classList.remove('border-red-500/50', 'focus:border-red-500', 'focus:ring-red-500/10');
    });

    let hasError = false;
    if (!sku) { highlightField(modalSku); hasError = true; }
    if (!name) { highlightField(modalName); hasError = true; }
    if (cost <= 0) { highlightField(modalCost); hasError = true; }
    if (price <= 0) { highlightField(modalPrice); hasError = true; }
    if (stock < 0) { highlightField(modalStock); hasError = true; }

    if (hasError) return;

    if (isEditMode) {
      // 1. UPDATE MODE
      const updatedProduct = {
        name: name,
        category: category,
        cost: cost,
        price: price,
        stock: stock
      };

      window.SaaSDB.updateProduct(editingSku, updatedProduct);
      toggleModal(false);
      
    } else {
      // 2. CREATE MODE
      // Duplication check
      const products = window.SaaSDB.getProducts();
      if (products.some(p => p.sku === sku)) {
        alert(`El código SKU: ${sku} ya está registrado en el sistema.`);
        highlightField(modalSku);
        return;
      }

      const newProduct = {
        sku: sku,
        name: name,
        category: category,
        cost: cost,
        price: price,
        stock: stock
      };

      products.push(newProduct);
      window.SaaSDB.saveProducts(products);
      toggleModal(false);
    }
  });

  function highlightField(element) {
    element.classList.add('border-red-500/50', 'focus:border-red-500', 'focus:ring-red-500/10');
  }

  // CURRENCY FORMATTER
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
});
