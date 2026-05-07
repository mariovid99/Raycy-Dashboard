/* Hash router — Raycy Dashboard */

import { state } from './state.js';

const _routes = new Map();
let _contenedor = null;
let _vistaActual = null;

/**
 * Registra una vista.
 * @param {string} hash - e.g. 'overview'
 * @param {Function} renderFn - función que recibe el contenedor y lo puebla
 * @param {Function} [destroyFn] - limpieza al salir
 */
export function registrar(hash, renderFn, destroyFn = null) {
  _routes.set(hash, { render: renderFn, destroy: destroyFn });
}

/** Navega a una ruta por hash. */
export function navegar(hash) {
  window.location.hash = `/${hash}`;
}

/** Inicializa el router y escucha cambios de hash. */
export function iniciarRouter(contenedor) {
  _contenedor = contenedor;

  window.addEventListener('hashchange', _resolver);
  _resolver();
}

function _resolver() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'overview';
  const hash = raw.split('?')[0];

  const ruta = _routes.get(hash) || _routes.get('overview');
  if (!ruta) return;

  // Destruir vista anterior si existe
  if (_vistaActual && _vistaActual.destroy) {
    _vistaActual.destroy();
  }

  _contenedor.innerHTML = '';
  _vistaActual = ruta;

  state.set({ vista: hash });
  ruta.render(_contenedor);
}
