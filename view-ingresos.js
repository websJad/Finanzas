/* =========================================================================
   VISTA: INGRESOS
   ========================================================================= */

function renderIngresos() {
  const main = document.getElementById('mainContent');
  const recibidos = totalIngresosRecibidos();
  const pendientes = totalIngresosPendientes();

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Ingresos</h1>
        <p class="view-sub">Sueldo, ventas, comisiones y devoluciones</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevoIngreso">${icon('check')} Nuevo ingreso</button>
      </div>
    </div>

    <div class="grid grid-2 mt-24" style="margin-bottom:24px;">
      ${statCard('Recibidos', formatoMoneda(recibidos), 'check', 'verde', 'Ya suman a tu saldo')}
      ${statCard('Pendientes', formatoMoneda(pendientes), 'alert-circle', 'azul', 'Aún no confirmados')}
    </div>

    ${STATE.ingresos.length === 0 ? emptyState('check', 'Sin ingresos registrados', 'Registra tu primer ingreso para empezar a ver tu saldo real.', 'Nuevo ingreso', 'btnEmptyIngreso') : `
    <div class="table-wrap table-scroll">
      <table>
        <thead><tr><th>Descripción</th><th>Cuenta</th><th>Fecha</th><th>Estado</th><th>Monto</th><th></th></tr></thead>
        <tbody>
          ${STATE.ingresos.map(i => filaIngreso(i)).join('')}
        </tbody>
      </table>
    </div>`}
  `;

  main.querySelector('#btnNuevoIngreso')?.addEventListener('click', () => abrirModalIngreso());
  main.querySelector('#btnEmptyIngreso')?.addEventListener('click', () => abrirModalIngreso());

  main.querySelectorAll('[data-marcar-recibido]').forEach(btn => {
    btn.addEventListener('click', () => manejarError(() => {
      accionMarcarIngresoRecibido(btn.dataset.marcarRecibido);
      toast('Ingreso marcado como recibido.', 'success');
      refrescarVistaActual();
    }));
  });

  main.querySelectorAll('[data-eliminar-ingreso]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('Esto eliminará el ingreso del historial y de tu saldo si ya estaba recibido. ¿Continuar?', () => {
        accionEliminarGenerico('ingresos', btn.dataset.eliminarIngreso);
        toast('Ingreso eliminado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function filaIngreso(i) {
  const cuenta = STATE.cuentas.find(c => c.id === i.cuentaId);
  return `
    <tr>
      <td>${i.descripcion}</td>
      <td>${cuenta ? cuenta.nombre : '—'}</td>
      <td>${formatoFecha(i.fecha)}</td>
      <td>${i.estado === 'recibido' ? '<span class="pill pill-verde">Recibido</span>' : '<span class="pill pill-azul">Pendiente</span>'}</td>
      <td class="num" style="color:var(--verde); font-weight:600;">+${formatoMoneda(i.monto)}</td>
      <td class="actions">
        ${i.estado === 'pendiente' ? `<button class="btn btn-sm" data-marcar-recibido="${i.id}">Marcar recibido</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-eliminar-ingreso="${i.id}">${icon('trash')}</button>
      </td>
    </tr>
  `;
}

function emptyState(iconName, titulo, texto, botonLabel, botonId) {
  return `
    <div class="empty-state card">
      ${icon(iconName)}
      <h3>${titulo}</h3>
      <p>${texto}</p>
      ${botonLabel ? `<button class="btn btn-primary" id="${botonId}">${botonLabel}</button>` : ''}
    </div>
  `;
}

function abrirModalIngreso() {
  if (STATE.cuentas.length === 0) {
    toast('Primero crea una cuenta en el módulo Cuentas.', 'warning');
    return;
  }
  abrirModal('Nuevo ingreso', `
    <form id="formIngreso">
      <div class="field">
        <label>Descripción</label>
        <input type="text" name="descripcion" placeholder="Ej. Sueldo de junio" required>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Monto</label>
          <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
        </div>
        <div class="field">
          <label>Fecha</label>
          <input type="date" name="fecha" value="${hoyISO()}">
        </div>
      </div>
      <div class="field">
        <label>Cuenta de destino</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field">
        <label>Estado</label>
        <div class="toggle-group" id="toggleEstadoIngreso">
          <button type="button" class="toggle-opt selected" data-valor="recibido">Recibido</button>
          <button type="button" class="toggle-opt" data-valor="pendiente">Pendiente</button>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar ingreso</button>
    </form>
  `, (body) => {
    let estado = 'recibido';
    body.querySelectorAll('#toggleEstadoIngreso .toggle-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        body.querySelectorAll('#toggleEstadoIngreso .toggle-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        estado = opt.dataset.valor;
      });
    });
    body.querySelector('#formIngreso').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['descripcion', 'monto', 'fecha', 'cuentaId']);
        accionAgregarIngreso({ ...datos, estado });
        cerrarModal();
        toast('Ingreso registrado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
