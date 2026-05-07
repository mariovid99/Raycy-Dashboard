/* Boot — Raycy Dashboard */

import { cargarDatos } from './data.js';
import { state } from './state.js';
import { registrar, iniciarRouter } from './router.js';
import { crearTopbar } from './components/topbar.js';
import { crearSidebar } from './components/sidebar.js';

// Importar vistas
import { renderOverview } from './views/overview.js';
import { renderSupervisores } from './views/supervisores.js';
import { renderCotizaciones } from './views/cotizaciones.js';
import { renderCompras } from './views/compras.js';
import { renderFacturacion } from './views/facturacion.js';
import { renderOportunidades } from './views/oportunidades.js';

async function boot() {
  const app = document.getElementById('app');

  try {
    await cargarDatos();
  } catch (err) {
    app.innerHTML = `
      <div class="error-screen">
        <div class="error-inner">
          <h2>Error al cargar el dashboard</h2>
          <p>No se pudo cargar <code>dashboard_data.json</code>.</p>
          <p>Asegúrate de servir el proyecto por HTTP:<br>
          <code>python -m http.server 8000</code><br>
          y abre <code>http://localhost:8000/</code></p>
          <p class="error-detail">${err.message}</p>
        </div>
      </div>`;
    return;
  }

  // Montar shell
  app.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'shell';

  const topbar = crearTopbar();
  shell.appendChild(topbar);

  const contentArea = document.createElement('main');
  contentArea.className = 'content-area';
  contentArea.id = 'main-content';

  const contentInner = document.createElement('div');
  contentInner.className = 'content-inner';
  contentArea.appendChild(contentInner);

  const sidebar = crearSidebar((expanded) => {
    contentArea.classList.toggle('sidebar-expanded', expanded);
  });

  shell.appendChild(sidebar);
  shell.appendChild(contentArea);
  app.appendChild(shell);

  // Registrar vistas
  registrar('overview',      (c) => renderOverview(c));
  registrar('supervisores',  (c) => renderSupervisores(c));
  registrar('cotizaciones',  (c) => renderCotizaciones(c));
  registrar('compras',       (c) => renderCompras(c));
  registrar('facturacion',   (c) => renderFacturacion(c));
  registrar('oportunidades', (c) => renderOportunidades(c));

  iniciarRouter(contentInner);
}

boot();
