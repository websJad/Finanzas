/* =========================================================================
   VISTA: PRÉSTAMOS OTORGADOS
   ---------------------------------------------------------------------
   Dinero que prestaste a personas. Al crear un préstamo, el monto sale
   de tu cuenta (gasto especial). Cada cobro parcial o total entra como
   ingreso a la cuenta que elegiste. Todo se refleja en el dashboard.
   ========================================================================= */

function renderPrestamos() {
  const main = document.getElementById('mainContent');
  const activos = STATE.prestamos.filter(p => p.estado !== 'cobrado');
  const cobrados = STATE.prestamos.filter(p => p.estado === 'cobrado');
  const totalPendiente = totalPrestamosActivos();

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Préstamos otorgados</h1>
        <p class="view-sub">Dinero que has prestado — controla quién te debe y cuánto te han pagado</p>
      </div>
      <div class="view-header-actions">
        <button class="btn btn-primary" id="btnNuevoPrestamo">${icon('gift')} Nuevo préstamo</button>
      </div>
    </div>

    ${STATE.prestamos.length === 0 ? emptyState('gift', 'Sin préstamos registrados', 'Cuando prestes dinero a alguien, regístralo aquí para saber cuánto te deben y llevar un historial de cobros.', 'Registrar préstamo', 'btnEmptyPrestamo') : `
    <div class="grid grid-2" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Total pendiente por cobrar</span>
          <div class="stat-icon naranja">${icon('alert-triangle')}</div>
        </div>
        <div class="stat-value naranja nums">${formatoMoneda(totalPendiente)}</div>
        <div class="stat-meta">${activos.length} préstamo${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Total ya cobrado</span>
          <div class="stat-icon verde">${icon('check')}</div>
        </div>
        <div class="stat-value verde nums">${formatoMoneda(STATE.prestamos.reduce((s,p) => s + (p.cobros||[]).reduce((x,c) => x+c.monto,0), 0))}</div>
        <div class="stat-meta">${cobrados.length} préstamo${cobrados.length !== 1 ? 's' : ''} cobrado${cobrados.length !== 1 ? 's' : ''} totalmente</div>
      </div>
    </div>

    ${activos.length > 0 ? `
    <div class="section-title" style="margin-bottom:12px;">Pendientes por cobrar</div>
    <div class="grid grid-3" style="margin-bottom:24px;">
      ${activos.map(p => cardPrestamo(p)).join('')}
    </div>` : ''}

    ${cobrados.length > 0 ? `
    <div class="section-title" style="margin-bottom:12px;">Ya cobrados</div>
    <div class="grid grid-3">
      ${cobrados.map(p => cardPrestamo(p)).join('')}
    </div>` : ''}`}
  `;

  main.querySelector('#btnNuevoPrestamo')?.addEventListener('click', abrirModalNuevoPrestamo);
  main.querySelector('#btnEmptyPrestamo')?.addEventListener('click', abrirModalNuevoPrestamo);

  main.querySelectorAll('[data-cobrar-prestamo]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalCobro(btn.dataset.cobrarPrestamo));
  });
  main.querySelectorAll('[data-historial-prestamo]').forEach(btn => {
    btn.addEventListener('click', () => verHistorialPrestamo(btn.dataset.historialPrestamo));
  });
  main.querySelectorAll('[data-eliminar-prestamo]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar este préstamo? También se eliminarán los registros de cobro asociados.', () => {
        manejarError(() => {
          // Eliminar los gastos/ingresos asociados a este préstamo
          const prestamoId = btn.dataset.eliminarPrestamo;
          STATE.gastos = STATE.gastos.filter(g => g.prestamoId !== prestamoId);
          STATE.ingresos = STATE.ingresos.filter(i => i.prestamoId !== prestamoId);
          accionEliminarGenerico('prestamos', prestamoId);
          toast('Préstamo eliminado.', 'success');
          refrescarVistaActual();
        });
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardPrestamo(p) {
  const cobrado = (p.cobros || []).reduce((s, c) => s + c.monto, 0);
  const pendiente = saldoPendientePrestamo(p);
  const pct = p.montoOriginal > 0 ? Math.min((cobrado / p.montoOriginal) * 100, 100) : 0;
  const cobradoTotal = p.estado === 'cobrado';
  const cuenta = STATE.cuentas.find(c => c.id === p.cuentaId);

  return `
    <div class="card" style="${cobradoTotal ? 'opacity:0.75;' : ''}">
      <div class="flex-between" style="margin-bottom:10px;">
        <div>
          <div style="font-weight:700; font-size:15px;">${p.persona}</div>
          <div class="text-faint" style="font-size:11.5px;">${formatoFecha(p.fecha)} · desde ${cuenta ? cuenta.nombre : '—'}</div>
        </div>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-sm btn-ghost" data-historial-prestamo="${p.id}" title="Ver historial">${icon('book')}</button>
          <button class="btn btn-sm btn-ghost" data-eliminar-prestamo="${p.id}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>
      ${p.descripcion ? `<div class="text-faint" style="font-size:12px; margin-bottom:10px;">${p.descripcion}</div>` : ''}
      <div class="progress-track" style="margin-bottom:8px;">
        <div class="progress-fill ${cobradoTotal ? 'verde' : 'azul'}" style="width:${pct}%;"></div>
      </div>
      <div class="flex-between" style="margin-bottom:14px;">
        <div>
          <div class="text-faint" style="font-size:11px;">Cobrado</div>
          <div class="mono" style="font-weight:600; color:var(--verde);">${formatoMoneda(cobrado)}</div>
        </div>
        <div style="text-align:right;">
          <div class="text-faint" style="font-size:11px;">Pendiente</div>
          <div class="mono" style="font-weight:600; color:${cobradoTotal ? 'var(--text-faint)' : 'var(--naranja)'};">${formatoMoneda(pendiente)}</div>
        </div>
      </div>
      <div class="text-faint" style="font-size:11.5px; margin-bottom:12px;">Prestado: ${formatoMoneda(p.montoOriginal)}</div>
      ${cobradoTotal
        ? '<span class="pill pill-verde">Cobrado en su totalidad</span>'
        : `<button class="btn btn-primary btn-sm btn-block" data-cobrar-prestamo="${p.id}">Registrar cobro</button>`}
    </div>
  `;
}

function abrirModalNuevoPrestamo() {
  if (STATE.cuentas.length === 0) { toast('Primero crea una cuenta.', 'warning'); return; }
  abrirModal('Nuevo préstamo', `
    <form id="formPrestamo">
      <div class="field">
        <label>¿A quién le prestaste?</label>
        <input type="text" name="persona" placeholder="Nombre de la persona" required>
      </div>
      <div class="field">
        <label>Monto prestado</label>
        <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Desde qué cuenta / billetera</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field">
        <label>Descripción (opcional)</label>
        <input type="text" name="descripcion" placeholder="Ej. Para emergencia médica">
      </div>
      <div class="field">
        <label>Fecha del préstamo</label>
        <input type="date" name="fecha" value="${hoyISO()}">
      </div>
      <p class="field-hint" style="margin-bottom:14px;">El monto se descontará de la cuenta seleccionada y aparecerá como gasto. Cuando cobres, entra como ingreso.</p>
      <button type="submit" class="btn btn-primary btn-block">Registrar préstamo</button>
    </form>
  `, (body) => {
    body.querySelector('#formPrestamo').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['persona', 'monto', 'cuentaId', 'descripcion', 'fecha']);
        accionAgregarPrestamo(datos);
        cerrarModal();
        toast('Préstamo registrado. El monto fue descontado de tu cuenta.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalCobro(prestamoId) {
  const p = STATE.prestamos.find(x => x.id === prestamoId);
  if (!p) return;
  const pendiente = saldoPendientePrestamo(p);
  if (STATE.cuentas.length === 0) { toast('Primero crea una cuenta.', 'warning'); return; }
  abrirModal(`Cobro de ${p.persona}`, `
    <form id="formCobro">
      <p class="field-hint" style="margin-bottom:16px;">Pendiente por cobrar: <strong>${formatoMoneda(pendiente)}</strong></p>
      <div class="field">
        <label>¿A qué cuenta / billetera llegó el pago?</label>
        <select name="cuentaId">${opcionesCuentas()}</select>
      </div>
      <div class="field">
        <label>Monto cobrado</label>
        <input type="number" name="monto" step="0.01" min="0.01" max="${pendiente}" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Fecha del cobro</label>
        <input type="date" name="fecha" value="${hoyISO()}">
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <input type="text" name="nota" placeholder="Ej. Pago parcial en efectivo">
      </div>
      <p class="field-hint" style="margin-bottom:14px;">El monto entrará como ingreso a la cuenta seleccionada.</p>
      <button type="submit" class="btn btn-primary btn-block">Confirmar cobro</button>
    </form>
  `, (body) => {
    body.querySelector('#formCobro').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['monto', 'cuentaId', 'fecha', 'nota']);
        accionCobrarPrestamo({ prestamoId, ...datos });
        cerrarModal();
        toast('Cobro registrado. El monto entró como ingreso a tu cuenta.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function verHistorialPrestamo(prestamoId) {
  const p = STATE.prestamos.find(x => x.id === prestamoId);
  if (!p) return;
  const cobros = p.cobros || [];
  abrirModal(`Historial — ${p.persona}`, `
    <div style="margin-bottom:16px;">
      <div class="flex-between" style="margin-bottom:4px;">
        <span class="text-faint">Prestado</span>
        <span class="mono" style="font-weight:600;">${formatoMoneda(p.montoOriginal)}</span>
      </div>
      <div class="flex-between" style="margin-bottom:4px;">
        <span class="text-faint">Total cobrado</span>
        <span class="mono" style="font-weight:600; color:var(--verde);">${formatoMoneda(cobros.reduce((s,c)=>s+c.monto,0))}</span>
      </div>
      <div class="flex-between">
        <span class="text-faint">Pendiente</span>
        <span class="mono" style="font-weight:600; color:var(--naranja);">${formatoMoneda(saldoPendientePrestamo(p))}</span>
      </div>
    </div>
    <div style="border-top:1px solid var(--border-soft); padding-top:14px;">
      <div style="font-weight:600; font-size:13px; margin-bottom:12px;">Cobros realizados</div>
      ${cobros.length === 0
        ? '<p class="text-faint" style="font-size:13px;">Aún no hay cobros registrados.</p>'
        : cobros.map(c => {
            const cuenta = STATE.cuentas.find(x => x.id === c.cuentaId);
            return `
              <div class="flex-between" style="padding:8px 0; border-bottom:1px solid var(--border-soft);">
                <div>
                  <div style="font-size:13px; font-weight:500;">${formatoFecha(c.fecha)}</div>
                  <div class="text-faint" style="font-size:11.5px;">${cuenta ? cuenta.nombre : '—'}${c.nota ? ' · ' + c.nota : ''}</div>
                </div>
                <span class="mono" style="font-weight:600; color:var(--verde);">${formatoMoneda(c.monto)}</span>
              </div>
            `;
          }).join('')}
    </div>
  `);
}
