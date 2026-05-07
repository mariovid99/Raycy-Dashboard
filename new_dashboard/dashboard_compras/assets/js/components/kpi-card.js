/* KPI Card */

export function KpiCard({ label, value, sub = '', primary = false, animClass = '' }) {
  const el = document.createElement('div');
  el.className = `kpi-card${primary ? ' kpi-card--primary' : ''} animate-in ${animClass}`.trim();
  const safeLabel = String(label || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const safeValue = String(value || '—').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const safeSub   = String(sub  || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  el.innerHTML = `
    <div class="kpi-card__label">${safeLabel}</div>
    <div class="kpi-card__value">${safeValue}</div>
    ${safeSub ? `<div class="kpi-card__sub">${safeSub}</div>` : ''}
  `;
  return el;
}
