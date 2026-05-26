document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const localeSelector = document.getElementById('locale-selector');
  const localesList = document.getElementById('locales-list');
  const globalDashboardBtn = document.getElementById('global-dashboard-btn');
  let currentSessionData = null;

  // Toggle password visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // Change Eye Icon
    if (isPassword) {
      eyeIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      `;
    } else {
      eyeIcon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  });

  // Form Submit Handler
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Reset styles
    errorAlert.classList.add('hidden');
    emailInput.classList.remove('border-red-500/50', 'focus:border-red-500', 'focus:ring-red-500/20');
    passwordInput.classList.remove('border-red-500/50', 'focus:border-red-500', 'focus:ring-red-500/20');

    // Validation
    if (!email || !password) {
      showError('Por favor complete todos los campos.');
      if (!email) highlightError(emailInput);
      if (!password) highlightError(passwordInput);
      return;
    }

    setLoadingState(true);

    setTimeout(() => {
      const users = window.SaaSDB.getUsers();
      const authenticatedUser = users.find(u => u.email === email && u.password === password);

      if (authenticatedUser) {
        // Prepare session data
        currentSessionData = {
          email: authenticatedUser.email,
          role: authenticatedUser.role,
          name: authenticatedUser.name,
          clientId: authenticatedUser.clientId,
          localeId: authenticatedUser.localeId,
          loginTime: new Date().toISOString()
        };
        
        // Successful login transition
        submitBtn.classList.remove('bg-gradient-to-r', 'from-cyan-500', 'to-blue-600');
        submitBtn.classList.add('bg-emerald-600');
        btnText.textContent = '¡Acceso Concedido!';
        btnSpinner.classList.add('hidden');

        setTimeout(() => {
          if (authenticatedUser.role === 'SuperAdmin') {
            sessionStorage.setItem('saas_session', JSON.stringify(currentSessionData));
            window.location.href = 'superadmin.html';
          } else if (authenticatedUser.role === 'Administrador') {
            // Show Locale Selector instead of immediate redirect
            loginForm.classList.add('hidden');
            localeSelector.classList.remove('hidden');
            renderLocaleOptions(authenticatedUser.clientId);
          } else {
            // Cajero
            sessionStorage.setItem('saas_session', JSON.stringify(currentSessionData));
            window.location.href = 'pos.html';
          }
        }, 800);

      } else {
        // Failed login
        setLoadingState(false);
        showError('Correo electrónico o contraseña incorrectos.');
        highlightError(emailInput);
        highlightError(passwordInput);
      }
    }, 1200);
  });

  // Helper functions for alerts and states
  function setLoadingState(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Verificando...';
      btnSpinner.classList.remove('hidden');
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Ingresar';
      btnSpinner.classList.add('hidden');
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
  }

  function highlightError(element) {
    element.classList.add('border-red-500/50', 'focus:border-red-500', 'focus:ring-red-500/20');
  }

  function renderLocaleOptions(clientId) {
    const allLocales = window.SaaSDB.getLocales();
    const myLocales = allLocales.filter(l => l.clientId === clientId);
    
    localesList.innerHTML = '';
    
    if(myLocales.length === 0) {
      localesList.innerHTML = '<p class="text-slate-400 text-sm text-center">No hay locales asignados a este cliente.</p>';
      return;
    }

    myLocales.forEach(l => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group';
      btn.innerHTML = `
        <div class="flex items-center">
          <div class="h-8 w-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold mr-3">
            ${l.name.substring(0,2).toUpperCase()}
          </div>
          <div class="text-left">
            <p class="text-sm font-bold text-white">${l.name}</p>
            <p class="text-xs text-slate-400">${l.plan} - ${l.status}</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      `;
      btn.addEventListener('click', () => {
        currentSessionData.localeId = l.id;
        sessionStorage.setItem('saas_session', JSON.stringify(currentSessionData));
        window.location.href = 'dashboard.html';
      });
      localesList.appendChild(btn);
    });
  }

  globalDashboardBtn.addEventListener('click', () => {
    currentSessionData.localeId = 'GLOBAL';
    sessionStorage.setItem('saas_session', JSON.stringify(currentSessionData));
    window.location.href = 'dashboard.html';
  });

});
