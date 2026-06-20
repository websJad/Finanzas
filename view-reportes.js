/* =========================================================================
   VISTA: REPORTES — 5 gráficos con Chart.js + exportación PDF/Excel
   ========================================================================= */

let _chartBarras = null;
let _chartPie = null;
let _chartNI = null;
let _chartComprometido = null;
let _chartLinea = null;

function renderReportes() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Reportes</h1>
        <p class="view-sub">Gráficos de tus finanzas — ingresos, gastos, distribución y evolución del saldo</p>
      </div>
      <div class="view-header-actions">
        <button class="btn" id="btnExportarExcel">${icon('book')} Exportar Excel</button>
        <button class="btn btn-primary" id="btnExportarPdf">${icon('alert-circle')} Exportar PDF</button>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px; align-items:start;">
      <div class="chart-card">
        <h3>Ingresos vs gastos (últimos 6 meses)</h3>
        <div class="chart-canvas-wrap" id="wrapBarras"><div class="chart-loading">Cargando gráfico...</div></div>
      </div>
      <div class="chart-card">
        <h3>Gastos por categoría</h3>
        <div class="chart-canvas-wrap" id="wrapPie"><div class="chart-loading">Cargando gráfico...</div></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px; align-items:start;">
      <div class="chart-card">
        <h3>Necesario vs impulsivo (histórico)</h3>
        <div class="chart-canvas-wrap" id="wrapNI"><div class="chart-loading">Cargando gráfico...</div></div>
      </div>
      <div class="chart-card">
        <h3>Dinero comprometido por tipo</h3>
        <div class="chart-canvas-wrap" id="wrapComprometido"><div class="chart-loading">Cargando gráfico...</div></div>
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:0;">
      <h3>Evolución del saldo neto (últimos 6 meses)</h3>
      <div class="chart-canvas-wrap tall" id="wrapLinea"><div class="chart-loading">Cargando gráfico...</div></div>
    </div>
  `;

  // Esperar a que Chart.js esté disponible (puede estar cargando aún)
  esperarChartJs(function(disponible) {
    if (!disponible) {
      ['wrapBarras','wrapPie','wrapNI','wrapComprometido','wrapLinea'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; padding:20px; text-align:center;">
            <p style="color:var(--text-faint); font-size:13px;">No se pudo cargar la librería de gráficos.<br>Verifica tu conexión a internet.</p>
            <button class="btn btn-sm" onclick="renderReportes()">↻ Reintentar</button>
          </div>`;
      });
      return;
    }
    // Crear los canvas ahora que Chart.js está listo
    ['wrapBarras','wrapPie','wrapNI','wrapComprometido','wrapLinea'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        var canvasId = id.replace('wrap', 'chart');
        el.innerHTML = '<canvas id="' + canvasId + '"></canvas>';
      }
    });
    dibujarGraficosReportes();
  });

  main.querySelector('#btnExportarPdf').addEventListener('click', exportarReportePdf);
  main.querySelector('#btnExportarExcel').addEventListener('click', exportarReporteExcel);
}

// Espera hasta 8 segundos a que Chart.js esté disponible, verificando cada 200ms
function esperarChartJs(callback) {
  var intentos = 0;
  var maxIntentos = 40; // 40 × 200ms = 8 segundos
  function verificar() {
    if (typeof Chart !== 'undefined') {
      callback(true);
      return;
    }
    if (intentos >= maxIntentos || window._chartJsFailed) {
      callback(false);
      return;
    }
    intentos++;
    setTimeout(verificar, 200);
  }
  verificar();
}

function ultimosNMeses(n) {
  const meses = [];
  const hoy = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ clave: d.toISOString().slice(0, 7), etiqueta: d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }) });
  }
  return meses;
}

function datosIngresosGastosPorMes(meses) {
  return meses.map(m => {
    const ingresos = STATE.ingresos
      .filter(i => i.estado === 'recibido' && i.fecha.slice(0, 7) === m.clave)
      .reduce((s, i) => s + i.monto, 0);
    const gastos = STATE.gastos
      .filter(g => g.fecha.slice(0, 7) === m.clave)
      .reduce((s, g) => s + g.monto, 0);
    return { ingresos, gastos };
  });
}

function colorParaIndice(i) {
  const paleta = ['#3DDC97', '#FF5C6C', '#FFA94D', '#5B9FFF', '#9EFF6E', '#C77DFF', '#FFD166', '#4DD4D4'];
  return paleta[i % paleta.length];
}

