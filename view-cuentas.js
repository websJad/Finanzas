/* =========================================================================
   VISTA: CUENTAS
   ========================================================================= */

function renderCuentas() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Cuentas</h1>
        <p class="view-sub">Efectivo, Yape, Plin, bancos — transferencias sin afectar tu saldo total</p>
      </div>
      <div class="view-header-actions">
        <button class="btn" id="btnTransferir">${icon('repeat')} Transferir</button>
        <button class="btn btn-primary" id="btnNuevaCuenta">${icon('check')} Nueva cuenta</button>
      </div>
    </div>

    ${STATE.cuentas.length === 0 ? emptyState('wallet', 'Sin cuentas todavía', 'Crea tu primera cuenta para empezar a registrar movimientos.', 'Nueva cuenta', 'btnEmptyCuenta') : `
    <div class="grid grid-3">
      ${STATE.cuentas.map(c => cardCuenta(c)).join('')}
    </div>`}
  `;

  main.querySelector('#btnNuevaCuenta')?.addEventListener('click', abrirModalCuenta);
  main.querySelector('#btnEmptyCuenta')?.addEventListener('click', abrirModalCuenta);
  main.querySelector('#btnTransferir')?.addEventListener('click', abrirModalTransferencia);

  main.querySelectorAll('[data-editar-cuenta]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditarCuenta(btn.dataset.editarCuenta));
  });
  main.querySelectorAll('[data-eliminar-cuenta]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmar('¿Eliminar esta cuenta? Solo es posible si no tiene movimientos asociados.', () => {
        manejarError(() => {
          accionEliminarCuenta(btn.dataset.eliminarCuenta);
          toast('Cuenta eliminada.', 'success');
          refrescarVistaActual();
        });
      }, { danger: true, okLabel: 'Eliminar' });
    });
  });
}

function cardCuenta(c) {
  const saldo = saldoCuenta(c.id);
  const labelTipo = TIPOS_CUENTA.find(t => t.valor === c.tipo)?.nombre || c.tipo;
  return `
    <div class="card">
      <div class="flex-between" style="margin-bottom:14px;">
        <div class="account-chip-icon">${icon(iconoCuenta(c.tipo))}</div>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-sm btn-ghost" data-editar-cuenta="${c.id}" title="Editar">${icon('edit')}</button>
          <button class="btn btn-sm btn-ghost" data-eliminar-cuenta="${c.id}" title="Eliminar">${icon('trash')}</button>
        </div>
      </div>
      <div style="font-weight:600; font-size:15px;">${c.nombre}</div>
      <div class="text-faint" style="font-size:12px; margin-bottom:10px;">${labelTipo}</div>
      <div class="mono" style="font-size:22px; font-weight:600; color:${saldo < 0 ? 'var(--rojo)' : 'var(--text)'};">${formatoMoneda(saldo)}</div>
      <div class="text-faint" style="font-size:11px; margin-top:4px;">Saldo inicial: ${formatoMoneda(c.saldoInicial || 0)}</div>
    </div>
  `;
}

function abrirModalEditarCuenta(cuentaId) {
  const c = STATE.cuentas.find(x => x.id === cuentaId);
  if (!c) return;
  const saldoActual = saldoCuenta(c.id);
  abrirModal('Editar cuenta', `
    <form id="formEditarCuenta">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" value="${c.nombre}" required>
      </div>
      <div class="field">
        <label>Tipo de cuenta</label>
        <select name="tipo">
          ${TIPOS_CUENTA.map(t => `<option value="${t.valor}" ${t.valor === c.tipo ? 'selected' : ''}>${t.nombre}</option>`).join('')}
        </select>
      </div>
      <div style="padding:14px; background:var(--surface-2); border-radius:8px; margin-bottom:16px;">
        <div class="flex-between" style="margin-bottom:6px;">
          <span class="text-faint" style="font-size:12px;">Saldo actual calculado</span>
          <span class="mono" style="font-weight:600; font-size:15px;">${formatoMoneda(saldoActual)}</span>
        </div>
        <div class="text-faint" style="font-size:11px;">= Saldo inicial (${formatoMoneda(c.saldoInicial || 0)}) + ingresos − gastos − abonos</div>
      </div>
      <div class="field">
        <label>Corregir saldo actual a</label>
        <input type="number" name="saldoDeseado" step="0.01" value="${saldoActual.toFixed(2)}" required>
        <p class="field-hint">Si el saldo calculado no coincide con lo que realmente tienes, escribe tu saldo real aquí y el sistema ajustará el saldo inicial automáticamente.</p>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar cambios</button>
    </form>
  `, (body) => {
    body.querySelector('#formEditarCuenta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'tipo', 'saldoDeseado']);
        // Calcular el nuevo saldoInicial para que el saldo final sea el deseado
        const diferencia = (datos.saldoDeseado || 0) - saldoActual;
        const nuevoSaldoInicial = (c.saldoInicial || 0) + diferencia;
        accionEditarCuenta({ cuentaId, nombre: datos.nombre, tipo: datos.tipo, saldoInicial: nuevoSaldoInicial });
        cerrarModal();
        toast('Cuenta actualizada. Saldo ajustado correctamente.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalCuenta() {
  abrirModal('Nueva cuenta', `
    <form id="formCuenta">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="nombre" placeholder="Ej. Interbank Ahorros" required>
      </div>
      <div class="field">
        <label>Tipo de cuenta</label>
        <select name="tipo" id="selectTipoCuenta">
          ${TIPOS_CUENTA.map(t => `<option value="${t.valor}">${t.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="field" id="campoTipoPersonalizado" style="display:none;">
        <label>Nombre del tipo personalizado</label>
        <input type="text" name="tipoPersonalizado" placeholder="Ej. Fondo mutual, Cuenta nómina...">
      </div>
      <div class="field">
        <label>Saldo inicial</label>
        <input type="number" name="saldoInicial" step="0.01" value="0">
      </div>
      <button type="submit" class="btn btn-primary btn-block">Crear cuenta</button>
    </form>
  `, (body) => {
    const selectTipo = body.querySelector('#selectTipoCuenta');
    const campoPersonalizado = body.querySelector('#campoTipoPersonalizado');
    selectTipo.addEventListener('change', () => {
      campoPersonalizado.style.display = selectTipo.value === 'otro' ? '' : 'none';
    });

    body.querySelector('#formCuenta').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['nombre', 'tipo', 'tipoPersonalizado', 'saldoInicial']);
        // Si eligió "otro" y escribió un tipo personalizado, usarlo como tipo
        if (datos.tipo === 'otro' && datos.tipoPersonalizado && datos.tipoPersonalizado.trim()) {
          datos.tipo = datos.tipoPersonalizado.trim().toLowerCase().replace(/\s+/g, '_');
        }
        accionAgregarCuenta(datos);
        cerrarModal();
        toast('Cuenta creada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function abrirModalTransferencia() {
  if (STATE.cuentas.length < 2) {
    toast('Necesitas al menos dos cuentas para transferir.', 'warning');
    return;
  }
  abrirModal('Transferencia entre cuentas', `
    <form id="formTransferencia">
      <p class="field-hint" style="margin-bottom:16px;">Una transferencia mueve dinero entre tus cuentas pero no cambia tu saldo total — no es ingreso ni gasto.</p>
      <div class="field">
        <label>Desde</label>
        <select name="origenId">${opcionesCuentas()}</select>
      </div>
      <div class="field">
        <label>Hacia</label>
        <select name="destinoId">${opcionesCuentas(STATE.cuentas[1]?.id)}</select>
      </div>
      <div class="field">
        <label>Monto</label>
        <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
      </div>
      <div class="field">
        <label>Nota (opcional)</label>
        <input type="text" name="nota" placeholder="Ej. Para gastos del mes">
      </div>
      <button type="submit" class="btn btn-primary btn-block">Transferir</button>
    </form>
  `, (body) => {
    body.querySelector('#formTransferencia').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['origenId', 'destinoId', 'monto', 'nota']);
        accionTransferir(datos);
        cerrarModal();
        toast('Transferencia realizada.', 'success');
        refrescarVistaActual();
      });
    });
  });
}
