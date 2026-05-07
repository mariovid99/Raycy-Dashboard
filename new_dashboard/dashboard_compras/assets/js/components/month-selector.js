/* Segmented control de mes */
import { state } from '../state.js';

export function MonthSelector(meses) {
  const el = document.createElement('div');
  el.className = 'month-selector';
  el.setAttribute('role', 'tablist');
  el.setAttribute('aria-label', 'Seleccionar mes');

  function render(currentKey) {
    el.innerHTML = '';
    meses.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-selector__btn${m.key === currentKey ? ' active' : ''}`;
      btn.textContent = m.key === 'acumulado' ? 'Acumulado' : m.label.split(' ')[0];
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', m.key === currentKey ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state.set({ mesKey: m.key, supervisorId: null });
      });
      el.appendChild(btn);
    });
  }

  const s = state.get();
  render(s.mesKey);

  state.subscribe(({ mesKey }) => render(mesKey));

  return el;
}
