/* =========================================================================
   FINANZAS — ARRANQUE DE LA APLICACIÓN
   ---------------------------------------------------------------------
   Conecta sidebar, topbar, FAB y la pantalla de PIN (si está activada).
   Es el único archivo que se ejecuta al cargar la página: todo lo
   demás son funciones que este archivo invoca en el orden correcto.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  cargarEstado();
  aplicarTema();

  if (typeof iniciarSistemaSync === 'function' && syncHabilitado()) {
    await iniciarSistemaSync();
    aplicarTema();
  }

  // PIN: solo pedir si la sesión es nueva (cerró la pestaña o navegador).
  // sessionStorage se borra al cerrar pestaña, pero persiste al recargar (F5).
  var yaDesbloqueado = sessionStorage.getItem('cofre_unlocked') === 'true';

  if (STATE.config.pinHabilitado && STATE.config.pin && !yaDesbloqueado) {
    mostrarPantallaPin();
  } else {
    iniciarApp();
  }
});

function iniciarApp() {
  configurarNavegacion();
  configurarSidebarMobile();
  configurarFab();
  configurarAtajosRapidosDashboard();
  navegarA('dashboard');
}

/* ------------------------------ NAVEGACIÓN ------------------------------ */

function configurarNavegacion() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navegarA(btn.dataset.view));
  });

  document.getElementById('btnTema').addEventListener('click', () => {
    STATE.config.tema = STATE.config.tema === 'oscuro' ? 'claro' : 'oscuro';
    guardarEstado();
    aplicarTema();
  });

  document.getElementById('btnNotif').addEventListener('click', () => navegarA('pendientes'));
}

function configurarSidebarMobile() {
  document.getElementById('btnMenu').addEventListener('click', abrirSidebarMobile);
  document.getElementById('sidebarOverlay').addEventListener('click', cerrarSidebarMobile);
}

/* --------------------------------- FAB --------------------------------- */

function configurarFab() {
  const fab = document.getElementById('fabAdd');
  fab.addEventListener('click', () => {
    const abierto = document.getElementById('fabMenu').classList.contains('is-open');
    if (abierto) cerrarFabMenu();
    else abrirFabMenu();
  });

  document.getElementById('fabOverlay').addEventListener('click', cerrarFabMenu);

  document.querySelectorAll('#fabMenu button').forEach(btn => {
    btn.addEventListener('click', () => {
      cerrarFabMenu();
      const accion = btn.dataset.action;
      if (accion === 'ingreso')             abrirModalIngreso();
      else if (accion === 'gasto')          abrirModalGasto();
      else if (accion === 'transferencia')  abrirModalTransferencia();
      else if (accion === 'pago-pendiente') abrirModalPendiente();
      else if (accion === 'prestamo')       abrirModalNuevoPrestamo();
    });
  });
}

function configurarAtajosRapidosDashboard() {}

/* ------------------------------ PIN DE ACCESO ---------------------------- */

function mostrarPantallaPin() {
  var pinCorrecto = String(STATE.config.pin || '');

  var overlay = document.createElement('div');
  overlay.id = 'pinOverlay';
  overlay.innerHTML = `
    <div class="pin-card">
      <div class="pin-logo">⬡</div>
      <h2 class="pin-title">Cofre</h2>
      <p class="pin-sub">Ingresa tu PIN para continuar</p>
      <form id="formPinAcceso">
        <div class="pin-dots" id="pinDots">
          <span></span><span></span><span></span><span></span>
        </div>
        <input type="tel" id="inputPinAcceso" inputmode="numeric" maxlength="4"
          autocomplete="off" autofocus
          style="position:absolute; opacity:0; pointer-events:none;">
        <p id="errorPin" class="pin-error">PIN incorrecto</p>
        <div class="pin-numpad" id="pinNumpad">
          <button type="button" data-n="1">1</button>
          <button type="button" data-n="2">2</button>
          <button type="button" data-n="3">3</button>
          <button type="button" data-n="4">4</button>
          <button type="button" data-n="5">5</button>
          <button type="button" data-n="6">6</button>
          <button type="button" data-n="7">7</button>
          <button type="button" data-n="8">8</button>
          <button type="button" data-n="9">9</button>
          <button type="button" data-n="" disabled style="visibility:hidden;"></button>
          <button type="button" data-n="0">0</button>
          <button type="button" data-n="del" class="pin-del">←</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  var input = document.getElementById('inputPinAcceso');
  var dots  = document.querySelectorAll('#pinDots span');
  var error = document.getElementById('errorPin');

  function actualizarDots() {
    var len = input.value.length;
    dots.forEach(function(d, i) {
      d.className = i < len ? 'filled' : '';
    });
  }

  function verificar() {
    if (input.value.length < 4) return;
    var valor = String(input.value).trim();
    if (valor === pinCorrecto) {
      // Marcar sesión como desbloqueada → no pide PIN al recargar
      sessionStorage.setItem('cofre_unlocked', 'true');
      dots.forEach(function(d) { d.className = 'correct'; });
      setTimeout(function() {
        overlay.remove();
        iniciarApp();
      }, 300);
    } else {
      dots.forEach(function(d) { d.className = 'wrong'; });
      error.classList.add('visible');
      setTimeout(function() {
        input.value = '';
        actualizarDots();
        error.classList.remove('visible');
      }, 800);
    }
  }

  // Numpad táctil
  document.getElementById('pinNumpad').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-n]');
    if (!btn) return;
    var n = btn.dataset.n;
    if (n === 'del') {
      input.value = input.value.slice(0, -1);
      actualizarDots();
    } else if (n && input.value.length < 4) {
      input.value += n;
      actualizarDots();
      if (input.value.length === 4) setTimeout(verificar, 150);
    }
  });

  // También soportar teclado físico
  input.addEventListener('input', function() {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    actualizarDots();
    if (input.value.length === 4) setTimeout(verificar, 150);
  });

  // Focus invisible para que el teclado físico funcione
  overlay.addEventListener('click', function(e) {
    if (!e.target.closest('[data-n]')) input.focus();
  });
  input.focus();
}
