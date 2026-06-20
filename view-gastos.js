/* =========================================================================
   VISTA: GASTOS
   ========================================================================= */

function renderGastos() {
  const main = document.getElementById('mainContent');
  const total = totalGastosRealizados();
  const necesario = totalGastosPorTipo('necesario');
  const impulsivo = totalGastosPorTipo('impulsivo');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Gastos</h1>
        <p class="view-sub">18 categorías · tipo necesario o impulsivo</p>
      </div>
      <div class="view-header-actions">
        <select id="filtroCategoriaGasto" style="width:auto;">
          <option value="">Todas las categorías</option>
          ${opcionesCategorias()}
        </select>
        <button class="btn btn-primary" id="btnNuevoGasto">${icon('zap')} Nuevo gasto</button>
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom:24px;">
      ${statCard('Total gastado', formatoMoneda(total), 'zap', 'rojo', 'Todos los registros')}
      ${statCard('Necesario', formatoMoneda(necesario), 'home', 'azul', 'Gasto base de vida')}
      ${statCard('Impulsivo', formatoMoneda(impulsivo), 'shopping-bag', 'naranja', 'Gasto discrecional')}
    </div>

    <div id="gastosTablaWrap"></div>
  `;

  renderTablaGastos();

  main.querySelector('#btnNuevoGasto').addEventListener('click', () => abrirModalGasto());
  main.querySelector('#filtroCategoriaGasto').addEventListener('change', renderTablaGastos);
}

function renderTablaGastos() {
  const wrap = document.getElementById('gastosTablaWrap');
  const filtro = document.getElementById('filtroCategoriaGasto').value;
  const lista = filtro ? STATE.gastos.filter(g => g.categoria === filtro) : STATE.gastos;

  if (lista.length === 0) {
    wrap.innerHTML = emptyState('zap', 'Sin gastos en esta vista', 'Registra un gasto o cambia el filtro de categoría.');
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap table-scroll">
      <table>
        <thead><tr><th>Descripción</th><th>Categoría</th><th>Origen</th><th>Tipo</th><th>Fecha</th><th>Monto</th><th></th></tr></thead>
        <tbody>${lista.map(g => filaGasto(g)).join('')}</tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll('[data-eliminar-gasto]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar este gasto? Esto revertirá su efecto en el saldo o en el consumo de tarjeta.', () => {
        const gasto = STATE.gastos.find(g => g.id === btn.dataset.eliminarGasto);
        if (gasto && gasto.tarjetaId) {
          const tarjeta = STATE.tarjetas.find(t => t.id === gasto.tarjetaId);
          if (tarjeta) tarjeta.consumoActual = Math.max(0, tarjeta.consumoActual - gasto.monto);
        }
        accionEliminarGenerico('gastos', btn.dataset.eliminarGasto);
        toast('Gasto eliminado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function filaGasto(g) {
  const cat = CATEGORIAS_GASTO.find(c => c.id === g.categoria);
  const origen = g.tarjetaId
    ? STATE.tarjetas.find(t => t.id === g.tarjetaId)?.nombre + ' (tarjeta)'
    : STATE.cuentas.find(c => c.id === g.cuentaId)?.nombre || '—';
  return `
    <tr>
      <td>${g.descripcion}</td>
      <td><span class="pill pill-gris">${cat ? cat.nombre : g.categoria}</span></td>
      <td>${origen}</td>
      <td>${cat ? (cat.tipo === 'necesario' ? '<span class="pill pill-azul">Necesario</span>' : '<span class="pill pill-naranja">Impulsivo</span>') : '—'}</td>
      <td>${formatoFecha(g.fecha)}</td>
      <td class="num" style="color:var(--rojo); font-weight:600;">-${formatoMoneda(g.monto)}</td>
      <td class="actions"><button class="btn btn-sm btn-ghost" data-eliminar-gasto="${g.id}">${icon('trash')}</button></td>
    </tr>
  `;
}

function abrirModalGasto() {
  if (STATE.cuentas.length === 0 && STATE.tarjetas.length === 0) {
    toast('Primero crea una cuenta o tarjeta.', 'warning');
    return;
  }
  abrirModal('Nuevo gasto', `
    <form id="formGasto">
      <div class="field">
        <label>Descripción</label>
        <input type="text" name="descripcion" placeholder="Ej. Supermercado" required>
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
        <label>Categoría</label>
        <select name="categoria">${opcionesCategorias()}</select>
      </div>
      <div class="field">
        <label>Pagar con</label>
        <div class="toggle-group" id="toggleOrigenGasto">
          <button type="button" class="toggle-opt selected" data-valor="cuenta">Cuenta</button>
          <button type="button" class="toggle-opt" data-valor="tarjeta" ${STATE.tarjetas.length === 0 ? 'disabled' : ''}>Tarjeta de crédito</button>
        </div>
      </div>
      <div class="field" id="campoCuentaGasto">
        <label>Cuenta</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field" id="campoTarjetaGasto" style="display:none;">
        <label>Tarjeta</label>
        <select name="tarjetaId">${opcionesTarjetas()}</select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar gasto</button>
    </form>
  `, (body) => {
    let origen = 'cuenta';
    body.querySelectorAll('#toggleOrigenGasto .toggle-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.disabled) return;
        body.querySelectorAll('#toggleOrigenGasto .toggle-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        origen = opt.dataset.valor;
        body.querySelector('#campoCuentaGasto').style.display = origen === 'cuenta' ? '' : 'none';
        body.querySelector('#campoTarjetaGasto').style.display = origen === 'tarjeta' ? '' : 'none';
      });
    });
    body.querySelector('#formGasto').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['descripcion', 'monto', 'fecha', 'categoria', 'cuentaId', 'tarjetaId']);
        if (origen === 'cuenta') datos.tarjetaId = null;
        else datos.cuentaId = null;
        accionAgregarGasto(datos);
        cerrarModal();
        toast('Gasto registrado.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
