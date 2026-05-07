/* Store pub/sub — Raycy Dashboard */

function createStore(initial) {
  let _state = { ...initial };
  const _subs = new Set();

  return {
    get() {
      return { ..._state };
    },
    set(partial) {
      const prev = _state;
      _state = { ..._state, ...partial };
      _subs.forEach(fn => fn(_state, prev));
    },
    subscribe(fn) {
      _subs.add(fn);
      return () => _subs.delete(fn);
    },
  };
}

export const state = createStore({
  mesKey: '2026-01',
  vista: 'overview',
  filtros: {
    supervisorId: null,
    q: '',
    estado: null,
  },
});
