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

  // Iniciar sistema de sync (carga inicial + polling + visibilitychange)
  // Se ejecuta antes de mostrar PIN para que los datos estén frescos
  if (typeof iniciarSistemaSync === 'function' && syncHabilitado()) {
    await iniciarSistemaSync();
    aplicarTema(); // re-aplicar tema por si cambió en Sheets
  }

  if (STATE.config.pinHabilitado && STATE.config.pin) {
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

function configurarAtajosRapidosDashboard() {
  // Los botones del dashboard se re-vinculan en cada render de esa vista
  // (ver renderDashboard), así que aquí no se necesita lógica adicional.
}

/* ------------------------------ PIN DE ACCESO ---------------------------- */

function mostrarPantallaPin() {
  document.body.innerHTML = `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); padding:20px;">
      <div class="card" style="max-width:340px; width:100%; text-align:center;">
        <div class="brand-mark" style="margin:0 auto 16px;">F</div>
        <h2 style="margin-bottom:6px;">App protegida</h2>
        <p class="text-faint" style="font-size:13px; margin-bottom:20px;">Ingresa tu PIN de 4 dígitos para continuar</p>
        <form id="formPinAcceso">
          <input type="password" id="inputPinAcceso" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"
            style="text-align:center; font-size:24px; letter-spacing:10px; margin-bottom:14px;" autofocus>
          <p class="field-error" id="errorPin" style="display:none; margin-bottom:14px;">PIN incorrecto. Intenta de nuevo.</p>
          <button type="submit" class="btn btn-primary btn-block">Desbloquear</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('formPinAcceso').addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = document.getElementById('inputPinAcceso').value;
    if (valor === STATE.config.pin) {
      location.reload();
    } else {
      document.getElementById('errorPin').style.display = 'block';
      document.getElementById('inputPinAcceso').value = '';
      document.getElementById('inputPinAcceso').focus();
    }
  });
}
