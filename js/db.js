(function() {
  // --- 1. DEFAULT MOCK DATA ---
  const defaultProducts = [
    { sku: 'PROD-001', name: 'Billetera de Cuero Premium', category: 'Accesorios', cost: 15.00, price: 45.00, stock: 12 },
    { sku: 'PROD-002', name: 'Mouse Inalámbrico Ergonómico', category: 'Tecnología', cost: 8.00, price: 25.00, stock: 4 },
    { sku: 'PROD-003', name: 'Teclado Mecánico RGB', category: 'Tecnología', cost: 30.00, price: 85.00, stock: 15 }
  ];

  const defaultSales = [
    { id: 'V-001', date: '2025-12-10T14:30:00.000Z', items: [{ sku: 'PROD-001', name: 'Billetera de Cuero Premium', quantity: 2, cost: 15.00, price: 45.00 }], total: 90.00, paymentMethod: 'Efectivo' },
    { id: 'V-002', date: '2025-12-18T18:15:00.000Z', items: [{ sku: 'PROD-003', name: 'Teclado Mecánico RGB', quantity: 5, cost: 30.00, price: 85.00 }], total: 425.00, paymentMethod: 'Tarjeta' }
  ];

  const defaultClients = [
    { id: 'C-001', name: 'Grupo Cencosud', email: 'admin@cencosud.com', contact: 'Roberto Silva', joinDate: '2025-10-15T10:00:00.000Z' },
    { id: 'C-002', name: 'Boutique Elegance', email: 'contacto@elegance.com', contact: 'Marta Díaz', joinDate: '2026-01-20T14:30:00.000Z' }
  ];

  const defaultLocales = [
    { id: 'L-001', clientId: 'C-001', name: 'Metro Lima Norte', plan: 'Empresa', status: 'Activo', mrr: 199.99, joinDate: '2025-10-15T10:00:00.000Z' },
    { id: 'L-002', clientId: 'C-001', name: 'Wong Surco', plan: 'Empresa', status: 'Activo', mrr: 199.99, joinDate: '2025-11-01T09:00:00.000Z' },
    { id: 'L-003', clientId: 'C-002', name: 'Elegance Principal', plan: 'Basic', status: 'Activo', mrr: 19.99, joinDate: '2026-01-20T14:30:00.000Z' }
  ];

  const defaultUsers = [
    { email: 'creator@saaspro.com', password: 'creator123', name: 'SaaS Creator', role: 'SuperAdmin', clientId: 'SYSTEM', localeId: null },
    { email: 'admin@cencosud.com', password: 'admin123', name: 'Roberto Silva', role: 'Administrador', clientId: 'C-001', localeId: null },
    { email: 'caja.metro@cencosud.com', password: 'caja123', name: 'Lucía Gómez', role: 'Cajero', clientId: 'C-001', localeId: 'L-001' },
    { email: 'vendedor.metro@cencosud.com', password: 'vend123', name: 'Carlos Vendedor', role: 'Vendedor', clientId: 'C-001', localeId: 'L-001' },
    { email: 'caja.wong@cencosud.com', password: 'caja123', name: 'Pedro Sánchez', role: 'Cajero', clientId: 'C-001', localeId: 'L-002' },
    { email: 'contacto@elegance.com', password: 'admin123', name: 'Marta Díaz', role: 'Administrador', clientId: 'C-002', localeId: null }
  ];

  // Hard Reset if old architecture is detected
  if (localStorage.getItem('saas_tenants')) {
    localStorage.clear();
  }

  // Initialize System DB
  if (!localStorage.getItem('saas_clients')) {
    localStorage.setItem('saas_clients', JSON.stringify(defaultClients));
    localStorage.setItem('saas_locales', JSON.stringify(defaultLocales));
    localStorage.setItem('saas_users', JSON.stringify(defaultUsers));
  }
  
  // Initialize L-001 with robust data
  if (!localStorage.getItem('saas_products_L-001')) {
    localStorage.setItem('saas_products_L-001', JSON.stringify(defaultProducts));
    localStorage.setItem('saas_sales_L-001', JSON.stringify(defaultSales));
    localStorage.setItem('saas_fixed_costs_L-001', JSON.stringify(1200));
  }
  
  if (!localStorage.getItem('saas_pending_orders_L-001')) {
    localStorage.setItem('saas_pending_orders_L-001', JSON.stringify([]));
  }

  // --- 2. GLOBAL DB OBJECT ---
  window.SaaSDB = {
    currentLocaleId: null, // used to namespace data for dashboard/pos

    setLocale: function(localeId) {
      this.currentLocaleId = localeId;
    },

    getNamespace: function(key) {
      if (!this.currentLocaleId || this.currentLocaleId === 'GLOBAL') return key;
      return `${key}_${this.currentLocaleId}`;
    },

    // Users
    getUsers: function() {
      return JSON.parse(localStorage.getItem('saas_users')) || [];
    },
    saveUsers: function(users) {
      localStorage.setItem('saas_users', JSON.stringify(users));
    },
    addUser: function(user) {
      const users = this.getUsers();
      users.push(user);
      this.saveUsers(users);
    },

    // Clients
    getClients: function() {
      return JSON.parse(localStorage.getItem('saas_clients')) || [];
    },
    saveClients: function(clients) {
      localStorage.setItem('saas_clients', JSON.stringify(clients));
      this.dispatchUpdate();
    },
    addClient: function(client) {
      const clients = this.getClients();
      const nextId = 'C-' + String(clients.length + 1).padStart(3, '0');
      client.id = nextId;
      client.joinDate = new Date().toISOString();
      clients.push(client);
      this.saveClients(clients);
      return nextId;
    },
    updateClient: function(id, updatedData) {
      const clients = this.getClients();
      const idx = clients.findIndex(c => c.id === id);
      if (idx !== -1) {
        clients[idx] = { ...clients[idx], ...updatedData };
        this.saveClients(clients);
        return true;
      }
      return false;
    },

    // Locales
    getLocales: function() {
      return JSON.parse(localStorage.getItem('saas_locales')) || [];
    },
    saveLocales: function(locales) {
      localStorage.setItem('saas_locales', JSON.stringify(locales));
      this.dispatchUpdate();
    },
    addLocale: function(locale) {
      const locales = this.getLocales();
      const nextId = 'L-' + String(locales.length + 1).padStart(3, '0');
      locale.id = nextId;
      locale.joinDate = new Date().toISOString();
      locales.push(locale);
      this.saveLocales(locales);

      // Initialize empty storage for new locale
      localStorage.setItem(`saas_products_${nextId}`, JSON.stringify([]));
      localStorage.setItem(`saas_sales_${nextId}`, JSON.stringify([]));
      localStorage.setItem(`saas_pending_orders_${nextId}`, JSON.stringify([]));
      localStorage.setItem(`saas_fixed_costs_${nextId}`, JSON.stringify(0));

      return nextId;
    },
    updateLocale: function(id, updatedData) {
      const locales = this.getLocales();
      const idx = locales.findIndex(l => l.id === id);
      if (idx !== -1) {
        locales[idx] = { ...locales[idx], ...updatedData };
        this.saveLocales(locales);
        return true;
      }
      return false;
    },

    // Products (Namespaced)
    getProducts: function() {
      if (this.currentLocaleId === 'GLOBAL') {
        const sessionStr = sessionStorage.getItem('saas_session');
        if (!sessionStr) return [];
        const session = JSON.parse(sessionStr);
        if (!session.clientId) return [];
        
        const locales = this.getLocales().filter(l => l.clientId === session.clientId);
        let allProducts = [];
        locales.forEach(l => {
          const prods = JSON.parse(localStorage.getItem(`saas_products_${l.id}`)) || [];
          allProducts = allProducts.concat(prods);
        });
        return allProducts;
      }
      const ns = this.getNamespace('saas_products');
      return JSON.parse(localStorage.getItem(ns)) || [];
    },
    saveProducts: function(products) {
      const ns = this.getNamespace('saas_products');
      localStorage.setItem(ns, JSON.stringify(products));
      this.dispatchUpdate();
    },
    updateProduct: function(sku, updatedProduct) {
      const products = this.getProducts();
      const idx = products.findIndex(p => p.sku === sku);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...updatedProduct };
        this.saveProducts(products);
        return true;
      }
      return false;
    },
    updateProductStock: function(sku, quantityToSubtract) {
      const products = this.getProducts();
      const pIndex = products.findIndex(p => p.sku === sku);
      if (pIndex !== -1) {
        products[pIndex].stock = Math.max(0, products[pIndex].stock - quantityToSubtract);
        this.saveProducts(products);
        return true;
      }
      return false;
    },

    // Sales (Namespaced)
    getSales: function() {
      if (this.currentLocaleId === 'GLOBAL') {
        const sessionStr = sessionStorage.getItem('saas_session');
        if (!sessionStr) return [];
        const session = JSON.parse(sessionStr);
        if (!session.clientId) return [];
        
        const locales = this.getLocales().filter(l => l.clientId === session.clientId);
        let allSales = [];
        locales.forEach(l => {
          const sales = JSON.parse(localStorage.getItem(`saas_sales_${l.id}`)) || [];
          allSales = allSales.concat(sales);
        });
        return allSales;
      }
      const ns = this.getNamespace('saas_sales');
      return JSON.parse(localStorage.getItem(ns)) || [];
    },
    saveSales: function(sales) {
      const ns = this.getNamespace('saas_sales');
      localStorage.setItem(ns, JSON.stringify(sales));
      this.dispatchUpdate();
    },
    addSale: function(sale) {
      const sales = this.getSales();
      const nextId = 'V-' + String(sales.length + 1).padStart(3, '0');
      sale.id = nextId;
      sale.date = new Date().toISOString();
      sales.push(sale);
      this.saveSales(sales);
      return nextId;
    },

    // Fixed Costs (Namespaced)
    getFixedCosts: function() {
      if (this.currentLocaleId === 'GLOBAL') {
        const sessionStr = sessionStorage.getItem('saas_session');
        if (!sessionStr) return 0;
        const session = JSON.parse(sessionStr);
        if (!session.clientId) return 0;
        
        const locales = this.getLocales().filter(l => l.clientId === session.clientId);
        let totalFixedCosts = 0;
        locales.forEach(l => {
          totalFixedCosts += parseFloat(JSON.parse(localStorage.getItem(`saas_fixed_costs_${l.id}`)) || 0);
        });
        return totalFixedCosts;
      }
      const ns = this.getNamespace('saas_fixed_costs');
      return JSON.parse(localStorage.getItem(ns)) || 0;
    },
    setFixedCosts: function(costs) {
      const ns = this.getNamespace('saas_fixed_costs');
      localStorage.setItem(ns, JSON.stringify(costs));
      this.dispatchUpdate();
    },

    // Pending Orders (Namespaced)
    getPendingOrders: function() {
      if (this.currentLocaleId === 'GLOBAL') return []; // Generally not accessed globally
      const ns = this.getNamespace('saas_pending_orders');
      return JSON.parse(localStorage.getItem(ns)) || [];
    },
    getPendingOrder: function(orderId) {
      const orders = this.getPendingOrders();
      return orders.find(o => o.id === orderId) || null;
    },
    savePendingOrders: function(orders) {
      const ns = this.getNamespace('saas_pending_orders');
      localStorage.setItem(ns, JSON.stringify(orders));
    },
    addPendingOrder: function(orderItems) {
      const orders = this.getPendingOrders();
      // Generate unique PED-XXXX
      const nextId = 'PED-' + Math.floor(1000 + Math.random() * 9000);
      const newOrder = {
        id: nextId,
        date: new Date().toISOString(),
        items: orderItems
      };
      orders.push(newOrder);
      this.savePendingOrders(orders);
      return nextId;
    },
    removePendingOrder: function(orderId) {
      let orders = this.getPendingOrders();
      orders = orders.filter(o => o.id !== orderId);
      this.savePendingOrders(orders);
    },

    // Factory Reset
    resetDB: function() {
      localStorage.clear();
      window.location.reload();
    },

    // Event Dispatch
    dispatchUpdate: function() {
      const event = new CustomEvent('saas_db_update');
      window.dispatchEvent(event);
    }
  };

  // Cross-tab synchronization via standard storage event
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('saas_')) {
      window.SaaSDB.dispatchUpdate();
    }
  });

})();