function dibujarGraficosReportes() {
  // Chart.js ya está garantizado disponible aquí (verificado por esperarChartJs)
  var esOscuro = (STATE.config.tema || 'oscuro') === 'oscuro';
  var textoColor = esOscuro ? '#9099A6' : '#6B7280';
  var gridColor  = esOscuro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  if (_chartBarras)      { _chartBarras.destroy();      _chartBarras = null; }
  if (_chartPie)         { _chartPie.destroy();          _chartPie = null; }
  if (_chartNI)          { _chartNI.destroy();           _chartNI = null; }
  if (_chartComprometido){ _chartComprometido.destroy(); _chartComprometido = null; }
  if (_chartLinea)       { _chartLinea.destroy();        _chartLinea = null; }

  var meses = ultimosNMeses(6);
  var datos = datosIngresosGastosPorMes(meses);

  /* 1. BARRAS */
  _chartBarras = new Chart(document.getElementById('chartBarras').getContext('2d'), {
    type: 'bar',
    data: {
      labels: meses.map(function(m) { return m.etiqueta; }),
      datasets: [
        { label: 'Ingresos', data: datos.map(function(d) { return d.ingresos; }), backgroundColor: '#3DDC97', borderRadius: 6, borderSkipped: false },
        { label: 'Gastos',   data: datos.map(function(d) { return d.gastos; }),   backgroundColor: '#FF5C6C', borderRadius: 6, borderSkipped: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textoColor, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: textoColor }, grid: { display: false } },
        y: { ticks: { color: textoColor }, grid: { color: gridColor } },
      },
    },
  });

  /* 2. DONUT: gastos por categoría */
  var gastosPorCat = {};
  STATE.gastos.forEach(function(g) {
    if (CATEGORIAS_INTERNAS.indexOf(g.categoria) !== -1) return; // excluir internos
    gastosPorCat[g.categoria] = (gastosPorCat[g.categoria] || 0) + g.monto;
  });
  var catsOrdenadas = Object.entries(gastosPorCat).sort(function(a, b) { return b[1] - a[1]; });

  if (catsOrdenadas.length === 0) {
    document.getElementById('wrapPie').innerHTML = emptyInline('Aún no hay gastos para mostrar distribución por categoría.');
  } else {
    _chartPie = new Chart(document.getElementById('chartPie').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: catsOrdenadas.map(function(e) { return nombreCategoria(e[0]); }),
        datasets: [{ data: catsOrdenadas.map(function(e) { return e[1]; }), backgroundColor: catsOrdenadas.map(function(e, i) { return colorParaIndice(i); }), borderWidth: 2, borderColor: esOscuro ? '#1a2030' : '#ffffff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textoColor, boxWidth: 10, font: { size: 11 }, padding: 10 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + formatoMoneda(ctx.raw); } } },
        },
      },
    });
  }

  /* 3. DONUT: necesario vs impulsivo */
  var necesario = totalGastosPorTipo('necesario');
  var impulsivo  = totalGastosPorTipo('impulsivo');

  if (necesario + impulsivo === 0) {
    document.getElementById('wrapNI').innerHTML = emptyInline('Registra gastos para ver la distribución necesario vs impulsivo.');
  } else {
    _chartNI = new Chart(document.getElementById('chartNI').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Necesario', 'Impulsivo'],
        datasets: [{ data: [necesario, impulsivo], backgroundColor: ['#5B9FFF', '#FFA94D'], borderWidth: 2, borderColor: esOscuro ? '#1a2030' : '#ffffff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textoColor, boxWidth: 10, font: { size: 12 }, padding: 14 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + formatoMoneda(ctx.raw) + ' (' + ((ctx.raw / (necesario + impulsivo)) * 100).toFixed(1) + '%)'; } } },
        },
      },
    });
  }

  /* 4. DONUT: comprometido por tipo */
  var r = resumenSaldo();
  var comprometidoDatos = [];
  if (r.deudas > 0)     comprometidoDatos.push({ label: 'Deudas', valor: r.deudas, color: '#FFA94D' });
  if (r.tarjetas > 0)   comprometidoDatos.push({ label: 'Tarjetas', valor: r.tarjetas, color: '#c084fc' });
  if (r.pendientes > 0) comprometidoDatos.push({ label: 'Pagos pendientes', valor: r.pendientes, color: '#5B9FFF' });

  if (comprometidoDatos.length === 0) {
    document.getElementById('wrapComprometido').innerHTML = emptyInline('No tienes dinero comprometido. Sin deudas, tarjetas ni pagos pendientes.');
  } else {
    _chartComprometido = new Chart(document.getElementById('chartComprometido').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: comprometidoDatos.map(function(d) { return d.label; }),
        datasets: [{ data: comprometidoDatos.map(function(d) { return d.valor; }), backgroundColor: comprometidoDatos.map(function(d) { return d.color; }), borderWidth: 2, borderColor: esOscuro ? '#1a2030' : '#ffffff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textoColor, boxWidth: 10, font: { size: 12 }, padding: 14 } },
          tooltip: { callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + formatoMoneda(ctx.raw); } } },
        },
      },
    });
  }

  /* 5. LÍNEA: evolución saldo */
  var saldosPorMes = meses.map(function(m) {
    var ingAcum  = STATE.ingresos.filter(function(i) { return i.estado === 'recibido' && i.fecha.slice(0,7) <= m.clave; }).reduce(function(s,i) { return s + i.monto; }, 0);
    var gastAcum = STATE.gastos.filter(function(g) { return g.fecha.slice(0,7) <= m.clave; }).reduce(function(s,g) { return s + g.monto; }, 0);
    return ingAcum - gastAcum;
  });

  _chartLinea = new Chart(document.getElementById('chartLinea').getContext('2d'), {
    type: 'line',
    data: {
      labels: meses.map(function(m) { return m.etiqueta; }),
      datasets: [{
        label: 'Saldo neto acumulado',
        data: saldosPorMes,
        borderColor: '#9EFF6E',
        backgroundColor: 'rgba(158,255,110,0.10)',
        fill: true, tension: 0.35,
        pointBackgroundColor: '#9EFF6E', pointRadius: 5, pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textoColor }, grid: { display: false } },
        y: { ticks: { color: textoColor }, grid: { color: gridColor } },
      },
    },
  });
}

