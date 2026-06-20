/* =========================================================================
   VISTA: HISTORIAL
   ---------------------------------------------------------------------
   Vista unificada de todo movimiento de dinero del sistema: ingresos,
   gastos, abonos a deudas, pagos confirmados, transferencias y aportes
   a metas. Se construye una lista normalizada a partir de las distintas
   colecciones de STATE para poder filtrar todo desde un solo lugar.
   ========================================================================= */

function construirHistorialCompleto() {
  const filas = [];

  STATE.ingresos.filter(i => i.estado === 'recibido').forEach(i => {
    filas.push({ fecha: i.fecha, tipo: 'ingreso', descripcion: i.descripcion, cuentaId: i.cuentaId, monto: i.monto });
  });

  STATE.gastos.forEach(g => {
    filas.push({
      fecha: g.fecha, tipo: 'gasto', descripcion: g.descripcion,
      cuentaId: g.cuentaId, tarjetaId: g.tarjetaId, monto: -g.monto,
    });
  });

  STATE.deudas.forEach(d => {
    (d.abonos || []).forEach(a => {
      filas.push({ fecha: a.fecha, tipo: 'deuda', descripcion: `Abono a ${d.nombre}`, cuentaId: a.cuentaId, monto: -a.monto });
    });
  });

  STATE.pagosPendientes.filter(p => p.estado === 'pagado').forEach(p => {
    filas.push({ fecha: p.fechaPago, tipo: 'gasto', descripcion: p.descripcion, cuentaId: p.cuentaId, monto: -p.monto });
  });

  // Los aportes a metas NO restan del dinero libre real: una meta de ahorro
  // solo "etiqueta" una porción de dinero que ya está en tus cuentas, no es
  // un compromiso con terceros como una deuda o un pago pendiente. Por eso
  // se muestran en el historial con monto 0 de impacto en saldo, solo como
  // referencia informativa de que ese movimiento ocurrió.
  STATE.metas.forEach(m => {
    (m.aportes || []).forEach(a => {
      filas.push({ fecha: a.fecha, tipo: 'meta', descripcion: `Aporte a ${m.nombre} (no afecta tu saldo)`, cuentaId: null, monto: 0 });
    });
  });

  STATE.movimientos.filter(m => m.tipo === 'transferencia_salida').forEach(m => {
    filas.push({ fecha: m.fecha, tipo: 'transferencia', descripcion: m.descripcion, cuentaId: m.cuentaId, monto: -m.monto });
  });

  return filas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

const ETIQUETA_TIPO = {
  ingreso: { texto: 'Ingreso', clase: 'pill-verde' },
  gasto: { texto: 'Gasto', clase: 'pill-rojo' },
  deuda: { texto: 'Deuda', clase: 'pill-naranja' },
  transferencia: { texto: 'Transferencia', clase: 'pill-azul' },
  meta: { texto: 'Meta', clase: 'pill-gris' },
};

function renderHistorial() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Historial</h1>
        <p class="view-sub">Todos los movimientos del sistema, en un solo lugar</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="grid grid-4" style="gap:12px;">
        <div class="field" style="margin-bottom:0;">
          <label>Buscar</label>
          <input type="text" id="histTexto" placeholder="Buscar por descripción...">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Tipo</label>
          <select id="histTipo">
            <option value="">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
            <option value="deuda">Abonos a deudas</option>
            <option value="transferencia">Transferencias</option>
            <option value="meta">Aportes a metas</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Cuenta</label>
          <select id="histCuenta">
            <option value="">Todas</option>
            ${STATE.cuentas.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Monto mínimo</label>
          <input type="number" id="histMontoMin" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="grid grid-3" style="gap:12px; margin-top:12px;">
        <div class="field" style="margin-bottom:0;">
          <label>Desde</label>
          <input type="date" id="histDesde">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Hasta</label>
          <input type="date" id="histHasta">
        </div>
        <div style="display:flex; align-items:flex-end;">
          <button class="btn btn-block" id="histLimpiar">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <div id="histResultados"></div>
  `;

  const aplicar = () => renderResultadosHistorial();

  ['histTexto', 'histMontoMin', 'histDesde', 'histHasta'].forEach(id => {
    document.getElementById(id).addEventListener('input', aplicar);
  });
  ['histTipo', 'histCuenta'].forEach(id => {
    document.getElementById(id).addEventListener('change', aplicar);
  });
  document.getElementById('histLimpiar').addEventListener('click', () => {
    document.getElementById('histTexto').value = '';
    document.getElementById('histMontoMin').value = '';
    document.getElementById('histDesde').value = '';
    document.getElementById('histHasta').value = '';
    document.getElementById('histTipo').value = '';
    document.getElementById('histCuenta').value = '';
    aplicar();
  });

  renderResultadosHistorial();
}

function renderResultadosHistorial() {
  const wrap = document.getElementById('histResultados');
  const texto = (document.getElementById('histTexto').value || '').toLowerCase().trim();
  const tipo = document.getElementById('histTipo').value;
  const cuentaId = document.getElementById('histCuenta').value;
  const montoMin = parseFloat(document.getElementById('histMontoMin').value) || 0;
  const desde = document.getElementById('histDesde').value;
  const hasta = document.getElementById('histHasta').value;

  let filas = construirHistorialCompleto();

  if (texto) filas = filas.filter(f => f.descripcion.toLowerCase().includes(texto));
  if (tipo) filas = filas.filter(f => f.tipo === tipo);
  if (cuentaId) filas = filas.filter(f => f.cuentaId === cuentaId);
  if (montoMin > 0) filas = filas.filter(f => Math.abs(f.monto) >= montoMin);
  if (desde) filas = filas.filter(f => f.fecha.slice(0, 10) >= desde);
  if (hasta) filas = filas.filter(f => f.fecha.slice(0, 10) <= hasta);

  if (filas.length === 0) {
    wrap.innerHTML = emptyState('inbox', 'Sin resultados', 'No hay movimientos que coincidan con estos filtros. Intenta ajustarlos.');
    return;
  }

  const totalNeto = filas.reduce((s, f) => s + f.monto, 0);

  wrap.innerHTML = `
    <div class="flex-between" style="margin-bottom:12px;">
      <span class="text-faint" style="font-size:13px;">${filas.length} movimientos encontrados</span>
      <span class="mono" style="font-weight:600; color:${totalNeto >= 0 ? 'var(--verde)' : 'var(--rojo)'};">Neto: ${totalNeto >= 0 ? '+' : ''}${formatoMoneda(totalNeto)}</span>
    </div>
    <div class="table-wrap table-scroll">
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cuenta</th><th>Monto</th></tr></thead>
        <tbody>${filas.map(f => filaHistorial(f)).join('')}</tbody>
      </table>
    </div>
  `;
}

function filaHistorial(f) {
  const cuenta = f.cuentaId ? STATE.cuentas.find(c => c.id === f.cuentaId) : null;
  const tarjeta = f.tarjetaId ? STATE.tarjetas.find(t => t.id === f.tarjetaId) : null;
  const origen = tarjeta ? `${tarjeta.nombre} (tarjeta)` : (cuenta ? cuenta.nombre : '—');
  const etq = ETIQUETA_TIPO[f.tipo] || { texto: f.tipo, clase: 'pill-gris' };
  const esNeutro = f.monto === 0;
  const positivo = f.monto > 0;
  const colorMonto = esNeutro ? 'var(--text-faint)' : (positivo ? 'var(--verde)' : 'var(--text)');
  const montoTexto = esNeutro ? '—' : `${positivo ? '+' : ''}${formatoMoneda(f.monto)}`;
  return `
    <tr>
      <td>${formatoFecha(f.fecha)}</td>
      <td><span class="pill ${etq.clase}">${etq.texto}</span></td>
      <td>${f.descripcion}</td>
      <td>${origen}</td>
      <td class="num" style="color:${colorMonto}; font-weight:600;">${montoTexto}</td>
    </tr>
  `;
}
