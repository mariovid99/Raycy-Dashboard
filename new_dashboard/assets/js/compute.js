/* Agregadores y cálculos derivados — Raycy Dashboard */

import { getMes, getMeses, getTodosLosMeses } from './data.js';

/**
 * Retorna el objeto de mes; si key === 'YTD' agrega todos los meses.
 */
export function getMesData(key) {
  if (key !== 'YTD') return getMes(key);

  const todos = Object.values(getTodosLosMeses());
  if (!todos.length) return null;

  // Agrega colecciones sumando arrays
  return {
    periodo: 'Acumulado',
    cotizaciones_por_supervisor: _agruparSupervisores(todos),
    cotizaciones_con_gastos: todos.flatMap(m => m.cotizaciones_con_gastos || []),
    cotizaciones_con_gastos_por_supervisor: _agruparConGastosPorSup(todos),
    cotizaciones_con_oportunidad: todos.flatMap(m => m.cotizaciones_con_oportunidad || []),
    cotizaciones_con_oportunidad_por_supervisor: _agruparOpPorSup(todos),
  };
}

function _sum(arr, key) { return arr.reduce((s, x) => s + (x[key] || 0), 0); }

function _agruparSupervisores(meses) {
  const map = new Map();
  meses.forEach(m => {
    (m.cotizaciones_por_supervisor || []).forEach(s => {
      const id = s.supervisor_id;
      if (!map.has(id)) { map.set(id, { ...s }); return; }
      const ex = map.get(id);
      ex.num_cotizaciones     += s.num_cotizaciones;
      ex.venta_total          += s.venta_total;
      ex.gasto_mes            += s.gasto_mes;
      ex.num_compras_mes      += s.num_compras_mes;
      ex.margen_estimado      += s.margen_estimado;
      ex.margen_real          += s.margen_real;
      ex.compras_facturadas   += s.compras_facturadas;
      ex.compras_pagadas      += s.compras_pagadas;
      ex.total_materiales     += s.total_materiales;
      ex.monto_pendiente_pagar_proveedores += s.monto_pendiente_pagar_proveedores;
    });
  });
  map.forEach(s => {
    s.venta_promedio = s.num_cotizaciones ? s.venta_total / s.num_cotizaciones : 0;
    s.porcentaje_margen = s.gasto_mes ? ((s.margen_real / s.gasto_mes) * 100) : 0;
    s.porcentaje_ejecucion_presupuesto = s.margen_estimado
      ? (s.gasto_mes / (s.venta_total - s.margen_estimado + s.gasto_mes)) * 100 : 0;
  });
  return [...map.values()];
}

function _agruparConGastosPorSup(meses) {
  const map = new Map();
  meses.forEach(m => {
    (m.cotizaciones_con_gastos_por_supervisor || []).forEach(s => {
      const id = s.supervisor_id || s.supervisor_nombre;
      if (!map.has(id)) { map.set(id, { ...s }); return; }
      const ex = map.get(id);
      ex.num_cotizaciones_con_gastos = (ex.num_cotizaciones_con_gastos || 0) + (s.num_cotizaciones_con_gastos || 0);
      ex.total_presupuestado = (ex.total_presupuestado || 0) + (s.total_presupuestado || 0);
      ex.total_gastado_mes = (ex.total_gastado_mes || 0) + (s.total_gastado_mes || 0);
      ex.monto_pendiente_pago = (ex.monto_pendiente_pago || 0) + (s.monto_pendiente_pago || 0);
    });
  });
  return [...map.values()];
}

