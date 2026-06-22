/* =========================================================================
   FINANZAS — CORE: estado, almacenamiento y lógica de saldo unificada
   ---------------------------------------------------------------------
   Toda la verdad sobre "cuánto dinero tengo realmente" vive aquí, en un
   solo lugar. Ningún módulo calcula saldos por su cuenta: todos leen de
   estas funciones para que el número nunca se desincronice entre vistas.
   ========================================================================= */

const STORAGE_KEY = 'finanzas_app_v1';

const CATEGORIAS_GASTO = [
  { id: 'alimentacion', nombre: 'Alimentación', tipo: 'necesario', icono: 'utensils' },
  { id: 'transporte', nombre: 'Transporte', tipo: 'necesario', icono: 'bus' },
  { id: 'vivienda', nombre: 'Vivienda', tipo: 'necesario', icono: 'home' },
  { id: 'servicios', nombre: 'Servicios', tipo: 'necesario', icono: 'zap' },
  { id: 'salud', nombre: 'Salud', tipo: 'necesario', icono: 'heart-pulse' },
  { id: 'educacion', nombre: 'Educación', tipo: 'necesario', icono: 'book' },
  { id: 'seguros', nombre: 'Seguros', tipo: 'necesario', icono: 'shield' },
  { id: 'cuidado_personal', nombre: 'Cuidado personal', tipo: 'necesario', icono: 'sparkles' },
  { id: 'mascotas', nombre: 'Mascotas', tipo: 'necesario', icono: 'paw-print' },
  { id: 'hogar', nombre: 'Hogar', tipo: 'necesario', icono: 'sofa' },
  { id: 'entretenimiento', nombre: 'Entretenimiento', tipo: 'impulsivo', icono: 'clapperboard' },
  { id: 'restaurantes', nombre: 'Restaurantes', tipo: 'impulsivo', icono: 'utensils-crossed' },
  { id: 'compras', nombre: 'Compras', tipo: 'impulsivo', icono: 'shopping-bag' },
  { id: 'suscripciones', nombre: 'Suscripciones', tipo: 'impulsivo', icono: 'repeat' },
  { id: 'viajes', nombre: 'Viajes', tipo: 'impulsivo', icono: 'plane' },
  { id: 'regalos', nombre: 'Regalos', tipo: 'impulsivo', icono: 'gift' },
  { id: 'tabaco_alcohol', nombre: 'Tabaco / alcohol', tipo: 'impulsivo', icono: 'wine' },
  { id: 'otros', nombre: 'Otros', tipo: 'impulsivo', icono: 'more-horizontal' },
  // Categorías internas (no se muestran en el selector de gastos manuales)
  { id: 'pago_tarjeta', nombre: 'Pago de tarjeta', tipo: 'necesario', icono: 'wallet' },
  { id: 'ahorro_meta', nombre: 'Aporte a meta', tipo: 'necesario', icono: 'target' },
  { id: 'prestamo_otorgado', nombre: 'Préstamo otorgado', tipo: 'necesario', icono: 'gift' },
];

const MONEDAS = {
  PEN: { simbolo: 'S/', nombre: 'Sol peruano' },
  USD: { simbolo: '$', nombre: 'Dólar estadounidense' },
  EUR: { simbolo: '€', nombre: 'Euro' },
};

const TIPOS_CUENTA = [
  { valor: 'efectivo',     nombre: 'Efectivo',                       icono: 'wallet' },
  { valor: 'billetera',    nombre: 'Billetera digital (Yape, Plin)',  icono: 'phone' },
  { valor: 'banco',        nombre: 'Cuenta bancaria',                icono: 'bank' },
  { valor: 'ahorro',       nombre: 'Cuenta de ahorros',              icono: 'bank' },
  { valor: 'cts',          nombre: 'CTS',                            icono: 'bank' },
  { valor: 'inversion',    nombre: 'Inversión (fondos, acciones)',    icono: 'target' },
  { valor: 'criptomoneda', nombre: 'Criptomoneda',                   icono: 'zap' },
  { valor: 'prestamo',     nombre: 'Préstamo recibido',              icono: 'alert-triangle' },
  { valor: 'otro',         nombre: 'Otro (personalizado)',           icono: 'wallet' },
];

