/* =========================================================================
   VISTA: PAGOS PENDIENTES
   ========================================================================= */

function renderPendientes() {
  const main = document.getElementById('mainContent');
  const pendientes = STATE.pagosPendientes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  const pagados = STATE.pagosPendientes.filter(p => p.estado === 'pagado');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Pagos pendientes</h1>
        <p class="view-sub">Alquiler, servicios, suscripciones — alertas a 7 y 3 días del vencimiento</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevoPendiente">${icon('check')} Nuevo pago pendiente</button>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px;">
      ${statCard('Total pendiente', formatoMoneda(totalPagosPendientes()), 'alert-circle', 'azul', `${pendientes.length} pagos por confirmar`)}
      ${statCard('Pagados este periodo', formatoMoneda(pagados.reduce((s,p)=>s+p.monto,0)), 'check', 'verde', `${pagados.length} pagos completados`)}
    </div>

    <div class="section-title">Por vencer</div>
    ${pendientes.length === 0 ? emptyState('inbox', 'No tienes pagos pendientes', 'Cuando registres alquiler, servicios o suscripciones por pagar, aparecerán aquí.', 'Nuevo pago pendiente', 'btnEmptyPendiente') :
      `<div class="table-wrap table-scroll" style="margin-bottom:28px;">
        <table>
          <thead><tr><th>Descripción</th><th>Categoría</th><th>Vence</th><th>Estado</th><th>Monto</th><th></th></tr></thead>
          <tbody>${pendientes.map(p => filaPendiente(p)).join('')}</tbody>
        </table>
      </div>`
    }

    ${pagados.length > 0 ? `
    <div class="section-title">Historial de pagos realizados</div>
    <div class="table-wrap table-scroll">
      <table>
        <thead><tr><th>Descripción</th><th>Pagado el</th><th>Monto</th></tr></thead>
        <tbody>${pagados.map(p => `<tr><td>${p.descripcion}</td><td>${formatoFecha(p.fechaPago)}</td><td class="num">${formatoMoneda(p.monto)}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;

  main.querySelector('#btnNuevoPendiente')?.addEventListener('click', abrirModalPendiente);
  main.querySelector('#btnEmptyPendiente')?.addEventListener('click', abrirModalPendiente);

  main.querySelectorAll('[data-marcar-pagado]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalConfirmarPago(btn.dataset.marcarPagado));
  });
  main.querySelectorAll('[data-eliminar-pendiente]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar este pago pendiente?', () => {
        accionEliminarGenerico('pagosPendientes', btn.dataset.eliminarPendiente);
        toast('Pago pendiente eliminado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function filaPendiente(p) {
  const dias = diasHastaVencimiento(p.fechaVencimiento);
  let estadoPill;
  if (dias < 0) estadoPill = '<span class="pill pill-rojo">Vencido</span>';
  else if (dias <= 3) estadoPill = `<span class="pill pill-rojo">${dias} días</span>`;
  else if (dias <= 7) estadoPill = `<span class="pill pill-naranja">${dias} días</span>`;
  else estadoPill = `<span class="pill pill-gris">${dias} días</span>`;

  return `
    <tr>
      <td>${p.descripcion}${p.recurrente ? ' <span class="pill pill-azul" style="margin-left:4px;">Recurrente</span>' : ''}</td>
      <td>${nombreCategoria(p.categoria)}</td>
      <td>${formatoFecha(p.fechaVencimiento)}</td>
      <td>${estadoPill}</td>
      <td class="num">${formatoMoneda(p.monto)}</td>
      <td class="actions">
        <button class="btn btn-sm btn-primary" data-marcar-pagado="${p.id}">Pagar</button>
        <button class="btn btn-sm btn-ghost" data-eliminar-pendiente="${p.id}">${icon('trash')}</button>
      </td>
    </tr>
  `;
}

function abrirModalPendiente() {
  abrirModal('Nuevo pago pendiente', `
    <form id="formPendiente">
      <div class="field">
        <label>Descripción</label>
        <input type="text" name="descripcion" placeholder="Ej. Alquiler de junio" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Monto</label>
          <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
        </div>
        <div class="field">
          <label>Fecha de vencimiento</label>
          <input type="date" name="fechaVencimiento" required>
        </div>
      </div>
      <div class="field">
        <label>Categoría</label>
        <select name="categoria">${opcionesCategorias()}</select>
      </div>
      <label class="switch">
        <input type="checkbox" name="recurrente">
        <span class="switch-track"></span>
        <span style="font-size:13px;">Se repite cada mes</span>
      </label>
      <button type="submit" class="btn btn-primary btn-block mt-24">Guardar</button>
    </form>
  `, (body) => {
    body.querySelector('#formPendiente').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['descripcion', 'monto', 'fechaVencimiento', 'categoria', 'recurrente']);
        accionAgregarPagoPendiente(datos);
        cerrarModal();
        toast('Pago pendiente registrado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalConfirmarPago(pagoId) {
  const pago = STATE.pagosPendientes.find(p => p.id === pagoId);
  if (!pago) return;
  abrirModal(`Pagar ${pago.descripcion}`, `
    <form id="formConfirmarPago">
      <p class="field-hint" style="margin-bottom:16px;">Monto: <strong>${formatoMoneda(pago.monto)}</strong></p>
      <div class="field">
        <label>Pagar desde</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar pago</button>
    </form>
  `, (body) => {
    body.querySelector('#formConfirmarPago').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['cuentaId']);
        accionMarcarPagoRealizado({ pagoId, ...datos });
        cerrarModal();
        toast('Pago confirmado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