function _agruparOpPorSup(meses) {
  const map = new Map();
  meses.forEach(m => {
    (m.cotizaciones_con_oportunidad_por_supervisor || []).forEach(s => {
      const id = s.supervisor_id || s.supervisor_nombre;
      if (!map.has(id)) { map.set(id, { ...s }); return; }
      const ex = map.get(id);
      ex.num_oportunidades = (ex.num_oportunidades || 0) + (s.num_oportunidades || 0);
      ex.ingreso_total_presupuestado = (ex.ingreso_total_presupuestado || 0) + (s.ingreso_total_presupuestado || 0);
      ex.margen_estimado_total = (ex.margen_estimado_total || 0) + (s.margen_estimado_total || 0);
      ex.margen_real = (ex.margen_real || 0) + (s.margen_real || 0);
      ex.gasto_real_mes = (ex.gasto_real_mes || 0) + (s.gasto_real_mes || 0);
      ex.monto_facturado = (ex.monto_facturado || 0) + (s.monto_facturado || 0);
      ex.monto_pendiente_facturar = (ex.monto_pendiente_facturar || 0) + (s.monto_pendiente_facturar || 0);
      ex.monto_cobrado = (ex.monto_cobrado || 0) + (s.monto_cobrado || 0);
      ex.monto_por_cobrar = (ex.monto_por_cobrar || 0) + (s.monto_por_cobrar || 0);
      ex.oportunidades_concluidas = (ex.oportunidades_concluidas || 0) + (s.oportunidades_concluidas || 0);
    });
  });
  return [...map.values()];
}

/**
 * KPIs globales del mes.
 */
export function kpisGlobalesMes(mesData) {
  if (!mesData) return {};

  const sups = mesData.cotizaciones_por_supervisor || [];
  const ops = mesData.cotizaciones_con_oportunidad || [];
  const opsPorSup = mesData.cotizaciones_con_oportunidad_por_supervisor || [];

  const ventaTotal = _sum(sups, 'venta_total');
  const gastoTotal = _sum(sups, 'gasto_mes');
  const margenReal = ventaTotal - gastoTotal;
  const pctMargen = gastoTotal > 0 ? (margenReal / gastoTotal) * 100 : 0;
  const numCotizaciones = _sum(sups, 'num_cotizaciones');
  const numCotizacionesConGastos = (mesData.cotizaciones_con_gastos || []).length;
  const numFacturadasCliente = ops.filter(o => o.estado_facturacion === 'Facturado').length;
  const numCobradas = ops.filter(o => o.estado_cobro === 'Cobrado').length;
  const pendientePagarProveedores = _sum(sups, 'monto_pendiente_pagar_proveedores');
  const pendientePorCobrar = _sum(opsPorSup, 'monto_por_cobrar');

  return {
    ventaTotal,
    gastoTotal,
    margenReal,
    pctMargen,
    numCotizaciones,
    numCotizacionesConGastos,
    numFacturadasCliente,
    numCobradas,
    pendientePagarProveedores,
    pendientePorCobrar,
    numOportunidades: ops.length,
  };
}

/**
 * Serie mensual de una métrica para line/bar chart.
 * @param {string} metric - 'ventaTotal' | 'gastoTotal' | 'margenReal' | 'numCotizaciones'
 */
export function serieMensual(metric) {
  return getMeses().map(m => {
    const data = getMes(m.key);
    const kpis = data ? kpisGlobalesMes(data) : {};
    return { mesKey: m.key, label: m.label, value: kpis[metric] || 0 };
  });
}

/**
 * Supervisores ordenados por métrica.
 * @param {Object} mesData
 * @param {'venta_total'|'margen_real'|'gasto_mes'} by
 */
export function rankingSupervisores(mesData, by = 'venta_total') {
  if (!mesData) return [];
  return [...(mesData.cotizaciones_por_supervisor || [])]
    .sort((a, b) => (b[by] || 0) - (a[by] || 0));
}

/**
 * Embudo operativo: counts y montos en cada etapa.
 */