function iconoCuenta(tipo) {
  const encontrado = TIPOS_CUENTA.find(t => t.valor === tipo);
  return encontrado ? encontrado.icono : 'wallet';
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function estadoVacio() {
  return {
    version: 1,
    config: {
      moneda: 'PEN',
      tema: 'oscuro',
      idioma: 'es',
      pinHabilitado: false,
      pin: null,
    },
    cuentas: [
      { id: uid(), nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 0 },
      { id: uid(), nombre: 'Yape', tipo: 'billetera', saldoInicial: 0 },
      { id: uid(), nombre: 'BCP Ahorros', tipo: 'banco', saldoInicial: 0 },
    ],
    tarjetas: [],
    ingresos: [],
    gastos: [],
    deudas: [],
    pagosPendientes: [],
    presupuestos: [],
    metas: [],
    gastosRecurrentes: [],
    movimientos: [],
    prestamos: [],
  };
}

let STATE = null;

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      STATE = estadoVacio();
      return STATE;
    }
    const parsed = JSON.parse(raw);
    STATE = Object.assign(estadoVacio(), parsed);
    STATE.config = Object.assign(estadoVacio().config, parsed.config || {});
    return STATE;
  } catch (e) {
    console.error('Error al cargar datos, iniciando estado limpio:', e);
    STATE = estadoVacio();
    return STATE;
  }
}

