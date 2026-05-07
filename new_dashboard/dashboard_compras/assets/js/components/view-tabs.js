/* Segmented control para alternar vistas */
import { state } from '../state.js';
import { Icon } from '../icons.js';

const VISTAS = [
  { key: 'general',        label: 'General',         icon: 'layout-dashboard' },
  { key: 'por-supervisor', label: 'Por Supervisor',  icon: 'users' },
];

export function ViewTabs() {
  const el = document.createElement('div');
  el.className = 'view-tabs';
  el.setAttribute('role', 'tablist');
  el.setAttribute('aria-label', 'Vista del dashboard');

  function render(currentVista) {
    el.innerHTML = '';
    VISTAS.forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `view-tabs__btn${v.key === currentVista ? ' active' : ''}`;
      btn.innerHTML = Icon(v.icon, { size: 14 }) + v.label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', v.key === currentVista ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state.set({ vista: v.key, supervisorId: null });
      });
      el.appendChild(btn);
    });
  }

  render(state.get().vista);
  state.subscribe(({ vista }) => render(vista));

  return el;
}
