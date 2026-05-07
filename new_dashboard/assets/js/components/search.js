/* Buscador global con debounce — Raycy Dashboard */

import { Icon } from '../icons.js';
import { state } from '../state.js';

export function crearSearch() {
  const el = document.createElement('div');
  el.className = 'search-wrap';

  const icon = document.createElement('span');
  icon.className = 'search-icon';
  icon.innerHTML = Icon('search', { size: 16 });

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'search-input';
  input.placeholder = 'Buscar cotización, supervisor, OP...';
  input.setAttribute('aria-label', 'Búsqueda global');
  input.value = state.get().filtros.q || '';

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      state.set({ filtros: { ...state.get().filtros, q } });
    }, 150);
  });

  el.appendChild(icon);
  el.appendChild(input);

  const unsub = state.subscribe(({ filtros }) => {
    if (input.value !== filtros.q) input.value = filtros.q;
  });

  el.destroy = () => {
    clearTimeout(timer);
    unsub();
  };

  return el;
}