// Alias para el módulo de sync — lee el estado local sin modificar STATE
function cargarEstadoLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// Aplica un estado recibido desde Sheets y lo persiste localmente
function aplicarEstadoCargado(datos) {
  try {
    STATE = Object.assign(estadoVacio(), datos);
    STATE.config = Object.assign(estadoVacio().config, datos.config || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.error('Error aplicando estado cargado:', e);
  }
}

function guardarEstado() {
  try {
    STATE._ts = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    // Si el sync está activo, guarda en Sheets con debounce
    if (typeof syncGuardar === 'function' && syncHabilitado()) {
      syncGuardar(STATE);
    }
    return true;
  } catch (e) {
    console.error('No se pudo guardar:', e);
    toast('No se pudo guardar. Verifica el espacio de almacenamiento.', 'error');
    return false;
  }
}

function registrarMovimiento(tipo, descripcion, monto) {
  STATE.movimientos.unshift({
    id: uid(),
    tipo,
    descripcion,
    monto,
    fecha: new Date().toISOString(),
  });
  if (STATE.movimientos.length > 500) STATE.movimientos.pop();
}

/* -------------------------------------------------------------------------
   LÓGICA DE SALDO — única fuente de verdad
   -------------------------------------------------------------------------
   Regla central del sistema:

     Dinero libre real = Ingresos recibidos
                        − Gastos realizados
                        − Deudas activas (saldo pendiente)
                        − Pagos pendientes (no confirmados)

   Reglas de no-interferencia:
   - Una transferencia entre cuentas mueve dinero de una cuenta a otra
     pero NO cambia el total disponible (no es ingreso ni gasto).
   - Un pago con tarjeta de crédito incrementa la deuda de esa tarjeta;
     el efectivo no se mueve hasta que se paga la tarjeta.
   - Un abono a una deuda reduce el saldo pendiente de esa deuda Y se
     registra como salida de la cuenta usada para pagarla.
   - Un ingreso "pendiente" no suma al saldo hasta que se marca "recibido".
   ------------------------------------------------------------------------- */

function totalIngresosRecibidos() {
  return STATE.ingresos
    .filter(i => i.estado === 'recibido')
    .reduce((sum, i) => sum + i.monto, 0);
}

function totalIngresosPendientes() {
  return STATE.ingresos
    .filter(i => i.estado === 'pendiente')
    .reduce((sum, i) => sum + i.monto, 0);
}

const CATEGORIAS_INTERNAS = ['pago_tarjeta', 'ahorro_meta', 'prestamo_otorgado'];

function totalGastosRealizados() {
  return STATE.gastos.reduce((sum, g) => sum + g.monto, 0);
}

// Solo gastos "manuales" del usuario — excluye pagos de tarjeta, aportes y préstamos
function totalGastosRealizadosManuales() {
  return STATE.gastos
    .filter(g => !CATEGORIAS_INTERNAS.includes(g.categoria))
    .reduce((sum, g) => sum + g.monto, 0);
}

function totalGastosPorTipo(tipo) {
  return STATE.gastos
    .filter(g => {
      if (CATEGORIAS_INTERNAS.includes(g.categoria)) return false;
      const cat = CATEGORIAS_GASTO.find(c => c.id === g.categoria);
      return cat && cat.tipo === tipo;
    })
    .reduce((sum, g) => sum + g.monto, 0);
}

function saldoPendienteDeuda(deuda) {
  const abonado = (deuda.abonos || []).reduce((s, a) => s + a.monto, 0);
  return Math.max(0, deuda.montoOriginal - abonado);
}

function totalDeudasActivas() {
  return STATE.deudas
    .filter(d => d.estado !== 'pagada')
    .reduce((sum, d) => sum + saldoPendienteDeuda(d), 0);
}

function totalPagosPendientes() {
  return STATE.pagosPendientes
    .filter(p => p.estado === 'pendiente')
    .reduce((sum, p) => sum + p.monto, 0);
}

function totalDeudaTarjetas() {
  return STATE.tarjetas.reduce((sum, t) => sum + (t.consumoActual || 0), 0);
}

function saldoComprometido() {
  // Dinero que ya tiene "destino": deudas activas + pagos pendientes + deuda de tarjetas
  return totalDeudasActivas() + totalPagosPendientes() + totalDeudaTarjetas();
}

function saldoTotalCuentas() {
  // Saldo inicial de cada cuenta + movimientos netos imputados a esa cuenta
  return STATE.cuentas.reduce((sum, c) => sum + saldoCuenta(c.id), 0);
}

function saldoCuenta(cuentaId) {
  const cuenta = STATE.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) return 0;
  let saldo = cuenta.saldoInicial || 0;

  STATE.ingresos
    .filter(i => i.cuentaId === cuentaId && i.estado === 'recibido')
    .forEach(i => { saldo += i.monto; });

  STATE.gastos
    .filter(g => g.cuentaId === cuentaId && !g.tarjetaId)
    .forEach(g => { saldo -= g.monto; });

  STATE.deudas.forEach(d => {
    (d.abonos || [])
      .filter(a => a.cuentaId === cuentaId)
      .forEach(a => { saldo -= a.monto; });
  });

  STATE.pagosPendientes
    .filter(p => p.cuentaId === cuentaId && p.estado === 'pagado')
    .forEach(p => { saldo -= p.monto; });

  STATE.movimientos
    .filter(m => m.tipo === 'transferencia_salida' && m.cuentaId === cuentaId)
    .forEach(m => { saldo -= m.monto; });

  STATE.movimientos
    .filter(m => m.tipo === 'transferencia_entrada' && m.cuentaId === cuentaId)
    .forEach(m => { saldo += m.monto; });

  return saldo;
}

function dineroLibreReal() {
  return totalIngresosRecibidos()
    - totalGastosRealizados()
    - totalDeudasActivas()
    - totalPagosPendientes();
}

// Dinero que físicamente tienes disponible ahora mismo:
// suma de saldos de cuentas reales (efectivo, bancos, billeteras).
// Las tarjetas de crédito NO entran aquí — no son dinero tuyo.
function saldoDisponibleReal() {
  return STATE.cuentas.reduce((sum, c) => sum + saldoCuenta(c.id), 0);
}

