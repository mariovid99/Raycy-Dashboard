/* Vista Por Supervisor: selector + bloques propios del supervisor */
import { currency, percent, dateShort, initials, supervisoresLabel } from '../format.js';
import { Icon } from '../icons.js';
import { Badge, badgePagado, badgeFacturado, badgeConcluido, badgeTipoCompra } from '../components/badge.js';
import { KpiCard } from '../components/kpi-card.js';
import { getDrawer } from '../components/drawer.js';
import { state } from '../state.js';

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

function renderCompraItem(c, nullTipo = false) {
  const proveedor = c.proveedor
    ? (typeof c.proveedor === 'object' ? c.proveedor.nombre : c.proveedor)
    : '—';
  const metodo = c.metodo_pago
    ? (typeof c.metodo_pago === 'object' ? (c.metodo_pago.etiqueta || c.metodo_pago.alias) : c.metodo_pago)
    : '—';
  const resp = c.supervisor_responsable
    ? (typeof c.supervisor_responsable === 'object' ? c.supervisor_responsable.nombre : c.supervisor_responsable)
    : '—';
  const tipo = nullTipo ? null : c.tipo_compra_proyecto;

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
        ${resp !== '—' ? `<span>· Resp: ${esc(resp)}</span>` : ''}
      </div>
      <div class="compra-item__estados">
        ${tipo ? badgeTipoCompra(tipo) : ''}
        ${badgeFacturado(c.facturado)}
        ${badgePagado(c.pagado)}
        ${badgeConcluido(c.concluido)}
      </div>
    </div>`;
}

function renderOpCard(op, isOp, idx) {
  const titulo = isOp ? op.codigo_op : op.numero_cotizacion;
  const meta = isOp
    ? `${op.categoria_display || op.categoria} · ${esc(op.cliente)}`
    : `${dateShort(op.fecha_cotizacion)} · ${esc(op.cliente || '')}`;

  const gasto = isOp ? op.gasto_total_mes : op.total_compras_mes;
  const venta = isOp ? op.venta_total : op.precio_total;
  const diff  = op.diferencia;
  const pct   = op.porcentaje_avance_gasto;
  const alerta = gasto > venta;

  const estadoBadges = isOp ? `
    ${badgeFacturado(op.estado_oportunidad.facturado)}
    ${badgePagado(op.estado_oportunidad.pagado)}
    ${badgeConcluido(op.estado_oportunidad.concluido)}
  ` : `<span class="sin-op-notice">${Icon('alert-triangle', { size: 12 })}Sin OP</span>`;

  const clamped = Math.min(pct, 100);
  const barCls = pct > 100 ? 'progress-bar__fill--danger' : pct > 80 ? 'progress-bar__fill--warning' : '';

  const el = document.createElement('div');
  el.className = `op-card animate-in stagger-${Math.min(idx + 1, 5)}`;
  el.innerHTML = `
    <div class="op-card__header">
      <div>
        <div class="op-card__id">${esc(titulo)}</div>
        <div class="op-card__meta">${meta}</div>
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
          <div class="econ-item__label">Gasto mes</div>
          <div class="econ-item__value">${currency(gasto)}</div>
        </div>
        <div class="econ-item">
          <div class="econ-item__label">Diferencia</div>
          <div class="econ-item__value ${diff < 0 ? 'econ-item__value--negative' : 'econ-item__value--positive'}">${currency(diff)}</div>
        </div>
        <div class="econ-item">
          <div class="econ-item__label">Compras</div>
          <div class="econ-item__value">${isOp ? op.cotizaciones.reduce((a,c) => a + c.num_compras_mes, 0) : op.num_compras_mes}</div>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label">
          <span>Avance gasto</span>
          <span>${percent(pct)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill ${barCls}" style="width:${clamped}%"></div>
        </div>
      </div>
      ${alerta ? `<div style="margin-top:8px">${Badge('Alerta: gasto sobre presupuesto', 'danger')}</div>` : ''}
    </div>`;

  el.addEventListener('click', () => {
    const drawer = getDrawer();
    const frag = document.createElement('div');

    if (isOp) {
      frag.innerHTML = `
        <div>
          <div class="drawer__section-title">Estado de la oportunidad</div>
          <div class="estado-op">
            ${badgeFacturado(op.estado_oportunidad.facturado)}
            ${badgePagado(op.estado_oportunidad.pagado)}
            ${badgeConcluido(op.estado_oportunidad.concluido)}
            ${op.estado_oportunidad.numero_factura ? `<span class="badge badge--neutral">Factura: ${esc(op.estado_oportunidad.numero_factura)}</span>` : ''}
          </div>
        </div>
        <div>
          <div class="drawer__section-title">Resumen economico</div>
          <div class="econ-grid-drawer">
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Venta total</span><span class="econ-grid-drawer__value">${currency(op.venta_total)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Gasto del mes</span><span class="econ-grid-drawer__value">${currency(op.gasto_total_mes)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Diferencia</span><span class="econ-grid-drawer__value ${op.diferencia < 0 ? 'econ-grid-drawer__value--negative' : 'econ-grid-drawer__value--positive'}">${currency(op.diferencia)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">% Avance</span><span class="econ-grid-drawer__value">${percent(op.porcentaje_avance_gasto)}</span></div>
          </div>
        </div>`;

      op.cotizaciones.forEach(cot => {
        const cotDiv = document.createElement('div');
        cotDiv.innerHTML = `<div class="drawer__section-title">Cotizacion ${esc(cot.numero_cotizacion)} — Compras (${cot.num_compras_mes})</div>`;
        cotDiv.appendChild(buildComprasListWithFilter(cot.compras_mes, c => renderCompraItem(c)));
        frag.appendChild(cotDiv);
      });

      drawer.open(op.codigo_op, op.cliente, frag);
    } else {
      frag.innerHTML = `
        <div>
          <div class="drawer__section-title">Resumen economico</div>
          <div class="econ-grid-drawer">
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Precio cotizado</span><span class="econ-grid-drawer__value">${currency(op.precio_total)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Gasto del mes</span><span class="econ-grid-drawer__value">${currency(op.total_compras_mes)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">Diferencia</span><span class="econ-grid-drawer__value ${op.diferencia < 0 ? 'econ-grid-drawer__value--negative' : 'econ-grid-drawer__value--positive'}">${currency(op.diferencia)}</span></div>
            <div class="econ-grid-drawer__item"><span class="econ-grid-drawer__label">% Avance</span><span class="econ-grid-drawer__value">${percent(op.porcentaje_avance_gasto)}</span></div>
          </div>
        </div>`;
      const comprasDiv = document.createElement('div');
      comprasDiv.innerHTML = `<div class="drawer__section-title">Compras del mes (${op.num_compras_mes})</div>`;
      comprasDiv.appendChild(buildComprasListWithFilter(op.compras_mes, c => renderCompraItem(c)));
      frag.appendChild(comprasDiv);
      drawer.open(op.numero_cotizacion, op.cliente || '—', frag);
    }
  });

  return el;
}

function renderSupervisorContent(supervisor, rootEl) {
  rootEl.innerHTML = '';

  const kpis = supervisor.kpis;

  // Header supervisor
  const hdr = document.createElement('div');
  hdr.className = 'supervisor-header animate-in';
  const ini = initials(supervisor.nombre);
  hdr.innerHTML = `
    <div class="supervisor-header__avatar">${esc(ini)}</div>
    <div class="supervisor-header__info">
      <h2>${esc(supervisor.nombre)}</h2>
      <p>${esc(supervisor.email || '')} · ${kpis.num_oportunidades} oportunidades · ${kpis.num_cotizaciones_con_compras_sin_op} cot. sin OP</p>
    </div>`;
  rootEl.appendChild(hdr);

  // KPI strip supervisor
  const strip = document.createElement('div');
  strip.className = 'kpi-strip';
  const kpiData = [
    { label: 'Total compras proyecto', value: currency(kpis.monto_total_compras_proyecto), sub: `${kpis.num_compras_proyecto} compras`, primary: true },
    { label: 'Materiales', value: currency(kpis.monto_proyecto_materiales), sub: '' },
    { label: 'Mano de obra', value: currency(kpis.monto_proyecto_mano_obra), sub: '' },
    { label: 'Gastos internos autorizados', value: currency(kpis.monto_gastos_internos_responsable), sub: `${kpis.num_gastos_internos_responsable} compras` },
    { label: 'Pendiente pagar proveedores', value: currency(kpis.monto_pendiente_pago_proveedores), sub: '' },
  ];
  kpiData.forEach((d, i) => strip.appendChild(KpiCard({ ...d, animClass: `stagger-${i + 1}` })));
  rootEl.appendChild(strip);

  // Oportunidades del supervisor
  const ops = supervisor.oportunidades || [];
  const secOps = document.createElement('div');
  secOps.className = 'section';
  secOps.innerHTML = `<div class="section__header"><h2 class="section__title">Oportunidades</h2><span class="section__count">${ops.length}</span></div>`;

  if (ops.length === 0) {
    secOps.innerHTML += `<div class="section__empty">${Icon('building-2', { size: 32 })}<p>Sin oportunidades con compras en este periodo</p></div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    ops.forEach((op, i) => grid.appendChild(renderOpCard(op, true, i)));
    secOps.appendChild(grid);
  }
  rootEl.appendChild(secOps);

  // Cotizaciones sin OP del supervisor
  const cots = supervisor.cotizaciones_con_compras_sin_oportunidad || [];
  const secCots = document.createElement('div');
  secCots.className = 'section';
  secCots.innerHTML = `<div class="section__header"><h2 class="section__title">Cotizaciones con compras sin OP</h2><span class="section__count">${cots.length}</span></div>`;

  if (cots.length === 0) {
    secCots.innerHTML += `<div class="section__empty">${Icon('file-text', { size: 32 })}<p>Sin cotizaciones en ejecucion sin oportunidad asignada</p></div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'cards-grid';
    cots.forEach((cot, i) => grid.appendChild(renderOpCard(cot, false, i)));
    secCots.appendChild(grid);
  }
  rootEl.appendChild(secCots);

  // Gastos internos del supervisor
  const gastos = supervisor.gastos_internos || [];
  const secGastos = document.createElement('div');
  secGastos.className = 'section';
  secGastos.innerHTML = `<div class="section__header"><h2 class="section__title">Gastos internos autorizados</h2><span class="section__count">${gastos.length}</span></div>`;

  if (gastos.length === 0) {
    secGastos.innerHTML += `<div class="section__empty">${Icon('wallet', { size: 32 })}<p>Este supervisor no tiene gastos internos en el periodo</p></div>`;
  } else {
    const list = document.createElement('div');
    list.className = 'compras-list';
    list.innerHTML = gastos.map(c => renderCompraItem(c, true)).join('');
    secGastos.appendChild(list);
  }
  rootEl.appendChild(secGastos);
}

export function renderSupervisor(mesData, supervisorId, rootEl) {
  rootEl.innerHTML = '';

  const supervisores = mesData.supervisores || [];

  if (supervisores.length === 0) {
    rootEl.innerHTML = `<div class="section__empty">${Icon('users', { size: 32 })}<p>Sin actividad de supervisores en este periodo</p></div>`;
    return;
  }

  // Selector de supervisor
  const selectorWrap = document.createElement('div');
  selectorWrap.className = 'supervisor-selector';
  selectorWrap.innerHTML = `<div class="supervisor-selector__label">Seleccionar supervisor</div>`;

  const effectiveId = supervisorId || supervisores[0].supervisor_id;

  if (supervisores.length <= 6) {
    const tabs = document.createElement('div');
    tabs.className = 'supervisor-tabs';
    supervisores.forEach(sv => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `supervisor-tab${sv.supervisor_id === effectiveId ? ' active' : ''}`;
      btn.innerHTML = `<span class="supervisor-tab__avatar">${esc(initials(sv.nombre))}</span>${esc(sv.nombre.split(' ')[0])}`;
      btn.addEventListener('click', () => {
        state.set({ supervisorId: sv.supervisor_id });
      });
      tabs.appendChild(btn);
    });
    selectorWrap.appendChild(tabs);
  } else {
    const dropWrap = document.createElement('div');
    dropWrap.className = 'supervisor-dropdown';
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Seleccionar supervisor');
    supervisores.forEach(sv => {
      const opt = document.createElement('option');
      opt.value = sv.supervisor_id;
      opt.textContent = sv.nombre;
      if (sv.supervisor_id === effectiveId) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      state.set({ supervisorId: Number(sel.value) });
    });
    dropWrap.innerHTML = Icon('chevron-down', { size: 16, className: 'supervisor-dropdown__icon' });
    dropWrap.prepend(sel);
    selectorWrap.appendChild(dropWrap);
  }

  rootEl.appendChild(selectorWrap);

  // Contenido del supervisor seleccionado
  const contentArea = document.createElement('div');
  rootEl.appendChild(contentArea);

  const selectedSv = supervisores.find(s => s.supervisor_id === effectiveId) || supervisores[0];
  renderSupervisorContent(selectedSv, contentArea);
}
