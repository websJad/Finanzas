/* =========================================================================
   FINANZAS — UI COMPARTIDA: router de vistas, modal, toasts, iconos
   ========================================================================= */

const ICONS = {
  'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2s2-.9 2-2V2M5 11v11M11 2v20M19 2c-1.5 0-3 1.5-3 4v6c0 1 .5 2 2 2s2-1 2-2"/>',
  'bus': '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 17v3M16 17v3"/><circle cx="7.5" cy="14" r="0.5"/><circle cx="16.5" cy="14" r="0.5"/>',
  'home': '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  'zap': '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  'heart-pulse': '<path d="M20.4 8.8c0-2.5-2-4.3-4.3-4.3-1.5 0-2.8.8-3.6 2-.8-1.2-2-2-3.6-2C6.6 4.5 4.6 6.3 4.6 8.8c0 1.3.5 2.4 1.3 3.2L12 18.5l6.1-6.4c.8-.9 1.3-2 1.3-3.3z"/><path d="M7 11h2.5l1.5-3 2 5 1.5-2H17"/>',
  'book': '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  'shield': '<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>',
  'sparkles': '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
  'paw-print': '<circle cx="7" cy="9" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="4" cy="14" r="1.6"/><circle cx="20" cy="14" r="1.6"/><path d="M12 13c-3 0-5.5 2-5.5 4.5S8.5 21 12 21s5.5-1 5.5-3.5S15 13 12 13z"/>',
  'sofa': '<path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M3 11h18v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5 17v3M19 17v3"/>',
  'clapperboard': '<path d="M3 8l2-4h3l-2 4M9 8l2-4h3l-2 4M15 8l2-4h2l-2 4"/><rect x="3" y="8" width="18" height="12" rx="1"/>',
  'utensils-crossed': '<path d="M16 2l-6 6M11 7l-5-5M16 2l5 5-9 9-3 3-3-3 3-3 9-9z"/>',
  'shopping-bag': '<path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  'repeat': '<path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  'plane': '<path d="M2 16l20-8-8 20-3-9-9-3z"/>',
  'gift': '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/>',
  'wine': '<path d="M8 2h8l-1 9a3 3 0 0 1-6 0z"/><path d="M12 14v7M8 21h8"/>',
  'more-horizontal': '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  'check': '<path d="M20 6L9 17l-5-5"/>',
  'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  'alert-triangle': '<path d="M12 3l9.5 17H2.5z"/><path d="M12 9v4M12 16.5h.01"/>',
  'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  'trash': '<path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"/>',
  'edit': '<path d="M12 20h9"/><path d="M16.5 3.5l4 4L8 20H4v-4z"/>',
  'wallet': '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3h-5a2 2 0 0 0 0 4h5v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="12" r="1"/>',
  'bank': '<path d="M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M9 21v-7M15 21v-7"/>',
  'phone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  'inbox': '<path d="M3 8l3-6h12l3 6"/><path d="M3 8v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8"/><path d="M3 8h5l1.5 3h5L16 8h5"/>',
};

