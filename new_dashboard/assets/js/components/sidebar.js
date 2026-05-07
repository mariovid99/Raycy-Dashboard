/* Sidebar component — Raycy Dashboard */

import { Icon, IconEl } from '../icons.js';
import { state } from '../state.js';
import { navegar } from '../router.js';

const ITEMS = [
  { hash: 'overview',     label: 'Resumen Ejecutivo',    icon: 'layout-dashboard' },
  { hash: 'supervisores', label: 'Supervisores',          icon: 'users' },
  { hash: 'cotizaciones', label: 'Cotizaciones',          icon: 'file-text' },
  { hash: 'compras',      label: 'Compras y Gastos',      icon: 'shopping-cart' },
  { hash: 'facturacion',  label: 'Facturación y Cobranza',icon: 'receipt' },
  { hash: 'oportunidades',label: 'Oportunidades',         icon: 'target' },
];

export function crearSidebar(onToggle) {
  let expanded = false;

  const el = document.createElement('nav');
  el.className = 'sidebar';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Menú principal');

  // Nav items
  const nav = document.createElement('ul');
  nav.className = 'sidebar__nav';

  ITEMS.forEach(item => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'sidebar__item';
    btn.setAttribute('aria-label', item.label);
    btn.dataset.hash = item.hash;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'sidebar__icon';
    iconWrap.innerHTML = Icon(item.icon, { size: 20 });

    const labelEl = document.createElement('span');
    labelEl.className = 'sidebar__label';
    labelEl.textContent = item.label;

    btn.appendChild(iconWrap);
    btn.appendChild(labelEl);
    li.appendChild(btn);
    nav.appendChild(li);

    btn.addEventListener('click', () => {
      navegar(item.hash);
    });
  });

  el.appendChild(nav);

  // Toggle button
  const toggleWrap = document.createElement('div');
  toggleWrap.className = 'sidebar__toggle';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'sidebar__toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Expandir menú');
  toggleBtn.innerHTML = Icon('chevron-right', { size: 18 });

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    el.classList.toggle('is-expanded', expanded);
    toggleBtn.innerHTML = Icon(expanded ? 'chevron-left' : 'chevron-right', { size: 18 });
    toggleBtn.setAttribute('aria-label', expanded ? 'Colapsar menú' : 'Expandir menú');
    if (onToggle) onToggle(expanded);
  });

  toggleWrap.appendChild(toggleBtn);
  el.appendChild(toggleWrap);

  // Actualizar item activo cuando cambia la vista
  const unsub = state.subscribe(({ vista }) => {
    nav.querySelectorAll('.sidebar__item').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.hash === vista);
      btn.setAttribute('aria-current', btn.dataset.hash === vista ? 'page' : 'false');
    });
  });

  // Activar item inicial
  const initial = state.get().vista;
  nav.querySelectorAll('.sidebar__item').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.hash === initial);
  });

  el.destroy = () => unsub();

  return el;
}
