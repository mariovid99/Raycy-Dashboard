/* Boot: carga data, monta shell, renderiza vista */
import { loadData, getMeses, getMes, getSupervisores } from './data.js';
import { state } from './state.js';
import { MonthSelector } from './components/month-selector.js';
import { ViewTabs } from './components/view-tabs.js';
import { Search } from './components/search.js';
import { renderGeneral } from './views/compras-general.js';
import { renderSupervisor } from './views/compras-supervisor.js';

let DATA = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 5000);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 400);
  }
}

function renderView(st) {
  const mesData = getMes(DATA, st.mesKey);
  if (!mesData) return;

  const contentEl = document.getElementById('view-content');
  if (!contentEl) return;

  if (st.vista === 'general') {
    renderGeneral(mesData, st.filtroTexto, contentEl);
  } else {
    renderSupervisor(mesData, st.supervisorId, contentEl);
  }

  // Sincronizar hash URL
  const hashParts = [];
  if (st.mesKey) hashParts.push('mes=' + st.mesKey);
  if (st.vista !== 'general') hashParts.push('vista=' + st.vista);
  if (st.supervisorId) hashParts.push('supervisor=' + st.supervisorId);
  history.replaceState(null, '', '#' + hashParts.join('&'));
}

function parseHash() {
  const hash = location.hash.replace('#', '');
  if (!hash) return {};
  return Object.fromEntries(hash.split('&').map(p => p.split('=')));
}

async function init() {
  try {
    DATA = await loadData();
  } catch (e) {
    hideLoading();
    showToast(e.message);
    return;
  }

  const meses = getMeses(DATA);

  // Restaurar estado desde hash
  const fromHash = parseHash();
  const initialState = {};
  if (fromHash.mes && DATA.datos_por_mes[fromHash.mes]) initialState.mesKey = fromHash.mes;
  if (fromHash.vista) initialState.vista = fromHash.vista;
  if (fromHash.supervisor) initialState.supervisorId = Number(fromHash.supervisor);
  if (Object.keys(initialState).length > 0) state.set(initialState);

  // Montar topbar
  const topbar = document.getElementById('topbar');

  const brand = document.createElement('div');
  brand.className = 'topbar__brand';
  brand.innerHTML = 'RAYCY <span>· Compras</span>';
  topbar.appendChild(brand);

  const controls = document.createElement('div');
  controls.className = 'topbar__controls';
  controls.appendChild(MonthSelector(meses));
  controls.appendChild(ViewTabs());
  topbar.appendChild(controls);

  topbar.appendChild(Search());

  // Suscribir re-render
  state.subscribe(st => renderView(st));

  // Render inicial
  renderView(state.get());

  hideLoading();
}

init();