function resumenSaldo() {
  const ingresos = totalIngresosRecibidos();
  const gastos = totalGastosRealizados();
  const deudas = totalDeudasActivas();
  const tarjetas = totalDeudaTarjetas();
  const pendientes = totalPagosPendientes();
  return {
    ingresos,
    gastos,
    deudas,
    tarjetas,
    pendientes,
    libre: ingresos - gastos - deudas - tarjetas - pendientes,
    comprometido: deudas + tarjetas + pendientes,
    disponible: saldoDisponibleReal(),
  };
}

/* -------------------------------------------------------------------------
   ACCIONES — cada acción de usuario pasa por aquí, nunca se edita STATE
   directamente desde la UI sin pasar por estas funciones validadas.
   ------------------------------------------------------------------------- */

function accionAgregarIngreso({ descripcion, monto, categoria, cuentaId, estado, fecha }) {
  if (!descripcion || !descripcion.trim()) throw new Error('La descripción es obligatoria.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!cuentaId) throw new Error('Selecciona una cuenta de destino.');

  const ingreso = {
    id: uid(),
    descripcion: descripcion.trim(),
    monto: Number(monto),
    categoria: categoria || 'general',
    cuentaId,
    estado: estado || 'recibido',
    fecha: fecha || hoyISO(),
  };
  STATE.ingresos.unshift(ingreso);
  registrarMovimiento('ingreso', descripcion, ingreso.monto);
  guardarEstado();
  return ingreso;
}

function accionMarcarIngresoRecibido(id) {
  const ing = STATE.ingresos.find(i => i.id === id);
  if (!ing) throw new Error('Ingreso no encontrado.');
  ing.estado = 'recibido';
  guardarEstado();
}

function accionAgregarGasto({ descripcion, monto, categoria, cuentaId, tarjetaId, fecha }) {
  if (!descripcion || !descripcion.trim()) throw new Error('La descripción es obligatoria.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!tarjetaId && !cuentaId) throw new Error('Selecciona una cuenta o tarjeta.');

  const gasto = {
    id: uid(),
    descripcion: descripcion.trim(),
    monto: Number(monto),
    categoria: categoria || 'otros',
    cuentaId: tarjetaId ? null : cuentaId,
    tarjetaId: tarjetaId || null,
    fecha: fecha || hoyISO(),
  };

  if (tarjetaId) {
    const tarjeta = STATE.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) throw new Error('Tarjeta no encontrada.');
    const disponible = tarjeta.limite - (tarjeta.consumoActual || 0);
    if (gasto.monto > disponible) {
      throw new Error(`Excede el límite disponible de la tarjeta (${formatoMoneda(disponible)} disponibles).`);
    }
    tarjeta.consumoActual = (tarjeta.consumoActual || 0) + gasto.monto;
  }

  STATE.gastos.unshift(gasto);
  registrarMovimiento('gasto', descripcion, -gasto.monto);

  // Presupuesto: alerta si supera el 80%
  const presupuesto = STATE.presupuestos.find(p => p.categoria === gasto.categoria);
  guardarEstado();
  if (presupuesto) {
    const usado = totalGastoCategoriaMesActual(gasto.categoria);
    if (usado >= presupuesto.limite) {
      toast(`Superaste el presupuesto de ${nombreCategoria(gasto.categoria)}.`, 'warning');
    } else if (usado >= presupuesto.limite * 0.8) {
      toast(`Vas en el 80% del presupuesto de ${nombreCategoria(gasto.categoria)}.`, 'warning');
    }
  }
  return gasto;
}

function totalGastoCategoriaMesActual(categoria) {
  const mesActual = hoyISO().slice(0, 7);
  return STATE.gastos
    .filter(g => g.categoria === categoria && g.fecha.slice(0, 7) === mesActual)
    .reduce((s, g) => s + g.monto, 0);
}

function nombreCategoria(id) {
  const c = CATEGORIAS_GASTO.find(c => c.id === id);
  return c ? c.nombre : id;
}

function accionTransferir({ origenId, destinoId, monto, nota }) {
  if (origenId === destinoId) throw new Error('La cuenta de origen y destino deben ser distintas.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  const saldoOrigen = saldoCuenta(origenId);
  if (monto > saldoOrigen) throw new Error('Saldo insuficiente en la cuenta de origen.');

  STATE.movimientos.unshift({
    id: uid(), tipo: 'transferencia_salida', cuentaId: origenId,
    monto, descripcion: nota || 'Transferencia', fecha: new Date().toISOString(),
  });
  STATE.movimientos.unshift({
    id: uid(), tipo: 'transferencia_entrada', cuentaId: destinoId,
    monto, descripcion: nota || 'Transferencia', fecha: new Date().toISOString(),
  });
  guardarEstado();
}

function accionAgregarDeuda({ nombre, montoOriginal, cuotas, tasaInteres, fechaInicio }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre de la deuda es obligatorio.');
  if (!(montoOriginal > 0)) throw new Error('El monto debe ser mayor a 0.');

  const deuda = {
    id: uid(),
    nombre: nombre.trim(),
    montoOriginal: Number(montoOriginal),
    cuotas: cuotas ? Number(cuotas) : null,
    tasaInteres: tasaInteres ? Number(tasaInteres) : 0,
    fechaInicio: fechaInicio || hoyISO(),
    estado: 'activa',
    abonos: [],
  };
  STATE.deudas.unshift(deuda);
  guardarEstado();
  return deuda;
}

function accionAbonarDeuda({ deudaId, monto, cuentaId, fecha }) {
  const deuda = STATE.deudas.find(d => d.id === deudaId);
  if (!deuda) throw new Error('Deuda no encontrada.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  const pendiente = saldoPendienteDeuda(deuda);
  if (monto > pendiente) throw new Error('El abono no puede ser mayor al saldo pendiente.');
  if (cuentaId) {
    const saldo = saldoCuenta(cuentaId);
    if (monto > saldo) throw new Error('Saldo insuficiente en la cuenta seleccionada.');
  }

  deuda.abonos = deuda.abonos || [];
  deuda.abonos.push({ id: uid(), monto: Number(monto), cuentaId, fecha: fecha || hoyISO() });

  const nuevoPendiente = saldoPendienteDeuda(deuda);
  deuda.estado = nuevoPendiente <= 0 ? 'pagada' : (deuda.abonos.length > 0 ? 'parcial' : 'activa');

  registrarMovimiento('abono_deuda', `Abono a ${deuda.nombre}`, -monto);
  guardarEstado();
}

function accionAgregarPagoPendiente({ descripcion, monto, fechaVencimiento, categoria, recurrente }) {
  if (!descripcion || !descripcion.trim()) throw new Error('La descripción es obligatoria.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!fechaVencimiento) throw new Error('La fecha de vencimiento es obligatoria.');

  const pago = {
    id: uid(),
    descripcion: descripcion.trim(),
    monto: Number(monto),
    fechaVencimiento,
    categoria: categoria || 'servicios',
    recurrente: !!recurrente,
    estado: 'pendiente',
  };
  STATE.pagosPendientes.unshift(pago);
  guardarEstado();
  return pago;
}

function accionMarcarPagoRealizado({ pagoId, cuentaId }) {
  const pago = STATE.pagosPendientes.find(p => p.id === pagoId);
  if (!pago) throw new Error('Pago no encontrado.');
  if (!cuentaId) throw new Error('Selecciona la cuenta desde la que se pagó.');
  const saldo = saldoCuenta(cuentaId);
  if (pago.monto > saldo) throw new Error('Saldo insuficiente en la cuenta seleccionada.');

  pago.estado = 'pagado';
  pago.cuentaId = cuentaId;
  pago.fechaPago = hoyISO();
  registrarMovimiento('pago', pago.descripcion, -pago.monto);
  guardarEstado();
}

function diasHastaVencimiento(fechaVencimiento) {
  const hoy = new Date(hoyISO());
  const venc = new Date(fechaVencimiento);
  return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
}

function accionAgregarPresupuesto({ categoria, limite }) {
  if (!categoria) throw new Error('Selecciona una categoría.');
  if (!(limite > 0)) throw new Error('El límite debe ser mayor a 0.');
  const existente = STATE.presupuestos.find(p => p.categoria === categoria);
  if (existente) {
    existente.limite = Number(limite);
  } else {
    STATE.presupuestos.push({ id: uid(), categoria, limite: Number(limite) });
  }
  guardarEstado();
}

function accionAgregarMeta({ nombre, montoObjetivo, fechaObjetivo }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre de la meta es obligatorio.');
  if (!(montoObjetivo > 0)) throw new Error('El monto objetivo debe ser mayor a 0.');
  const meta = {
    id: uid(),
    nombre: nombre.trim(),
    montoObjetivo: Number(montoObjetivo),
    fechaObjetivo: fechaObjetivo || null,
    aportes: [],
  };
  STATE.metas.unshift(meta);
  guardarEstado();
  return meta;
}

function accionAportarMeta({ metaId, monto, cuentaId }) {
  const meta = STATE.metas.find(m => m.id === metaId);
  if (!meta) throw new Error('Meta no encontrada.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!cuentaId) throw new Error('Selecciona la cuenta o billetera desde la que aportas.');
  const saldo = saldoCuenta(cuentaId);
  if (Number(monto) > saldo) throw new Error('Saldo insuficiente en la cuenta seleccionada.');

  // El aporte sale físicamente de la cuenta y se registra como gasto
  STATE.gastos.unshift({
    id: uid(),
    descripcion: `Aporte a meta "${meta.nombre}"`,
    monto: Number(monto),
    categoria: 'ahorro_meta',
    cuentaId,
    tarjetaId: null,
    esAporteMeta: true,
    metaId,
    fecha: hoyISO(),
  });
  meta.aportes.push({ id: uid(), monto: Number(monto), cuentaId, fecha: hoyISO() });
  registrarMovimiento('aporte_meta', `Aporte a meta "${meta.nombre}"`, -Number(monto));
  guardarEstado();
}

function totalAportadoMeta(meta) {
  return (meta.aportes || []).reduce((s, a) => s + a.monto, 0);
}

function accionAgregarCuenta({ nombre, tipo, saldoInicial }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre de la cuenta es obligatorio.');
  const cuenta = {
    id: uid(),
    nombre: nombre.trim(),
    tipo: tipo || 'efectivo',
    saldoInicial: Number(saldoInicial) || 0,
  };
  STATE.cuentas.push(cuenta);
  guardarEstado();
  return cuenta;
}

function accionEliminarCuenta(id) {
  const usoIngresos = STATE.ingresos.some(i => i.cuentaId === id);
  const usoGastos = STATE.gastos.some(g => g.cuentaId === id);
  const usoAbonosDeuda = STATE.deudas.some(d => (d.abonos || []).some(a => a.cuentaId === id));
  const usoPagosPendientes = STATE.pagosPendientes.some(p => p.cuentaId === id);
  const usoTransferencias = STATE.movimientos.some(m =>
    (m.tipo === 'transferencia_salida' || m.tipo === 'transferencia_entrada') && m.cuentaId === id
  );
  if (usoIngresos || usoGastos || usoAbonosDeuda || usoPagosPendientes || usoTransferencias) {
    throw new Error('No se puede eliminar: la cuenta tiene movimientos asociados.');
  }
  STATE.cuentas = STATE.cuentas.filter(c => c.id !== id);
  guardarEstado();
}

function accionEditarCuenta({ cuentaId, nombre, tipo, saldoInicial }) {
  const cuenta = STATE.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) throw new Error('Cuenta no encontrada.');
  if (!nombre || !nombre.trim()) throw new Error('El nombre es obligatorio.');
  cuenta.nombre = nombre.trim();
  cuenta.tipo = tipo || cuenta.tipo;
  cuenta.saldoInicial = Number(saldoInicial) || 0;
  guardarEstado();
}

function accionAgregarTarjeta({ nombre, limite, diaCorte, diaPago }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre de la tarjeta es obligatorio.');
  if (!(limite > 0)) throw new Error('El límite debe ser mayor a 0.');
  const tarjeta = {
    id: uid(),
    nombre: nombre.trim(),
    limite: Number(limite),
    consumoActual: 0,
    diaCorte: diaCorte ? Number(diaCorte) : 1,
    diaPago: diaPago ? Number(diaPago) : 15,
  };
  STATE.tarjetas.push(tarjeta);
  guardarEstado();
  return tarjeta;
}

function accionPagarTarjeta({ tarjetaId, monto, cuentaId }) {
  const tarjeta = STATE.tarjetas.find(t => t.id === tarjetaId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (monto > tarjeta.consumoActual) throw new Error('El pago no puede ser mayor a la deuda actual.');
  if (!cuentaId) throw new Error('Selecciona la cuenta desde la que pagas.');
  const saldo = saldoCuenta(cuentaId);
  if (monto > saldo) throw new Error('Saldo insuficiente en la cuenta seleccionada.');

  // El pago de tarjeta SÍ es un gasto real que sale de la cuenta:
  // descuenta de la cuenta elegida y reduce la deuda de la tarjeta.
  STATE.gastos.unshift({
    id: uid(),
    descripcion: `Pago tarjeta ${tarjeta.nombre}`,
    monto: Number(monto),
    categoria: 'pago_tarjeta',
    cuentaId,
    tarjetaId: null, // No es un cargo a tarjeta, es pago desde cuenta
    esPagoTarjeta: true,
    fecha: hoyISO(),
  });
  tarjeta.consumoActual = Math.max(0, tarjeta.consumoActual - Number(monto));
  registrarMovimiento('pago_tarjeta', `Pago tarjeta ${tarjeta.nombre}`, -Number(monto));
  guardarEstado();
}

function accionEditarTarjeta({ tarjetaId, nombre, limite, diaCorte, diaPago }) {
  const tarjeta = STATE.tarjetas.find(t => t.id === tarjetaId);
  if (!tarjeta) throw new Error('Tarjeta no encontrada.');
  if (!nombre || !nombre.trim()) throw new Error('El nombre es obligatorio.');
  if (!(limite > 0)) throw new Error('El límite debe ser mayor a 0.');
  tarjeta.nombre = nombre.trim();
  tarjeta.limite = Number(limite);
  tarjeta.diaCorte = diaCorte ? Number(diaCorte) : tarjeta.diaCorte;
  tarjeta.diaPago = diaPago ? Number(diaPago) : tarjeta.diaPago;
  guardarEstado();
}

function accionEliminarTarjeta(id) {
  const usoGastos = STATE.gastos.some(g => g.tarjetaId === id);
  if (usoGastos) {
    throw new Error('No se puede eliminar: la tarjeta tiene gastos asociados.');
  }
  STATE.tarjetas = STATE.tarjetas.filter(t => t.id !== id);
  guardarEstado();
}

function accionEliminarGenerico(coleccion, id) {
  if (!STATE[coleccion]) throw new Error('Colección no válida.');
  STATE[coleccion] = STATE[coleccion].filter(item => item.id !== id);
  guardarEstado();
}

/* ==================== PRÉSTAMOS OTORGADOS ==================== */

function accionAgregarPrestamo({ persona, monto, descripcion, fecha, cuentaId }) {
  if (!persona || !persona.trim()) throw new Error('El nombre de la persona es obligatorio.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!cuentaId) throw new Error('Selecciona la cuenta desde la que prestaste.');
  const saldo = saldoCuenta(cuentaId);
  if (Number(monto) > saldo) throw new Error('Saldo insuficiente en la cuenta seleccionada.');

  const prestamo = {
    id: uid(),
    persona: persona.trim(),
    montoOriginal: Number(monto),
    descripcion: (descripcion || '').trim(),
    fecha: fecha || hoyISO(),
    cuentaId,
    estado: 'activo', // activo | parcial | cobrado
    cobros: [],
  };

  // El préstamo sale de la cuenta como un gasto especial
  STATE.gastos.unshift({
    id: uid(),
    descripcion: `Préstamo a ${prestamo.persona}`,
    monto: Number(monto),
    categoria: 'prestamo_otorgado',
    cuentaId,
    tarjetaId: null,
    esPrestamoOtorgado: true,
    prestamoId: prestamo.id,
    fecha: prestamo.fecha,
  });

  STATE.prestamos.unshift(prestamo);
  registrarMovimiento('prestamo', `Préstamo a ${prestamo.persona}`, -Number(monto));
  guardarEstado();
  return prestamo;
}

function accionCobrarPrestamo({ prestamoId, monto, cuentaId, fecha, nota }) {
  const prestamo = STATE.prestamos.find(p => p.id === prestamoId);
  if (!prestamo) throw new Error('Préstamo no encontrado.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!cuentaId) throw new Error('Selecciona la cuenta donde recibiste el abono.');
  const pendiente = saldoPendientePrestamo(prestamo);
  if (Number(monto) > pendiente + 0.001) throw new Error(`El cobro no puede superar el saldo pendiente (${formatoMoneda(pendiente)}).`);

  // El cobro entra como ingreso a la cuenta
  STATE.ingresos.unshift({
    id: uid(),
    descripcion: nota ? `Cobro préstamo ${prestamo.persona} — ${nota}` : `Cobro préstamo ${prestamo.persona}`,
    monto: Number(monto),
    categoria: 'general',
    cuentaId,
    estado: 'recibido',
    esCobroPrestamo: true,
    prestamoId,
    fecha: fecha || hoyISO(),
  });

  prestamo.cobros.push({ id: uid(), monto: Number(monto), cuentaId, nota: nota || '', fecha: fecha || hoyISO() });
  const nuevoPendiente = saldoPendientePrestamo(prestamo);
  prestamo.estado = nuevoPendiente <= 0.001 ? 'cobrado' : 'parcial';
  registrarMovimiento('cobro_prestamo', `Cobro préstamo ${prestamo.persona}`, Number(monto));
  guardarEstado();
}

function saldoPendientePrestamo(prestamo) {
  const cobrado = (prestamo.cobros || []).reduce((s, c) => s + c.monto, 0);
  return Math.max(0, prestamo.montoOriginal - cobrado);
}

function totalPrestamosActivos() {
  return STATE.prestamos
    .filter(p => p.estado !== 'cobrado')
    .reduce((s, p) => s + saldoPendientePrestamo(p), 0);
}

function accionAgregarGastoRecurrente({ nombre, monto, categoria, diaDelMes }) {
  if (!nombre || !nombre.trim()) throw new Error('El nombre es obligatorio.');
  if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  const rec = {
    id: uid(),
    nombre: nombre.trim(),
    monto: Number(monto),
    categoria: categoria || 'suscripciones',
    diaDelMes: diaDelMes ? Number(diaDelMes) : 1,
    pausado: false,
    ultimoRegistro: null,
  };
  STATE.gastosRecurrentes.unshift(rec);
  guardarEstado();
  return rec;
}

function accionTogglePausaRecurrente(id) {
  const rec = STATE.gastosRecurrentes.find(r => r.id === id);
  if (!rec) throw new Error('No encontrado.');
  rec.pausado = !rec.pausado;
  guardarEstado();
}

/* ----------------------------- utilidades ------------------------------- */

function formatoMoneda(valor) {
  const cfg = STATE.config.moneda || 'PEN';
  const simbolo = MONEDAS[cfg].simbolo;
  const num = Number(valor || 0);
  const formatted = Math.abs(num).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${num < 0 ? '-' : ''}${simbolo} ${formatted}`;
}

function formatoFecha(fechaISO) {
  if (!fechaISO) return '—';
  const d = new Date(fechaISO.length === 10 ? fechaISO + 'T00:00:00' : fechaISO);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exportarRespaldo() {
  return JSON.stringify(STATE, null, 2);
}

function restaurarRespaldo(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('Archivo inválido.');
  STATE = Object.assign(estadoVacio(), parsed);
  guardarEstado();
}

function reiniciarTodo() {
  STATE = estadoVacio();
  guardarEstado();
}
