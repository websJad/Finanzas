/* =========================================================================
   VISTA: DASHBOARD
   ========================================================================= */

function renderDashboard() {
  const main = document.getElementById('mainContent');
  const r = resumenSaldo();

  const pendientesUrgentes = STATE.pagosPendientes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    .slice(0, 4);

  const ultimosMovs = STATE.movimientos.slice(0, 6);

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Dashboard</h1>
        <p class="view-sub">Centro de mando de tus finanzas</p>
      </div>
      <div class="view-header-actions">
        <button class="btn" id="dashRegistrarGasto">${icon('zap')} Registrar gasto</button>
        <button class="btn btn-primary" id="dashRegistrarIngreso">${icon('check')} Registrar ingreso</button>
      </div>
    </div>

    <!-- HERO: dinero disponible real (lo que tenés físicamente en tus cuentas) -->
    <div class="dash-hero-disponible">
      <div class="dash-hero-left">
        <span class="dash-hero-label">Dinero disponible en tus cuentas</span>
        <div class="dash-hero-valor nums ${r.disponible < 0 ? 'rojo' : 'lima'}">${formatoMoneda(r.disponible)}</div>
        <span class="dash-hero-sub">Suma de efectivo + billeteras digitales + cuentas bancarias</span>
      </div>
      <div class="dash-hero-desglose">
        ${STATE.cuentas.map(c => `
          <div class="dash-hero-cuenta">
            <div class="account-chip-icon sm">${icon(iconoCuenta(c.tipo))}</div>
            <span>${c.nombre}</span>
            <span class="mono">${formatoMoneda(saldoCuenta(c.id))}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- KPIs secundarios -->
    <div class="grid grid-4 mt-24">
      ${statCard('Ingresos del mes', formatoMoneda(r.ingresos), 'check', 'verde', `Pendientes: ${formatoMoneda(totalIngresosPendientes())}`)}
      ${statCard('Gastos del mes', formatoMoneda(r.gastos), 'zap', 'rojo', 'Incluye pagos de tarjeta y aportes')}
      ${statCard('Comprometido', formatoMoneda(r.comprometido), 'alert-triangle', 'naranja', `Deudas + tarjetas + pagos`)}
      ${statCard('Préstamos por cobrar', formatoMoneda(totalPrestamosActivos()), 'gift', 'azul', `${STATE.prestamos.filter(p=>p.estado!=='cobrado').length} préstamo${STATE.prestamos.filter(p=>p.estado!=='cobrado').length!==1?'s':''} activo${STATE.prestamos.filter(p=>p.estado!=='cobrado').length!==1?'s':''}`)}
    </div>

    ${renderWaterfall(r)}

    <div class="grid grid-2 mt-24" style="align-items:start;">
      <div class="card">
        <div class="flex-between" style="margin-bottom:14px;">
          <h3 style="font-size:14.5px;">Próximos vencimientos</h3>
          <button class="btn btn-sm btn-ghost" data-go="pendientes">Ver todos</button>
        </div>
        ${pendientesUrgentes.length === 0 ? emptyInline('No tienes pagos pendientes próximos.') :
          pendientesUrgentes.map(p => filaVencimiento(p)).join('')}
      </div>

      <div class="card">
        <div class="flex-between" style="margin-bottom:14px;">
          <h3 style="font-size:14.5px;">Actividad reciente</h3>
          <button class="btn btn-sm btn-ghost" data-go="historial">Ver todo</button>
        </div>
        ${ultimosMovs.length === 0 ? emptyInline('Aún no registras movimientos.') :
          ultimosMovs.map(m => filaMovimiento(m)).join('')}
      </div>
    </div>

    <div class="grid grid-2 mt-24" style="align-items:start;">
      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:14px;">Deudas y tarjetas (comprometido)</h3>
        ${renderResumenComprometido(r)}
      </div>
      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:14px;">Gastos: necesario vs. impulsivo (este mes)</h3>
        ${renderBarraNecesarioImpulsivo()}
      </div>
    </div>
  `;

  main.querySelector('#dashRegistrarGasto').addEventListener('click', () => abrirModalGasto());
  main.querySelector('#dashRegistrarIngreso').addEventListener('click', () => abrirModalIngreso());
  main.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => navegarA(btn.dataset.go));
  });
}

