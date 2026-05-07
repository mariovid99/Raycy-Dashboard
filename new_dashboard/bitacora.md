# Bitácora · RAYCY Dashboard Ejecutivo

> Cada agente que trabaje en este proyecto **debe** actualizar este archivo.
> El propósito es que el siguiente agente sepa exactamente qué se hizo, qué
> falta y qué decisiones se tomaron, sin necesidad de leer todos los commits.

Reglas:
1. No borrar entradas anteriores. Solo agregar.
2. Marcar cambios de estado en la "Tabla de progreso".
3. Antes de tomar un ítem, asegúrate de que no esté ya "EN PROGRESO" por
   otro agente reciente; si lo está y han pasado más de 30 minutos sin
   avance evidente, retómalo y nótalo.

---

## 1. Tabla de progreso

Estados válidos: `PENDIENTE` · `EN PROGRESO` · `COMPLETO` · `BLOQUEADO`

### Fase 0 — Andamiaje

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F0.1 | Crear estructura de carpetas (`assets/css`, `assets/js`, `components/`, `views/`) | COMPLETO | agent-01 | |
| F0.2 | `index.html` scaffolding | COMPLETO | agent-01 | |
| F0.3 | `assets/css/variables.css` (tokens) | COMPLETO | agent-01 | |
| F0.4 | `assets/css/base.css` (reset, body, scrollbars) | COMPLETO | agent-01 | |
| F0.5 | `assets/js/icons.js` (registro SVG inline Lucide) | COMPLETO | agent-01 | 22 iconos + extras |
| F0.6 | `assets/js/format.js` (currency, %, fechas) | COMPLETO | agent-01 | |
| F0.7 | `assets/js/data.js` (fetch JSON + caché) | COMPLETO | agent-01 | |

### Fase 1 — Estado y shell

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F1.1 | `state.js` (store pub/sub) | COMPLETO | agent-01 | |
| F1.2 | `router.js` (hash-based) | COMPLETO | agent-01 | |
| F1.3 | `components/topbar.js` | COMPLETO | agent-01 | |
| F1.4 | `components/sidebar.js` | COMPLETO | agent-01 | expandible 64→232px |
| F1.5 | `components/month-selector.js` | COMPLETO | agent-01 | incluye YTD |
| F1.6 | `assets/css/layout.css` | COMPLETO | agent-01 | |
| F1.7 | `assets/js/main.js` (boot) | COMPLETO | agent-01 | |

### Fase 2 — Componentes base

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F2.1 | `components/kpi-card.js` (con sparkline + count-up) | COMPLETO | agent-01 | |
| F2.2 | `components/data-table.js` (sortable, sticky header) | COMPLETO | agent-01 | |
| F2.3 | `components/badge.js` | COMPLETO | agent-01 | |
| F2.4 | `components/drawer.js` | COMPLETO | agent-01 | ESC, click fuera, focus |
| F2.5 | `components/search.js` (debounce 150ms) | COMPLETO | agent-01 | |
| F2.6 | `assets/js/charts.js` (wrappers Chart.js) | COMPLETO | agent-01 | combo, donut, bar H/V, scatter |
| F2.7 | `assets/css/components.css` y `charts.css` | COMPLETO | agent-01 | + views.css |

### Fase 3 — Vistas

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F3.1 | `assets/js/compute.js` (agregadores) | COMPLETO | agent-01 | |
| F3.2 | Vista Resumen Ejecutivo (`views/overview.js`) | COMPLETO | agent-01 | |
| F3.3 | Vista Supervisores (`views/supervisores.js`) | COMPLETO | agent-01 | |
| F3.4 | Vista Cotizaciones (`views/cotizaciones.js`) | COMPLETO | agent-01 | |
| F3.5 | Vista Compras y Gastos (`views/compras.js`) | COMPLETO | agent-01 | |
| F3.6 | Vista Facturación y Cobranza (`views/facturacion.js`) | COMPLETO | agent-01 | |
| F3.7 | Vista Oportunidades (`views/oportunidades.js`) | COMPLETO | agent-01 | |

### Fase 4 — Polish

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F4.1 | Animaciones de entrada (stagger cards) | COMPLETO | agent-01 | card-enter class con delay |
| F4.2 | Count-up de KPIs en cambio de mes | COMPLETO | agent-01 | en kpi-card.js |
| F4.3 | Estados vacíos en tablas | COMPLETO | agent-01 | data-table.js emptyMsg |
| F4.4 | Micro-interacciones sidebar y tablas | COMPLETO | agent-01 | CSS transitions |
| F4.5 | Print stylesheet | PENDIENTE | — | |
| F4.6 | Mensaje de pantalla pequeña | COMPLETO | agent-01 | CSS @media max-width:1023px |

### Fase 5 — QA

