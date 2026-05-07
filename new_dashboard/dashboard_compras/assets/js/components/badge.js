/* Badge de estado */

export function Badge(text, variant = 'neutral', withDot = true) {
  const dot = withDot ? `<span class="badge__dot"></span>` : '';
  return `<span class="badge badge--${variant}">${dot}${text}</span>`;
}

export function badgePagado(pagado) {
  return pagado ? Badge('Pagado', 'success') : Badge('Pendiente pago', 'warning');
}

export function badgeFacturado(facturado) {
  return facturado ? Badge('Facturado', 'blue') : Badge('Sin factura', 'neutral');
}

export function badgeConcluido(concluido) {
  return concluido ? Badge('Concluido', 'success') : Badge('En proceso', 'neutral');
}

export function badgeTipoCompra(tipo) {
  if (tipo === 'mano_obra') return Badge('Mano de obra', 'blue');
  if (tipo === 'material')  return Badge('Material', 'neutral');
  return Badge(tipo || '—', 'neutral');
}
