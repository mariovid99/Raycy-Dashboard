/* Selector de mes — Raycy Dashboard */

import { getMeses } from '../data.js';
import { state } from '../state.js';

export function crearMonthSelector() {
  const el = document.createElement('div');
  el.className = 'month-selector';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Seleccionar período');

  function render() {
    el.innerHTML = '';
    const meses = getMeses();
    const current = state.get().mesKey;

    const opciones = [
      { key: 'YTD', label: 'Acumulado' },
      ...meses,
    ];

    opciones.forEach(mes => {
      const btn = document.createElement('button');
      btn.className = 'month-btn';
      btn.textContent = mes.label || mes.key;
      btn.dataset.key = mes.key;
      btn.setAttribute('aria-pressed', mes.key === current ? 'true' : 'false');
      if (mes.key === current) btn.classList.add('is-active');

      btn.addEventListener('click', () => {
        state.set({ mesKey: mes.key });
      });

      el.appendChild(btn);
    });
  }

  render();

  const unsub = state.subscribe(({ mesKey }) => {
    el.querySelectorAll('.month-btn').forEach(btn => {
      const active = btn.dataset.key === mesKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });

  el.destroy = () => unsub();

  return el;
}
