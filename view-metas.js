/* =========================================================================
   VISTA: METAS DE AHORRO
   ========================================================================= */

function renderMetas() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Metas de ahorro</h1>
        <p class="view-sub">Monto objetivo, fecha y progreso — aporte manual</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevaMeta">${icon('check')} Nueva meta</button>
      </div>
    </div>

    ${STATE.metas.length === 0 ? emptyState('target', 'Sin metas de ahorro', 'Define una meta — un viaje, un fondo de emergencia, lo que sea — y registra tus aportes.', 'Nueva meta', 'btnEmptyMeta') : `
    <div class="grid grid-3">
      ${STATE.metas.map(m => cardMeta(m)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevaMeta')?.addEventListener('click', abrirModalMeta);
  main.querySelector('#btnEmptyMeta')?.addEventListener('click', abrirModalMeta);

  main.querySelectorAll('[data-aportar-meta]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalAporte(btn.dataset.aportarMeta));
  });
  main.querySelectorAll('[data-eliminar-meta]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar esta meta y su historial de aportes?', () => {
        accionEliminarGenerico('metas', btn.dataset.eliminarMeta);
        toast('Meta eliminada.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardMeta(m) {
  const aportado = totalAportadoMeta(m);
  const pct = m.montoObjetivo > 0 ? Math.min((aportado / m.montoObjetivo) * 100, 100) : 0;
  const completa = aportado >= m.montoObjetivo;
  return `
    <div class="card">
      <div class="flex-between" style="margin-bottom:10px;">
        <div style="font-weight:600;">${m.nombre}</div>
        <button class="btn btn-sm btn-ghost" data-eliminar-meta="${m.id}">${icon('trash')}</button>
      </div>
      <div class="progress-track" style="margin-bottom:10px;">
        <div class="progress-fill ${completa ? 'verde' : 'azul'}" style="width:${pct}%;"></div>
      </div>
      <div class="flex-between" style="margin-bottom:14px;">
        <span class="mono" style="font-weight:600;">${formatoMoneda(aportado)}</span>
        <span class="text-faint" style="font-size:12.5px;">de ${formatoMoneda(m.montoObjetivo)}</span>
      </div>
      ${m.fechaObjetivo ? `<div class="text-faint" style="font-size:12px; margin-bottom:12px;">Meta para ${formatoFecha(m.fechaObjetivo)}</div>` : ''}
      ${completa
        ? '<div class="pill pill-verde">¡Meta cumplida!</div>'
        : `<button class="btn btn-sm btn-primary btn-block" data-aportar-meta="${m.id}">Aportar</button>`}
    </div>
  `;
}

function abrirModalMeta() {
  abrirModal('Nueva meta de ahorro', `
    <form id="formMeta">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" placeholder="Ej. Fondo de emergencia" required>
      </div>
      <div class="field">
        <label>Monto objetivo</label>
        <input type="number" name="montoObjetivo" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Fecha objetivo (opcional)</label>
        <input type="date" name="fechaObjetivo">
      </div>
      <button type="submit" class="btn btn-primary btn-block">Crear meta</button>
    </form>
  `, (body) => {
    body.querySelector('#formMeta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'montoObjetivo', 'fechaObjetivo']);
        accionAgregarMeta(datos);
        cerrarModal();
        toast('Meta creada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalAporte(metaId) {
  const meta = STATE.metas.find(m => m.id === metaId);
  if (!meta) return;
  if (STATE.cuentas.length === 0) { toast('Primero crea una cuenta.', 'warning'); return; }
  const restante = meta.montoObjetivo - totalAportadoMeta(meta);
  abrirModal(`Aportar a ${meta.nombre}`, `
    <form id="formAporte">
      <p class="field-hint" style="margin-bottom:16px;">Restante para completar: <strong>${formatoMoneda(restante)}</strong></p>
      <div class="field">
        <label>Desde qué cuenta / billetera</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field">
        <label>Monto a aportar</label>
        <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <p class="field-hint">El monto se descontará de la cuenta elegida y aparecerá en tus gastos del mes.</p>
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px;">Confirmar aporte</button>
    </form>
  `, (body) => {
    body.querySelector('#formAporte').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['monto', 'cuentaId']);
        accionAportarMeta({ metaId, ...datos });
        cerrarModal();
        toast('Aporte registrado y descontado de tu cuenta.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
