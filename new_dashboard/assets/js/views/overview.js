/* Vista Resumen Ejecutivo — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData, kpisGlobalesMes, serieMensual, rankingSupervisores,
         embudoOperativo, cotizacionesEnRiesgo, flujoEfectivo,
         saludFinanciera, comparativoMesActualVsAnterior } from '../compute.js';
import { crearKpiCard } from '../components/kpi-card.js';
import { moneda, monedaCorta, porcentaje, iniciales } from '../format.js';
import { crearComboChart, crearDonutChart, destruirChart } from '../charts.js';
import { abrirDrawer } from '../components/drawer.js';
import { badgeHTML } from '../components/badge.js';
import { Icon } from '../icons.js';

let _charts = [];
let _unsub = null;

export function renderOverview(contenedor) {
  _destroy();

  function render() {
    _charts.forEach(c => destruirChart(c));
    _charts = [];
    contenedor.innerHTML = '';

    const { mesKey } = state.get();
    const mesData = getMesData(mesKey);
    const kpis = kpisGlobalesMes(mesData);

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Resumen Ejecutivo</h1>`;
    contenedor.appendChild(header);

    // (a) KPI Strip
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'grid grid-5 section-gap';

    const deltas = {
      ventaTotal: mesKey !== 'YTD' ? comparativoMesActualVsAnterior(mesKey, 'ventaTotal') : null,
      gastoTotal: mesKey !== 'YTD' ? comparativoMesActualVsAnterior(mesKey, 'gastoTotal') : null,
    };

    const sparkVenta = serieMensual('ventaTotal').map(s => s.value);
    const sparkGasto = serieMensual('gastoTotal').map(s => s.value);

    const kpiCards = [
      crearKpiCard({
        label: 'Venta del mes',
        valor: kpis.ventaTotal || 0,
        formatear: (v) => monedaCorta(v),
        delta: deltas.ventaTotal,
        sparkline: sparkVenta,
        hero: true,
        delay: 0,
      }),
      crearKpiCard({
        label: 'Gasto del mes',
        valor: kpis.gastoTotal || 0,
        formatear: (v) => monedaCorta(v),
        delta: deltas.gastoTotal,
        sparkline: sparkGasto,
        delay: 40,
      }),
      crearKpiCard({
        label: 'Margen Real',
        valor: kpis.margenReal || 0,
        formatear: (v) => monedaCorta(v),
        subtitulo: `${porcentaje(kpis.pctMargen || 0)} sobre gasto`,
        hero: true,
        delay: 80,
      }),
      crearKpiCard({
        label: 'Cotizaciones enviadas',
        valor: kpis.numCotizaciones || 0,
        formatear: (v) => Math.round(v).toLocaleString('es-MX'),
        subtitulo: `${kpis.numCotizacionesConGastos || 0} con gastos · ${kpis.numFacturadasCliente || 0} facturadas al cliente`,
        delay: 120,
      }),
      crearKpiCard({
        label: 'Pendiente cobrar',
        valor: kpis.pendientePorCobrar || 0,
        formatear: (v) => monedaCorta(v),
        subtitulo: `de ${kpis.numOportunidades || 0} oportunidades`,
        delay: 160,
      }),
    ];

    kpiCards.forEach(c => kpiGrid.appendChild(c));
    contenedor.appendChild(kpiGrid);

    // (b) Embudo operativo
    const embudo = embudoOperativo(mesData);
    const maxCount = embudo.length ? embudo[0].count : 1;

    const embudoCard = document.createElement('div');
    embudoCard.className = 'card section-gap card-enter';
    embudoCard.style.animationDelay = '200ms';
    embudoCard.innerHTML = `
      <div class="card__header">
        <div>
          <div class="card__title">Embudo Operativo</div>
          <div class="card__subtitle">Flujo de cotizaciones por etapa</div>
        </div>
      </div>`;

    const funnel = document.createElement('div');
    funnel.className = 'funnel';
    embudo.forEach((step, i) => {
      const pct = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
      const convRate = i > 0 && embudo[i - 1].count > 0
        ? Math.round((step.count / embudo[i - 1].count) * 100) : null;
      const row = document.createElement('div');
      row.className = 'funnel__step';
      row.innerHTML = `
        <div class="funnel__label">${step.label}</div>
        <div class="funnel__bar-wrap">
          <div class="funnel__bar funnel__bar--${i + 1}" style="width:${Math.max(pct,5)}%">
            <span class="funnel__bar-text">${step.count} · ${monedaCorta(step.monto)}</span>
          </div>
        </div>
        <div class="funnel__rate">${convRate !== null ? convRate + '%' : ''}</div>`;
      funnel.appendChild(row);
    });
    embudoCard.appendChild(funnel);
    contenedor.appendChild(embudoCard);

    // (c) Doble columna: Combo chart + Donut salud
    const doubleGrid = document.createElement('div');
    doubleGrid.className = 'grid grid-12 section-gap';
    doubleGrid.style.alignItems = 'start';

    // Combo chart
    const comboCard = document.createElement('div');
    comboCard.className = 'card col-span-8 card-enter';
    comboCard.style.animationDelay = '240ms';
    comboCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Venta vs Gasto · Histórico</div>
      </div>
      <div class="chart-wrap chart-wrap--lg"><canvas id="chart-combo"></canvas></div>`;
    doubleGrid.appendChild(comboCard);

    // Donut salud financiera
    const salud = saludFinanciera(mesData);
    const totalSalud = salud.cobrado + salud.facturadoPendiente + salud.sinFacturar || 1;
    const donutCard = document.createElement('div');
    donutCard.className = 'card col-span-4 card-enter';
    donutCard.style.animationDelay = '280ms';
    donutCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Salud Financiera</div>
      </div>
      <div class="donut-combo">
        <div class="donut-combo__chart">
          <canvas id="chart-donut-salud"></canvas>
          <div class="donut-center">
            <div class="donut-center__val">${monedaCorta(totalSalud)}</div>
            <div class="donut-center__label">Pipeline</div>
          </div>
        </div>
        <div class="donut-combo__legend">
          ${_donutLegendRow('Cobrado', salud.cobrado, '#0E8A5F')}
          ${_donutLegendRow('Facturado por cobrar', salud.facturadoPendiente, '#1E5EFF')}
          ${_donutLegendRow('Sin facturar', salud.sinFacturar, '#B7CCFF')}
        </div>
      </div>`;
    doubleGrid.appendChild(donutCard);
    contenedor.appendChild(doubleGrid);

    // Inicializar charts
    requestAnimationFrame(() => {
      const serie = serieMensual('ventaTotal');
      const c1 = crearComboChart(
        document.getElementById('chart-combo'),
        {
          labels: serie.map(s => s.label.replace(' 2026', '')),
          barData: serieMensual('ventaTotal').map(s => s.value),
          lineData: serieMensual('gastoTotal').map(s => s.value),
          barLabel: 'Venta',
          lineLabel: 'Gasto',
          formatTooltip: (label, v) => `${label}: ${moneda(v)}`,
        }
      );
      _charts.push(c1);

      const c2 = crearDonutChart(
        document.getElementById('chart-donut-salud'),
        {
          labels: ['Cobrado', 'Facturado por cobrar', 'Sin facturar'],
          data: [salud.cobrado, salud.facturadoPendiente, salud.sinFacturar],
          colores: ['#0E8A5F', '#1E5EFF', '#B7CCFF'],
          formatTooltip: (label, v) => `${label}: ${moneda(v)}`,
        }
      );
      _charts.push(c2);
    });

    // (d) Top performers
    const ranking = rankingSupervisores(mesData);
    const topGrid = document.createElement('div');
    topGrid.className = 'grid grid-2 section-gap';

    topGrid.appendChild(_crearTopCard('Top por venta', ranking.slice(0, 5), 'venta_total', moneda));
    topGrid.appendChild(_crearTopCard('Top por margen real', [...ranking].sort((a, b) => b.margen_real - a.margen_real).slice(0, 5), 'margen_real', moneda));
    contenedor.appendChild(topGrid);

    // (e) Alertas — cotizaciones en riesgo
    const riesgo = cotizacionesEnRiesgo(mesData).slice(0, 5);
    const riesgoCard = document.createElement('div');
    riesgoCard.className = 'card section-gap card-enter';
    riesgoCard.style.animationDelay = '320ms';
    const riesgoHeader = document.createElement('div');
    riesgoHeader.className = 'card__header';
    riesgoHeader.innerHTML = `
      <div>
        <div class="card__title">${Icon('circle-alert', { size: 16 })} Cotizaciones en riesgo</div>
        <div class="card__subtitle">Gasto supera el precio — margen negativo</div>
      </div>`;
    riesgoCard.appendChild(riesgoHeader);

    if (riesgo.length === 0) {
      riesgoCard.innerHTML += `<p style="color:var(--text-tertiary);font-size:var(--fs-sm);">Ninguna cotización en riesgo este período.</p>`;
    } else {
      const list = document.createElement('div');
      list.className = 'riesgo-list';
      riesgo.forEach(c => {
        const item = document.createElement('div');
        item.className = 'riesgo-item';
        item.setAttribute('tabindex', '0');
        const pct = c.precio_total > 0 ? Math.min((c.total_compras_mes / c.precio_total) * 100, 200) : 0;
        item.innerHTML = `
          <span class="riesgo-item__num">${c.numero_cotizacion || c.cotizacion_id}</span>
          <div class="riesgo-item__bars" style="flex:1">
            <div style="display:flex;gap:4px;align-items:center;font-size:11px;color:var(--text-tertiary);margin-bottom:4px">
              <span>Precio: ${moneda(c.precio_total)}</span>
              <span>·</span>
              <span>Gastado: ${moneda(c.total_compras_mes)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill progress-bar__fill--danger" style="width:${Math.min(pct,100)}%"></div>
            </div>
          </div>
          <span class="riesgo-item__perdida">${moneda(c.diferencia)}</span>`;
        item.addEventListener('click', () => _abrirDrawerCotizacion(c));
        list.appendChild(item);
      });
      riesgoCard.appendChild(list);
    }
    contenedor.appendChild(riesgoCard);

    // (f) Flujo de efectivo
    const flujos = flujoEfectivo(mesData);
    const flujoCard = document.createElement('div');
    flujoCard.className = 'card section-gap card-enter';
    flujoCard.style.animationDelay = '360ms';
    flujoCard.innerHTML = `
      <div class="card__header">
        <div class="card__title">Flujo de Efectivo — Estado por etapa</div>
      </div>`;

    if (flujos.length === 0) {
      flujoCard.innerHTML += `<p style="color:var(--text-tertiary);font-size:var(--fs-sm);">Sin oportunidades registradas.</p>`;
    } else {
      flujos.forEach(b => {
        const row = document.createElement('div');
        row.className = 'flujo-bucket';
        row.innerHTML = `
          <span class="flujo-bucket__label">${b.label}</span>
          <div class="flujo-bucket__stats">
            <span class="flujo-bucket__count">${b.count} oportunidades</span>
            <span class="flujo-bucket__monto">${monedaCorta(b.monto)}</span>
          </div>`;
        flujoCard.appendChild(row);
      });
    }
    contenedor.appendChild(flujoCard);
  }

  render();
  _unsub = state.subscribe(() => render());
}

function _donutLegendRow(label, val, color) {
  return `
    <div class="donut-legend-row">
      <span class="donut-legend-row__label">
        <span class="chart-legend__dot" style="background:${color}"></span>
        ${label}
      </span>
      <span class="donut-legend-row__val">${monedaCorta(val)}</span>
    </div>`;
}

function _crearTopCard(titulo, ranking, key, fmt) {
  const card = document.createElement('div');
  card.className = 'card card-enter';
  card.style.animationDelay = '280ms';
  const maxVal = ranking.length ? (ranking[0][key] || 1) : 1;
  card.innerHTML = `<div class="card__header"><div class="card__title">${titulo}</div></div>`;
  ranking.forEach(s => {
    const pct = ((s[key] || 0) / maxVal) * 100;
    const row = document.createElement('div');
    row.className = 'perf-row';
    row.innerHTML = `
      <div class="avatar">${iniciales(s.supervisor_nombre)}</div>
      <div class="perf-row__name">${s.supervisor_nombre}</div>
      <div class="perf-bar-wrap"><div class="perf-bar" style="width:${pct}%"></div></div>
      <div class="perf-row__val">${fmt(s[key] || 0)}</div>`;
    card.appendChild(row);
  });
  return card;
}

function _abrirDrawerCotizacion(c) {
  abrirDrawer({
    titulo: `Cotización ${c.numero_cotizacion || c.cotizacion_id}`,
    contenido: `
      <div class="drawer-section">
        <div class="drawer-section__label">Económico</div>
        <div class="drawer-row"><span class="drawer-row__key">Precio total</span><span class="drawer-row__val">${moneda(c.precio_total)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Total compras</span><span class="drawer-row__val">${moneda(c.total_compras_mes)}</span></div>
        <div class="drawer-row"><span class="drawer-row__key">Diferencia</span><span class="drawer-row__val" style="color:var(--danger-fg)">${moneda(c.diferencia)}</span></div>
      </div>
      <div class="drawer-section">
        <div class="drawer-section__label">Estado operación con proveedores</div>
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
