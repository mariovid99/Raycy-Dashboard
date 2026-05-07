/* Vista Cotizaciones — Raycy Dashboard */

import { state } from '../state.js';
import { getMesData } from '../compute.js';
import { crearDataTable } from '../components/data-table.js';
import { badgeHTML, crearBadge } from '../components/badge.js';
import { abrirDrawer } from '../components/drawer.js';
import { moneda, monedaCorta, fechaCorta, porcentaje } from '../format.js';
import { Icon } from '../icons.js';

let _unsub = null;

export function renderCotizaciones(contenedor) {
  _destroy();

  function render() {
    contenedor.innerHTML = '';

    const { mesKey, filtros } = state.get();
    const mesData = getMesData(mesKey);
    const conGastos = mesData?.cotizaciones_con_gastos || [];
    const conOps = mesData?.cotizaciones_con_oportunidad || [];

    // Crear mapa de oportunidades por cotizacion_id
    const opMap = new Map();
    conOps.forEach(o => opMap.set(o.cotizacion_id, o));

    // Unir datos
    let filas = conGastos.map(c => ({
      ...c,
      op: opMap.get(c.cotizacion_id) || null,
    }));

    // Header
    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `<h1 class="view-title">Cotizaciones</h1>`;
    contenedor.appendChild(header);

    // Filtros
    const allSups = [...new Set(conOps.map(o => o.supervisores_asignados).filter(Boolean))];
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';

    // Supervisor select
    const supSel = document.createElement('select');
    supSel.className = 'filter-select';
    supSel.innerHTML = `<option value="">Todos los supervisores</option>` +
      allSups.map(s => `<option value="${s}">${s}</option>`).join('');

    const estadoSel = document.createElement('select');
    estadoSel.className = 'filter-select';
    estadoSel.innerHTML = `
      <option value="">Todos los estados</option>
      <option value="con_gastos">Con compras</option>
      <option value="sin_gastos">Sin compras</option>
      <option value="riesgo">En riesgo</option>
      <option value="facturada_cliente">Facturada al cliente</option>
      <option value="cobrada">Cobrada</option>`;

    filterBar.innerHTML = `<span class="filter-bar__label">Filtrar por</span>`;
    filterBar.appendChild(supSel);
    filterBar.appendChild(estadoSel);
    contenedor.appendChild(filterBar);

    // Búsqueda desde state
    const q = (filtros.q || '').toLowerCase();

    function getFilasFiltered() {
      let result = filas;
      if (q) {
        result = result.filter(f =>
          (f.numero_cotizacion || '').toLowerCase().includes(q) ||
          (f.op?.codigo_op || '').toLowerCase().includes(q) ||
          (f.op?.supervisores_asignados || []).some(s => s.toLowerCase().includes(q))
        );
      }
      const supVal = supSel.value;
      if (supVal) {
        result = result.filter(f => f.op?.supervisores_asignados === supVal);
      }
      const estVal = estadoSel.value;
      if (estVal === 'riesgo') result = result.filter(f => (f.diferencia || 0) < 0);
      else if (estVal === 'facturada_cliente') result = result.filter(f => f.op?.estado_facturacion === 'Facturado');
      else if (estVal === 'cobrada') result = result.filter(f => f.op?.estado_cobro === 'Cobrado');
      return result;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'card';
    contenedor.appendChild(tableWrap);

    function renderTabla() {
      tableWrap.innerHTML = '';
      const fil = getFilasFiltered();
      const tabla = crearDataTable({
        columnas: [
          { key: 'numero_cotizacion', label: '# Cotización', format: v => `<span style="font-weight:600">${v || '—'}</span>` },
          { key: 'fecha_cotizacion', label: 'Fecha', format: v => fechaCorta(v, true) },
          { key: '_supervisores', label: 'Supervisor(es)', format: (_, f) => f.op?.supervisores_asignados || '—' },
          { key: 'precio_total', label: 'Precio', align: 'right', format: v => moneda(v) },
          { key: 'total_compras_mes', label: 'Gastado', align: 'right', format: v => moneda(v) },
          { key: 'diferencia', label: 'Diferencia', align: 'right',
            format: v => `<span style="color:${v >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'};font-weight:600">${moneda(v)}</span>` },
          { key: '_pago_prov', label: 'Pago prov.', format: (_, f) =>
            badgeHTML(f.todas_pagadas ? 'Pagado' : f.alguna_pagada ? 'Pendiente' : 'Pendiente') },
          { key: '_fact_prov', label: 'Factura prov.', format: (_, f) =>
            badgeHTML(f.todas_facturadas ? 'Facturado' : 'Pendiente') },
          { key: '_fact_cliente', label: 'Factura cliente', format: (_, f) =>
            f.op ? badgeHTML(f.op.estado_facturacion) : badgeHTML('Sin compras', 'neutral') },
          { key: '_cobro', label: 'Cobro cliente', format: (_, f) =>
            f.op ? badgeHTML(f.op.estado_cobro) : '—' },
          { key: '_conclusion', label: 'Conclusión', format: (_, f) =>
            badgeHTML(f.todas_concluidas ? 'Concluido' : 'En Proceso') },
        ],
        filas: fil,
        onRowClick: (fila) => _abrirDrawerCot(fila),
        emptyMsg: 'Sin cotizaciones para los filtros aplicados.',
      });
      tableWrap.appendChild(tabla);
    }

    renderTabla();
    supSel.addEventListener('change', renderTabla);
    estadoSel.addEventListener('change', renderTabla);
  }

  render();
  _unsub = state.subscribe((newState, prevState) => {
    if (newState.mesKey !== prevState.mesKey) render();
    else {
      // Solo búsqueda cambió — re-filtrar sin re-construir todo
      const q = (newState.filtros.q || '').toLowerCase();
      if (newState.filtros.q !== prevState.filtros.q) render();
    }
  });
}

function _abrirDrawerCot(fila) {
  const op = fila.op;
  const body = `
    <div class="drawer-section">
      <div class="drawer-section__label">Económico</div>
      <div class="drawer-row"><span class="drawer-row__key">Precio total</span><span class="drawer-row__val">${moneda(fila.precio_total)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Costo cotizado</span><span class="drawer-row__val">${moneda(fila.costo_cotizado)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Total gastado</span><span class="drawer-row__val">${moneda(fila.total_compras_mes)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Diferencia</span><span class="drawer-row__val" style="color:${(fila.diferencia||0)>=0?'var(--success-fg)':'var(--danger-fg)'}">${moneda(fila.diferencia)}</span></div>
      <div class="drawer-row"><span class="drawer-row__key"># Compras</span><span class="drawer-row__val">${fila.num_compras_mes}</span></div>
    </div>
    <div class="drawer-section">
      <div class="drawer-section__label">Operación con proveedores</div>
      <div class="drawer-row"><span class="drawer-row__key">Alguna pagada</span><span class="drawer-row__val">${fila.alguna_pagada ? 'Sí' : 'No'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Todas pagadas</span><span class="drawer-row__val">${fila.todas_pagadas ? 'Sí' : 'No'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Todas facturadas</span><span class="drawer-row__val">${fila.todas_facturadas ? 'Sí' : 'No'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Concluidas</span><span class="drawer-row__val">${fila.todas_concluidas ? 'Sí' : 'No'}</span></div>
    </div>
    ${op ? `
    <div class="drawer-section">
      <div class="drawer-section__label">Ciclo con cliente</div>
      <div class="drawer-row"><span class="drawer-row__key">Código OP</span><span class="drawer-row__val">${op.codigo_op || '—'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Estado factura</span><span class="drawer-row__val">${op.estado_facturacion || '—'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Estado cobro</span><span class="drawer-row__val">${op.estado_cobro || '—'}</span></div>
      <div class="drawer-row"><span class="drawer-row__key">Ingreso presupuestado</span><span class="drawer-row__val">${moneda(op.ingreso_presupuestado)}</span></div>
    </div>
    ${op.analisis_flujo_efectivo ? `<div class="flujo-quote">${op.analisis_flujo_efectivo}</div>` : ''}
    ` : ''}`;

  abrirDrawer({
    titulo: `Cotización ${fila.numero_cotizacion || fila.cotizacion_id}`,
    contenido: body,
  });
}

function _destroy() {
  if (_unsub) { _unsub(); _unsub = null; }
}
