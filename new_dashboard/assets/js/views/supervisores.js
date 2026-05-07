/* Vista Supervisores — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData, rankingSupervisores, serieMensual } from '../compute.js';
import { getMeses, getMes } from '../data.js';
import { crearKpiCard } from '../components/kpi-card.js';
import { crearDataTable } from '../components/data-table.js';
import { badgeHTML } from '../components/badge.js';
import { abrirDrawer } from '../components/drawer.js';
import { moneda, monedaCorta, porcentaje, numero, iniciales } from '../format.js';
import { crearBarHorizontal, crearComboChart, destruirChart } from '../charts.js';
import { Icon } from '../icons.js';

let _charts = [];
let _unsub = null;

export function renderSupervisores(contenedor) {
  _destroy();

  function render() {
    _charts.forEach(c => destruirChart(c));
    _charts = [];
    contenedor.innerHTML = '';

    const { mesKey } = state.get();
    const mesData = getMesData(mesKey);
    const sups = mesData ? (mesData.cotizaciones_por_supervisor || []) : [];

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Supervisores</h1>`;
    contenedor.appendChild(header);

    // (a) Resumen del equipo — 4 KPIs
    const activos = sups.filter(s => s.num_cotizaciones > 0).length;
    const ventaPromedio = activos > 0 ? sups.reduce((s, x) => s + x.venta_total, 0) / activos : 0;
    const margenesArr = sups.map(s => s.porcentaje_margen).filter(v => isFinite(v)).sort((a, b) => a - b);
    const mediana = margenesArr.length
      ? margenesArr[Math.floor(margenesArr.length / 2)]
      : 0;
    const enRojo = sups.filter(s => s.porcentaje_ejecucion_presupuesto > 100 || s.margen_real < 0).length;

    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'grid grid-4 section-gap';
    [
      { label: 'Supervisores activos', valor: activos, fmt: v => Math.round(v).toString(), delay: 0 },
      { label: 'Venta promedio por supervisor', valor: ventaPromedio, fmt: monedaCorta, delay: 40 },
      { label: 'Mediana % margen', valor: mediana, fmt: v => porcentaje(v), delay: 80 },
      { label: 'Supervisores en rojo', valor: enRojo, fmt: v => Math.round(v).toString(), delay: 120 },
    ].forEach(k => {
      kpiGrid.appendChild(crearKpiCard({ label: k.label, valor: k.valor, formatear: k.fmt, delay: k.delay }));
    });
    contenedor.appendChild(kpiGrid);

    // (b) Tabla comparativa
    const tableCard = document.createElement('div');
    tableCard.className = 'card section-gap card-enter';
    tableCard.innerHTML = `<div class="card__header"><div class="card__title">Comparativo de supervisores</div></div>`;

    const detailContainers = new Map();

    const tabla = crearDataTable({
      columnas: [
        { key: 'supervisor_nombre', label: 'Supervisor', format: (v) => `<span style="font-weight:500">${v}</span>` },
        { key: 'num_cotizaciones', label: 'Cotizaciones', align: 'right' },
        { key: 'venta_total', label: 'Venta', align: 'right', format: v => monedaCorta(v) },
        { key: 'gasto_mes', label: 'Gasto', align: 'right', format: v => monedaCorta(v) },
        { key: 'margen_real', label: 'Margen real', align: 'right', format: (v) => `<span style="color:${v >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'}">${moneda(v)}</span>` },
        { key: 'porcentaje_margen', label: '% Margen', align: 'right', format: v => porcentaje(v) },
        { key: 'porcentaje_ejecucion_presupuesto', label: '% Ejec. Ppto', align: 'right', format: v => `<span style="color:${v > 100 ? 'var(--danger-fg)' : 'inherit'}">${porcentaje(v)}</span>` },
        { key: 'compras_pagadas', label: 'Compras pagadas', align: 'right' },
        { key: 'monto_pendiente_pagar_proveedores', label: 'Pendiente prov.', align: 'right', format: v => moneda(v) },
      ],
      filas: sups,
      onRowClick: (fila) => _abrirDrawerSupervisor(fila, mesData),
    });
    tableCard.appendChild(tabla);
    contenedor.appendChild(tableCard);

    // (c) Heatmap supervisor × mes
    const heatCard = document.createElement('div');
    heatCard.className = 'card section-gap card-enter';
    heatCard.style.animationDelay = '160ms';
    heatCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Heatmap Supervisor × Mes</div>
        <div class="seg-control" id="heatmap-metric-ctrl" role="group" aria-label="Métrica del heatmap"></div>
      </div>
      <div class="heatmap" id="heatmap-container"></div>`;
    contenedor.appendChild(heatCard);

    const heatMetrics = [
      { key: 'venta_total', label: 'Venta' },
      { key: 'gasto_mes', label: 'Gasto' },
      { key: 'margen_real', label: 'Margen' },
    ];
    let heatMetric = 'venta_total';

    const ctrl = heatCard.querySelector('#heatmap-metric-ctrl');
    heatMetrics.forEach(m => {
      const btn = document.createElement('button');
      btn.className = `seg-btn${m.key === heatMetric ? ' is-active' : ''}`;
      btn.textContent = m.label;
      btn.addEventListener('click', () => {
        heatMetric = m.key;
        ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderHeatmap();
      });
      ctrl.appendChild(btn);
    });

    function renderHeatmap() {
      const meses = getMeses();
      const container = heatCard.querySelector('#heatmap-container');
      const allSups = [...new Set(meses.flatMap(m => {
        const d = getMes(m.key);
        return d ? d.cotizaciones_por_supervisor.map(s => s.supervisor_nombre) : [];
      }))];

      const allValues = meses.flatMap(m => {
        const d = getMes(m.key);
        if (!d) return [];
        return d.cotizaciones_por_supervisor.map(s => s[heatMetric] || 0);
      }).filter(v => v > 0);
      const maxVal = allValues.length ? Math.max(...allValues) : 1;

      const table = document.createElement('table');
      // Header
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      trHead.innerHTML = `<th>Supervisor</th>` + meses.map(m => `<th>${m.label.replace(' 2026', '')}</th>`).join('');
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      allSups.forEach(supNombre => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<th style="text-align:left;padding:4px 8px;font-weight:500;font-size:12px;color:var(--text-secondary);white-space:nowrap">${supNombre}</th>`;
        meses.forEach(m => {
          const d = getMes(m.key);
          const sup = d ? d.cotizaciones_por_supervisor.find(s => s.supervisor_nombre === supNombre) : null;
          const val = sup ? (sup[heatMetric] || 0) : 0;
          const intensity = maxVal > 0 ? val / maxVal : 0;
          const alpha = Math.round(intensity * 100);
          const td = document.createElement('td');
          td.style.background = `rgba(30,94,255,${(intensity * 0.7 + 0.05).toFixed(2)})`;
          td.style.color = intensity > 0.6 ? 'white' : 'var(--text-primary)';
          td.title = `${supNombre} · ${m.label}: ${moneda(val)}`;
          td.textContent = val > 0 ? monedaCorta(val) : '—';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      container.innerHTML = '';
      container.appendChild(table);
    }
    renderHeatmap();

    // (d) Barras divergentes margen
    const divCard = document.createElement('div');
    divCard.className = 'card section-gap card-enter';
    divCard.style.animationDelay = '200ms';
    divCard.innerHTML = `<div class="card__header"><div class="card__title">Margen real por supervisor</div></div>`;

    const maxMargen = Math.max(...sups.map(s => Math.abs(s.margen_real || 0)), 1);
    sups.forEach(s => {
      const pct = (Math.abs(s.margen_real || 0) / maxMargen) * 48;
      const isPos = (s.margen_real || 0) >= 0;
      const div = document.createElement('div');
      div.className = 'divergent-bar';
      div.innerHTML = `
        <div class="divergent-bar__name">${s.supervisor_nombre}</div>
        <div class="divergent-bar__center">
          <div class="divergent-bar__axis"></div>
          <div class="divergent-bar__fill ${isPos ? 'divergent-bar__fill--pos' : 'divergent-bar__fill--neg'}"
               style="width:${pct}%"></div>
        </div>
        <div class="divergent-bar__val" style="color:${isPos ? 'var(--success-fg)' : 'var(--danger-fg)'}">${moneda(s.margen_real)}</div>`;
      divCard.appendChild(div);
    });
    contenedor.appendChild(divCard);
  }

  render();
  _unsub = state.subscribe(() => render());
}

function _abrirDrawerSupervisor(sup, mesData) {
  const conGastosSup = (mesData?.cotizaciones_con_gastos || []).filter(c =>
    c.supervisor_nombre === sup.supervisor_nombre ||
    (mesData?.cotizaciones_con_oportunidad || []).some(
      o => o.supervisores_asignados?.includes(sup.supervisor_nombre) && o.cotizacion_id === c.cotizacion_id
    )
  );

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section__label">KPIs del supervisor</div>
      <div class="drawer-row"><span class="drawer-row__key">Cotizaciones</span><span class="drawer-row__val">${sup.num_cotizaciones}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Venta total</span><span class="drawer-row__val">${moneda(sup.venta_total)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Gasto mes</span><span class="drawer-row__val">${moneda(sup.gasto_mes)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Margen real</span>
        <span class="drawer-row__val" style="color:${sup.margen_real >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'}">${moneda(sup.margen_real)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">% Margen</span><span class="drawer-row__val">${porcentaje(sup.porcentaje_margen)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Pendiente prov.</span><span class="drawer-row__val">${moneda(sup.monto_pendiente_pagar_proveedores)}</span></div>
    </div>`;

  abrirDrawer({ titulo: sup.supervisor_nombre, contenido: body });
}

function _destroy() {
  if (_unsub) { _unsub(); _unsub = null; }
  _charts.forEach(c => destruirChart(c));
  _charts = [];
}
