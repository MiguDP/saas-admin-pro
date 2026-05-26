document.addEventListener('DOMContentLoaded', () => {
  // Authentication Check
  const session = JSON.parse(sessionStorage.getItem('saas_session'));
  if (!session || session.role !== 'SuperAdmin') {
    window.location.href = 'index.html';
    return;
  }

  // UI Elements
  const userNameEl = document.getElementById('user-name');
  if (userNameEl) userNameEl.textContent = session.name;

  const logoutBtn = document.getElementById('logout-btn');
  const clientsContainer = document.getElementById('clients-container');
  
  const kpiMrr = document.getElementById('kpi-mrr');
  const kpiTenants = document.getElementById('kpi-tenants');

  // Client Modal Elements
  const clientModal = document.getElementById('client-modal');
  const clientModalContent = clientModal.querySelector('.modal-content');
  const addClientBtn = document.getElementById('add-client-btn');
  const closeClientModalBtn = document.getElementById('close-client-modal-btn');
  const cancelClientModalBtn = document.getElementById('cancel-client-modal-btn');
  const clientForm = document.getElementById('client-form');

  // Locale Modal Elements
  const localeModal = document.getElementById('locale-modal');
  const localeModalContent = localeModal.querySelector('.locale-modal-content');
  const closeLocaleModalBtn = document.getElementById('close-locale-modal-btn');
  const cancelLocaleModalBtn = document.getElementById('cancel-locale-modal-btn');
  const localeForm = document.getElementById('locale-form');

  // Plan Pricing Map
  const planPricing = {
    'Basic': 19.99,
    'Pro': 49.99,
    'Premium': 99.99,
    'Empresa': 199.99
  };

  // State
  let clients = [];
  let locales = [];

  function loadData() {
    clients = window.SaaSDB.getClients() || [];
    locales = window.SaaSDB.getLocales() || [];
    renderClients();
    calculateKPIs();
  }

  function calculateKPIs() {
    let totalMrr = 0;
    let activeLocalesCount = 0;

    locales.forEach(l => {
      if (l.status === 'Activo') {
        totalMrr += parseFloat(l.mrr || 0);
        activeLocalesCount++;
      }
    });

    kpiMrr.textContent = '$' + totalMrr.toFixed(2);
    // the label says 'Clientes Activos' but let's count active locales since those bring the money
    kpiTenants.textContent = activeLocalesCount.toString();
  }

  function getClientMRR(clientId) {
    return locales
      .filter(l => l.clientId === clientId && l.status === 'Activo')
      .reduce((sum, l) => sum + parseFloat(l.mrr || 0), 0);
  }

  function renderClients() {
    clientsContainer.innerHTML = '';
    
    if (clients.length === 0) {
      clientsContainer.innerHTML = `
        <div class="py-12 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-700/50">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          No hay clientes registrados en el sistema.
        </div>
      `;
      return;
    }

    const sortedClients = [...clients].reverse();

    sortedClients.forEach(c => {
      const clientLocales = locales.filter(l => l.clientId === c.id);
      const clientMRR = getClientMRR(c.id);

      const card = document.createElement('div');
      card.className = 'bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden';
      
      let localesRows = '';
      if (clientLocales.length === 0) {
        localesRows = `<tr><td colspan="5" class="py-4 text-center text-xs text-slate-500">Sin locales registrados.</td></tr>`;
      } else {
        clientLocales.forEach(l => {
          let statusColor = 'text-slate-400 bg-slate-400/10 border-slate-400/20';
          let statusDot = 'bg-slate-400';
          if (l.status === 'Activo') {
            statusColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            statusDot = 'bg-emerald-400';
          } else if (l.status === 'Pausado') {
            statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            statusDot = 'bg-amber-400';
          } else if (l.status === 'Cancelado') {
            statusColor = 'text-rose-400 bg-rose-400/10 border-rose-400/20';
            statusDot = 'bg-rose-400';
          }
          
          let planColor = 'text-slate-300';
          if(l.plan === 'Premium') planColor = 'text-purple-400';
          if(l.plan === 'Pro') planColor = 'text-blue-400';
          if(l.plan === 'Empresa') planColor = 'text-orange-400';

          localesRows += `
            <tr class="hover:bg-slate-700/30 transition-colors border-b border-slate-700/30 last:border-0">
              <td class="py-2 px-4 text-xs font-mono text-slate-500">${l.id}</td>
              <td class="py-2 px-4 text-sm text-slate-200">${l.name}</td>
              <td class="py-2 px-4">
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold ${planColor}">${l.plan}</span>
                  <span class="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor}">
                    <span class="w-1.5 h-1.5 rounded-full ${statusDot} mr-1.5"></span>${l.status}
                  </span>
                </div>
              </td>
              <td class="py-2 px-4 text-sm font-bold text-slate-200 text-right">$${parseFloat(l.mrr).toFixed(2)}</td>
              <td class="py-2 px-4 text-center">
                <button class="edit-locale-btn p-1.5 rounded bg-slate-800 hover:bg-indigo-500/20 hover:text-indigo-400 border border-slate-700 transition-colors text-slate-400" data-id="${l.id}" title="Administrar Local">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </td>
            </tr>
          `;
        });
      }

      card.innerHTML = `
        <div class="p-4 flex flex-col sm:flex-row justify-between items-center bg-slate-800/50 cursor-pointer hover:bg-slate-800/80 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <div class="flex items-center space-x-4 w-full sm:w-auto">
            <div class="h-10 w-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              ${c.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 class="text-md font-bold text-white">${c.name}</h4>
              <p class="text-xs text-slate-400">Contacto: ${c.contact} &bull; ${c.email}</p>
            </div>
          </div>
          <div class="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0 space-x-6">
            <div class="text-right">
              <p class="text-xs text-slate-500">MRR Total</p>
              <p class="text-sm font-bold text-emerald-400">$${clientMRR.toFixed(2)}</p>
            </div>
            <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <div class="hidden border-t border-slate-700/50">
          <div class="p-4 bg-slate-900/30 flex justify-between items-center">
            <h5 class="text-sm font-semibold text-slate-300">Sucursales / Locales</h5>
            <button class="add-locale-btn text-xs bg-slate-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded transition-colors" data-client-id="${c.id}">+ Añadir Local</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-slate-800/40">
                <tr>
                  <th class="py-2 px-4 text-xs text-slate-400 font-medium">ID Local</th>
                  <th class="py-2 px-4 text-xs text-slate-400 font-medium">Nombre</th>
                  <th class="py-2 px-4 text-xs text-slate-400 font-medium">Plan/Estado</th>
                  <th class="py-2 px-4 text-xs text-slate-400 font-medium text-right">MRR</th>
                  <th class="py-2 px-4 text-xs text-slate-400 font-medium text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${localesRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
      clientsContainer.appendChild(card);
    });

    // Bind Add Locale buttons
    document.querySelectorAll('.add-locale-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent toggling accordion
        const clientId = btn.getAttribute('data-client-id');
        openLocaleModal(clientId);
      });
    });

    // Bind Edit Locale buttons
    document.querySelectorAll('.edit-locale-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openLocaleModal(null, id);
      });
    });
  }

  // --- Modal Logic: CLIENT ---
  function openClientModal() {
    clientModal.classList.remove('hidden');
    setTimeout(() => {
      clientModalContent.classList.remove('scale-95', 'opacity-0');
      clientModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  function closeClientModal() {
    clientModalContent.classList.remove('scale-100', 'opacity-100');
    clientModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      clientModal.classList.add('hidden');
      clientForm.reset();
    }, 200);
  }

  addClientBtn.addEventListener('click', openClientModal);
  closeClientModalBtn.addEventListener('click', closeClientModal);
  cancelClientModalBtn.addEventListener('click', closeClientModal);

  clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('client-name').value;
    const contact = document.getElementById('client-contact').value;
    const email = document.getElementById('client-email').value;

    const newClient = { name, contact, email };
    const newId = window.SaaSDB.addClient(newClient);
    
    // Automatically provision an admin user for the new Client
    window.SaaSDB.addUser({
      email: email,
      password: 'admin' + newId.replace('-', ''),
      name: contact,
      role: 'Administrador',
      clientId: newId,
      localeId: null
    });

    closeClientModal();
    loadData();
    
    alert(`Cliente Corporativo ${name} creado con éxito.\n\nCredenciales del Administrador General:\nCorreo: ${email}\nClave: admin${newId.replace('-', '')}\n\nNota: El cliente no generará MRR hasta que le añadas al menos un Local.`);
  });

  // --- Modal Logic: LOCALE ---
  function openLocaleModal(clientId = null, editLocaleId = null) {
    document.getElementById('locale-form').reset();
    document.getElementById('locale-edit-id').value = '';
    
    if (editLocaleId) {
      document.getElementById('locale-modal-title').textContent = 'Administrar Local';
      const loc = locales.find(x => x.id === editLocaleId);
      if (loc) {
        document.getElementById('locale-edit-id').value = loc.id;
        document.getElementById('locale-client-id').value = loc.clientId;
        document.getElementById('locale-name').value = loc.name;
        document.getElementById('locale-plan').value = loc.plan;
        document.getElementById('locale-status').value = loc.status;
      }
    } else {
      document.getElementById('locale-modal-title').textContent = 'Añadir Nuevo Local';
      document.getElementById('locale-client-id').value = clientId;
    }

    localeModal.classList.remove('hidden');
    setTimeout(() => {
      localeModalContent.classList.remove('scale-95', 'opacity-0');
      localeModalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
  }

  function closeLocaleModal() {
    localeModalContent.classList.remove('scale-100', 'opacity-100');
    localeModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      localeModal.classList.add('hidden');
      localeForm.reset();
    }, 200);
  }

  closeLocaleModalBtn.addEventListener('click', closeLocaleModal);
  cancelLocaleModalBtn.addEventListener('click', closeLocaleModal);

  localeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('locale-edit-id').value;
    const clientId = document.getElementById('locale-client-id').value;
    const name = document.getElementById('locale-name').value;
    const plan = document.getElementById('locale-plan').value;
    const status = document.getElementById('locale-status').value;
    
    const mrr = status === 'Activo' ? planPricing[plan] : 0;
    
    if (editId) {
      // Edit mode
      window.SaaSDB.updateLocale(editId, { name, plan, status, mrr });
    } else {
      // Create mode
      const newLocaleId = window.SaaSDB.addLocale({ clientId, name, plan, status, mrr });
      // Suggestion: SuperAdmin might want to create a cashier for this locale, but let's keep it simple.
    }
    
    closeLocaleModal();
    loadData();
  });


  // Logout Logic
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('saas_session');
    window.location.href = 'index.html';
  });

  // Initialize
  loadData();

  // Listen for storage events (multi-tab)
  window.addEventListener('saas_db_update', () => {
    loadData();
  });

  // Sidebar Navigation Logic
  const navLinks = document.querySelectorAll('.nav-link');
  const viewSections = document.querySelectorAll('.view-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;
      
      navLinks.forEach(l => {
        l.classList.remove('bg-indigo-500/10', 'text-indigo-400', 'border-indigo-500/20');
        l.classList.add('text-slate-400', 'border-transparent', 'hover:bg-slate-800/50', 'hover:text-slate-200');
        const svg = l.querySelector('svg');
        if(svg) svg.classList.add('group-hover:text-indigo-400');
      });

      link.classList.remove('text-slate-400', 'border-transparent', 'hover:bg-slate-800/50', 'hover:text-slate-200');
      link.classList.add('bg-indigo-500/10', 'text-indigo-400', 'border-indigo-500/20');
      const activeSvg = link.querySelector('svg');
      if(activeSvg) activeSvg.classList.remove('group-hover:text-indigo-400');

      viewSections.forEach(view => {
        if (view.id === targetId) {
          view.classList.remove('hidden');
          view.classList.add('block');
        } else {
          view.classList.remove('block');
          view.classList.add('hidden');
        }
      });
    });
  });

});