function renderWaterfall(r) {
  const valores = [r.ingresos, r.gastos, r.deudas, r.tarjetas, r.pendientes, Math.max(r.libre, 0)];
  const maxValor = Math.max(...valores, 1);
  const anchoPct = (v) => Math.max((v / maxValor) * 100, v > 0 ? 5 : 2);

  return `
    <div class="waterfall-card mt-24">
      <div class="waterfall-title">
        <h2>Cómo se calcula tu dinero libre real</h2>
        <span>Ingresos − Gastos − Deudas − Tarjetas − Pagos pendientes</span>
      </div>
      <div class="waterfall-track">
        <div class="waterfall-seg ingresos" style="flex-grow:${anchoPct(r.ingresos)};">
          <span class="seg-label">Ingresos</span>
          <span class="seg-value">${formatoMoneda(r.ingresos)}</span>
        </div>
        <div class="waterfall-seg gastos" style="flex-grow:${anchoPct(r.gastos)};">
          <span class="seg-label">− Gastos</span>
          <span class="seg-value">${formatoMoneda(r.gastos)}</span>
        </div>
        <div class="waterfall-seg deudas" style="flex-grow:${anchoPct(r.deudas)};">
          <span class="seg-label">− Deudas</span>
          <span class="seg-value">${formatoMoneda(r.deudas)}</span>
        </div>
        <div class="waterfall-seg tarjetas" style="flex-grow:${anchoPct(r.tarjetas)};">
          <span class="seg-label">− Tarjetas</span>
          <span class="seg-value">${formatoMoneda(r.tarjetas)}</span>
        </div>
        <div class="waterfall-seg pendientes" style="flex-grow:${anchoPct(r.pendientes)};">
          <span class="seg-label">− Pendientes</span>
          <span class="seg-value">${formatoMoneda(r.pendientes)}</span>
        </div>
        <div class="waterfall-seg resultado" style="flex-grow:${anchoPct(Math.max(r.libre,0)) + 6};">
          <span class="seg-label">= Libre real</span>
          <span class="seg-value">${formatoMoneda(r.libre)}</span>
        </div>
      </div>
      <div class="waterfall-legend">
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:var(--verde)"></span>Ingresos recibidos</span>
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:var(--rojo)"></span>Gastos realizados</span>
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:var(--naranja)"></span>Deudas activas</span>
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:#c084fc"></span>Deuda en tarjetas</span>
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:var(--azul)"></span>Pagos pendientes</span>
        <span class="waterfall-legend-item"><span class="legend-dot" style="background:var(--lima)"></span>Resultado: dinero libre</span>
      </div>
    </div>
  `;
}

function renderResumenComprometido(r) {
  if (r.comprometido === 0) return emptyInline('No tienes deudas ni pagos comprometidos.');
  const filas = [];
  STATE.deudas.filter(d => d.estado !== 'pagada').forEach(d => {
    filas.push({ label: d.nombre, sublabel: 'Deuda', monto: saldoPendienteDeuda(d), color: 'var(--naranja)' });
  });
  STATE.tarjetas.forEach(t => {
    if (t.consumoActual > 0) filas.push({ label: t.nombre, sublabel: 'Tarjeta de crédito', monto: t.consumoActual, color: '#c084fc' });
  });
  STATE.pagosPendientes.filter(p => p.estado === 'pendiente').forEach(p => {
    filas.push({ label: p.descripcion, sublabel: `Vence ${formatoFecha(p.fechaVencimiento)}`, monto: p.monto, color: 'var(--azul)' });
  });
  return filas.map(f => `
    <div class="flex-between" style="padding:8px 0; border-bottom:1px solid var(--border-soft);">
      <div>
        <div style="font-weight:500; font-size:13px;">${f.label}</div>
        <div class="text-faint" style="font-size:11.5px;">${f.sublabel}</div>
      </div>
      <span class="mono" style="font-weight:600; font-size:13.5px; color:${f.color};">${formatoMoneda(f.monto)}</span>
    </div>
  `).join('') + `
    <div class="flex-between" style="padding:10px 0 2px; font-weight:700; font-size:13.5px;">
      <span>Total comprometido</span>
      <span class="mono" style="color:var(--naranja);">${formatoMoneda(r.comprometido)}</span>
    </div>
  `;
}