/* ======================== EXPORTACIÓN ======================== */

function cargarScript(src) {
  return new Promise(function(resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error('No se pudo cargar la librería de exportación.')); };
    document.head.appendChild(s);
  });
}

async function exportarReportePdf() {
  try {
    toast('Generando PDF...', 'info');
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const r = resumenSaldo();

    doc.setFontSize(18);
    doc.text('Reporte financiero', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Generado el ' + formatoFecha(hoyISO()), 14, 24);
    doc.setTextColor(0);
    doc.setFontSize(12);
    let y = 38;
    const linea = function(label, valor) { doc.text(label, 14, y); doc.text(valor, 196, y, { align: 'right' }); y += 8; };

    doc.setFont(undefined, 'bold'); doc.text('Resumen del periodo', 14, y); y += 10;
    doc.setFont(undefined, 'normal');
    linea('Dinero disponible en cuentas', formatoMoneda(r.disponible));
    linea('Ingresos recibidos', formatoMoneda(r.ingresos));
    linea('Gastos realizados', formatoMoneda(r.gastos));
    linea('Deudas activas', formatoMoneda(r.deudas));
    linea('Deuda en tarjetas', formatoMoneda(r.tarjetas));
    linea('Pagos pendientes', formatoMoneda(r.pendientes));
    doc.setFont(undefined, 'bold');
    linea('Dinero libre real', formatoMoneda(r.libre));
    y += 6;

    if (STATE.cuentas.length > 0) {
      doc.setFont(undefined, 'bold'); doc.text('Cuentas', 14, y); y += 10;
      doc.setFont(undefined, 'normal');
      STATE.cuentas.forEach(function(c) { linea(c.nombre, formatoMoneda(saldoCuenta(c.id))); });
      y += 6;
    }

    if (STATE.deudas.filter(function(d) { return d.estado !== 'pagada'; }).length > 0) {
      doc.setFont(undefined, 'bold'); doc.text('Deudas activas', 14, y); y += 10;
      doc.setFont(undefined, 'normal');
      STATE.deudas.filter(function(d) { return d.estado !== 'pagada'; }).forEach(function(d) { linea(d.nombre, formatoMoneda(saldoPendienteDeuda(d))); });
    }

    doc.save('reporte-financiero-' + hoyISO() + '.pdf');
    toast('PDF descargado.', 'success');
  } catch (e) {
    toast(e.message || 'No se pudo generar el PDF.', 'error');
  }
}

async function exportarReporteExcel() {
  try {
    toast('Generando Excel...', 'info');
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.utils.book_new();
    const r = resumenSaldo();

    const hojaResumen = [
      { Concepto: 'Dinero disponible en cuentas', Monto: r.disponible },
      { Concepto: 'Ingresos recibidos', Monto: r.ingresos },
      { Concepto: 'Gastos realizados', Monto: r.gastos },
      { Concepto: 'Deudas activas', Monto: r.deudas },
      { Concepto: 'Deuda en tarjetas', Monto: r.tarjetas },
      { Concepto: 'Pagos pendientes', Monto: r.pendientes },
      { Concepto: 'Dinero libre real', Monto: r.libre },
    ];
    const hojaIngresos = STATE.ingresos.map(function(i) {
      return { Descripción: i.descripcion, Monto: i.monto, Estado: i.estado, Fecha: i.fecha, Cuenta: (STATE.cuentas.find(function(c) { return c.id === i.cuentaId; }) || {}).nombre || '' };
    });
    const hojaGastos = STATE.gastos.map(function(g) {
      var origen = g.tarjetaId ? ((STATE.tarjetas.find(function(t) { return t.id === g.tarjetaId; }) || {}).nombre + ' (tarjeta)') : ((STATE.cuentas.find(function(c) { return c.id === g.cuentaId; }) || {}).nombre || '');
      return { Descripción: g.descripcion, Monto: g.monto, Categoría: nombreCategoria(g.categoria), Fecha: g.fecha, Origen: origen };
    });
    const hojaDeudas = STATE.deudas.map(function(d) {
      return { Nombre: d.nombre, 'Monto original': d.montoOriginal, 'Saldo pendiente': saldoPendienteDeuda(d), Estado: d.estado };
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaResumen), 'Resumen');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaIngresos), 'Ingresos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaGastos), 'Gastos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaDeudas), 'Deudas');

    XLSX.writeFile(wb, 'reporte-financiero-' + hoyISO() + '.xlsx');
    toast('Excel descargado.', 'success');
  } catch (e) {
    toast(e.message || 'No se pudo generar el Excel.', 'error');
  }
}
