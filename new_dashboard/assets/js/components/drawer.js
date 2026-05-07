/* Drawer de detalle — slide-in derecho — Raycy Dashboard */

import { Icon } from '../icons.js';

let _activeDrawer = null;

export function abrirDrawer({ titulo, contenido }) {
  if (_activeDrawer) cerrarDrawer();

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', titulo);

  const header = document.createElement('div');
  header.className = 'drawer__header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'drawer__title';
  titleEl.textContent = titulo;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'drawer__close';
  closeBtn.setAttribute('aria-label', 'Cerrar panel');
  closeBtn.innerHTML = Icon('x', { size: 18 });
  closeBtn.addEventListener('click', cerrarDrawer);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'drawer__body';
  if (typeof contenido === 'string') {
    body.innerHTML = contenido;
  } else if (contenido instanceof HTMLElement) {
    body.appendChild(contenido);
  }

  drawer.appendChild(header);
  drawer.appendChild(body);

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  // Animar entrada
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    drawer.classList.add('is-open');
  });

  // Cerrar con click fuera
  overlay.addEventListener('click', cerrarDrawer);

  // Cerrar con ESC
  const onKey = (e) => {
    if (e.key === 'Escape') cerrarDrawer();
  };
  document.addEventListener('keydown', onKey);

  _activeDrawer = { overlay, drawer, onKey };

  // Foco al drawer
  closeBtn.focus();
}

export function cerrarDrawer() {
  if (!_activeDrawer) return;
  const { overlay, drawer, onKey } = _activeDrawer;
  document.removeEventListener('keydown', onKey);
  overlay.classList.remove('is-visible');
  drawer.classList.remove('is-open');
  setTimeout(() => {
    overlay.remove();
    drawer.remove();
  }, 300);
  _activeDrawer = null;
}