function statCard(label, value, iconName, color, meta) {
  return `
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-label">${label}</span>
        <div class="stat-icon ${color}">${icon(iconName)}</div>
      </div>
      <div class="stat-value ${color} nums">${value}</div>
      <div class="stat-meta">${meta}</div>
    </div>
  `;
}

function emptyInline(texto) {
  return `<p class="text-faint" style="font-size:13px; padding:8px 0; text-align:center;">${texto}</p>`;
}

function filaVencimiento(p) {
  const dias = diasHastaVencimiento(p.fechaVencimiento);
  const urgente = dias <= 3;
  return `
    <div class="flex-between" style="padding:9px 0; border-bottom:1px solid var(--border-soft);">
      <div>
        <div style="font-weight:500; font-size:13.5px;">${p.descripcion}</div>
        <div class="text-faint" style="font-size:12px;">Vence ${formatoFecha(p.fechaVencimiento)}</div>
      </div>
      <div style="text-align:right;">
        <div class="mono" style="font-weight:600; font-size:13.5px;">${formatoMoneda(p.monto)}</div>
        <span class="pill ${urgente ? 'pill-rojo' : 'pill-naranja'}">${dias < 0 ? 'Vencido' : dias + ' días'}</span>
      </div>
    </div>
  `;
}

function filaMovimiento(m) {
  const positivo = m.monto >= 0;
  return `
    <div class="flex-between" style="padding:9px 0; border-bottom:1px solid var(--border-soft);">
      <div style="font-size:13.5px;">${m.descripcion}</div>
      <div class="mono" style="font-weight:600; font-size:13.5px; color:${positivo ? 'var(--verde)' : 'var(--text)'}">${positivo ? '+' : ''}${formatoMoneda(m.monto)}</div>
    </div>
  `;
}

function filaCuentaResumen(c) {
  return `
    <div class="account-chip">
      <div class="account-chip-icon">${icon(iconoCuenta(c.tipo))}</div>
      <div style="flex:1;">
        <div style="font-weight:500; font-size:13.5px;">${c.nombre}</div>
        <div class="text-faint" style="font-size:11.5px; text-transform:capitalize;">${c.tipo}</div>
      </div>
      <div class="mono" style="font-weight:600;">${formatoMoneda(saldoCuenta(c.id))}</div>
    </div>
  `;
}

function renderBarraNecesarioImpulsivo() {
  const necesario = totalGastosPorTipo('necesario');
  const impulsivo = totalGastosPorTipo('impulsivo');
  const total = necesario + impulsivo;
  if (total === 0) return emptyInline('Aún no hay gastos registrados.');
  const pctNecesario = (necesario / total) * 100;
  const pctImpulsivo = 100 - pctNecesario;
  return `
    <div style="display:flex; height:14px; border-radius:99px; overflow:hidden; background:var(--surface-3); margin-bottom:14px;">
      <div style="width:${pctNecesario}%; background:var(--azul);"></div>
      <div style="width:${pctImpulsivo}%; background:var(--naranja);"></div>
    </div>
    <div class="flex-between">
      <div><span class="legend-dot" style="background:var(--azul); display:inline-block; margin-right:6px;"></span>Necesario — ${formatoMoneda(necesario)} (${pctNecesario.toFixed(0)}%)</div>
    </div>
    <div class="flex-between" style="margin-top:8px;">
      <div><span class="legend-dot" style="background:var(--naranja); display:inline-block; margin-right:6px;"></span>Impulsivo — ${formatoMoneda(impulsivo)} (${pctImpulsivo.toFixed(0)}%)</div>
    </div>
  `;
}
