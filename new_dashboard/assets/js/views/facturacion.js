/* Vista Facturación y Cobranza — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData, kpisFacturacion, saludFinanciera } from '../compute.js';
import { crearKpiCard } from '../components/kpi-card.js';
import { crearDataTable } from '../components/data-table.js';
import { badgeHTML } from '../components/badge.js';
import { abrirDrawer } from '../components/drawer.js';
import { moneda, monedaCorta, porcentaje } from '../format.js';
import { getFechaGeneracion } from '../data.js';
import { Icon } from '../icons.js';

let _unsub = null;

export function renderFacturacion(contenedor) {
  _destroy();

  function render() {
    contenedor.innerHTML = '';

    const { mesKey } = state.get();
    const mesData = getMesData(mesKey);
    const kpis = kpisFacturacion(mesData);
    const opsPorSup = mesData?.cotizaciones_con_oportunidad_por_supervisor || [];
    const ops = mesData?.cotizaciones_con_oportunidad || [];
    const salud = saludFinanciera(mesData);
    const totalPpto = kpis.totalPresupuestado || 1;

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Facturación y Cobranza</h1>`;
    contenedor.appendChild(header);

    // (a) KPI strip — 4
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'grid grid-4 section-gap';
    const cobertura = totalPpto > 0 ? (kpis.montoFacturado / totalPpto) * 100 : 0;
    [
      { label: 'Monto facturado al cliente', valor: kpis.montoFacturado || 0, fmt: monedaCorta, delay: 0 },
      { label: 'Monto por cobrar', valor: kpis.montoPorCobrar || 0, fmt: monedaCorta, delay: 40 },
      { label: 'Cobertura (facturado / presupuesto)', valor: cobertura, fmt: v => porcentaje(v), delay: 80 },
      { label: 'Total presupuestado', valor: kpis.totalPresupuestado || 0, fmt: monedaCorta, delay: 120 },
    ].forEach(k => {
      kpiGrid.appendChild(crearKpiCard({ label: k.label, valor: k.valor, formatear: k.fmt, delay: k.delay }));
    });
    contenedor.appendChild(kpiGrid);

    // (b) Embudo de cobranza — stacked bar
    const embudoCard = document.createElement('div');
    embudoCard.className = 'card section-gap card-enter';
    embudoCard.innerHTML = `
      <div class="card__header"><div class="card__title">Embudo de Cobranza</div></div>`;

    [
      { label: 'Total presupuestado', val: kpis.totalPresupuestado || 0, pct: 100, color: 'var(--bg-muted)' },
      { label: 'Facturado', val: kpis.montoFacturado || 0, pct: totalPpto > 0 ? (kpis.montoFacturado / totalPpto) * 100 : 0, color: 'var(--blue-400)' },
      { label: 'Cobrado', val: salud.cobrado || 0, pct: totalPpto > 0 ? (salud.cobrado / totalPpto) * 100 : 0, color: 'var(--success-fg)' },
    ].forEach(step => {
      const row = document.createElement('div');
      row.className = 'stacked-bar';
      row.innerHTML = `
        <div class="stacked-bar__label">${step.label} — ${moneda(step.val)} (${porcentaje(step.pct, 0)})</div>
        <div style="height:32px;background:var(--bg-muted);border-radius:var(--radius-sm);overflow:hidden">
          <div style="height:100%;width:${Math.min(step.pct,100)}%;background:${step.color};border-radius:var(--radius-sm);transition:width 600ms var(--ease)"></div>
        </div>`;
      embudoCard.appendChild(row);
    });
    contenedor.appendChild(embudoCard);

    // (c) Tabla de oportunidades
    const tableCard = document.createElement('div');
    tableCard.className = 'card section-gap card-enter';
    tableCard.style.animationDelay = '160ms';
    tableCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Oportunidades del mes</div>
        <div class="card__subtitle">${ops.length} registros</div>
      </div>`;

    const tabla = crearDataTable({
      columnas: [
        { key: 'cotizacion_id', label: '# Cot.', format: (_, f) => `<span style="font-weight:600">${f.numero_cotizacion || f.cotizacion_id || '—'}</span>` },
        { key: 'codigo_op', label: 'Código OP' },
        { key: 'supervisores_asignados', label: 'Supervisor', format: v => v || '—' },
        { key: 'ingreso_presupuestado', label: 'Ingreso ppto.', align: 'right', format: v => moneda(v) },
        { key: 'gasto_real_mes', label: 'Gastado', align: 'right', format: v => moneda(v) },
        { key: 'margen_real', label: 'Margen real', align: 'right',
          format: v => `<span style="color:${v >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'}">${moneda(v)}</span>` },
        { key: 'estado_facturacion', label: 'Factura', format: v => badgeHTML(v || '—') },
        { key: 'estado_cobro', label: 'Cobro', format: v => badgeHTML(v || '—') },
        { key: 'analisis_flujo_efectivo', label: 'Análisis flujo', format: v => `<span style="font-size:11px;color:var(--text-tertiary)">${v || '—'}</span>` },
      ],
      filas: ops,
      onRowClick: (fila) => _abrirDrawerOp(fila),
      emptyMsg: 'Sin oportunidades registradas en este período.',
    });
    tableCard.appendChild(tabla);
    contenedor.appendChild(tableCard);

    // (d) Aging — pendiente cobro
    const hoy = getFechaGeneracion();
    const pendientes = ops.filter(o => o.estado_cobro !== 'Cobrado' && o.estado_facturacion === 'Facturado');
    const agingBuckets = [
      { label: '0 – 15 días', montoTotal: 0, count: 0 },
      { label: '16 – 30 días', montoTotal: 0, count: 0 },
      { label: '31 – 60 días', montoTotal: 0, count: 0 },
      { label: '60+ días', montoTotal: 0, count: 0 },
    ];

    pendientes.forEach(o => {
      const fechaRef = o.fecha_cotizacion || null;
      if (!fechaRef) return;
      const dias = Math.max(0, Math.floor((hoy - new Date(fechaRef + 'T00:00:00')) / 86400000));
      const idx = dias <= 15 ? 0 : dias <= 30 ? 1 : dias <= 60 ? 2 : 3;
      agingBuckets[idx].montoTotal += o.ingreso_presupuestado || 0;
      agingBuckets[idx].count++;
    });

    const agingCard = document.createElement('div');
    agingCard.className = 'card section-gap card-enter';
    agingCard.style.animationDelay = '200ms';
    agingCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Aging — Antigüedad de cobro pendiente</div>
        <div class="card__subtitle">${pendientes.length} oportunidades facturadas sin cobrar</div>
      </div>`;

    const maxAging = Math.max(...agingBuckets.map(b => b.montoTotal), 1);
    agingBuckets.forEach(b => {
      const pct = (b.montoTotal / maxAging) * 100;
      const row = document.createElement('div');
      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:var(--fs-sm);color:var(--text-secondary)">${b.label}</span>
          <span style="font-size:var(--fs-sm);font-weight:600;font-variant-numeric:tabular-nums">${moneda(b.montoTotal)} (${b.count})</span>
        </div>
        <div class="progress-bar" style="margin-bottom:12px">
          <div class="progress-bar__fill" style="width:${pct}%;background:${pct > 80 ? 'var(--danger-fg)' : 'var(--blue-500)'}"></div>
        </div>`;
      agingCard.appendChild(row);
    });
    contenedor.appendChild(agingCard);

    // (e) Estado de la información
    const infoCard = document.createElement('div');
    infoCard.className = 'card section-gap card-enter';
    infoCard.style.animationDelay = '240ms';
    const pendCobro = ops.filter(o => o.estado_cobro === 'Pendiente Cobro');
    infoCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">${Icon('info', { size: 16 })} Estado de la información</div>
      </div>
      <p style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:16px">
        Hay <strong>${pendCobro.length}</strong> oportunidades con cobro pendiente de actualizar.
      </p>`;

    if (pendCobro.length > 0) {
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn btn--ghost';
      exportBtn.innerHTML = `${Icon('download', { size: 14 })} Exportar CSV`;
      exportBtn.addEventListener('click', () => _exportarCSV(pendCobro));
      infoCard.appendChild(exportBtn);
    }
    contenedor.appendChild(infoCard);
  }

  render();
  _unsub = state.subscribe(() => render());
}

function _abrirDrawerOp(op) {
  abrirDrawer({
    titulo: `OP: ${op.codigo_op || op.cotizacion_id}`,
    contenido: `
      <div class="drawer-section">
        <div class="drawer-section__label">Financiero</div>
        <div class="drawer-row"><span class="drawer-row__key">Ingreso presupuestado</span><span class="drawer-row__val">${moneda(op.ingreso_presupuestado)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Costo cotizado</span><span class="drawer-row__val">${moneda(op.costo_cotizado)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Gasto real</span><span class="drawer-row__val">${moneda(op.gasto_real_mes)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Margen real</span>
          <span class="drawer-row__val" style="color:${(op.margen_real||0)>=0?'var(--success-fg)':'var(--danger-fg)'}">${moneda(op.margen_real)}</span></div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section__label">Estado con cliente</div>
        <div class="drawer-row"><span class="drawer-row__key">Facturación</span><span class="drawer-row__val">${op.estado_facturacion || '—'}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Cobro</span><span class="drawer-row__val">${op.estado_cobro || '—'}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Conclusión</span><span class="drawer-row__val">${op.estado_conclusion || '—'}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Pend. pagar prov.</span><span class="drawer-row__val">${moneda(op.monto_pendiente_pagar_proveedores)}</span></div>
      </div>
      ${op.analisis_flujo_efectivo ? `<div class="flujo-quote">${op.analisis_flujo_efectivo}</div>` : ''}`,
  });
}

function _exportarCSV(ops) {
  const cols = ['cotizacion_id', 'codigo_op', 'supervisores_asignados', 'ingreso_presupuestado', 'estado_facturacion', 'estado_cobro', 'analisis_flujo_efectivo'];
  const header = cols.join(',');
  const rows = ops.map(o => cols.map(c => {
    const v = o[c];
    if (Array.isArray(v)) return `"${v.join('; ')}"`;
    if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
    return v ?? '';
  }).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cobranza_pendiente.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function _destroy() {
  if (_unsub) { _unsub(); _unsub = null; }
}
