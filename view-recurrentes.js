/* =========================================================================
   VISTA: GASTOS RECURRENTES
   ---------------------------------------------------------------------
   Netflix, gimnasio, seguros — gastos que se repiten cada mes en el
   mismo día. Se pueden pausar sin perder la configuración, y "Registrar
   este mes" los convierte en un gasto real dentro del módulo Gastos.
   ========================================================================= */

function renderRecurrentes() {
  const main = document.getElementById('mainContent');
  const activos = STATE.gastosRecurrentes.filter(r => !r.pausado);
  const totalMensual = activos.reduce((s, r) => s + r.monto, 0);
  const mesActual = hoyISO().slice(0, 7);

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Gastos recurrentes</h1>
        <p class="view-sub">Netflix, gimnasio, seguros — se registran solos cada mes</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevoRecurrente">${icon('check')} Nuevo recurrente</button>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:24px;">
      ${statCard('Compromiso mensual', formatoMoneda(totalMensual), 'repeat', 'naranja', `${activos.length} activos`)}
      ${statCard('Pausados', STATE.gastosRecurrentes.filter(r => r.pausado).length, 'alert-circle', 'azul', 'No se registran este mes')}
    </div>

    ${STATE.gastosRecurrentes.length === 0 ? emptyState('repeat', 'Sin gastos recurrentes', 'Agrega suscripciones o pagos fijos que se repiten cada mes y déjalos correr solos.', 'Nuevo recurrente', 'btnEmptyRecurrente') : `
    <div class="grid grid-3">
      ${STATE.gastosRecurrentes.map(r => cardRecurrente(r, mesActual)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevoRecurrente')?.addEventListener('click', abrirModalRecurrente);
  main.querySelector('#btnEmptyRecurrente')?.addEventListener('click', abrirModalRecurrente);

  main.querySelectorAll('[data-toggle-pausa]').forEach(btn => {
    btn.addEventListener('click', () => manejarError(() => {
      accionTogglePausaRecurrente(btn.dataset.togglePausa);
      refrescarVistaActual();
    }));
  });
  main.querySelectorAll('[data-registrar-recurrente]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalRegistrarRecurrente(btn.dataset.registrarRecurrente));
  });
  main.querySelectorAll('[data-eliminar-recurrente]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar este gasto recurrente? Ya no se registrará automáticamente.', () => {
        accionEliminarGenerico('gastosRecurrentes', btn.dataset.eliminarRecurrente);
        toast('Recurrente eliminado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardRecurrente(r, mesActual) {
  const registradoEsteMes = r.ultimoRegistro === mesActual;
  return `
    <div class="card" style="${r.pausado ? 'opacity:0.6;' : ''}">
      <div class="flex-between" style="margin-bottom:10px;">
        <div>
          <div style="font-weight:600; font-size:15px;">${r.nombre}</div>
          <div class="text-faint" style="font-size:12px;">${nombreCategoria(r.categoria)} · día ${r.diaDelMes} de cada mes</div>
        </div>
        <button class="btn btn-sm btn-ghost" data-eliminar-recurrente="${r.id}">${icon('trash')}</button>
      </div>
      <div class="mono" style="font-size:22px; font-weight:600; margin-bottom:14px; color:${r.pausado ? 'var(--text-faint)' : 'var(--naranja)'};">${formatoMoneda(r.monto)}</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-sm" data-toggle-pausa="${r.id}">${r.pausado ? '▶ Reanudar' : '⏸ Pausar'}</button>
        ${!r.pausado ? (registradoEsteMes
          ? `<span class="pill pill-verde">${icon('check')} Registrado este mes</span>`
          : `<button class="btn btn-sm btn-primary" data-registrar-recurrente="${r.id}">Registrar este mes</button>`) : ''}
      </div>
    </div>
  `;
}

function abrirModalRecurrente() {
  abrirModal('Nuevo gasto recurrente', `
    <form id="formRecurrente">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" placeholder="Ej. Netflix" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Monto mensual</label>
          <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
        </div>
        <div class="field">
          <label>Día del mes</label>
          <input type="number" name="diaDelMes" min="1" max="31" value="1">
        </div>
      </div>
      <div class="field">
        <label>Categoría</label>
        <select name="categoria">${opcionesCategorias('suscripciones')}</select>
      </div>
      <p class="field-hint" style="margin-bottom:16px;">Este gasto no se registra solo en tu saldo: cada mes podrás confirmarlo con un clic desde aquí.</p>
      <button type="submit" class="btn btn-primary btn-block">Guardar recurrente</button>
    </form>
  `, (body) => {
    body.querySelector('#formRecurrente').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'monto', 'diaDelMes', 'categoria']);
        accionAgregarGastoRecurrente(datos);
        cerrarModal();
        toast('Gasto recurrente creado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalRegistrarRecurrente(recurrenteId) {
  const rec = STATE.gastosRecurrentes.find(r => r.id === recurrenteId);
  if (!rec) return;
  if (STATE.cuentas.length === 0 && STATE.tarjetas.length === 0) {
    toast('Primero crea una cuenta o tarjeta.', 'warning');
    return;
  }
  abrirModal(`Registrar ${rec.nombre} de este mes`, `
    <form id="formRegistrarRecurrente">
      <p class="field-hint" style="margin-bottom:16px;">Esto crea un gasto de <strong>${formatoMoneda(rec.monto)}</strong> en la categoría ${nombreCategoria(rec.categoria)}.</p>
      <div class="field">
        <label>Pagar con</label>
        <div class="toggle-group" id="toggleOrigenRecurrente">
          <button type="button" class="toggle-opt selected" data-valor="cuenta">Cuenta</button>
          <button type="button" class="toggle-opt" data-valor="tarjeta" ${STATE.tarjetas.length === 0 ? 'disabled' : ''}>Tarjeta de crédito</button>
        </div>
      </div>
      <div class="field" id="campoCuentaRecurrente">
        <label>Cuenta</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field" id="campoTarjetaRecurrente" style="display:none;">
        <label>Tarjeta</label>
        <select name="tarjetaId">${opcionesTarjetas()}</select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Confirmar registro</button>
    </form>
  `, (body) => {
    let origen = 'cuenta';
    body.querySelectorAll('#toggleOrigenRecurrente .toggle-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.disabled) return;
        body.querySelectorAll('#toggleOrigenRecurrente .toggle-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        origen = opt.dataset.valor;
        body.querySelector('#campoCuentaRecurrente').style.display = origen === 'cuenta' ? '' : 'none';
        body.querySelector('#campoTarjetaRecurrente').style.display = origen === 'tarjeta' ? '' : 'none';
      });
    });
    body.querySelector('#formRegistrarRecurrente').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['cuentaId', 'tarjetaId']);
        accionAgregarGasto({
          descripcion: rec.nombre,
          monto: rec.monto,
          categoria: rec.categoria,
          cuentaId: origen === 'cuenta' ? datos.cuentaId : null,
          tarjetaId: origen === 'tarjeta' ? datos.tarjetaId : null,
        });
        rec.ultimoRegistro = hoyISO().slice(0, 7);
        guardarEstado();
        cerrarModal();
        toast(`${rec.nombre} registrado como gasto de este mes.`, 'success');
        refrescarVistaActual();
      });
    });
  });
}
