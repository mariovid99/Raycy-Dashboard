/* Vista Oportunidades — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData } from '../compute.js';
import { crearKpiCard } from '../components/kpi-card.js';
import { crearDataTable } from '../components/data-table.js';
import { badgeHTML } from '../components/badge.js';
import { abrirDrawer } from '../components/drawer.js';
import { moneda, monedaCorta, porcentaje } from '../format.js';
import { crearScatter, destruirChart } from '../charts.js';

let _charts = [];
let _unsub = null;

// Paleta de colores por supervisor (índice)
const SUP_COLORS = ['#1E5EFF','#0E8A5F','#B36A00','#0B36A8','#8B92A1','#88AAFF','#C8281A'];

export function renderOportunidades(contenedor) {
  _destroy();

  function render() {
    _charts.forEach(c => destruirChart(c));
    _charts = [];
    contenedor.innerHTML = '';

    const { mesKey } = state.get();
    const mesData = getMesData(mesKey);
    const ops = mesData?.cotizaciones_con_oportunidad || [];
    const opsPorSup = mesData?.cotizaciones_con_oportunidad_por_supervisor || [];

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Oportunidades</h1>`;
    contenedor.appendChild(header);

    // (a) KPIs — 4
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'grid grid-4 section-gap';
    const totalIngreso = ops.reduce((s, o) => s + (o.ingreso_presupuestado || 0), 0);
    const totalMargenEst = ops.reduce((s, o) => s + (o.margen_estimado || 0), 0);
    const concluidas = ops.filter(o => o.estado_conclusion === 'Concluido').length;
    [
      { label: '# Oportunidades', valor: ops.length, fmt: v => Math.round(v).toString(), delay: 0 },
      { label: 'Ingreso total presupuestado', valor: totalIngreso, fmt: monedaCorta, delay: 40 },
      { label: 'Margen estimado total', valor: totalMargenEst, fmt: monedaCorta, delay: 80 },
      { label: 'Concluidas', valor: concluidas, fmt: v => Math.round(v).toString(), delay: 120 },
    ].forEach(k => {
      kpiGrid.appendChild(crearKpiCard({ label: k.label, valor: k.valor, formatear: k.fmt, delay: k.delay }));
    });
    contenedor.appendChild(kpiGrid);

    // (b) Pipeline por supervisor — stacked bars horizontales
    const pipeCard = document.createElement('div');
    pipeCard.className = 'card section-gap card-enter';
    pipeCard.innerHTML = `
      <div class="card__header"><div class="card__title">Pipeline por supervisor</div></div>`;

    const segColores = {
      'Sin facturar': 'var(--blue-200)',
      'Facturado pendiente cobro': 'var(--blue-500)',
      'Cobrado': 'var(--success-fg)',
      'Concluido': '#2B3140',
    };

    opsPorSup.forEach(s => {
      const total = (s.monto_facturado || 0) + (s.monto_pendiente_facturar || 0) || 1;
      const segs = [
        { label: 'Sin facturar', val: s.monto_pendiente_facturar || 0 },
        { label: 'Facturado pendiente cobro', val: (s.monto_facturado || 0) - (s.monto_cobrado || 0) },
        { label: 'Cobrado', val: s.monto_cobrado || 0 },
      ];

      const row = document.createElement('div');
      row.className = 'stacked-bar';
      row.innerHTML = `
        <div class="stacked-bar__label">${s.supervisor_nombre || 'Sin nombre'} — ${monedaCorta(s.monto_facturado + (s.monto_pendiente_facturar || 0))}</div>
        <div class="stacked-bar__track">
          ${segs.map(seg => {
            const pct = total > 0 ? Math.max((seg.val / total) * 100, 0) : 0;
            const color = segColores[seg.label] || 'var(--bg-muted)';
            return pct > 0
              ? `<div class="stacked-bar__seg" style="width:${pct}%;background:${color}" title="${seg.label}: ${moneda(seg.val)}">
                  ${pct > 10 ? `<span class="stacked-bar__seg-label">${porcentaje(pct, 0)}</span>` : ''}
                </div>`
              : '';
          }).join('')}
        </div>`;
      pipeCard.appendChild(row);
    });

    // Leyenda
    pipeCard.innerHTML += `
      <div class="chart-legend" style="margin-top:12px">
        ${Object.entries(segColores).map(([label, color]) =>
          `<div class="chart-legend__item">
            <div class="chart-legend__dot" style="background:${color}"></div>
            <span>${label}</span>
          </div>`
        ).join('')}
      </div>`;
    contenedor.appendChild(pipeCard);

    // (c) Tabla por supervisor
    const tableCard = document.createElement('div');
    tableCard.className = 'card section-gap card-enter';
    tableCard.style.animationDelay = '160ms';
    tableCard.innerHTML = `
      <div class="card__header"><div class="card__title">Detalle por supervisor</div></div>`;

    const tablaFilas = opsPorSup.map(s => ({
      ...s,
      pct_margen: s.gasto_real_mes > 0
        ? ((s.margen_real || 0) / Math.abs(s.gasto_real_mes)) * 100
        : 0,
    }));

    const tabla = crearDataTable({
      columnas: [
        { key: 'supervisor_nombre', label: 'Supervisor', format: v => `<span style="font-weight:500">${v || '—'}</span>` },
        { key: 'num_oportunidades', label: '# Oportunidades', align: 'right' },
        { key: 'ingreso_total_presupuestado', label: 'Ingreso ppto.', align: 'right', format: v => moneda(v) },
        { key: 'margen_estimado_total', label: 'Margen estimado', align: 'right', format: v => moneda(v) },
        { key: 'margen_real', label: 'Margen real', align: 'right',
          format: v => `<span style="color:${v >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'}">${moneda(v)}</span>` },
        { key: 'pct_margen', label: '% Margen', align: 'right', format: v => porcentaje(v) },
        { key: 'monto_facturado', label: 'Facturado', align: 'right', format: v => moneda(v) },
        { key: 'monto_por_cobrar', label: 'Por cobrar', align: 'right', format: v => moneda(v) },
        { key: 'oportunidades_concluidas', label: 'Concluidas', align: 'right' },
      ],
      filas: tablaFilas,
      onRowClick: (fila) => _abrirDrawerSup(fila),
    });
    tableCard.appendChild(tabla);
    contenedor.appendChild(tableCard);

    // (d) Scatter: Ingreso vs Margen real
    const scatterCard = document.createElement('div');
    scatterCard.className = 'card section-gap card-enter';
    scatterCard.style.animationDelay = '200ms';

    // Agrupar por supervisor
    const supNombres = [...new Set(ops.map(o => o.supervisores_asignados).filter(Boolean))];
    const datasets = supNombres.map((nombre, idx) => {
      const puntos = ops
        .filter(o => o.supervisores_asignados === nombre)
        .map(o => ({
          x: o.ingreso_presupuestado || 0,
          y: o.margen_real || 0,
          r: Math.max(5, Math.sqrt((o.num_compras_mes || 1)) * 3),
        }));
      return {
        label: nombre,
        data: puntos,
        backgroundColor: SUP_COLORS[idx % SUP_COLORS.length] + 'AA',
        borderColor: SUP_COLORS[idx % SUP_COLORS.length],
        borderWidth: 1,
        pointRadius: puntos.map(p => p.r),
        pointHoverRadius: puntos.map(p => p.r + 2),
      };
    });

    scatterCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Ingreso presupuestado vs Margen real</div>
        <div class="card__subtitle">Tamaño de burbuja = # compras</div>
      </div>
      <div class="chart-wrap chart-wrap--lg"><canvas id="chart-scatter"></canvas></div>`;
    contenedor.appendChild(scatterCard);

    requestAnimationFrame(() => {
      const canvas = document.getElementById('chart-scatter');
      if (canvas && datasets.length > 0) {
        const c = crearScatter(canvas, {
          datasets,
          formatTooltip: (label, raw) =>
            `${label} | Ingreso: ${moneda(raw.x)} | Margen: ${moneda(raw.y)}`,
        });
        _charts.push(c);
      }
    });
  }

  render();
  _unsub = state.subscribe(() => render());
}

function _abrirDrawerSup(s) {
  abrirDrawer({
    titulo: s.supervisor_nombre || 'Supervisor',
    contenido: `
      <div class="drawer-section">
        <div class="drawer-section__label">Pipeline</div>
        <div class="drawer-row"><span class="drawer-row__key">Oportunidades</span><span class="drawer-row__val">${s.num_oportunidades}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Ingreso ppto.</span><span class="drawer-row__val">${moneda(s.ingreso_presupuestado)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Monto facturado</span><span class="drawer-row__val">${moneda(s.monto_facturado)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Monto cobrado</span><span class="drawer-row__val">${moneda(s.monto_cobrado)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Por cobrar</span><span class="drawer-row__val">${moneda(s.monto_por_cobrar)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Pend. facturar</span><span class="drawer-row__val">${moneda(s.monto_pendiente_facturar)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Concluidas</span><span class="drawer-row__val">${s.oportunidades_concluidas || 0}</span></div>
      </div>`,
  });
}

function _destroy() {
  if (_unsub) { _unsub(); _unsub = null; }
  _charts.forEach(c => destruirChart(c));
  _charts = [];
}
