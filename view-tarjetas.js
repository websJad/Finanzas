/* =========================================================================
   VISTA: TARJETAS
   ========================================================================= */

function renderTarjetas() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Tarjetas</h1>
        <p class="view-sub">Límite, consumo, disponible y alertas de corte y pago mínimo</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevaTarjeta">${icon('check')} Nueva tarjeta</button>
      </div>
    </div>

    ${STATE.tarjetas.length === 0 ? emptyState('wallet', 'Sin tarjetas registradas', 'Agrega tus tarjetas de crédito para controlar consumo y fechas de corte.', 'Nueva tarjeta', 'btnEmptyTarjeta') : `
    <div class="grid grid-3">
      ${STATE.tarjetas.map(t => cardTarjeta(t)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevaTarjeta')?.addEventListener('click', abrirModalTarjeta);
  main.querySelector('#btnEmptyTarjeta')?.addEventListener('click', abrirModalTarjeta);

  main.querySelectorAll('[data-pagar-tarjeta]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalPagoTarjeta(btn.dataset.pagarTarjeta));
  });
  main.querySelectorAll('[data-editar-tarjeta]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditarTarjeta(btn.dataset.editarTarjeta));
  });
  main.querySelectorAll('[data-eliminar-tarjeta]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar esta tarjeta? Solo es posible si no tiene gastos asociados.', () => {
        manejarError(() => {
          accionEliminarTarjeta(btn.dataset.eliminarTarjeta);
          toast('Tarjeta eliminada.', 'success');
          refrescarVistaActual();
        });
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardTarjeta(t) {
  const disponible = t.limite - t.consumoActual;
  const pctUsado = t.limite > 0 ? (t.consumoActual / t.limite) * 100 : 0;
  const critico = pctUsado >= 80;
  return `
    <div class="card-credit">
      <div class="card-credit-top">
        <div>
          <div class="card-credit-name">${t.nombre}</div>
          <div class="card-credit-limit">Límite ${formatoMoneda(t.limite)} · corte día ${t.diaCorte}</div>
        </div>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-sm btn-ghost" data-editar-tarjeta="${t.id}" title="Editar">${icon('edit')}</button>
          <button class="btn btn-sm btn-ghost" data-eliminar-tarjeta="${t.id}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>
      <div>
        <div class="flex-between" style="margin-bottom:6px;">
          <span class="text-faint" style="font-size:11.5px;">Consumido</span>
          <span class="text-faint" style="font-size:11.5px;">${pctUsado.toFixed(0)}%</span>
        </div>
        <div class="progress-track" style="margin-bottom:8px;">
          <div class="progress-fill ${critico ? 'rojo' : 'naranja'}" style="width:${Math.min(pctUsado,100)}%;"></div>
        </div>
        <div class="flex-between">
          <span class="card-credit-amount" style="color:${critico ? 'var(--rojo)' : 'var(--naranja)'};">${formatoMoneda(t.consumoActual)}</span>
          <button class="btn btn-sm btn-primary" data-pagar-tarjeta="${t.id}">Pagar tarjeta</button>
        </div>
        <div class="text-faint" style="font-size:11.5px; margin-top:6px;">Disponible: ${formatoMoneda(disponible)} · pago día ${t.diaPago}</div>
        ${critico ? `<div class="pill pill-rojo" style="margin-top:8px;">${icon('alert-triangle')} Cerca del límite</div>` : ''}
      </div>
    </div>
  `;
}

function abrirModalTarjeta() {
  abrirModal('Nueva tarjeta', `
    <form id="formTarjeta">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" placeholder="Ej. BCP Visa Gold" required>
      </div>
      <div class="field">
        <label>Límite de crédito</label>
        <input type="number" name="limite" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Día de corte</label>
          <input type="number" name="diaCorte" min="1" max="31" value="1">
        </div>
        <div class="field">
          <label>Día de pago</label>
          <input type="number" name="diaPago" min="1" max="31" value="15">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Crear tarjeta</button>
    </form>
  `, (body) => {
    body.querySelector('#formTarjeta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'limite', 'diaCorte', 'diaPago']);
        accionAgregarTarjeta(datos);
        cerrarModal();
        toast('Tarjeta agregada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalEditarTarjeta(tarjetaId) {
  const t = STATE.tarjetas.find(x => x.id === tarjetaId);
  if (!t) return;
  abrirModal(`Editar ${t.nombre}`, `
    <form id="formEditarTarjeta">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" value="${t.nombre}" required>
      </div>
      <div class="field">
        <label>Límite de crédito</label>
        <input type="number" name="limite" step="0.01" min="0.01" value="${t.limite}" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Día de corte</label>
          <input type="number" name="diaCorte" min="1" max="31" value="${t.diaCorte}">
        </div>
        <div class="field">
          <label>Día de pago</label>
          <input type="number" name="diaPago" min="1" max="31" value="${t.diaPago}">
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar cambios</button>
    </form>
  `, (body) => {
    body.querySelector('#formEditarTarjeta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'limite', 'diaCorte', 'diaPago']);
        accionEditarTarjeta({ tarjetaId, ...datos });
        cerrarModal();
        toast('Tarjeta actualizada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalPagoTarjeta(tarjetaId) {
  const tarjeta = STATE.tarjetas.find(t => t.id === tarjetaId);
  if (!tarjeta) return;
  abrirModal(`Pagar ${tarjeta.nombre}`, `
    <form id="formPagoTarjeta">
      <p class="field-hint" style="margin-bottom:16px;">Deuda actual: <strong>${formatoMoneda(tarjeta.consumoActual)}</strong></p>
      <div class="field">
        <label>Monto a pagar</label>
        <input type="number" name="monto" step="0.01" min="0.01" max="${tarjeta.consumoActual}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Pagar desde</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar pago</button>
    </form>
  `, (body) => {
    body.querySelector('#formPagoTarjeta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['monto', 'cuentaId']);
        accionPagarTarjeta({ tarjetaId, ...datos });
        cerrarModal();
        toast('Pago de tarjeta registrado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
