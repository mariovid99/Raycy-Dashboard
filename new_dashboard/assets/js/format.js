/* Helpers de formato — Raycy Dashboard */

/**
 * Formatea un número como moneda MXN.
 * Sin decimales si >= 10,000; con 2 decimales si menor.
 */
export function moneda(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  const abs = Math.abs(valor);
  const opts = abs >= 10000
    ? { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return new Intl.NumberFormat('es-MX', opts).format(valor);
}

/**
 * Formatea como moneda abreviada (K / M).
 */
export function monedaCorta(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  const abs = Math.abs(valor);
  const sign = valor < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return moneda(valor);
}

/**
 * Formatea un porcentaje.
 * @param {number} valor - valor ya en porcentaje (ej: 87.5)
 * @param {number} decimales
 */
export function porcentaje(valor, decimales = 1) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return `${valor.toFixed(decimales)}%`;
}

/**
 * Formatea número con separadores de miles.
 */
export function numero(valor, decimales = 0) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

/**
 * Fecha corta: "05 Ene" o "05 Ene 2026"
 */
export function fechaCorta(isoStr, incluirAño = false) {
  if (!isoStr) return '—';
  const d = new Date(isoStr + (isoStr.length === 10 ? 'T00:00:00' : ''));
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = meses[d.getMonth()];
  if (incluirAño) return `${dia} ${mes} ${d.getFullYear()}`;
  return `${dia} ${mes}`;
}

/**
 * Fecha larga: "5 de enero de 2026"
 */
export function fechaLarga(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr + (isoStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Delta con signo: "+12.3%" o "-5.1%"
 */
export function delta(valor, decimales = 1) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  const sign = valor >= 0 ? '+' : '';
  return `${sign}${valor.toFixed(decimales)}%`;
}

/**
 * Iniciales de un nombre completo (máximo 2 caracteres).
 */
export function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
