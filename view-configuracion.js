/* =========================================================================
   VISTA: CONFIGURACIÓN
   ---------------------------------------------------------------------
   Moneda, tema, idioma, PIN de seguridad y respaldo/restauración de
   datos. El cambio de moneda es solo de presentación (no convierte
   montos); se advierte al usuario para evitar confusión.
   ========================================================================= */

function renderConfiguracion() {
  const main = document.getElementById('mainContent');
  const cfg = STATE.config;

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Configuración</h1>
        <p class="view-sub">Moneda, idioma, modo oscuro, PIN y respaldo de datos</p>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start;">

      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:16px;">Apariencia</h3>
        <div class="field">
          <label>Tema</label>
          <div class="toggle-group" id="toggleTema">
            <button type="button" class="toggle-opt ${cfg.tema === 'oscuro' ? 'selected' : ''}" data-valor="oscuro">Oscuro</button>
            <button type="button" class="toggle-opt ${cfg.tema === 'claro' ? 'selected' : ''}" data-valor="claro">Claro</button>
          </div>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Moneda</label>
          <select id="selectMoneda">
            ${Object.entries(MONEDAS).map(([id, m]) => `<option value="${id}" ${id === cfg.moneda ? 'selected' : ''}>${m.simbolo} — ${m.nombre}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:16px;">Seguridad</h3>
        <div class="flex-between" style="margin-bottom:14px;">
          <div>
            <div style="font-weight:500; font-size:13.5px;">PIN de acceso</div>
            <div class="text-faint" style="font-size:12px;">Protege la app con un PIN de 4 dígitos al abrirla</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="switchPin" ${cfg.pinHabilitado ? 'checked' : ''}>
            <span class="switch-track"></span>
          </label>
        </div>
        <button class="btn btn-block" id="btnConfigurarPin" ${!cfg.pinHabilitado ? 'disabled' : ''}>Cambiar PIN</button>
      </div>

      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:6px;">Google Sheets <span class="tag-nuevo">sincronización</span></h3>
        <p class="text-faint" style="font-size:12.5px; margin-bottom:16px;">
          Sincronización en tiempo real entre todos tus dispositivos. Los datos se guardan automáticamente y se verifican cada 15 segundos.
        </p>
        <div class="field">
          <label>URL del Apps Script</label>
          <input type="url" id="sheetsUrl" placeholder="https://script.google.com/macros/s/..." value="${typeof getSheetsUrl === 'function' ? getSheetsUrl() : ''}">
        </div>
        <div style="display:flex; gap:8px; margin-bottom:14px;">
          <button class="btn btn-primary" id="btnConectarSheets" style="flex:1;">
            ${syncHabilitado() ? '↻ Reconectar' : 'Conectar y sincronizar'}
          </button>
          <button class="btn" id="btnDesconectarSheets" ${!syncHabilitado() ? 'disabled' : ''}>Desconectar</button>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:var(--surface-2); border-radius:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span id="syncIndicator" style="font-size:12px; font-weight:500;">${syncHabilitado() ? '● Conectado' : '○ Sin conectar'}</span>
            ${STATE._ts ? `<span class="text-faint" style="font-size:11px;">Último sync: ${new Date(STATE._ts).toLocaleTimeString('es-PE')}</span>` : ''}
          </div>
          <button class="btn btn-sm" id="btnForzarSync" ${!syncHabilitado() ? 'disabled' : ''}>↻ Sync ahora</button>
        </div>
        ${syncHabilitado() ? `<p class="text-faint" style="font-size:11px; margin-top:10px;">● Verde en la barra superior = sincronizado · Naranja = sin conexión · Sincroniza automáticamente cada 15 segundos</p>` : ''}
      </div>
        <p class="text-faint" style="font-size:12.5px; margin-bottom:16px;">Exporta toda tu información a un archivo .json que puedes guardar o restaurar después, incluso en otro dispositivo.</p>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button class="btn btn-block" id="btnExportarRespaldo">Exportar respaldo</button>
          <label class="btn btn-block" style="text-align:center; cursor:pointer;">
            Restaurar
            <input type="file" id="inputRestaurar" accept=".json" style="display:none;">
          </label>
        </div>
        <button class="btn btn-block" id="btnCargarDemo">Cargar datos de demostración</button>
      </div>

      <div class="card" style="border-color:var(--rojo-bg);">
        <h3 style="font-size:14.5px; margin-bottom:16px; color:var(--rojo);">Zona de riesgo</h3>
        <p class="text-faint" style="font-size:12.5px; margin-bottom:16px;">Esta acción borra permanentemente todas tus cuentas, movimientos, deudas y configuraciones. No se puede deshacer.</p>
        <button class="btn btn-danger btn-block" id="btnBorrarTodo">Borrar todos los datos</button>
      </div>

    </div>
  `;

  main.querySelectorAll('#toggleTema .toggle-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      main.querySelectorAll('#toggleTema .toggle-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      STATE.config.tema = opt.dataset.valor;
      guardarEstado();
      aplicarTema();
      toast(`Tema ${opt.dataset.valor} activado.`, 'success');
    });
  });

  main.querySelector('#selectMoneda').addEventListener('change', (e) => {
    STATE.config.moneda = e.target.value;
    guardarEstado();
    toast('Moneda actualizada. Los montos se muestran con el nuevo símbolo, sin conversión automática.', 'info');
    refrescarVistaActual();
    actualizarTopbarYBadges();
  });

  main.querySelector('#switchPin').addEventListener('change', (e) => {
    if (e.target.checked) {
      abrirModalConfigurarPin(true);
    } else {
      confirmar('¿Desactivar el PIN de acceso? Cualquiera con acceso a este navegador podrá abrir la app.', () => {
        STATE.config.pinHabilitado = false;
        STATE.config.pin = null;
        guardarEstado();
        toast('PIN desactivado.', 'success');
        refrescarVistaActual();
      }, { danger: true, okLabel: 'Desactivar' });
    }
  });

  main.querySelector('#btnConfigurarPin').addEventListener('click', () => abrirModalConfigurarPin(false));

  main.querySelector('#btnExportarRespaldo').addEventListener('click', () => {
    const json = exportarRespaldo();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-finanzas-${hoyISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Respaldo exportado.', 'success');
  });

  main.querySelector('#inputRestaurar').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    confirmar('Restaurar este respaldo reemplazará todos tus datos actuales. ¿Continuar?', () => {
      const reader = new FileReader();
      reader.onload = () => {
        manejarError(() => {
          restaurarRespaldo(reader.result);
          aplicarTema();
          toast('Respaldo restaurado correctamente.', 'success');
          navegarA('dashboard');
        });
      };
      reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
      reader.readAsText(archivo);
    }, { danger: true, okLabel: 'Restaurar' });
    e.target.value = '';
  });

  main.querySelector('#btnCargarDemo').addEventListener('click', () => {
    confirmar('Esto agregará datos de ejemplo a tu información actual. ¿Continuar?', () => {
      cargarDatosDemo();
      toast('Datos de demostración cargados.', 'success');
      navegarA('dashboard');
    });
  });

  main.querySelector('#btnBorrarTodo').addEventListener('click', () => {
    confirmar('Esto eliminará permanentemente todas tus cuentas, movimientos, deudas, metas y configuraciones. Esta acción no se puede deshacer.', () => {
      reiniciarTodo();
      aplicarTema();
      toast('Todos los datos fueron eliminados.', 'success');
      navegarA('dashboard');
    }, { danger: true, okLabel: 'Borrar todo' });
  });

  // Eventos Google Sheets
  main.querySelector('#btnConectarSheets')?.addEventListener('click', async () => {
    const url = main.querySelector('#sheetsUrl').value.trim();
    if (!url || !url.includes('script.google.com')) {
      toast('Pega una URL válida de Google Apps Script.', 'warning');
      return;
    }
    const btn = main.querySelector('#btnConectarSheets');
    btn.disabled = true;
    btn.textContent = 'Conectando...';
    try {
      await sincronizarAlConectar(url);
      refrescarVistaActual(); // redibujar configuración con estado actualizado
    } catch(e) {
      toast('No se pudo conectar: ' + (e.message || 'Error de red'), 'error');
      btn.disabled = false;
      btn.textContent = 'Conectar y sincronizar';
    }
  });

  main.querySelector('#btnDesconectarSheets')?.addEventListener('click', () => {
    confirmar('¿Desconectar Google Sheets? Tus datos locales se mantienen.', () => {
      detenerPolling();
      setSheetsUrl('');
      setBadgeSync('off');
      toast('Desconectado de Google Sheets.', 'success');
      refrescarVistaActual();
    });
  });

  main.querySelector('#btnForzarSync')?.addEventListener('click', async () => {
    if (!syncHabilitado()) return;
    setBadgeSync('loading');
    try {
      var datosSheets = await syncCargar();
      if (datosSheets && datosSheets._ts) {
        var tsSheets = new Date(datosSheets._ts).getTime();
        var tsLocal  = STATE._ts ? new Date(STATE._ts).getTime() : 0;
        if (tsSheets > tsLocal + 1000) {
          aplicarDatosSheets(datosSheets);
          toast('✓ Datos actualizados desde Google Sheets.', 'success');
          return;
        }
      }
      // Mis datos son más nuevos o iguales → subirlos
      await syncGuardarAhora(STATE);
      setBadgeSync('ok');
      toast('✓ Datos subidos a Google Sheets.', 'success');
    } catch(e) {
      setBadgeSync('error');
      toast('Error: ' + (e.message || 'Sin conexión'), 'error');
    }
  });

  if (syncHabilitado()) setBadgeSync('ok');
}

