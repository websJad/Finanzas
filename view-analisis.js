/* =========================================================================
   VISTA: ANÁLISIS INTELIGENTE
   ---------------------------------------------------------------------
   Todo aquí es heurística simple sobre los datos reales del usuario,
   sin llamadas externas: proyección lineal de fin de mes, detección de
   hábitos (categoría dominante, ritmo de gasto impulsivo, presupuestos
   en riesgo) y orden de pago de deudas por método avalancha (mayor
   tasa de interés primero, ya que es matemáticamente lo más eficiente).
   ========================================================================= */

function renderAnalisis() {
  const main = document.getElementById('mainContent');

  main.innerHTML = `
    <div class="view-header">
      <div>
        <h1>Análisis inteligente</h1>
        <p class="view-sub">Hábitos detectados, proyección de saldo y estrategia de deudas</p>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px; align-items:start;">
      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:16px;">Proyección a fin de mes</h3>
        ${renderProyeccion()}
      </div>
      <div class="card">
        <h3 style="font-size:14.5px; margin-bottom:16px;">Qué deuda pagar primero</h3>
        ${renderEstrategiaDeudas()}
      </div>
    </div>

    <div class="section-title">Hábitos detectados</div>
    <div style="display:flex; flex-direction:column; gap:12px;">
      ${renderInsights()}
    </div>
  `;
}

function renderProyeccion() {
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const mesActual = hoyISO().slice(0, 7);

  const ingresosMes = STATE.ingresos.filter(i => i.estado === 'recibido' && i.fecha.slice(0, 7) === mesActual).reduce((s, i) => s + i.monto, 0);
  const gastosMes = STATE.gastos.filter(g => g.fecha.slice(0, 7) === mesActual).reduce((s, g) => s + g.monto, 0);

  if (gastosMes === 0 && ingresosMes === 0) {
    return emptyInline('Registra movimientos este mes para ver una proyección.');
  }

  const ritmoGastoDiario = gastosMes / Math.max(diaActual, 1);
  const gastoProyectado = ritmoGastoDiario * diasEnMes;
  const libreActual = dineroLibreReal();
  const proyeccionFinMes = libreActual - (gastoProyectado - gastosMes);

  const tendenciaPositiva = proyeccionFinMes >= libreActual;

  return `
    <div class="projection-box">
      <span class="eyebrow">Saldo libre estimado al cierre del mes</span>
      <div class="mono" style="font-size:30px; font-weight:700; color:${proyeccionFinMes >= 0 ? 'var(--lima)' : 'var(--rojo)'}; margin:6px 0 10px;">
        ${formatoMoneda(proyeccionFinMes)}
      </div>
      <p style="font-size:12.5px; color:var(--text-dim); line-height:1.5;">
        Mantienes un ritmo de gasto de ${formatoMoneda(ritmoGastoDiario)} por día.
        A ese ritmo, terminarías el mes habiendo gastado ${formatoMoneda(gastoProyectado)} en total
        ${tendenciaPositiva ? '— tu saldo se mantiene estable.' : '— tu saldo libre seguirá bajando si no ajustas el ritmo.'}
      </p>
    </div>
  `;
}

function renderEstrategiaDeudas() {
  const activas = STATE.deudas.filter(d => d.estado !== 'pagada');
  if (activas.length === 0) {
    return emptyInline('No tienes deudas activas. No hay nada que priorizar — buen trabajo.');
  }

  // Método avalancha: ordenar por tasa de interés descendente; si no hay
  // tasa registrada, se asume 0 y se ordena luego por saldo pendiente.
  const ordenadas = [...activas].sort((a, b) => {
    const tasaA = a.tasaInteres || 0;
    const tasaB = b.tasaInteres || 0;
    if (tasaB !== tasaA) return tasaB - tasaA;
    return saldoPendienteDeuda(b) - saldoPendienteDeuda(a);
  });

  return `
    <ol style="display:flex; flex-direction:column; gap:10px; padding-left:0; margin:0; list-style:none;">
      ${ordenadas.map((d, i) => `
        <li style="display:flex; align-items:center; gap:12px; padding:10px 0; ${i < ordenadas.length - 1 ? 'border-bottom:1px solid var(--border-soft);' : ''}">
          <div style="width:26px; height:26px; border-radius:50%; background:${i === 0 ? 'var(--lima-bg)' : 'var(--surface-3)'}; color:${i === 0 ? 'var(--lima)' : 'var(--text-dim)'}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;">${i + 1}</div>
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13.5px;">${d.nombre}</div>
            <div class="text-faint" style="font-size:11.5px;">${d.tasaInteres ? `${d.tasaInteres}% de interés · ` : 'Sin tasa registrada · '}saldo ${formatoMoneda(saldoPendienteDeuda(d))}</div>
          </div>
          ${i === 0 ? '<span class="pill pill-verde">Prioridad</span>' : ''}
        </li>
      `).join('')}
    </ol>
    <p style="font-size:11.5px; color:var(--text-faint); margin-top:14px; line-height:1.5;">
      Método avalancha: paga primero la deuda con mayor tasa de interés mientras cubres el mínimo de las demás. Así reduces lo que pagas en intereses a lo largo del tiempo.
    </p>
  `;
}

