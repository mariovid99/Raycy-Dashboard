/* Carga y caché del JSON — Raycy Dashboard */

let _cache = null;
let _promise = null;

/**
 * Carga dashboard_data.json (una sola vez, cachea en memoria).
 * @returns {Promise<Object>}
 */
export async function cargarDatos() {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch('./dashboard_data.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      _cache = data;
      return data;
    })
    .catch(err => {
      _promise = null;
      throw err;
    });

  return _promise;
}

/** Retorna el array de meses disponibles. */
export function getMeses() {
  if (!_cache) return [];
  return _cache.meses_disponibles;
}

/**
 * Retorna el objeto de datos de un mes específico.
 * @param {string} key - e.g. '2026-01'
 */
export function getMes(key) {
  if (!_cache) return null;
  return _cache.datos_por_mes[key] ?? null;
}

/** Retorna la fecha de generación del JSON como objeto Date. */
export function getFechaGeneracion() {
  if (!_cache) return new Date();
  return new Date(_cache.fecha_generacion);
}

/** Retorna todos los datos disponibles (datos_por_mes). */
export function getTodosLosMeses() {
  if (!_cache) return {};
  return _cache.datos_por_mes;
}
