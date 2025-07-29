// Datos fijos para detalle
const projectDetails = {
    "PintarNaveA": {
      title: "Pintar Nave A",
      budget: 100000, cost: 88000,
      orders: [
        ["Pintura y Barniz","$50,000","2025-02-10"],
        ["Mano de Obra","$20,000","2025-02-12"],
        ["Renta Plataforma","$10,000","2025-02-15"],
        ["Escaleras y Andamios","$8,000","2025-02-20"]
      ],
      breakdown: [50000,20000,10000,8000],
      breakdownLabels: ['Pintura','Mano de Obra','Plataforma','Escaleras']
    },
    "MantenimientoPlantaB": {
      title: "Mantenimiento Planta B",
      budget: 100000, cost: 82000,
      orders: [
        ["Repuestos Hidráulicos","$40,000","2025-01-30"],
        ["Mano de Obra Técnica","$25,000","2025-02-05"],
        ["Lubricantes","$7,000","2025-02-10"],
        ["Equipo de Seguridad","$10,000","2025-02-18"]
      ],
      breakdown: [40000,25000,7000,10000],
      breakdownLabels: ['Repuestos','Mano de Obra','Lubricantes','Seguridad']
    }
  };

  // Inicializar gráficos resumen
  new Chart(document.getElementById('usageChart'), {
    type: 'doughnut',
    data: {
      labels: ['Verde', 'Amarillo', 'Rojo'],
      datasets: [{
        data: [15, 25, 10],
        backgroundColor: ['#83bc55', '#fcb148', '#f25148'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '70%', // correcto lugar
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#ffffff'
          }
        }
      }
    }
  });
  
  new Chart(document.getElementById('statusChart'), { type: 'bar', data: { labels: ['Pintar A','Mant. B','Instal C','Reves D','Limp E'], datasets: [{ label: '% Uso', data: [88,82,76,68,45], backgroundColor: '#50d1fb' }] }, options: { scales: { y: { beginAtZero: true, max: 100 } } } });

  // Navegación a detalle
  function showDetail(key) {
    const data = projectDetails[key];
    if (!data) return;
    const dv = document.getElementById('detailView');
    const sc = document.getElementById('summaryView');
    const container = document.getElementById('detailContent');
    sc.classList.add('hidden'); dv.classList.remove('hidden');
    // Generar contenido HTML
    container.innerHTML = `
      <h2>${data.title}</h2>
      <div class="cards">
        <div class="card"><h3>Costo Actual</h3><div class="kpi">$${data.cost.toLocaleString()}</div></div>
        <div class="card"><h3>Presupuesto Total</h3><div class="kpi">$${data.budget.toLocaleString()}</div></div>
        <div class="card"><h3>% Uso Presupuesto</h3><div class="kpi ${data.cost/data.budget>0.85? 'red': data.cost/data.budget>0.65? 'yellow': 'green'}">${Math.round(data.cost/data.budget*100)}%</div></div>
        <div class="card"><h3>Restante</h3><div class="kpi">$${(data.budget-data.cost).toLocaleString()}</div></div>
      </div>
      <div class="table-container">
        <h3>Órdenes de Compra</h3>
        <table><thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead><tbody>
          ${data.orders.map(o => `<tr><td>${o[0]}</td><td>${o[1]}</td><td>${o[2]}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="chart-container-detail card"><canvas id="detailChart"></canvas></div>
    `;
    // Crear gráfico breakdown
    new Chart(document.getElementById('detailChart'), {
        type: 'doughnut',
        data: {
          labels: data.breakdownLabels,
          datasets: [{
            data: data.breakdown,
            backgroundColor: [
              '#83ff4c', '#fcff57', '#ff5964', '#57f2e6', '#a95fff',
              '#ffa24c', '#4cffd2', '#ff69f2', '#91ff57', '#48aaff'
            ],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '70%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#ffffff'
              }
            }
          }
        }
      });
      
  }

  // Click en filas y lista
  document.querySelectorAll('[data-proj-key]').forEach(el => el.addEventListener('click', () => showDetail(el.getAttribute('data-proj-key'))));
  // Back
  document.getElementById('btnBack').addEventListener('click', () => {
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('summaryView').classList.remove('hidden');
  });
  // Offcanvas
  document.getElementById('btnViewAll').addEventListener('click', () => document.getElementById('offcanvas').classList.add('open'));
  document.getElementById('closeOff').addEventListener('click', () => document.getElementById('offcanvas').classList.remove('open'));