/* Vista Compras y Gastos — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData, kpisGlobalesMes, cotizacionesEnRiesgo } from '../compute.js';
import { crearKpiCard } from '../components/kpi-card.js';
import { crearDataTable } from '../components/data-table.js';
import { badgeHTML } from '../components/badge.js';
import { abrirDrawer } from '../components/drawer.js';
import { moneda, monedaCorta, porcentaje, numero } from '../format.js';
import { crearBarHorizontal, destruirChart } from '../charts.js';

let _charts = [];
let _unsub = null;

export function renderCompras(contenedor) {
  _destroy();

  function render() {
    _charts.forEach(c => destruirChart(c));
    _charts = [];
    contenedor.innerHTML = '';

    const { mesKey } = state.get();
    const mesData = getMesData(mesKey);
    const kpis = kpisGlobalesMes(mesData);
    const sups = mesData?.cotizaciones_por_supervisor || [];
    const conGastos = mesData?.cotizaciones_con_gastos || [];
    const riesgo = cotizacionesEnRiesgo(mesData);

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Compras y Gastos</h1>`;
    contenedor.appendChild(header);

    // (a) KPI Strip — 4 KPIs
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'grid grid-4 section-gap';
    const numCompras = sups.reduce((s, x) => s + (x.num_compras_mes || 0), 0);
    const pendienteProv = sups.reduce((s, x) => s + (x.monto_pendiente_pagar_proveedores || 0), 0);
    [
      { label: 'Total gastado en el mes', valor: kpis.gastoTotal || 0, fmt: monedaCorta, delay: 0 },
      { label: 'Compras en el mes', valor: numCompras, fmt: v => Math.round(v).toLocaleString('es-MX'), delay: 40 },
      { label: 'Pendiente pagar a proveedores', valor: pendienteProv, fmt: monedaCorta, delay: 80 },
      { label: 'Cotizaciones en riesgo', valor: riesgo.length, fmt: v => Math.round(v).toString(), delay: 120 },
    ].forEach(k => {
      kpiGrid.appendChild(crearKpiCard({ label: k.label, valor: k.valor, formatear: k.fmt, delay: k.delay }));
    });
    contenedor.appendChild(kpiGrid);

    // (b) Tabla de cotizaciones con gastos
    const tableCard = document.createElement('div');
    tableCard.className = 'card section-gap card-enter';
    tableCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Cotizaciones con gastos registrados</div>
        <div class="card__subtitle">${conGastos.length} cotizaciones · ordenadas por gasto desc</div>
      </div>`;

    const filas = [...conGastos].sort((a, b) => (b.total_compras_mes || 0) - (a.total_compras_mes || 0));
    const tabla = crearDataTable({
      columnas: [
        { key: 'numero_cotizacion', label: '# Cotización', format: v => `<span style="font-weight:600">${v || '—'}</span>` },
        { key: 'precio_total', label: 'Precio', align: 'right', format: v => moneda(v) },
        { key: 'num_compras_mes', label: '# Compras', align: 'right' },
        { key: 'total_compras_mes', label: 'Total compras', align: 'right', format: v => moneda(v) },
        { key: 'diferencia', label: 'Diferencia', align: 'right',
          format: v => `<span style="color:${v >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'};font-weight:600">${moneda(v)}</span>` },
        { key: '_pago', label: 'Pago prov.', format: (_, f) =>
          badgeHTML(f.todas_pagadas ? 'Pagado' : f.alguna_pagada ? 'Pendiente' : 'Pendiente') },
        { key: '_fact', label: 'Factura prov.', format: (_, f) =>
          badgeHTML(f.todas_facturadas ? 'Facturado' : 'Pendiente') },
        { key: '_concl', label: 'Conclusión', format: (_, f) =>
          badgeHTML(f.todas_concluidas ? 'Concluido' : 'En Proceso') },
      ],
      filas,
      onRowClick: (fila) => _abrirDrawerCot(fila),
      emptyMsg: 'Sin cotizaciones con compras en este período.',
    });
    tableCard.appendChild(tabla);
    contenedor.appendChild(tableCard);

    // (c) Cotizaciones donde el gasto rebasó al precio
    const riesgoCard = document.createElement('div');
    riesgoCard.className = 'card section-gap card-enter';
    riesgoCard.style.animationDelay = '160ms';
    riesgoCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Cotizaciones donde el gasto supera el precio</div>
        <div class="card__subtitle">${riesgo.length} cotizaciones en margen negativo</div>
      </div>`;

    if (riesgo.length === 0) {
      riesgoCard.innerHTML += `<p style="color:var(--text-tertiary);font-size:var(--fs-sm);padding:16px 0">Ninguna cotización en margen negativo. Buenas noticias.</p>`;
    } else {
      riesgo.forEach(c => {
        const maxW = 300;
        const gastoPct = c.precio_total > 0 ? Math.min((c.total_compras_mes / c.precio_total), 2) : 1;
        const row = document.createElement('div');
        row.className = 'riesgo-item';
        row.setAttribute('tabindex', '0');
        row.innerHTML = `
          <span class="riesgo-item__num">${c.numero_cotizacion || c.cotizacion_id}</span>
          <div class="riesgo-item__bars" style="flex:1">
            <div style="display:flex;gap:8px;margin-bottom:4px;font-size:11px;color:var(--text-secondary)">
              <span>Precio: ${moneda(c.precio_total)}</span>
              <span>Gastado: ${moneda(c.total_compras_mes)}</span>
            </div>
            <div style="height:8px;background:var(--bg-muted);border-radius:99px;overflow:hidden;position:relative">
              <div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(gastoPct * 100, 100)}%;background:var(--danger-fg);border-radius:99px"></div>
            </div>
          </div>
          <span class="riesgo-item__perdida">${moneda(c.diferencia)}</span>`;
        row.addEventListener('click', () => _abrirDrawerCot(c));
        riesgoCard.appendChild(row);
      });
    }
    contenedor.appendChild(riesgoCard);

    // (d) Pendiente pagar a proveedores por supervisor
    const provCard = document.createElement('div');
    provCard.className = 'card section-gap card-enter';
    provCard.style.animationDelay = '200ms';
    const supsSorted = [...sups].sort((a, b) => (b.monto_pendiente_pagar_proveedores || 0) - (a.monto_pendiente_pagar_proveedores || 0))
      .filter(s => (s.monto_pendiente_pagar_proveedores || 0) > 0);

    provCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Pendiente pagar a proveedores por supervisor</div>
      </div>
      <div class="chart-wrap chart-wrap--md"><canvas id="chart-pend-prov"></canvas></div>`;
    contenedor.appendChild(provCard);

    requestAnimationFrame(() => {
      const canvas = document.getElementById('chart-pend-prov');
      if (canvas && supsSorted.length > 0) {
        const c = crearBarHorizontal(canvas, {
          labels: supsSorted.map(s => s.supervisor_nombre),
          data: supsSorted.map(s => s.monto_pendiente_pagar_proveedores),
          label: 'Pendiente',
          formatTooltip: (label, v) => `${label}: ${moneda(v)}`,
          color: 'rgba(200,40,26,0.7)',
        });
        _charts.push(c);
      }
    });
  }

  render();
  _unsub = state.subscribe(() => render());
}

function _abrirDrawerCot(c) {
  abrirDrawer({
    titulo: `Cotización ${c.numero_cotizacion || c.cotizacion_id}`,
    contenido: `
      <div class="drawer-section">
        <div class="drawer-section__label">Detalle de gasto</div>
        <div class="drawer-row"><span class="drawer-row__key">Precio total</span><span class="drawer-row__val">${moneda(c.precio_total)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key"># Compras</span><span class="drawer-row__val">${c.num_compras_mes}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Total compras</span><span class="drawer-row__val">${moneda(c.total_compras_mes)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Diferencia</span>
          <span class="drawer-row__val" style="color:${(c.diferencia||0)>=0?'var(--success-fg)':'var(--danger-fg)'}">${moneda(c.diferencia)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Alguna pagada</span><span class="drawer-row__val">${c.alguna_pagada ? 'Sí' : 'No'}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Todas pagadas</span><span class="drawer-row__val">${c.todas_pagadas ? 'Sí' : 'No'}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Todas facturadas</span><span class="drawer-row__val">${c.todas_facturadas ? 'Sí' : 'No'}</span></div>
      </div>`,
  });
}

function _destroy() {
  if (_unsub) { _unsub(); _unsub = null; }
  _charts.forEach(c => destruirChart(c));
  _charts = [];
}