function abrirModalConfigurarPin(esActivacion) {
  abrirModal(esActivacion ? 'Configurar PIN de acceso' : 'Cambiar PIN', `
    <form id="formPin">
      <div class="field">
        <label>Nuevo PIN (4 dígitos)</label>
        <input type="text" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="••••" required>
      </div>
      <div class="field">
        <label>Confirmar PIN</label>
        <input type="text" name="pinConfirmar" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="••••" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Guardar PIN</button>
    </form>
  `, (body) => {
    body.querySelector('#formPin').addEventListener('submit', (e) => {
      e.preventDefault();
      manejarError(() => {
        const datos = leerForm(e.target, ['pin', 'pinConfirmar']);
        if (!/^\d{4}$/.test(datos.pin)) throw new Error('El PIN debe tener exactamente 4 dígitos.');
        if (datos.pin !== datos.pinConfirmar) throw new Error('Los PIN no coinciden.');
        STATE.config.pin = datos.pin;
        STATE.config.pinHabilitado = true;
        guardarEstado();
        cerrarModal();
        toast('PIN configurado correctamente.', 'success');
        refrescarVistaActual();
      });
    });
  });
}

function aplicarTema() {
  document.documentElement.setAttribute('data-tema', STATE.config.tema === 'claro' ? 'claro' : 'oscuro');
}

