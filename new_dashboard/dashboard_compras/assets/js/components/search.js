/* Buscador global con debounce */
import { state } from '../state.js';
import { Icon } from '../icons.js';

export function Search() {
  const wrap = document.createElement('div');
  wrap.className = 'search-input topbar__search-wrap';

  wrap.innerHTML = Icon('search', { size: 16 }) + `<input type="text" placeholder="Buscar cotizacion, OP, cliente..." aria-label="Buscar">`;

  const input = wrap.querySelector('input');

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.set({ filtroTexto: input.value.toLowerCase().trim() });
    }, 150);
  });

  state.subscribe(({ filtroTexto }) => {
    if (filtroTexto !== input.value.toLowerCase().trim()) {
      input.value = filtroTexto;
    }
  });

  return wrap;
}

/* Filtra un array de items por texto en campos clave */
export function filterItems(items, texto, campos) {
  if (!texto) return items;
  return items.filter(item =>
    campos.some(campo => {
      const val = campo.split('.').reduce((o, k) => o && o[k], item);
      return val && String(val).toLowerCase().includes(texto);
    })
  );
}
