/* Vista General: KPIs + OPs + Cotizaciones sin OP + Internos + Pendientes */
import { currency, percent, dateShort, supervisoresLabel } from '../format.js';
import { Icon } from '../icons.js';
import { Badge, badgePagado, badgeFacturado, badgeConcluido, badgeTipoCompra } from '../components/badge.js';
import { KpiCard } from '../components/kpi-card.js';
import { getDrawer } from '../components/drawer.js';
import { filterItems } from '../components/search.js';

/* Renders el contenido de un compra_item en el drawer */
function renderCompraItem(c) {
  const tipo = c.tipo_compra_proyecto;
  const proveedor = c.proveedor ? c.proveedor.nombre : (typeof c.proveedor === 'string' ? c.proveedor : '—');
  const metodo = c.metodo_pago ? (c.metodo_pago.etiqueta || c.metodo_pago.alias) : (typeof c.metodo_pago === 'string' ? c.metodo_pago : '—');
  const supRespNombre = c.supervisor_responsable ? (c.supervisor_responsable.nombre || c.supervisor_responsable) : '—';

  return `
    <div class="compra-item">
      <div class="compra-item__header">
        <div>
          <div class="compra-item__concepto">${esc(c.concepto)}</div>
          ${c.descripcion ? `<div class="compra-item__meta">${esc(c.descripcion)}</div>` : ''}
        </div>
        <div class="compra-item__monto">${currency(c.costo_total)}</div>
      </div>
      <div class="compra-item__meta">
        <span>${dateShort(c.fecha_compra)}</span>
        ${proveedor !== '—' ? `<span>· ${esc(proveedor)}</span>` : ''}
        ${metodo !== '—' ? `<span>· ${esc(metodo)}</span>` : ''}
        ${supRespNombre !== '—' ? `<span>· Resp: ${esc(supRespNombre)}</span>` : ''}
      </div>
      <div class="compra-item__estados">
        ${tipo ? badgeTipoCompra(tipo) : ''}
        ${badgeFacturado(c.facturado)}
        ${badgePagado(c.pagado)}
        ${badgeConcluido(c.concluido)}
      </div>
    </div>`;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Lista de compras con filtro por concepto */
function buildComprasListWithFilter(compras, renderFn) {
  const wrap = document.createElement('div');

  const list = document.createElement('div');
  list.className = 'compras-list';
  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'compras-filter__empty';
  emptyMsg.textContent = 'Sin resultados para ese concepto.';

  const items = compras.map(c => {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderFn(c);
    return tmp.firstElementChild;
  });
  items.forEach(item => list.appendChild(item));

  const filterWrap = document.createElement('div');
  filterWrap.className = 'compras-filter';
  filterWrap.innerHTML = `<input type="text" class="compras-filter__input" placeholder="Filtrar por concepto...">`;
  const input = filterWrap.querySelector('input');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    let visible = 0;
    items.forEach(item => {
      const concepto = item.querySelector('.compra-item__concepto');
      const match = !q || (concepto && concepto.textContent.toLowerCase().includes(q));
      item.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    emptyMsg.style.display = visible === 0 ? 'block' : 'none';
  });

  wrap.appendChild(filterWrap);
  wrap.appendChild(list);
  wrap.appendChild(emptyMsg);
  return wrap;
}

/* Drawer de OP */
function renderOpDrawer(op) {
  const drawer = getDrawer();
  const frag = document.createElement('div');

  // Estado OP
  frag.innerHTML = `
    <div>
      <div class="drawer__section-title">Estado de la oportunidad</div>
      <div class="estado-op">
        ${badgeFacturado(op.estado_oportunidad.facturado)}
        ${badgePagado(op.estado_oportunidad.pagado)}
        ${badgeConcluido(op.estado_oportunidad.concluido)}
        ${op.estado_oportunidad.numero_factura ? `<span class="badge badge--neutral">Factura: ${esc(op.estado_oportunidad.numero_factura)}</span>` : ''}
        ${op.estado_oportunidad.oc ? `<span class="badge badge--neutral">OC: ${esc(op.estado_oportunidad.oc)}</span>` : ''}
      </div>
    </div>

    <div>
      <div class="drawer__section-title">Resumen economico</div>
      <div class="econ-grid-drawer">
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Venta total</span>
          <span class="econ-grid-drawer__value">${currency(op.venta_total)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Gasto del mes</span>
          <span class="econ-grid-drawer__value">${currency(op.gasto_total_mes)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Diferencia</span>
          <span class="econ-grid-drawer__value ${op.diferencia < 0 ? 'econ-grid-drawer__value--negative' : 'econ-grid-drawer__value--positive'}">${currency(op.diferencia)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">% Avance gasto</span>
          <span class="econ-grid-drawer__value ${op.porcentaje_avance_gasto > 100 ? 'econ-grid-drawer__value--negative' : ''}">${percent(op.porcentaje_avance_gasto)}</span>
        </div>
      </div>
    </div>`;

  // Cotizaciones
  op.cotizaciones.forEach(cot => {
    const cotDiv = document.createElement('div');
    cotDiv.innerHTML = `
      <div class="drawer__section-title">Cotizacion ${esc(cot.numero_cotizacion)}</div>
      <table class="cot-table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Precio cotizado</th>
            <th>Gasto del mes</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${esc(cot.numero_cotizacion)} · ${esc(supervisoresLabel(cot.supervisores))}</td>
            <td class="num">${currency(cot.precio_total)}</td>
            <td class="num">${currency(cot.total_compras_mes)}</td>
            <td class="num ${cot.diferencia < 0 ? 'negative' : 'positive'}">${currency(cot.diferencia)}</td>
          </tr>
        </tbody>
      </table>`;
    frag.appendChild(cotDiv);

    if (cot.compras_mes && cot.compras_mes.length > 0) {
      const comprasDiv = document.createElement('div');
      comprasDiv.innerHTML = `<div class="drawer__section-title">Compras del mes (${cot.compras_mes.length})</div>`;
      comprasDiv.appendChild(buildComprasListWithFilter(cot.compras_mes, renderCompraItem));
      frag.appendChild(comprasDiv);
    }
  });

  const subtitle = op.cliente + ' · ' + supervisoresLabel(op.supervisores);
  drawer.open(op.codigo_op, subtitle, frag);
}

/* Drawer de cotizacion sin OP */
function renderCotDrawer(cot) {
  const drawer = getDrawer();
  const frag = document.createElement('div');

  frag.innerHTML = `
    <div>
      <div class="drawer__section-title">Resumen economico</div>
      <div class="econ-grid-drawer">
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Precio cotizado</span>
          <span class="econ-grid-drawer__value">${currency(cot.precio_total)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Costo presupuestado</span>
          <span class="econ-grid-drawer__value">${currency(cot.costo_cotizado)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Gasto del mes</span>
          <span class="econ-grid-drawer__value">${currency(cot.total_compras_mes)}</span>
        </div>
        <div class="econ-grid-drawer__item">
          <span class="econ-grid-drawer__label">Diferencia</span>
          <span class="econ-grid-drawer__value ${cot.diferencia < 0 ? 'econ-grid-drawer__value--negative' : 'econ-grid-drawer__value--positive'}">${currency(cot.diferencia)}</span>
        </div>
      </div>
    </div>`;

  if (cot.compras_mes && cot.compras_mes.length > 0) {
    const comprasDiv = document.createElement('div');
    comprasDiv.innerHTML = `<div class="drawer__section-title">Compras del mes (${cot.compras_mes.length})</div>`;
    comprasDiv.appendChild(buildComprasListWithFilter(cot.compras_mes, renderCompraItem));
    frag.appendChild(comprasDiv);
  }

  drawer.open(cot.numero_cotizacion, cot.cliente + ' · ' + supervisoresLabel(cot.supervisores), frag);
}

/* Drawer de nomenclatura */
function renderNomDrawer(nom) {
  const drawer = getDrawer();
  const frag = document.createElement('div');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="drawer__section-title">Detalle de gastos internos (${nom.num_compras})</div>`;
  wrap.appendChild(buildComprasListWithFilter(
    nom.compras,
    c => renderCompraItem({ ...c, tipo_compra_proyecto: null })
  ));
  frag.appendChild(wrap);
  drawer.open(`${nom.clave} — ${nom.descripcion}`, `${nom.num_compras} compras · ${currency(nom.monto_total)}`, frag);
}

/* Barra de progreso */
function progressBar(pct) {
  const clamped = Math.min(pct, 100);
  const cls = pct > 100 ? 'progress-bar__fill--danger' : pct > 80 ? 'progress-bar__fill--warning' : '';
  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span>Avance gasto</span>
        <span>${percent(pct)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill ${cls}" style="width:${clamped}%"></div>
      </div>
    </div>`;
}

/* Card de OP o cotizacion */
function renderOpCard(op, isOp, idx) {
  const el = document.createElement('div');
  el.className = `op-card animate-in stagger-${Math.min(idx + 1, 5)}`;

  const titulo = isOp ? op.codigo_op : op.numero_cotizacion;
  const meta = isOp
    ? `${op.categoria_display || op.categoria} · ${esc(op.cliente)}`
    : `${dateShort(op.fecha_cotizacion)} · ${esc(op.cliente)}`;

  const supervisoresList = isOp
    ? (op.supervisores || [])
    : (op.supervisores || []);

  const chips = supervisoresList.map(s => `<span class="chip">${esc(s.nombre)}</span>`).join('');
  const sinOpBadge = !isOp ? `<span class="sin-op-notice">${Icon('alert-triangle', { size: 12 })}Sin OP asignada</span>` : '';

  const gasto = isOp ? op.gasto_total_mes : op.total_compras_mes;
  const venta = isOp ? op.venta_total : op.precio_total;
  const diff = isOp ? op.diferencia : op.diferencia;
  const pct = isOp ? op.porcentaje_avance_gasto : op.porcentaje_avance_gasto;
  const alerta = gasto > venta;

  const estadoBadges = isOp ? `
    ${badgeFacturado(op.estado_oportunidad.facturado)}
    ${badgePagado(op.estado_oportunidad.pagado)}
    ${badgeConcluido(op.estado_oportunidad.concluido)}
  ` : '';

  el.innerHTML = `
    <div class="op-card__header">
      <div>
        <div class="op-card__id">${esc(titulo)}</div>
        <div class="op-card__meta">${meta}</div>
        <div class="op-card__chips">${chips}${sinOpBadge}</div>
      </div>
      <div class="op-card__badges">${estadoBadges}</div>
    </div>
    <div class="op-card__body">
      <div class="econ-row">
        <div class="econ-item">
          <div class="econ-item__label">Venta</div>
          <div class="econ-item__value">${currency(venta)}</div>
        </div>
        <div class="econ-item">
          <div class="econ-item__label">Gasto del mes</div>
          <div class="econ-item__value">${currency(gasto)}</div>
        </div>
        <div class="econ-item">
          <div class="econ-item__label">Diferencia</div>
          <div class="econ-item__value ${diff < 0 ? 'econ-item__value--negative' : 'econ-item__value--positive'}">${currency(diff)}</div>
        </div>
        <div class="econ-item">
          <div class="econ-item__label">Compras</div>
          <div class="econ-item__value">${isOp ? op.cotizaciones.reduce((a, c) => a + c.num_compras_mes, 0) : op.num_compras_mes}</div>
        </div>
      </div>
      ${progressBar(pct)}
      ${alerta ? `<div style="margin-top:8px">${Badge('Alerta: gasto sobre presupuesto', 'danger', true)}</div>` : ''}
    </div>`;

  el.addEventListener('click', () => {
    if (isOp) renderOpDrawer(op);
    else renderCotDrawer(op);
  });

  return el;
}

/* KPI strip de la vista general */
function renderKpis(kpis, container) {
  const pct = kpis.total_compras > 0
    ? ((kpis.monto_pendiente_pago / kpis.total_compras) * 100).toFixed(0) + '% del total'
    : '0% del total';

  const data = [
    { label: 'Total compras del mes', value: currency(kpis.total_compras), sub: `${kpis.num_compras} compras`, primary: true },
    { label: 'Proyecto · Materiales',  value: currency(kpis.monto_proyecto_materiales), sub: percent(kpis.total_compras > 0 ? kpis.monto_proyecto_materiales / kpis.total_compras * 100 : 0) + ' del total' },
    { label: 'Proyecto · Mano de obra', value: currency(kpis.monto_proyecto_mano_obra), sub: percent(kpis.total_compras > 0 ? kpis.monto_proyecto_mano_obra / kpis.total_compras * 100 : 0) + ' del total' },
    { label: 'Gastos internos',        value: currency(kpis.monto_interno), sub: `${kpis.num_interno} compras` },
    { label: 'Pendiente pagar proveedores', value: currency(kpis.monto_pendiente_pago), sub: pct },
  ];

  container.innerHTML = '';
  data.forEach((d, i) => {
    const card = KpiCard({ ...d, animClass: `stagger-${i + 1}` });
    container.appendChild(card);
  });
}

export function renderGeneral(mesData, filtro, rootEl) {
  rootEl.innerHTML = '';

  const kpis = mesData.kpis_compras;
  const ops = mesData.oportunidades || [];
  const cotsSinOp = mesData.cotizaciones_con_compras_sin_oportunidad || [];
  const nomenclaturas = mesData.gastos_internos_por_nomenclatura || [];
  const pendientes = mesData.compras_proyecto_pendientes_asignar || [];

  // KPI strip
  const kpiStrip = document.createElement('div');
  kpiStrip.className = 'kpi-strip';
  renderKpis(kpis, kpiStrip);
  rootEl.appendChild(kpiStrip);

  // --- Oportunidades ---
  const secOps = document.createElement('div');
  secOps.className = 'section';

  const filteredOps = filterItems(ops, filtro, ['codigo_op', 'cliente', 'categoria_display', 'supervisores.0.nombre']);
  secOps.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">Oportunidades del mes</h2>
      <span class="section__count">${filteredOps.length}</span>
    </div>`;

  if (filteredOps.length === 0) {
    secOps.innerHTML += `<div class="section__empty">${Icon('building-2', { size: 32 })}<p>Sin oportunidades con compras en este periodo</p></div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    filteredOps.forEach((op, i) => grid.appendChild(renderOpCard(op, true, i)));
    secOps.appendChild(grid);
  }
  rootEl.appendChild(secOps);

  // --- Cotizaciones sin OP ---
  const secCots = document.createElement('div');
  secCots.className = 'section';

  const filteredCots = filterItems(cotsSinOp, filtro, ['numero_cotizacion', 'cliente', 'supervisores.0.nombre']);
  secCots.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">Cotizaciones con compras sin OP</h2>
      <span class="section__count">${filteredCots.length}</span>
    </div>`;

  if (filteredCots.length === 0) {
    secCots.innerHTML += `<div class="section__empty">${Icon('file-text', { size: 32 })}<p>Sin cotizaciones en ejecucion sin oportunidad asignada</p></div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'cards-grid cards-grid--scrollable';
    filteredCots.forEach((cot, i) => grid.appendChild(renderOpCard(cot, false, i)));
    secCots.appendChild(grid);
  }
  rootEl.appendChild(secCots);

  // --- Gastos internos por nomenclatura ---
  const secNom = document.createElement('div');
  secNom.className = 'section';

  const filteredNom = filterItems(nomenclaturas, filtro, ['clave', 'descripcion']);
  secNom.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">Gastos internos por nomenclatura</h2>
      <span class="section__count">${filteredNom.length}</span>
    </div>`;

  if (filteredNom.length === 0) {
    secNom.innerHTML += `<div class="section__empty">${Icon('wallet', { size: 32 })}<p>Sin gastos internos en este periodo</p></div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'nomenclatura-grid';
    filteredNom.forEach((nom, i) => {
      const card = document.createElement('div');
      card.className = `nom-card animate-in stagger-${Math.min(i + 1, 5)}`;
      card.innerHTML = `
        <div class="nom-card__clave">${esc(nom.clave)}</div>
        <div class="nom-card__desc">${esc(nom.descripcion)}</div>
        <div class="nom-card__stats">
          <div class="nom-card__stat">
            <span class="nom-card__stat-label">Compras</span>
            <span class="nom-card__stat-value">${nom.num_compras}</span>
          </div>
          <div class="nom-card__stat">
            <span class="nom-card__stat-label">Monto total</span>
            <span class="nom-card__stat-value">${currency(nom.monto_total)}</span>
          </div>
        </div>`;
      card.addEventListener('click', () => renderNomDrawer(nom));
      grid.appendChild(card);
    });
    secNom.appendChild(grid);
  }
  rootEl.appendChild(secNom);

  // --- Compras pendientes de asignar ---
  if (pendientes.length > 0) {
    const secPend = document.createElement('div');
    secPend.className = 'section';
    secPend.innerHTML = `
      <div class="section__header">
        <h2 class="section__title">Compras de proyecto sin asignar</h2>
        <span class="section__count">${pendientes.length}</span>
      </div>
      <div class="pendientes-table-wrap">
        <div class="pendientes-notice">
          ${Icon('alert-triangle', { size: 14 })}
          Estas compras no tienen cotizacion asignada. Deben vincularse a un proyecto.
        </div>
        <div class="data-table-wrap" style="border:none;border-radius:0;box-shadow:none">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Proveedor</th>
                <th>Resp.</th>
                <th class="num">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${pendientes.map(c => `
                <tr>
                  <td>${dateShort(c.fecha_compra)}</td>
                  <td>${esc(c.concepto)}</td>
                  <td>${badgeTipoCompra(c.tipo_compra_proyecto)}</td>
                  <td>${esc(c.proveedor || '—')}</td>
                  <td>${esc(c.supervisor_responsable || '—')}</td>
                  <td class="num">${currency(c.costo_total)}</td>
                  <td>${badgeFacturado(c.facturado)} ${badgePagado(c.pagado)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    rootEl.appendChild(secPend);
  }
}