/* --------------------------- DATOS DE DEMOSTRACIÓN --------------------------- */

function cargarDatosDemo() {
  const cuentaEfectivo = STATE.cuentas[0];
  const cuentaBanco = STATE.cuentas[2] || STATE.cuentas[0];

  accionAgregarIngreso({ descripcion: 'Sueldo de junio', monto: 3500, categoria: 'general', cuentaId: cuentaBanco.id, estado: 'recibido', fecha: hoyISO().slice(0, 8) + '01' });
  accionAgregarIngreso({ descripcion: 'Venta de diseño freelance', monto: 450, categoria: 'general', cuentaId: cuentaEfectivo.id, estado: 'pendiente', fecha: hoyISO() });

  accionAgregarGasto({ descripcion: 'Supermercado Plaza Vea', monto: 280, categoria: 'alimentacion', cuentaId: cuentaBanco.id, fecha: hoyISO() });
  accionAgregarGasto({ descripcion: 'Uber al trabajo', monto: 45, categoria: 'transporte', cuentaId: cuentaEfectivo.id, fecha: hoyISO() });
  accionAgregarGasto({ descripcion: 'Cena con amigos', monto: 95, categoria: 'restaurantes', cuentaId: cuentaEfectivo.id, fecha: hoyISO() });

  accionAgregarDeuda({ nombre: 'Préstamo personal BBVA', montoOriginal: 4000, cuotas: 12, tasaInteres: 3.2, fechaInicio: hoyISO() });
  accionAgregarDeuda({ nombre: 'Crédito moto', montoOriginal: 1800, cuotas: 8, tasaInteres: 1.5, fechaInicio: hoyISO() });

  const venc = new Date();
  venc.setDate(venc.getDate() + 5);
  accionAgregarPagoPendiente({ descripcion: 'Alquiler de junio', monto: 900, fechaVencimiento: venc.toISOString().slice(0, 10), categoria: 'vivienda', recurrente: true });

  accionAgregarPresupuesto({ categoria: 'alimentacion', limite: 600 });
  accionAgregarPresupuesto({ categoria: 'entretenimiento', limite: 150 });

  accionAgregarMeta({ nombre: 'Fondo de emergencia', montoObjetivo: 5000, fechaObjetivo: null });
  accionAportarMeta({ metaId: STATE.metas[0].id, monto: 800 });

  accionAgregarGastoRecurrente({ nombre: 'Netflix', monto: 35, categoria: 'suscripciones', diaDelMes: 5 });
  accionAgregarGastoRecurrente({ nombre: 'Gimnasio', monto: 120, categoria: 'cuidado_personal', diaDelMes: 1 });

  guardarEstado();
}
