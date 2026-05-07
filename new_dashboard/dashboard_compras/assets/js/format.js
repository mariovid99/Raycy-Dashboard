/* Formateadores de datos */

export function currency(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Math.abs(n) >= 10000) {
    return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function currencyCompact(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + 'M';
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + 'K';
  return currency(n);
}

export function percent(value, decimals = 1) {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(decimals) + '%';
}

export function dateShort(str) {
  if (!str) return '—';
  const d = new Date(str + (str.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function supervisoresLabel(supervisores) {
  if (!supervisores || supervisores.length === 0) return '—';
  if (supervisores.length === 1) return supervisores[0].nombre;
  return supervisores.map(s => s.nombre.split(' ')[0]).join(', ');
}
