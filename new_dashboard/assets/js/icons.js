/* Registro de iconos SVG inline — Lucide v0.300+ paths */

const PATHS = {
  'layout-dashboard': `
    <rect width="7" height="9" x="3" y="3" rx="1"/>
    <rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/>
    <rect width="7" height="5" x="3" y="16" rx="1"/>`,
  'users': `
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  'file-text': `
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>`,
  'shopping-cart': `
    <circle cx="8" cy="21" r="1"/>
    <circle cx="19" cy="21" r="1"/>
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`,
  'receipt': `
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
    <path d="M16 8H8"/>
    <path d="M16 12H8"/>
    <path d="M12 16H8"/>`,
  'target': `
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>`,
  'chevron-down': `
    <path d="m6 9 6 6 6-6"/>`,
  'chevron-right': `
    <path d="m9 18 6-6-6-6"/>`,
  'chevron-left': `
    <path d="m15 18-6-6 6-6"/>`,
  'arrow-up-right': `
    <path d="M7 7h10v10"/>
    <path d="M7 17 17 7"/>`,
  'arrow-down-right': `
    <path d="M7 7v10h10"/>
    <path d="M7 17 17 7"/>`,
  'circle-check': `
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>`,
  'circle-alert': `
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>`,
  'clock': `
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>`,
  'search': `
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>`,
  'filter': `
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
  'download': `
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>`,
  'more-horizontal': `
    <circle cx="12" cy="12" r="1"/>
    <circle cx="19" cy="12" r="1"/>
    <circle cx="5" cy="12" r="1"/>`,
  'x': `
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>`,
  'sparkles': `
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    <path d="M20 3v4"/>
    <path d="M22 5h-4"/>
    <path d="M4 17v2"/>
    <path d="M5 18H3"/>`,
  'building-2': `
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
    <path d="M10 6h4"/>
    <path d="M10 10h4"/>
    <path d="M10 14h4"/>
    <path d="M10 18h4"/>`,
  'trending-up': `
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>`,
  'trending-down': `
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
    <polyline points="16 17 22 17 22 11"/>`,
  'alert-triangle': `
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>`,
  'bar-chart-2': `
    <line x1="18" x2="18" y1="20" y2="10"/>
    <line x1="12" x2="12" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="14"/>`,
  'minus': `
    <path d="M5 12h14"/>`,
  'check': `
    <path d="M20 6 9 17l-5-5"/>`,
  'info': `
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>`,
  'external-link': `
    <path d="M15 3h6v6"/>
    <path d="M10 14 21 3"/>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>`,
};

/**
 * Retorna un string SVG para el icono dado.
 * @param {string} name - nombre del icono Lucide
 * @param {Object} attrs - atributos adicionales: size, color, className
 */
export function Icon(name, { size = 16, color = 'currentColor', className = '' } = {}) {
  const paths = PATHS[name];
  if (!paths) {
    console.warn(`[icons] Icono no encontrado: "${name}"`);
    return '';
  }
  const cls = className ? ` class="${className}"` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls}>${paths}</svg>`;
}

/**
 * Crea un elemento SVG como HTMLElement (no string).
 */
export function IconEl(name, { size = 16, color = 'currentColor', className = '' } = {}) {
  const div = document.createElement('span');
  div.innerHTML = Icon(name, { size, color, className });
  return div.firstElementChild;
}