| ID | Tarea | Estado | Agente | Notas |
|----|-------|--------|--------|-------|
| F5.1 | Validar KPIs vs JSON manual (1 mes completo) | PENDIENTE | — | |
| F5.2 | Cambio de mes recalcula 100% de la vista | PENDIENTE | — | |
| F5.3 | Consola limpia (0 errores) | PENDIENTE | — | Requiere servidor HTTP |
| F5.4 | Probar 1280 / 1440 / 1920 | PENDIENTE | — | |
| F5.5 | Accesibilidad básica (tab + focus) | PENDIENTE | — | |
| F5.6 | Documentar ejecución y limitaciones | PENDIENTE | — | |

---

## 2. Decisiones técnicas vigentes

- **`supervisores_asignados` es un string, no un array** — en el JSON de
  `cotizaciones_con_oportunidad`, el campo viene como string simple (nombre
  del supervisor). El código lo trata directamente como string.
- **`cotizaciones_con_oportunidad_por_supervisor`** usa `ingreso_total_presupuestado`,
  `margen_estimado_total`, `oportunidades_concluidas` (no `ingreso_presupuestado`,
  `margen_estimado`, `cotizaciones_concluidas`). Confirmado leyendo el JSON real.
- **Módulos ES2020** (`type="module"` en index.html) — el servidor HTTP local
  es obligatorio; `file://` no funcionará por CORS.
- No se usaron frameworks, bundlers ni TypeScript. Todo vanilla JS.

---

## 3. Pendientes / Bugs conocidos

- F4.5 (print stylesheet) pendiente.
- F5.x (QA completo) pendiente — requiere abrir en navegador con servidor HTTP.
- El `cotizaciones.js` filtra solo por mes; el filtro de búsqueda global en
  topbar actualiza `state.filtros.q` y la vista lo consume.
- El heatmap supervisor×mes en supervisores.js construye la tabla con JS puro
  (sin Chart.js) para control total de colores.

---

## 4. Registro cronológico

### 2026-05-05 · setup
Tarea(s): documentación maestra
Archivos:
  + prompt.txt
  + CLAUDE.md
  + bitacora.md
Resumen: Se creó el plan de trabajo, especificación maestra y bitácora.
Cero código de aplicación todavía. Todo agente debe iniciar leyendo
prompt.txt → CLAUDE.md → esta bitácora.
Siguiente recomendado: F0.1 (crear estructura de carpetas) seguido de F0.2
(scaffolding de index.html).

---

### 2026-05-05 · agent-01
Tarea(s): F0.1–F0.7, F1.1–F1.7, F2.1–F2.7, F3.1–F3.7, F4.1–F4.4, F4.6
Archivos:
  + index.html                              (scaffolding completo)
  + assets/css/variables.css               (tokens de diseño)
  + assets/css/base.css                    (reset, body, loading, scrollbars)
  + assets/css/layout.css                  (topbar, sidebar, grid, content)
  + assets/css/components.css              (cards, KPI, badges, tabla, drawer, search, month-sel)
  + assets/css/charts.css                  (contenedores, leyendas, donut, combos)
  + assets/css/views.css                   (filter bar, kanban, riesgo, timeline, flujo)
  + assets/js/icons.js                     (22 iconos Lucide SVG inline)
  + assets/js/format.js                    (moneda, porcentaje, fechas, iniciales)
  + assets/js/data.js                      (fetch JSON con caché, getMes, getMeses)
  + assets/js/state.js                     (store pub/sub)
  + assets/js/router.js                    (hash router)
  + assets/js/compute.js                   (agregadores YTD, kpis, embudo, riesgo, flujo)
  + assets/js/charts.js                    (wrappers Chart.js: combo, donut, barH, barV, scatter)
  + assets/js/main.js                      (boot: carga data, monta shell, router)
  + assets/js/components/topbar.js
  + assets/js/components/sidebar.js
  + assets/js/components/month-selector.js
  + assets/js/components/search.js
  + assets/js/components/kpi-card.js      (count-up + sparkline)
  + assets/js/components/data-table.js    (sortable, sticky header, row click)
  + assets/js/components/badge.js
  + assets/js/components/drawer.js        (slide-in, ESC, click fuera)
  + assets/js/views/overview.js           (KPIs, embudo, combo chart, donut, top performers, alertas, flujo)
  + assets/js/views/supervisores.js       (KPIs, tabla, heatmap, barras divergentes)
  + assets/js/views/cotizaciones.js       (filtros, tabla unificada, drawer detalle)
  + assets/js/views/compras.js            (KPIs, tabla, riesgo, pending proveedores)
  + assets/js/views/facturacion.js        (KPIs, embudo cobranza, tabla ops, aging, export CSV)
  + assets/js/views/oportunidades.js      (KPIs, pipeline stacked, tabla, scatter)
  ~ bitacora.md                            (actualizado)

Decisiones:
  - `supervisores_asignados` en `cotizaciones_con_oportunidad` es string, no array.
  - `cotizaciones_con_oportunidad_por_supervisor` usa `ingreso_total_presupuestado`.
  - Módulos ES2020 requieren servidor HTTP — no funciona con file://.

Pendiente: F4.5 (print), F5.x (QA completo en navegador).
Siguiente recomendado: correr `python -m http.server 8000` en la raíz de
`new_dashboard/` y verificar consola + navegación + KPIs en Enero 2026.

---
