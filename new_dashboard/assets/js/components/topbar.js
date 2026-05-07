/* Topbar component — Raycy Dashboard */

import { Icon } from '../icons.js';
import { state } from '../state.js';
import { crearMonthSelector } from './month-selector.js';
import { crearSearch } from './search.js';

export function crearTopbar() {
  const el = document.createElement('header');
  el.className = 'topbar';
  el.setAttribute('role', 'banner');

  // Brand
  const brand = document.createElement('a');
  brand.href = '#/overview';
  brand.className = 'topbar__brand';
  brand.setAttribute('aria-label', 'Raycy Dashboard — inicio');
  brand.innerHTML = `${Icon('building-2', { size: 18 })}<span>RAYCY</span>`;

  const divider = document.createElement('div');
  divider.className = 'topbar__divider';
  divider.setAttribute('aria-hidden', 'true');

  // Centro: selector de mes
  const center = document.createElement('div');
  center.className = 'topbar__center';
  const monthSel = crearMonthSelector();
  center.appendChild(monthSel);

  // Derecha: buscador + avatar
  const right = document.createElement('div');
  right.className = 'topbar__right';
  const searchEl = crearSearch();
  right.appendChild(searchEl);

  const avatar = document.createElement('div');
  avatar.className = 'topbar__avatar';
  avatar.setAttribute('title', 'Director General');
  avatar.setAttribute('aria-label', 'Perfil');
  avatar.textContent = 'DG';
  right.appendChild(avatar);

  el.appendChild(brand);
  el.appendChild(divider);
  el.appendChild(center);
  el.appendChild(right);

  return el;
}