function icon(name, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ------------------------------- TOASTS --------------------------------- */

function toast(mensaje, tipo) {
  tipo = tipo || 'info';
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  const icons = { success: 'check', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
  el.innerHTML = `${icon(icons[tipo] || 'info')}<span>${mensaje}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 200ms, transform 200ms';
    el.style.opacity = '0';
    el.style.transform = 'translateX(16px)';
    setTimeout(() => el.remove(), 220);
  }, 4200);
}

/* -------------------------------- MODAL ---------------------------------- */

function abrirModal(titulo, html, onMount) {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('is-open');
  if (onMount) onMount(document.getElementById('modalBody'));
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('is-open');
  document.getElementById('modalBody').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalClose').addEventListener('click', cerrarModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') cerrarModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarModal();
      cerrarFabMenu();
    }
  });
});

function confirmar(mensaje, onConfirm, opts) {
  opts = opts || {};
  abrirModal(opts.titulo || 'Confirmar acción', `
    <p class="confirm-text">${mensaje}</p>
    <div class="flex-between" style="gap:10px;">
      <button class="btn btn-block" id="confirmCancel">Cancelar</button>
      <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'} btn-block" id="confirmOk">${opts.okLabel || 'Confirmar'}</button>
    </div>
  `, (body) => {
    body.querySelector('#confirmCancel').addEventListener('click', cerrarModal);
    body.querySelector('#confirmOk').addEventListener('click', () => {
      cerrarModal();
      onConfirm();
    });
  });
}

/* ------------------------------ HELPERS FORM ------------------------------ */

function opcionesCuentas(seleccionId) {
  return STATE.cuentas.map(c =>
    `<option value="${c.id}" ${c.id === seleccionId ? 'selected' : ''}>${c.nombre} — ${formatoMoneda(saldoCuenta(c.id))}</option>`
  ).join('');
}

function opcionesCategorias(seleccionId) {
  return CATEGORIAS_GASTO.map(c =>
    `<option value="${c.id}" ${c.id === seleccionId ? 'selected' : ''}>${c.nombre}</option>`
  ).join('');
}

function opcionesTarjetas(seleccionId) {
  return STATE.tarjetas.map(t =>
    `<option value="${t.id}" ${t.id === seleccionId ? 'selected' : ''}>${t.nombre} — disp. ${formatoMoneda(t.limite - t.consumoActual)}</option>`
  ).join('');
}

function leerForm(form, campos) {
  const datos = {};
  campos.forEach(c => {
    const el = form.querySelector(`[name="${c}"]`);
    if (!el) return;
    if (el.type === 'checkbox') datos[c] = el.checked;
    else if (el.type === 'number') datos[c] = el.value === '' ? null : parseFloat(el.value);
    else datos[c] = el.value;
  });
  return datos;
}

function manejarError(fn) {
  try {
    fn();
  } catch (e) {
    toast(e.message || 'Ocurrió un error.', 'error');
  }
}

/* -------------------------------- ROUTER --------------------------------- */

const VISTAS = {
  dashboard: { render: () => renderDashboard(), titulo: 'Dashboard' },
  ingresos: { render: () => renderIngresos(), titulo: 'Ingresos' },
  gastos: { render: () => renderGastos(), titulo: 'Gastos' },
  cuentas: { render: () => renderCuentas(), titulo: 'Cuentas' },
  tarjetas: { render: () => renderTarjetas(), titulo: 'Tarjetas' },
  deudas: { render: () => renderDeudas(), titulo: 'Deudas' },
  pendientes: { render: () => renderPendientes(), titulo: 'Pagos pendientes' },
  presupuestos: { render: () => renderPresupuestos(), titulo: 'Presupuestos' },
  metas: { render: () => renderMetas(), titulo: 'Metas de ahorro' },
  recurrentes: { render: () => renderRecurrentes(), titulo: 'Gastos recurrentes' },
  prestamos: { render: () => renderPrestamos(), titulo: 'Préstamos otorgados' },
  historial: { render: () => renderHistorial(), titulo: 'Historial' },
  reportes: { render: () => renderReportes(), titulo: 'Reportes' },
  analisis: { render: () => renderAnalisis(), titulo: 'Análisis inteligente' },
  configuracion: { render: () => renderConfiguracion(), titulo: 'Configuración' },
};

let VISTA_ACTUAL = 'dashboard';

function navegarA(vista) {
  if (!VISTAS[vista]) vista = 'dashboard';
  VISTA_ACTUAL = vista;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === vista);
  });
  VISTAS[vista].render();
  cerrarSidebarMobile();
  document.getElementById('mainContent').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });
  actualizarTopbarYBadges();
}

function refrescarVistaActual() {
  VISTAS[VISTA_ACTUAL].render();
  actualizarTopbarYBadges();
}

function actualizarTopbarYBadges() {
  document.getElementById('topbarSaldo').textContent = formatoMoneda(saldoDisponibleReal());

  const pendientesUrgentes = STATE.pagosPendientes.filter(p =>
    p.estado === 'pendiente' && diasHastaVencimiento(p.fechaVencimiento) <= 7
  );
  const badgeNav = document.getElementById('navBadgePendientes');
  if (pendientesUrgentes.length > 0) {
    badgeNav.hidden = false;
    badgeNav.textContent = pendientesUrgentes.length;
  } else {
    badgeNav.hidden = true;
  }

  const notifBadge = document.getElementById('notifBadge');
  notifBadge.hidden = pendientesUrgentes.length === 0;
}

/* ------------------------------ SIDEBAR MOBILE ----------------------------- */

function abrirSidebarMobile() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}
function cerrarSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* --------------------------------- FAB ------------------------------------ */

function abrirFabMenu() {
  document.getElementById('fabMenu').classList.add('is-open');
  document.getElementById('fabOverlay').classList.add('is-open');
  document.getElementById('fabAdd').classList.add('open');
}
function cerrarFabMenu() {
  document.getElementById('fabMenu').classList.remove('is-open');
  document.getElementById('fabOverlay').classList.remove('is-open');
  document.getElementById('fabAdd').classList.remove('open');
}
