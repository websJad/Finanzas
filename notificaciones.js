/* =========================================================================
   SISTEMA DE NOTIFICACIONES
   =========================================================================
   Analiza todo el estado de la app y genera notificaciones inteligentes
   organizadas por prioridad: urgente, advertencia, info, motivacional.
   ========================================================================= */

function generarNotificaciones() {
  var notifs = [];
  var hoy = new Date(); hoy.setHours(0,0,0,0);

  // ── URGENTE (rojo) ──────────────────────────────────────────

  // Pagos pendientes vencidos
  STATE.pagosPendientes.filter(function(p) { return p.estado === 'pendiente'; }).forEach(function(p) {
    var vence = new Date(p.fechaVencimiento + 'T12:00:00');
    var dias = Math.ceil((vence - hoy) / 86400000);
    if (dias < 0) {
      notifs.push({ tipo: 'urgente', icono: 'alert-circle', titulo: p.descripcion + ' está vencido',
        texto: 'Venció hace ' + Math.abs(dias) + ' día' + (Math.abs(dias) !== 1 ? 's' : '') + ' · ' + formatoMoneda(p.monto), id: 'pp-' + p.id });
    }
  });

  // Tarjetas al límite (≥90%)
  STATE.tarjetas.forEach(function(t) {
    var pct = t.limite > 0 ? (t.consumoActual / t.limite) * 100 : 0;
    if (pct >= 90) {
      notifs.push({ tipo: 'urgente', icono: 'alert-triangle', titulo: t.nombre + ' al ' + pct.toFixed(0) + '% del límite',
        texto: 'Consumo: ' + formatoMoneda(t.consumoActual) + ' de ' + formatoMoneda(t.limite), id: 'tj-' + t.id });
    }
  });

  // ── ADVERTENCIA (naranja) ───────────────────────────────────

  // Pagos pendientes próximos (1-3 días)
  STATE.pagosPendientes.filter(function(p) { return p.estado === 'pendiente'; }).forEach(function(p) {
    var vence = new Date(p.fechaVencimiento + 'T12:00:00');
    var dias = Math.ceil((vence - hoy) / 86400000);
    if (dias >= 0 && dias <= 3) {
      notifs.push({ tipo: 'advertencia', icono: 'clock', titulo: p.descripcion + (dias === 0 ? ' vence HOY' : ' vence en ' + dias + ' día' + (dias !== 1 ? 's' : '')),
        texto: formatoMoneda(p.monto), id: 'ppw-' + p.id });
    }
  });

  // Fecha de pago de tarjeta próxima (1-5 días)
  STATE.tarjetas.forEach(function(t) {
    var fecha = t.fechaPago || (typeof proximaFechaDesde === 'function' ? proximaFechaDesde(t.diaPago) : null);
    if (!fecha || !String(fecha).includes('-')) return;
    var target = new Date(fecha + 'T12:00:00');
    var dias = Math.ceil((target - hoy) / 86400000);
    if (dias >= 0 && dias <= 5 && t.consumoActual > 0) {
      notifs.push({ tipo: 'advertencia', icono: 'wallet', titulo: 'Pago de ' + t.nombre + (dias === 0 ? ' es HOY' : ' en ' + dias + ' día' + (dias !== 1 ? 's' : '')),
        texto: 'Deuda: ' + formatoMoneda(t.consumoActual), id: 'tp-' + t.id });
    }
  });

  // Fecha de corte de tarjeta próxima (1-3 días)
  STATE.tarjetas.forEach(function(t) {
    var fecha = t.fechaCorte || (typeof proximaFechaDesde === 'function' ? proximaFechaDesde(t.diaCorte) : null);
    if (!fecha || !String(fecha).includes('-')) return;
    var target = new Date(fecha + 'T12:00:00');
    var dias = Math.ceil((target - hoy) / 86400000);
    if (dias >= 0 && dias <= 3) {
      notifs.push({ tipo: 'advertencia', icono: 'scissors', titulo: 'Corte de ' + t.nombre + (dias === 0 ? ' es HOY' : ' en ' + dias + ' día' + (dias !== 1 ? 's' : '')),
        texto: 'Consumo actual: ' + formatoMoneda(t.consumoActual), id: 'tc-' + t.id });
    }
  });

  // Presupuestos al ≥80%
  STATE.presupuestos.forEach(function(p) {
    var usado = totalGastoCategoriaMesActual(p.categoria);
    var pct = p.limite > 0 ? (usado / p.limite) * 100 : 0;
    if (pct >= 80 && pct < 100) {
      notifs.push({ tipo: 'advertencia', icono: 'bar-chart', titulo: nombreCategoria(p.categoria) + ' al ' + pct.toFixed(0) + '% del presupuesto',
        texto: formatoMoneda(usado) + ' de ' + formatoMoneda(p.limite), id: 'pres-' + p.categoria });
    } else if (pct >= 100) {
      notifs.push({ tipo: 'urgente', icono: 'alert-triangle', titulo: 'Presupuesto de ' + nombreCategoria(p.categoria) + ' superado',
        texto: formatoMoneda(usado) + ' de ' + formatoMoneda(p.limite) + ' (' + pct.toFixed(0) + '%)', id: 'pres-' + p.categoria });
    }
  });

  // Tarjetas al 80-90%
  STATE.tarjetas.forEach(function(t) {
    var pct = t.limite > 0 ? (t.consumoActual / t.limite) * 100 : 0;
    if (pct >= 80 && pct < 90) {
      notifs.push({ tipo: 'advertencia', icono: 'alert-triangle', titulo: t.nombre + ' al ' + pct.toFixed(0) + '% del límite',
        texto: 'Disponible: ' + formatoMoneda(t.limite - t.consumoActual), id: 'tjw-' + t.id });
    }
  });

  // ── INFO (azul) ─────────────────────────────────────────────

  // Pagos pendientes en 7 días
  STATE.pagosPendientes.filter(function(p) { return p.estado === 'pendiente'; }).forEach(function(p) {
    var vence = new Date(p.fechaVencimiento + 'T12:00:00');
    var dias = Math.ceil((vence - hoy) / 86400000);
    if (dias > 3 && dias <= 7) {
      notifs.push({ tipo: 'info', icono: 'calendar', titulo: p.descripcion + ' vence en ' + dias + ' días',
        texto: formatoMoneda(p.monto), id: 'ppi-' + p.id });
    }
  });

  // Préstamos pendientes de cobrar
  var prestamosActivos = STATE.prestamos.filter(function(p) { return p.estado !== 'cobrado'; });
  if (prestamosActivos.length > 0) {
    var totalPrest = prestamosActivos.reduce(function(s, p) { return s + saldoPendientePrestamo(p); }, 0);
    notifs.push({ tipo: 'info', icono: 'gift', titulo: prestamosActivos.length + ' préstamo' + (prestamosActivos.length !== 1 ? 's' : '') + ' por cobrar',
      texto: 'Total pendiente: ' + formatoMoneda(totalPrest), id: 'prest-info' });
  }

  // Ingresos pendientes
  var ingresosPend = STATE.ingresos.filter(function(i) { return i.estado === 'pendiente'; });
  if (ingresosPend.length > 0) {
    var totalPend = ingresosPend.reduce(function(s, i) { return s + i.monto; }, 0);
    notifs.push({ tipo: 'info', icono: 'clock', titulo: ingresosPend.length + ' ingreso' + (ingresosPend.length !== 1 ? 's' : '') + ' pendiente' + (ingresosPend.length !== 1 ? 's' : '') + ' de cobrar',
      texto: formatoMoneda(totalPend) + ' por recibir', id: 'ing-pend' });
  }

  // No has registrado gastos hoy
  var mesActual = hoyISO().slice(0, 7);
  var gastosHoy = STATE.gastos.filter(function(g) { return g.fecha.slice(0, 10) === hoyISO(); });
  if (gastosHoy.length === 0 && STATE.gastos.length > 0) {
    notifs.push({ tipo: 'info', icono: 'edit', titulo: 'No has registrado gastos hoy',
      texto: 'Registra tus gastos del día para mantener tus finanzas al día.', id: 'sin-gastos' });
  }

  // Gastos recurrentes no registrados este mes
  var mesAct = hoyISO().slice(0, 7);
  var sinRegistrar = STATE.gastosRecurrentes.filter(function(r) { return !r.pausado && r.ultimoRegistro !== mesAct; });
  if (sinRegistrar.length > 0) {
    notifs.push({ tipo: 'info', icono: 'repeat', titulo: sinRegistrar.length + ' gasto' + (sinRegistrar.length !== 1 ? 's' : '') + ' recurrente' + (sinRegistrar.length !== 1 ? 's' : '') + ' sin registrar este mes',
      texto: sinRegistrar.map(function(r) { return r.nombre; }).join(', '), id: 'rec-pend' });
  }

  // ── MOTIVACIONAL (verde) ────────────────────────────────────

  // Saldo disponible positivo
  var disponible = saldoDisponibleReal();
  if (disponible > 0 && STATE.cuentas.length > 0) {
    notifs.push({ tipo: 'motivacional', icono: 'check', titulo: 'Tu dinero disponible es ' + formatoMoneda(disponible),
      texto: 'Sigue así — tienes el control de tus finanzas.', id: 'motiv-saldo' });
  }

  // Metas con progreso
  STATE.metas.forEach(function(m) {
    var aportado = totalAportadoMeta(m);
    var pct = m.montoObjetivo > 0 ? (aportado / m.montoObjetivo) * 100 : 0;
    if (pct >= 100) {
      notifs.push({ tipo: 'motivacional', icono: 'check', titulo: '¡Meta "' + m.nombre + '" completada!',
        texto: 'Alcanzaste tu objetivo de ' + formatoMoneda(m.montoObjetivo), id: 'meta-' + m.id });
    } else if (pct >= 50) {
      notifs.push({ tipo: 'motivacional', icono: 'target', titulo: 'Meta "' + m.nombre + '" al ' + pct.toFixed(0) + '%',
        texto: 'Llevas ' + formatoMoneda(aportado) + ' de ' + formatoMoneda(m.montoObjetivo) + '. Vas por buen camino.', id: 'meta-' + m.id });
    }
  });

  // Deudas pagadas
  var deudasPagadas = STATE.deudas.filter(function(d) { return d.estado === 'pagada'; });
  if (deudasPagadas.length > 0) {
    notifs.push({ tipo: 'motivacional', icono: 'check', titulo: deudasPagadas.length + ' deuda' + (deudasPagadas.length !== 1 ? 's' : '') + ' pagada' + (deudasPagadas.length !== 1 ? 's' : '') + ' completamente',
      texto: 'Cada deuda pagada te acerca a la libertad financiera.', id: 'deuda-pagada' });
  }

  return notifs;
}