function renderInsights() {
  const insights = [];
  const mesActual = hoyISO().slice(0, 7);
  const gastosMes = STATE.gastos.filter(g => g.fecha.slice(0, 7) === mesActual);

  if (gastosMes.length === 0 && STATE.gastos.length === 0) {
    insights.push({ icono: 'inbox', color: 'azul', titulo: 'Aún sin datos suficientes', texto: 'Registra algunos gastos para que el análisis pueda detectar patrones reales en tu comportamiento financiero.' });
    return insights.map(i => insightCard(i)).join('');
  }

  // 1. Categoría dominante del mes
  const porCategoria = {};
  gastosMes.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto; });
  const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0);
  const top = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
  if (top && totalMes > 0) {
    const pct = ((top[1] / totalMes) * 100).toFixed(0);
    insights.push({
      icono: 'shopping-bag', color: 'naranja',
      titulo: `${nombreCategoria(top[0])} es tu categoría dominante`,
      texto: `Representa el ${pct}% de tu gasto este mes (${formatoMoneda(top[1])} de ${formatoMoneda(totalMes)}).`,
    });
  }

  // 2. Proporción necesario vs impulsivo
  const necesario = totalGastosPorTipo('necesario');
  const impulsivo = totalGastosPorTipo('impulsivo');
  const totalNI = necesario + impulsivo;
  if (totalNI > 0) {
    const pctImpulsivo = (impulsivo / totalNI) * 100;
    if (pctImpulsivo >= 40) {
      insights.push({
        icono: 'zap', color: 'rojo',
        titulo: 'El gasto impulsivo pesa bastante',
        texto: `El ${pctImpulsivo.toFixed(0)}% de tu gasto histórico es impulsivo (entretenimiento, compras, restaurantes). Vale la pena revisarlo.`,
      });
    } else {
      insights.push({
        icono: 'check', color: 'verde',
        titulo: 'Tu gasto está bien equilibrado',
        texto: `Solo el ${pctImpulsivo.toFixed(0)}% de tu gasto histórico es impulsivo — la mayoría va a necesidades reales.`,
      });
    }
  }

  // 3. Presupuestos en riesgo
  const presupuestosEnRiesgo = STATE.presupuestos.filter(p => {
    const usado = totalGastoCategoriaMesActual(p.categoria);
    return p.limite > 0 && usado / p.limite >= 0.8;
  });
  if (presupuestosEnRiesgo.length > 0) {
    insights.push({
      icono: 'alert-triangle', color: 'naranja',
      titulo: `${presupuestosEnRiesgo.length} presupuesto(s) cerca del límite`,
      texto: `${presupuestosEnRiesgo.map(p => nombreCategoria(p.categoria)).join(', ')} ${presupuestosEnRiesgo.length > 1 ? 'están' : 'está'} por encima del 80% de su límite mensual.`,
    });
  }

  // 4. Tarjetas con uso alto
  const tarjetasAltoUso = STATE.tarjetas.filter(t => t.limite > 0 && (t.consumoActual / t.limite) >= 0.8);
  if (tarjetasAltoUso.length > 0) {
    insights.push({
      icono: 'alert-circle', color: 'rojo',
      titulo: 'Tarjetas cerca de su límite',
      texto: `${tarjetasAltoUso.map(t => t.nombre).join(', ')} ${tarjetasAltoUso.length > 1 ? 'superan' : 'supera'} el 80% de su línea de crédito disponible.`,
    });
  }

  // 5. Metas estancadas
  const metasSinAportes = STATE.metas.filter(m => totalAportadoMeta(m) === 0);
  if (metasSinAportes.length > 0) {
    insights.push({
      icono: 'target', color: 'azul',
      titulo: 'Tienes metas sin ningún aporte',
      texto: `${metasSinAportes.map(m => m.nombre).join(', ')} no ${metasSinAportes.length > 1 ? 'han' : 'ha'} recibido aportes todavía.`,
    });
  }

  if (insights.length === 0) {
    insights.push({ icono: 'check', color: 'verde', titulo: 'Todo en orden', texto: 'No detectamos patrones de riesgo en tus finanzas actuales.' });
  }

  return insights.map(i => insightCard(i)).join('');
}

function insightCard(i) {
  return `
    <div class="insight-card">
      <div class="insight-icon" style="background:var(--${i.color}-bg); color:var(--${i.color});">${icon(i.icono)}</div>
      <div class="insight-body">
        <h4>${i.titulo}</h4>
        <p>${i.texto}</p>
      </div>
    </div>
  `;
}
