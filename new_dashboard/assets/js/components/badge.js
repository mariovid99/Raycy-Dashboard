/* Badges de estado — Raycy Dashboard */

/* Mapa de estado → variante CSS */
const VARIANTES = {
  'Pagado':           'success',
  'Cobrado':          'success',
  'Concluido':        'success',
  'Todo pagado':      'success',
  'Facturado':        'blue',
  'Pendiente':        'warning',
  'Pendiente Cobro':  'warning',
  'Pendiente pago':   'warning',
  'En Proceso':       'neutral',
  'Sin facturar':     'danger',
  'Sin compras':      'neutral',
  'Sobregirado':      'danger',
  'Riesgo':           'danger',
  'Cobrado, pendiente pago a proveedores': 'warning',
  'Proveedores pagados, falta cliente': 'warning',
  'Pendiente cobro y pago': 'danger',
};

/**
 * Crea un badge de estado como HTMLElement.
 * @param {string} texto - texto del estado
 * @param {string} [variante] - fuerza una variante: success|blue|warning|danger|neutral
 */
export function crearBadge(texto, variante = null) {
  const el = document.createElement('span');
  el.className = 'badge';
  const v = variante || VARIANTES[texto] || 'neutral';
  el.classList.add(`badge--${v}`);
  el.textContent = texto;
  return el;
}

/**
 * Retorna el string HTML de un badge.
 */
export function badgeHTML(texto, variante = null) {
  const v = variante || VARIANTES[texto] || 'neutral';
  return `<span class="badge badge--${v}">${texto}</span>`;
}
