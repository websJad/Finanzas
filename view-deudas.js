/* =========================================================================
   VISTA: DEUDAS
   ========================================================================= */

function renderDeudas() {
  const main = document.getElementById('mainContent');
  const activas = STATE.deudas.filter(d => d.estado !== 'pagada');
  const totalActivo = totalDeudasActivas();

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Deudas</h1>
        <p class="view-sub">Préstamos y cuotas — estado activa, parcial, pagada o vencida</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevaDeuda">${icon('check')} Nueva deuda</button>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px;">
      ${statCard('Deuda activa total', formatoMoneda(totalActivo), 'alert-triangle', 'naranja', `${activas.length} deudas pendientes`)}
      ${statCard('Deudas pagadas', STATE.deudas.filter(d => d.estado === 'pagada').length, 'check', 'verde', 'Felicitaciones por cerrarlas')}
    </div>

    ${STATE.deudas.length === 0 ? emptyState('alert-circle', 'Sin deudas registradas', 'Si tienes préstamos o compras en cuotas, regístralas aquí para controlarlas.', 'Nueva deuda', 'btnEmptyDeuda') : `
    <div class="grid grid-2">
      ${STATE.deudas.map(d => cardDeuda(d)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevaDeuda')?.addEventListener('click', abrirModalDeuda);
  main.querySelector('#btnEmptyDeuda')?.addEventListener('click', abrirModalDeuda);

  main.querySelectorAll('[data-abonar-deuda]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalAbono(btn.dataset.abonarDeuda));
  });
  main.querySelectorAll('[data-eliminar-deuda]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar esta deuda y su historial de abonos?', () => {
        accionEliminarGenerico('deudas', btn.dataset.eliminarDeuda);
        toast('Deuda eliminada.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardDeuda(d) {
  const pendiente = saldoPendienteDeuda(d);
  const pagado = d.montoOriginal - pendiente;
  const pct = d.montoOriginal > 0 ? (pagado / d.montoOriginal) * 100 : 0;
  const estadoPill = {
    activa: '<span class="pill pill-naranja">Activa</span>',
    parcial: '<span class="pill pill-azul">Parcial</span>',
    pagada: '<span class="pill pill-verde">Pagada</span>',
    vencida: '<span class="pill pill-rojo">Vencida</span>',
  }[d.estado] || '';

  return `
    <div class="card">
      <div class="flex-between" style="margin-bottom:10px;">
        <div>
          <div style="font-weight:600; font-size:15px;">${d.nombre}</div>
          <div class="text-faint" style="font-size:12px;">Desde ${formatoFecha(d.fechaInicio)}${d.cuotas ? ` · ${d.cuotas} cuotas` : ''}</div>
        </div>
        ${estadoPill}
      </div>
      <div class="progress-track" style="margin-bottom:8px;">
        <div class="progress-fill verde" style="width:${pct}%;"></div>
      </div>
      <div class="flex-between" style="margin-bottom:14px;">
        <span class="text-faint" style="font-size:12px;">Pagado ${formatoMoneda(pagado)}</span>
        <span class="text-faint" style="font-size:12px;">Original ${formatoMoneda(d.montoOriginal)}</span>
      </div>
      <div class="flex-between">
        <span class="mono" style="font-weight:600; font-size:17px; color:var(--naranja);">${formatoMoneda(pendiente)}</span>
        <div style="display:flex; gap:8px;">
          ${d.estado !== 'pagada' ? `<button class="btn btn-sm btn-primary" data-abonar-deuda="${d.id}">Abonar</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-eliminar-deuda="${d.id}">${icon('trash')}</button>
        </div>
      </div>
    </div>
  `;
}

function abrirModalDeuda() {
  abrirModal('Nueva deuda', `
    <form id="formDeuda">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" placeholder="Ej. Préstamo personal BBVA" required>
      </div>
      <div class="field">
        <label>Monto total</label>
        <input type="number" name="montoOriginal" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Número de cuotas (opcional)</label>
          <input type="number" name="cuotas" min="1" placeholder="Ej. 12">
        </div>
        <div class="field">
          <label>Tasa de interés % (opcional)</label>
          <input type="number" name="tasaInteres" step="0.01" min="0" placeholder="Ej. 2.5">
        </div>
      </div>
      <div class="field">
        <label>Fecha de inicio</label>
        <input type="date" name="fechaInicio" value="${hoyISO()}">
      </div>
      <button type="submit" class="btn btn-primary btn-block">Registrar deuda</button>
    </form>
  `, (body) => {
    body.querySelector('#formDeuda').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'montoOriginal', 'cuotas', 'tasaInteres', 'fechaInicio']);
        accionAgregarDeuda(datos);
        cerrarModal();
        toast('Deuda registrada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalAbono(deudaId) {
  const deuda = STATE.deudas.find(d => d.id === deudaId);
  if (!deuda) return;
  const pendiente = saldoPendienteDeuda(deuda);
  abrirModal(`Abonar a ${deuda.nombre}`, `
    <form id="formAbono">
      <p class="field-hint" style="margin-bottom:16px;">Saldo pendiente: <strong>${formatoMoneda(pendiente)}</strong></p>
      <div class="field">
        <label>Monto del abono</label>
        <input type="number" name="monto" step="0.01" min="0.01" max="${pendiente}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Pagar desde</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar abono</button>
    </form>
  `, (body) => {
    body.querySelector('#formAbono').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['monto', 'cuentaId']);
        accionAbonarDeuda({ deudaId, ...datos });
        cerrarModal();
        toast('Abono registrado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
