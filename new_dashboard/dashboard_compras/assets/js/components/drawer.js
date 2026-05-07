/* Drawer slide-in desde la derecha */
import { Icon } from '../icons.js';

let activeDrawer = null;

export function createDrawer() {
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';

  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');

  const header = document.createElement('div');
  header.className = 'drawer__header';

  const titleWrap = document.createElement('div');
  const titleEl = document.createElement('div');
  titleEl.className = 'drawer__title';
  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'drawer__subtitle';
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subtitleEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'drawer__close';
  closeBtn.innerHTML = Icon('x', { size: 20 });
  closeBtn.setAttribute('aria-label', 'Cerrar');

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'drawer__body';

  drawer.appendChild(header);
  drawer.appendChild(body);

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  function open(title, subtitle, content) {
    titleEl.textContent = title;
    subtitleEl.textContent = subtitle || '';
    body.innerHTML = '';
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof Node) {
      body.appendChild(content);
    }
    backdrop.classList.add('open');
    drawer.classList.add('open');
    activeDrawer = { close };
    document.addEventListener('keydown', handleKey);
  }

  function close() {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    activeDrawer = null;
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape') close();
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  return { open, close, body };
}

/* Singleton global */
let _drawer = null;
export function getDrawer() {
  if (!_drawer) _drawer = createDrawer();
  return _drawer;
}