export function embudoOperativo(mesData) {
  if (!mesData) return [];
  const sups = mesData.cotizaciones_por_supervisor || [];
  const conGastos = mesData.cotizaciones_con_gastos || [];
  const ops = mesData.cotizaciones_con_oportunidad || [];

  const totalCotizaciones = _sum(sups, 'num_cotizaciones');
  const totalVenta = _sum(sups, 'venta_total');
  const cotConCompras = conGastos.length;
  const montoConCompras = _sum(conGastos, 'precio_total');
  const facturadas = ops.filter(o => o.estado_facturacion === 'Facturado');
  const cobradas = ops.filter(o => o.estado_cobro === 'Cobrado');

  return [
    { label: 'Cotizaciones enviadas', count: totalCotizaciones, monto: totalVenta },
    { label: 'Con compras registradas', count: cotConCompras, monto: montoConCompras },
    { label: 'Facturadas al cliente', count: facturadas.length, monto: _sum(facturadas, 'ingreso_presupuestado') },
    { label: 'Cobradas', count: cobradas.length, monto: _sum(cobradas, 'ingreso_presupuestado') },
  ];
}

/**
 * Cotizaciones donde gasto > precio (margen negativo).
 */
export function cotizacionesEnRiesgo(mesData) {
  if (!mesData) return [];
  return (mesData.cotizaciones_con_gastos || [])
    .filter(c => (c.diferencia ?? 0) < 0)
    .sort((a, b) => (a.diferencia || 0) - (b.diferencia || 0));
}

/**
 * Agrupa cotizaciones_con_oportunidad por analisis_flujo_efectivo.
 */
export function flujoEfectivo(mesData) {
  if (!mesData) return [];
  const map = new Map();
  (mesData.cotizaciones_con_oportunidad || []).forEach(op => {
    const k = op.analisis_flujo_efectivo || 'Sin datos';
    if (!map.has(k)) map.set(k, { label: k, count: 0, monto: 0 });
    const bucket = map.get(k);
    bucket.count++;
    bucket.monto += op.ingreso_presupuestado || 0;
  });
  return [...map.values()].sort((a, b) => b.monto - a.monto);
}

/**
 * Delta % de una métrica: mes actual vs mes anterior.
 */
export function comparativoMesActualVsAnterior(mesKey, metric) {
  const meses = getMeses();
  const idx = meses.findIndex(m => m.key === mesKey);
  if (idx <= 0) return null;

  const actual = getMes(mesKey);
  const anterior = getMes(meses[idx - 1].key);
  if (!actual || !anterior) return null;

  const va = kpisGlobalesMes(actual)[metric] || 0;
  const vb = kpisGlobalesMes(anterior)[metric] || 0;

  if (vb === 0) return null;
  return ((va - vb) / Math.abs(vb)) * 100;
}

/**
 * Salud financiera para donut: cobrado / facturado pendiente cobro / sin facturar.
 */
export function saludFinanciera(mesData) {
  if (!mesData) return { cobrado: 0, facturadoPendiente: 0, sinFacturar: 0 };

  const ops = mesData.cotizaciones_con_oportunidad || [];
  const cobrado = _sum(ops.filter(o => o.estado_cobro === 'Cobrado'), 'ingreso_presupuestado');
  const facturadoPendiente = _sum(
    ops.filter(o => o.estado_facturacion === 'Facturado' && o.estado_cobro !== 'Cobrado'),
    'ingreso_presupuestado'
  );
  const sinFacturar = _sum(ops.filter(o => o.estado_facturacion !== 'Facturado'), 'ingreso_presupuestado');
  return { cobrado, facturadoPendiente, sinFacturar };
}

/** KPIs de facturación por supervisor. */
export function kpisFacturacion(mesData) {
  if (!mesData) return {};
  const opsPorSup = mesData.cotizaciones_con_oportunidad_por_supervisor || [];
  return {
    montoFacturado: _sum(opsPorSup, 'monto_facturado'),
    montoPorCobrar: _sum(opsPorSup, 'monto_por_cobrar'),
    totalPresupuestado: _sum(opsPorSup, 'monto_facturado') + _sum(opsPorSup, 'monto_pendiente_facturar'),
  };
}
