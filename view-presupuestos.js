/* =========================================================================
   VISTA: PRESUPUESTOS
   ========================================================================= */

function renderPresupuestos() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Presupuestos</h1>
        <p class="view-sub">Límite mensual por categoría — alerta al superar el 80%</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevoPresupuesto">${icon('check')} Nuevo presupuesto</button>
      </div>
    </div>

    ${STATE.presupuestos.length === 0 ? emptyState('target', 'Sin presupuestos definidos', 'Define un límite mensual por categoría para controlar tu gasto antes de que se salga de control.', 'Nuevo presupuesto', 'btnEmptyPresupuesto') : `
    <div class="grid grid-3">
      ${STATE.presupuestos.map(p => cardPresupuesto(p)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevoPresupuesto')?.addEventListener('click', abrirModalPresupuesto);
  main.querySelector('#btnEmptyPresupuesto')?.addEventListener('click', abrirModalPresupuesto);

  main.querySelectorAll('[data-eliminar-presupuesto]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar este presupuesto?', () => {
        accionEliminarGenerico('presupuestos', btn.dataset.eliminarPresupuesto);
        toast('Presupuesto eliminado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardPresupuesto(p) {
  const usado = totalGastoCategoriaMesActual(p.categoria);
  const pct = p.limite > 0 ? (usado / p.limite) * 100 : 0;
  const color = pct >= 100 ? 'rojo' : pct >= 80 ? 'naranja' : 'verde';
  return `
    <div class="card">
      <div class="flex-between" style="margin-bottom:12px;">
        <div style="font-weight:600;">${nombreCategoria(p.categoria)}</div>
        <button class="btn btn-sm btn-ghost" data-eliminar-presupuesto="${p.id}">${icon('trash')}</button>
      </div>
      <div class="progress-track" style="margin-bottom:10px;">
        <div class="progress-fill ${color}" style="width:${Math.min(pct,100)}%;"></div>
      </div>
      <div class="flex-between">
        <span class="mono" style="font-weight:600; font-size:14px;">${formatoMoneda(usado)}</span>
        <span class="text-faint" style="font-size:12.5px;">de ${formatoMoneda(p.limite)}</span>
      </div>
      ${pct >= 80 ? `<div class="pill ${pct >= 100 ? 'pill-rojo' : 'pill-naranja'}" style="margin-top:10px;">${icon('alert-triangle')} ${pct >= 100 ? 'Presupuesto superado' : 'Cerca del límite'}</div>` : ''}
    </div>
  `;
}

function abrirModalPresupuesto() {
  abrirModal('Nuevo presupuesto', `
    <form id="formPresupuesto">
      <div class="field">
        <label>Categoría</label>
        <select name="categoria">${opcionesCategorias()}</select>
      </div>
      <div class="field">
        <label>Límite mensual</label>
        <input type="number" name="limite" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar presupuesto</button>
    </form>
  `, (body) => {
    body.querySelector('#formPresupuesto').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['categoria', 'limite']);
        accionAgregarPresupuesto(datos);
        cerrarModal();
        toast('Presupuesto guardado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