/* ── PANEL DE NOTIFICACIONES ────────────────────────────────── */

function abrirPanelNotificaciones() {
  var notifs = generarNotificaciones();
  var urgentes = notifs.filter(function(n) { return n.tipo === 'urgente'; });
  var advertencias = notifs.filter(function(n) { return n.tipo === 'advertencia'; });
  var infos = notifs.filter(function(n) { return n.tipo === 'info'; });
  var motivacionales = notifs.filter(function(n) { return n.tipo === 'motivacional'; });

  var html = '';

  if (notifs.length === 0) {
    html = '<div style="text-align:center; padding:30px 10px;"><div style="font-size:28px; margin-bottom:12px;">✓</div><p style="color:var(--text-faint); font-size:14px;">Todo en orden. No hay notificaciones pendientes.</p></div>';
  } else {
    if (urgentes.length > 0) html += seccionNotifs('Urgente', urgentes, 'rojo');
    if (advertencias.length > 0) html += seccionNotifs('Atención', advertencias, 'naranja');
    if (infos.length > 0) html += seccionNotifs('Información', infos, 'azul');
    if (motivacionales.length > 0) html += seccionNotifs('Logros', motivacionales, 'verde');
  }

  abrirModal('Notificaciones (' + notifs.length + ')', html);
}

function seccionNotifs(titulo, items, color) {
  return '<div style="margin-bottom:18px;">' +
    '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--' + color + '); margin-bottom:10px;">' + titulo + '</div>' +
    items.map(function(n) {
      return '<div style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--border-soft);">' +
        '<div style="width:32px; height:32px; min-width:32px; border-radius:8px; background:var(--' + colorNotif(n.tipo) + '-bg); color:var(--' + colorNotif(n.tipo) + '); display:flex; align-items:center; justify-content:center;">' + icon(n.icono) + '</div>' +
        '<div><div style="font-weight:600; font-size:13px; margin-bottom:2px;">' + n.titulo + '</div><div class="text-faint" style="font-size:12px;">' + n.texto + '</div></div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function colorNotif(tipo) {
  return { urgente: 'rojo', advertencia: 'naranja', info: 'azul', motivacional: 'verde' }[tipo] || 'azul';
}

function contarNotificacionesUrgentes() {
  var notifs = generarNotificaciones();
  return notifs.filter(function(n) { return n.tipo === 'urgente' || n.tipo === 'advertencia'; }).length;
}
