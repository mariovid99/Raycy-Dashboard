/* Store pub/sub minimo */

export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    get() { return { ...state }; },
    set(patch) {
      state = { ...state, ...patch };
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const state = createStore({
  mesKey: '2026-01',
  vista: 'general',
  supervisorId: null,
  filtroTexto: '',
});
