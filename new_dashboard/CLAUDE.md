# RAYCY · Dashboard Ejecutivo — Especificación Maestra

> Este documento es la **fuente única de verdad** para construir el dashboard.
> Todo agente que trabaje en el proyecto debe leerlo completo antes de tocar
> código. No improvisar fuera de él.

---

## 1. Propósito del Producto

Construir un dashboard web ejecutivo para **Grupo Raycy** que permita al
director general entender, en un solo vistazo y luego en profundidad, el
estado del negocio mes a mes:

- Cuántas **cotizaciones** se enviaron, por quién y por cuánto.
- Cuáles cotizaciones ya tienen **compras asociadas** (es decir, ya arrancaron
  ejecución, aunque no estén facturadas todavía).
- Cuáles ya están **facturadas** al cliente (factura emitida, pago no
  necesariamente recibido).
- Cuáles ya están **pagadas / cobradas** (la información de cobro hoy es
  parcial, hay que mostrarla y dejar evidente lo que falta actualizar).
- Performance comparada de **supervisores**: cuánto venden vs cuánto gastan,
  margen real, ejecución de presupuesto, exposición a pérdida.
- Salud financiera del flujo: facturado, por cobrar, por pagar a proveedores,
  cotizaciones donde el gasto rebasó al precio.

El cliente final es el **director**. La presentación de la información debe
sentirse como herramienta de C-suite: limpia, jerárquica, decisiva.

Estética de referencia: **Salesforce** (densidad de KPIs, cards estructuradas)
+ **Apple** (tipografía, blancos, sutileza) + **Tesla** (monocromía con un
acento, alto contraste, minimalismo). Tema **claro** con azul como único
color de marca.

---

## 2. Restricciones Técnicas

- **Solo** HTML5 + CSS3 + JavaScript ES2020 vanilla. Servido como archivos
  estáticos.
- Permitido únicamente vía CDN:
  - **Chart.js v4.x** (gráficas)
  - **Google Fonts: Inter** (tipografía)
- Prohibido: cualquier framework (React, Vue, Svelte, Alpine, htmx),
  cualquier bundler (Vite, webpack, parcel), cualquier preprocesador (Sass,
  Less, PostCSS), TypeScript, npm/node modules, Tailwind, Bootstrap.
- Prohibido emojis en UI. Solo iconos SVG inline (Lucide v0.300+ paths,
  copiados como markup).
- El JSON `dashboard_data.json` no se modifica. Todo se calcula client-side.
- Compatibilidad: Chrome / Edge / Safari modernos (≤ 2 años). No IE.
- Idioma del UI: **español de México**.

---

## 3. Modelo de Datos

Archivo: `dashboard_data.json` (raíz `new_dashboard/`).

### 3.1 Estructura raíz

```jsonc
{
  "fecha_generacion": "ISO timestamp",
  "meses_disponibles": [
    { "key": "2026-01", "label": "Enero 2026", "mes": 1, "year": 2026 }
  ],
  "datos_por_mes": {
    "2026-01": { /* objeto de mes — ver 3.2 */ }
  }
}
```

### 3.2 Objeto de mes (`datos_por_mes[key]`)

Campos directos:

| Campo          | Tipo   | Descripción                                  |
| -------------- | ------ | -------------------------------------------- |
| `mes`          | int    | 1–12                                          |
| `year`         | int    | Año                                            |
| `mes_nombre`   | string | "Enero", "Febrero", ...                        |
| `periodo`      | string | "Enero 2026"                                   |
| `fecha_inicio` | string | "YYYY-MM-DD"                                   |
| `fecha_fin`    | string | "YYYY-MM-DD"                                   |

Y cuatro colecciones que componen el corazón del dashboard:

#### a) `cotizaciones_por_supervisor[]`
KPIs agregados de **cotizaciones del mes** por cada supervisor.

| Campo | Significado |
|---|---|
| `supervisor_id` / `supervisor_nombre` / `supervisor_email` | Identidad |
| `num_cotizaciones` | Cotizaciones enviadas en el mes |
| `venta_total` | Suma de `precio_total` de sus cotizaciones (MXN) |
| `venta_promedio` | Ticket promedio |
| `gasto_mes` | Suma de compras (gasto real) en el mes ligadas a sus cotizaciones |
| `num_compras_mes` | # de compras realizadas |
| `suma_mano_obra` | Mano de obra registrada |
| `margen_estimado` | Margen presupuestado (precio − costo cotizado) |
| `margen_real` | `venta_total − gasto_mes` |
| `porcentaje_margen` | % margen real sobre gasto |
| `porcentaje_ejecucion_presupuesto` | gasto / precio (alerta cuando >100) |
| `compras_facturadas` / `compras_pagadas` / `compras_concluidas` | Conteo |
| `total_materiales` / `total_mano_obra_tipo` | Desglose de gasto |
| `monto_pendiente_pagar_proveedores` | Saldo a proveedores |

#### b) `cotizaciones_con_gastos[]`
Detalle de **cada cotización del mes que tiene al menos una compra asociada**
(es decir, "ya empezaron").

| Campo | Significado |
|---|---|
| `cotizacion_id`, `numero_cotizacion`, `fecha_cotizacion`, `estado_cotizacion` | Identidad |
| `precio_total` | Lo que se cobra al cliente |
| `costo_cotizado` | Costo presupuestado |
| `num_compras_mes` / `total_compras_mes` | Compras y gasto real |
| `diferencia` | `precio_total − total_compras_mes` (margen contante) |
| `alguna_pagada` / `todas_pagadas` | Estado de pago a proveedores |
| `alguna_facturada` / `todas_facturadas` | Estado de factura de las compras |
| `alguna_concluida` / `todas_concluidas` | Estado de cierre |

> Nota crítica: estos `*_pagada` / `*_facturada` se refieren a las **compras
> de proveedores** ligadas a la cotización, no al cobro al cliente. Es la
> dimensión "qué tan limpia tenemos la operación con proveedores".

#### c) `cotizaciones_con_gastos_por_supervisor[]`
Roll-up del bloque (b) por supervisor.

| Campo | Significado |
|---|---|
| `num_cotizaciones_con_gastos` | Cotizaciones del supervisor que ya empezaron |
| `total_presupuestado` / `total_costo_cotizado` | Sumatorias |
| `total_gastado_mes` | Gasto real |
| `diferencia_presupuesto_vs_gasto` | Negativo = está perdiendo |
| `cotizaciones_totalmente_pagadas` / `cotizaciones_con_pagos_pendientes` | Conteo |
| `cotizaciones_totalmente_facturadas` | Conteo |
| `cotizaciones_concluidas` | Conteo |
| `monto_pendiente_pago` | A proveedores |

#### d) `cotizaciones_con_oportunidad[]` y `_por_supervisor[]`
Cotizaciones que avanzaron a **oportunidad** (ya hay codigo OP del cliente,
ya hay factura al cliente — esto sí es facturación a cliente).

Campos clave por cotización:

| Campo | Significado |
|---|---|
| `oportunidad_id`, `codigo_op`, `supervisores_asignados` | Identidad |
| `ingreso_presupuestado` / `costo_cotizado` / `margen_estimado` | Económico |
| `gasto_real_mes` / `num_compras_mes` | Ejecución |
| `margen_real` / `porcentaje_margen` | Resultado |
| `estado_facturacion` | "Facturado" / "Sin facturar" — al cliente |
| `estado_cobro` | "Cobrado" / "Pendiente Cobro" — del cliente (parcial) |
| `estado_conclusion` | "Concluido" / "En Proceso" |
| `estado_pago_compras` | "Todo pagado" / "Pendiente pago" / "Sin compras" |
| `estado_facturacion_compras` | Análogo |
| `estado_conclusion_compras` | Análogo |
| `monto_pendiente_pagar_proveedores` | Saldo |
| `analisis_flujo_efectivo` | Texto narrativo: "En proceso", "Pendiente cobro y pago", "Proveedores pagados, falta cliente", etc. |

Roll-up por supervisor agrega: `num_oportunidades`, `monto_facturado`,
`monto_pendiente_facturar`, `monto_cobrado`, `monto_por_cobrar`, etc.

> **Importante para el director**: la cadena de valor es
> `Cotización → Compra (operación) → Facturación al cliente → Cobro`.
> El campo "pagada/facturada" en `cotizaciones_con_gastos` se refiere al
> ciclo con proveedores. El campo `estado_facturacion` y `estado_cobro` en
> `cotizaciones_con_oportunidad` se refiere al ciclo con el cliente. Ambos
> deben mostrarse separados pero conectados.

---

## 4. Sistema de Diseño

### 4.1 Tokens de color (CSS custom properties)

```css
/* Neutral surface */
--bg-canvas:        #FFFFFF;
--bg-subtle:        #F7F8FA;
--bg-muted:         #F1F3F7;
--surface:          #FFFFFF;
--surface-hover:    #F9FAFC;
--border-subtle:    #EEF0F4;
--border:           #E1E5EC;
--border-strong:    #C9CFD9;

/* Text */
--text-primary:     #0A0A0B;
--text-secondary:   #4A5160;
--text-tertiary:    #8B92A1;
--text-on-blue:     #FFFFFF;

/* Brand blue scale */
--blue-50:          #EEF4FF;
--blue-100:         #D9E5FF;
--blue-200:         #B7CCFF;
--blue-300:         #88AAFF;
--blue-400:         #5483FF;
--blue-500:         #1E5EFF;   /* primary */
--blue-600:         #1448D6;
--blue-700:         #0B36A8;
--blue-800:         #07287D;
--blue-900:         #041A55;

/* Semantic (uso restringido — solo para alertas y estados) */
--success-bg:       #E8F7F0;
--success-fg:       #0E8A5F;
--warning-bg:       #FFF4E0;
--warning-fg:       #B36A00;
--danger-bg:        #FDECEC;
--danger-fg:        #C8281A;

/* Chart palette (use blues + neutrals; reserve semantic colors for status) */
--chart-1: var(--blue-500);
--chart-2: var(--blue-300);
--chart-3: #2B3140;   /* near-black */
--chart-4: #8B92A1;   /* gray */
--chart-5: var(--blue-700);
--chart-6: #B7CCFF;
```

**Reglas de uso:**
- Fondo dominante = blanco. Cards y zonas elevadas = blanco con sombra
  sutil. Zonas separadoras = `--bg-subtle`.
- El azul `--blue-500` se usa **con moderación**: KPI principal del momento,
  CTA único por vista, links activos, primer dataset de cada gráfica.
- Verde, amarillo y rojo se usan **únicamente** para indicadores de estado
  (badges de "Pagado", "Pendiente", "Riesgo"). No decorar con ellos.
- Tema 100 % claro. No incluir dark mode en esta entrega.

### 4.2 Tipografía

- Familia: **Inter** (Google Fonts), pesos 400/500/600/700.
- Numerales con `font-variant-numeric: tabular-nums` en KPIs y tablas.
- Escala (px / line-height):

| Token | Tamaño | LH | Uso |
|-------|--------|-----|-----|
| `--fs-display` | 36 / 44 | weight 700 | KPI hero |
| `--fs-h1` | 28 / 36 | weight 700 | Título de vista |
| `--fs-h2` | 22 / 30 | weight 600 | Sección |
| `--fs-h3` | 17 / 24 | weight 600 | Card title |
| `--fs-body` | 14 / 20 | weight 400 | Texto base |
| `--fs-sm` | 13 / 18 | weight 500 | Tablas / badges |
| `--fs-xs` | 11 / 14 | weight 600 | Labels uppercase, letter-spacing 0.04em |

Letter-spacing: `-0.01em` en tamaños ≥ 22px para apretar visual.

### 4.3 Espaciado y radios

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;

--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-pill: 999px;
```

Padding interno estándar de card: `var(--space-6)`. Gap entre cards de la
misma fila: `var(--space-5)`. Margen entre secciones: `var(--space-10)`.

### 4.4 Sombras

```css
--shadow-1: 0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03);
--shadow-2: 0 1px 3px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.05);
--shadow-3: 0 8px 24px rgba(15,23,42,0.08);
--shadow-focus: 0 0 0 3px rgba(30,94,255,0.18);
```

Cards normales: `--shadow-1`. Hover: `--shadow-2`. Modales: `--shadow-3`.

### 4.5 Movimiento

- Easing universal: `cubic-bezier(0.22, 0.61, 0.36, 1)`.
- Duraciones: micro 120ms, default 220ms, larga 360ms, charts 600ms.
- Page enter: cards aparecen con `translateY(8px) → 0` y `opacity 0 → 1`,
  stagger de 40ms.
- KPIs: count-up animado 700ms al cambiar de mes.
- Hover en row de tabla: bg `--surface-hover` con transición 120ms.
- Sidebar item activo: barra azul a la izquierda con `transform: scaleY`
  desde 0.6 a 1, 220ms.
- Charts: animación de entrada 600ms; al filtrar, animación 400ms.

### 4.6 Iconografía

- Set: **Lucide** (https://lucide.dev), stroke 1.75, tamaño 18px en sidebar,
  16px en botones, 20px en cards.
- Inline SVG (no `<img>`, no font-icon). Crear un módulo
  `assets/js/icons.js` que exporte un `Icon(name, attrs)` que retorne SVG
  string. Iconos requeridos mínimo:
  `layout-dashboard`, `users`, `file-text`, `shopping-cart`, `receipt`,
  `target`, `chevron-down`, `chevron-right`, `arrow-up-right`,
  `arrow-down-right`, `circle-check`, `circle-alert`, `clock`, `search`,
  `filter`, `download`, `more-horizontal`, `x`, `sparkles`, `building-2`.

### 4.7 Componentes

**KPI Card (estándar)**
- Layout: label (xs uppercase tertiary) → valor (display) → delta y comparativo.
- Sparkline opcional al pie (40px alto).
- Borde sutil; hover eleva sombra.
- Variante "principal" del mes con borde superior 2px azul.

**Tabla de datos**
- Header sticky en scroll vertical.
- Filas 48px alto, separador `--border-subtle`.
- Hover row + clic abre detalle (drawer derecho).
- Columnas numéricas alineadas a la derecha y tabular-nums.
- Sortable por click en header. Indicador con flecha 10px.
- Paginación 25/50/100 o virtual scroll si hay >200 filas.

**Badges de estado**
| Estado | Estilo |
|--------|--------|
| Pagado / Concluido / Cobrado | `success-bg` + `success-fg`, dot 6px |
| Facturado | azul-50 + azul-700 |
| Pendiente | warning-bg + warning-fg |
| Riesgo / Sin factura / Sobregirado | danger-bg + danger-fg |
| Sin compras | neutro: `--bg-muted` + `--text-secondary` |

Badge: pill, padding 4px 10px, fs-xs, letter-spacing 0.02em.

**Selector de mes**
- Segmented control horizontal con todos los `meses_disponibles`.
- Mes seleccionado: azul-500 fondo, texto blanco.
- También opción "Total / YTD" agregada que combina todos los meses.

**Sidebar**
- Vertical, ancho colapsado 64px / expandido 232px.
- Brand "RAYCY" arriba, items en columna, separador, perfil al fondo.
- Solo cambia entre vistas. No anida menús.

**Search global**
- Input en topbar, ancho 360px, icono lupa, placeholder
  "Buscar cotización, supervisor, OP...".
- Filtra en tiempo real las tablas y KPIs visibles.

**Drawer de detalle**
- Slide-in desde la derecha, ancho 480px, sombra `--shadow-3`.
- Cierra con ESC, X arriba derecha o click fuera.

**Empty states**
- Icono 32px gris + texto secundario centrado + (si aplica) CTA.

### 4.8 Layout global

- Resolución base **1440×900**. Optimizar también 1920 ancho.
- Degrada limpio hasta 1280. Bajo 1024 muestra mensaje
  "Mejor experiencia en pantallas grandes" pero permanece usable.
- Topbar: 64px alto, sticky.
- Sidebar: 64px ancho colapsado por default, expandible a 232px con click.
- Contenido: max-width 1440px, padding lateral 32px, padding superior 24px.

### 4.9 Vista del director — propuesta jerárquica

Información a la altura del ojo (banner principal): "Estado del mes en 5
indicadores". Debajo: análisis profundo. Esto se debe sentir desde la primera
mirada.

---

## 5. Arquitectura del Front

### 5.1 Estructura de archivos

```
new_dashboard/
├── dashboard_data.json
├── index.html
├── prompt.txt
├── CLAUDE.md
├── bitacora.md
└── assets/
    ├── css/
    │   ├── variables.css        # tokens: colores, fuentes, espacios, sombras
    │   ├── base.css             # reset, html/body, tipografía base, scrollbars
    │   ├── layout.css           # topbar, sidebar, grid de contenido
    │   ├── components.css       # cards, kpi, tablas, badges, botones, drawer
    │   ├── charts.css           # estilos contenedores de gráficas, leyendas
    │   └── views.css            # ajustes específicos por vista
    ├── js/
    │   ├── main.js              # boot: carga data, monta router, primer render
    │   ├── data.js              # fetch JSON, expone DATA y helpers
    │   ├── compute.js           # agregadores: total YTD, ranking, comparativos
    │   ├── format.js            # currency MXN, %, K/M, fechas
    │   ├── state.js             # store pub/sub: { mes, vista, filtros }
    │   ├── router.js            # hash router → vistas
    │   ├── icons.js             # registro SVG inline
    │   ├── charts.js            # wrappers de Chart.js con presets de marca
    │   ├── components/
    │   │   ├── kpi-card.js
    │   │   ├── data-table.js
    │   │   ├── badge.js
    │   │   ├── month-selector.js
    │   │   ├── sidebar.js
    │   │   ├── topbar.js
    │   │   ├── drawer.js
    │   │   └── search.js
    │   └── views/
    │       ├── overview.js
    │       ├── supervisores.js
    │       ├── cotizaciones.js
    │       ├── compras.js
    │       ├── facturacion.js
    │       └── oportunidades.js
```

### 5.2 Patrón de componentes

Sin librería: cada componente es una función `crearXxx(opts) → HTMLElement`
que retorna un nodo y, si es necesario, expone `update(newProps)` y
`destroy()` mediante closure. Nada de innerHTML con strings concatenadas
salvo en helpers que sanitizan.

Convención: nombres en español del dominio (cotizaciones, supervisor),
identificadores técnicos en inglés (kpiCard, dataTable, render).

### 5.3 Estado y reactividad

`state.js` expone:

```js
export const state = createStore({
  mesKey: '2026-01',     // o 'YTD'
  vista: 'overview',
  filtros: { supervisorId: null, q: '', estado: null },
});
state.subscribe(fn);     // re-render
state.set({ mesKey: '2026-02' });
```

Cada vista se suscribe al store. Cambio de mes → todas las KPIs y gráficas
de la vista activa se actualizan con animación.

### 5.4 Cálculos derivados (compute.js)

Implementar y exportar al menos:

- `getMes(key)` → objeto mes; si key === 'YTD' agrega todos los meses.
- `kpisGlobalesMes(mes)` → `{ ventaTotal, gastoTotal, margenReal, pctMargen,
  numCotizaciones, numCotizacionesConGastos, numFacturadasCliente,
  numCobradas, pendientePagarProveedores, pendientePorCobrar }`.
- `serieMensual(metric)` → array `[{ mesKey, value }]` para line/bar charts.
- `rankingSupervisores(mes, by)` → array ordenado por métrica.
- `embudoOperativo(mes)` → counts y montos en cada etapa:
  Cotizadas → Con compras → Facturadas a cliente → Cobradas.
- `cotizacionesEnRiesgo(mes)` → cotizaciones donde `total_compras_mes >
  precio_total` (margen negativo).
- `pendientesPorEstado(mes)` → buckets por estado_facturacion / estado_cobro.
- `flujoEfectivo(mes)` → reparte cotizaciones por `analisis_flujo_efectivo`.
- `comparativoMesActualVsAnterior(metric)` → delta % y absoluto.

### 5.5 Carga de datos

`data.js` hace `fetch('./dashboard_data.json')`. Cachea en memoria. Falla
graceful con un toast: "No se pudo cargar dashboard_data.json. Verifica que
el dashboard esté servido por HTTP local (`python -m http.server 8000`)".

---

## 6. Vistas — Especificación Detallada

Hay **6 vistas** accesibles desde la sidebar, en este orden:

1. Resumen Ejecutivo
2. Supervisores
3. Cotizaciones
4. Compras y Gastos
5. Facturación y Cobranza
6. Oportunidades

Topbar visible en todas: brand `RAYCY` + selector de mes + buscador + perfil.

---

### 6.1 Vista 1 · Resumen Ejecutivo (`#/overview`)

**Objetivo:** que el director entienda el mes en 10 segundos y tenga la
puerta de entrada a profundizar.

**Layout (top → bottom):**

**(a) KPI Strip — 5 KPI hero**
Una fila de 5 KPI cards de altura uniforme (140px), valores `--fs-display`:

1. **Venta del mes** — `Σ precio_total` de `cotizaciones_por_supervisor`.
   Sparkline con la serie de los meses disponibles. Delta vs mes anterior.
2. **Gasto del mes** — `Σ gasto_mes`. Sparkline. Delta.
3. **Margen Real** — venta − gasto. Color azul. Mostrar también `% margen`.
4. **Cotizaciones enviadas** — `Σ num_cotizaciones`. Subtítulo:
   "X con gastos · Y facturadas cliente".
5. **Pendiente cobrar** — `Σ monto_por_cobrar` de
   `cotizaciones_con_oportunidad_por_supervisor`. Subtítulo: "de N
   oportunidades".

**(b) Embudo operativo**
Card ancha (col-span-12). Funnel chart horizontal con 4 etapas:

- Cotizaciones enviadas
- Cotizaciones con compras (alguna compra registrada)
- Cotizaciones facturadas al cliente (`estado_facturacion === 'Facturado'`)
- Cotizaciones cobradas (`estado_cobro === 'Cobrado'`)

Cada barra muestra count y monto. Encima, etiqueta con tasa de conversión
respecto al paso previo. Construir con div bars + transitions, no Chart.js.

**(c) Doble columna**
- **Izquierda (8/12): "Venta vs Gasto · histórico"** — Bar+Line combo de
  Chart.js: barras = venta_total, línea = gasto_mes, área translúcida en la
  diferencia. Todos los meses disponibles en eje X.
- **Derecha (4/12): "Salud financiera"** — Donut con tres segmentos:
  Cobrado · Facturado pendiente cobro · Sin facturar. Centro: monto total
  pipeline. Lista a la derecha del donut con leyendas y montos.

**(d) Top performers**
Dos cards 6/12:
- "Top supervisores por venta" (mes seleccionado): tabla compacta 5 filas
  con avatar/iniciales, nombre, venta_total, barra horizontal proporcional.
- "Top supervisores por margen real": idéntico patrón.

**(e) Alertas**
Card "Cotizaciones en riesgo" (margen negativo). Lista de hasta 5,
ordenadas por monto perdido. Click → drawer con detalle.

**(f) Flujo de efectivo (narrativa)**
Card que parsea `analisis_flujo_efectivo` de `cotizaciones_con_oportunidad`
y agrupa por etiqueta. Muestra count y monto por bucket:
- "En proceso"
- "Pendiente cobro y pago"
- "Proveedores pagados, falta cliente"
- "Cobrado, pendiente pago a proveedores"
- (cualquier otra que aparezca)

---

### 6.2 Vista 2 · Supervisores (`#/supervisores`)

**Objetivo:** comparar performance de supervisores y entender quién está
generando valor vs quién está rebasando presupuesto.

**Layout:**

**(a) Resumen del equipo** — fila de 4 KPIs:
- # Supervisores activos en el mes (los que tienen ≥1 cotización).
- Venta promedio por supervisor.
- Mediana de % margen.
- Supervisores en rojo (% ejecución > 100 o margen real negativo).

**(b) Tabla matriz comparativa** — col-span-12:

Columnas:
| Supervisor | Cotizaciones | Venta | Gasto | Margen real | % Margen | % Ejec. ppto | Compras pagadas | Compras facturadas | Pendiente prov. |

- Click en fila → expande sección debajo con vista detalle del supervisor:
  - Mini KPIs propios.
  - Lista de **sus** cotizaciones del mes (de `cotizaciones_con_gastos`
    filtrando por nombre del supervisor cuando aplique — para esto cruzar
    con `cotizaciones_con_oportunidad` que sí tiene `supervisores_asignados`).
  - Bar chart comparando **venta vs gasto** por mes histórico.
  - Donut: distribución de sus cotizaciones por estado.
- Header de columna ordenable. Click sobre nombre abre drawer con perfil
  más extenso.

**(c) Heatmap supervisor × mes**
- Filas: supervisores. Columnas: meses_disponibles.
- Celda colorea por intensidad de venta (escala blue-50 → blue-700) y muestra
  monto en hover.
- Permite alternar métrica: Venta · Gasto · Margen · % Ejec.

**(d) Barras divergentes "Margen real por supervisor"**
- Eje cero al centro. Barras a la derecha (azul) o a la izquierda (rojo
  pálido) según signo del margen real del mes.
- Etiqueta a cada lado con monto.

---

### 6.3 Vista 3 · Cotizaciones (`#/cotizaciones`)

**Objetivo:** explorador granular de todas las cotizaciones del mes.

**Layout:**

**(a) Filtros tipo "command bar"** — barra horizontal:
- Buscador (número o descripción).
- Multi-select supervisores.
- Toggle estado: Todas · Con compras · Sin compras · Facturadas a cliente
  · Pendiente cobro · En riesgo (margen negativo) · Concluidas.
- Range slider de monto (precio_total).

**(b) Toggle de vista** — segmented control:
- **Tabla** (default).
- **Tarjetas** (grid de cards, una por cotización).
- **Kanban** por estado (columnas: Borrador → Con compras → Facturada cliente
  → Cobrada → Concluida).

**(c) Tabla detallada (default)**
Combina `cotizaciones_con_gastos` y `cotizaciones_con_oportunidad` (left
join por `cotizacion_id`). Columnas:

| # Cot. | Fecha | Supervisor(es) | Precio | Gastado | Diferencia | Margen % | Pago prov. | Factura prov. | Factura cliente | Cobro cliente | Conclusión |

Badges de estado en las últimas 5 columnas. Diferencia con color (azul si
positiva, rojo si negativa). Click fila → drawer.

**(d) Drawer de detalle de cotización**
- Header: número de cotización + estado conclusión.
- Bloque económico: precio, costo cotizado, gastado, margen estimado,
  margen real, % ejecución.
- Bloque operación con proveedores: pagado, facturado, conclusión.
- Bloque cliente: factura, código OP, cobro, monto pendiente cobrar.
- Línea de tiempo vertical con los hitos.
- `analisis_flujo_efectivo` resaltado como cita.

---

### 6.4 Vista 4 · Compras y Gastos (`#/compras`)

**Objetivo:** seguimiento del gasto operativo y exposición a proveedores.

**Layout:**

**(a) KPI strip — 4 KPIs:**
- Total gastado en el mes.
- # Compras en el mes (`Σ num_compras_mes` de supervisores).
- Pendiente pagar a proveedores.
- Total cotizaciones en riesgo (gasto > venta).

**(b) Línea de tiempo — gasto diario**
Bar chart con suma de `total_compras_mes` por `fecha_cotizacion` (proxy de
fecha de compra). Eje X: días del mes. Tooltip con cotizaciones del día.

**(c) Tabla "Cotizaciones con gastos"**
De `cotizaciones_con_gastos`, todas las del mes. Columnas:
| # Cot. | Fecha | Precio | # Compras | Total compras | Diferencia |
| Pago proveedores (col compuesta: dot + texto) | Factura proveedores | Conclusión |

Filtrable. Default: ordenado por monto gastado desc.

**(d) Card "Cotizaciones donde el gasto rebasó al precio"**
Lista de cotizaciones con `diferencia < 0`. Cada item:
- Numero de cotización.
- Precio vs gastado en barra horizontal con etiquetas.
- Pérdida en MXN destacada.

**(e) Card "Pendiente pagar a proveedores por supervisor"**
Bar chart horizontal con `monto_pendiente_pagar_proveedores`. Barras
ordenadas desc.

---

### 6.5 Vista 5 · Facturación y Cobranza (`#/facturacion`)

**Objetivo:** visibilidad del ciclo de cobro al cliente.

**Layout:**

**(a) KPI strip — 4 KPIs:**
- Monto facturado al cliente (`Σ monto_facturado` por supervisor en
  `cotizaciones_con_oportunidad_por_supervisor`).
- Monto por cobrar.
- Cobertura: `% facturado / total presupuestado`.
- Días promedio entre cotización y facturación (si se puede inferir).

**(b) Embudo de cobranza**
Stacked horizontal bar:
- Total presupuestado del mes.
- Facturado.
- Cobrado.
Cada segmento etiquetado con monto y %.

**(c) Tabla "Oportunidades del mes"**
De `cotizaciones_con_oportunidad`. Columnas:
| Cot. | Código OP | Supervisor | Ingreso ppto. | Costo cotizado | Gastado | Margen real | Estado factura | Estado cobro | Análisis flujo |

Color de fila pálido si flujo es "Pendiente cobro y pago". Click → drawer.

**(d) Card "Aging" (envejecimiento de pendiente cobro)**
Buckets: 0-15 días · 16-30 · 31-60 · 60+ (calculado contra hoy = fecha de
generación del JSON). Bar chart vertical.

**(e) Card "Estado de la información"**
Mensaje al director: "Información de cobro pendiente de actualizar". Lista
oportunidades con `estado_cobro === 'Pendiente Cobro'` antiguas. Permite
exportar CSV (botón con ícono download, generación local con
`Blob` + `URL.createObjectURL`).

---

### 6.6 Vista 6 · Oportunidades (`#/oportunidades`)

**Objetivo:** pipeline de oportunidades por supervisor y eficiencia de cierre.

**Layout:**

**(a) KPI strip — 4 KPIs:**
- # Oportunidades del mes.
- Ingreso total presupuestado.
- Margen estimado total.
- # Concluidas.

**(b) Pipeline por supervisor**
Stacked bar horizontal: cada supervisor una fila, segmentos = etapas
(Sin facturar / Facturado pendiente cobro / Cobrado / Concluido). Mostrar
montos.

**(c) Tabla por supervisor**
De `cotizaciones_con_oportunidad_por_supervisor`. Columnas:
| Supervisor | # Oportunidades | Ingreso ppto. | Margen estimado | Margen real | % Margen | Facturado | Por cobrar | Concluidas |

**(d) Scatter plot "Ingreso vs Margen real"**
- Eje X: ingreso presupuestado (log si rango grande).
- Eje Y: margen real.
- Burbuja: tamaño proporcional a `num_compras_mes`, color por supervisor.
- Cuadrante "alto ingreso bajo margen" sombreado en danger-bg.

---

## 7. Performance y Calidad

- Bundle CSS combinado debe pesar < 60 KB. JS sin Chart.js < 80 KB.
- Carga inicial del JSON < 250ms en local; primer pintado < 800ms.
- Todas las animaciones a 60fps. Usar `transform` y `opacity`, no top/left.
- Accesibilidad mínima: contraste AA, foco visible, labels en inputs,
  navegación por teclado en sidebar y selector de mes.
- No errores en consola.

---

## 8. Plan de Trabajo por Fases

> Cada fase está pensada para que un agente la pueda tomar y completar en
> una sola sesión. La "TABLA DE PROGRESO" en bitacora.md mantiene el estado.

### Fase 0 — Andamiaje
- F0.1 Crear estructura de carpetas (`assets/css`, `assets/js`,
  `assets/js/components`, `assets/js/views`).
- F0.2 Crear `index.html` con scaffolding mínimo (head, fonts, links a CSS,
  scripts en orden, contenedor `#app`).
- F0.3 Crear `variables.css` con todos los tokens del §4.
- F0.4 Crear `base.css` (reset, body, scrollbars, focus rings).
- F0.5 Crear `icons.js` con al menos los 20 iconos listados en §4.6.
- F0.6 Crear `format.js` (currency MXN, percent, abreviado K/M, fecha
  corta, fecha larga).
- F0.7 Crear `data.js` con fetch + caché + `getMeses()` / `getMes(key)`.

### Fase 1 — Estado y shell
- F1.1 Crear `state.js` (store pub/sub).
- F1.2 Crear `router.js` (hash-based, registra vistas).
- F1.3 Crear `topbar.js` (brand + selector de mes + search + avatar).
- F1.4 Crear `sidebar.js` (vertical, expandible, items con iconos).
- F1.5 Crear `month-selector.js` (segmented control + opción YTD).
- F1.6 Crear `layout.css` que coloque topbar + sidebar + content.
- F1.7 Boot en `main.js`: cargar data, montar shell, render vista default.

### Fase 2 — Componentes base
- F2.1 `kpi-card.js` con sparkline opcional + count-up.
- F2.2 `data-table.js` (sortable, sticky header, hover, click row).
- F2.3 `badge.js` con variantes de estado.
- F2.4 `drawer.js` (slide-in derecha, ESC, click fuera, focus trap).
- F2.5 `search.js` global con debounce 150ms.
- F2.6 Wrappers en `charts.js` (line, bar, combo, donut, funnel, heatmap,
  scatter) con presets de marca.
- F2.7 Estilos en `components.css` y `charts.css`.

### Fase 3 — Vistas
- F3.1 `compute.js` con todas las funciones del §5.4.
- F3.2 Vista Resumen Ejecutivo (`overview.js`) — sección por sección.
- F3.3 Vista Supervisores (`supervisores.js`).
- F3.4 Vista Cotizaciones (`cotizaciones.js`).
- F3.5 Vista Compras y Gastos (`compras.js`).
- F3.6 Vista Facturación y Cobranza (`facturacion.js`).
- F3.7 Vista Oportunidades (`oportunidades.js`).

### Fase 4 — Polish
- F4.1 Animaciones de entrada de cards (stagger).
- F4.2 Count-up de KPIs en cambio de mes.
- F4.3 Estados vacíos en todas las tablas.
- F4.4 Hover y micro-interacciones en sidebar y tablas.
- F4.5 Print stylesheet básico (orientación horizontal).
- F4.6 Mensaje de pantalla pequeña (<1024).

### Fase 5 — QA
- F5.1 Validar cada KPI con un cálculo manual contra el JSON (al menos un
  mes completo).
- F5.2 Verificar que cambiar de mes recalcula 100% de la vista activa.
- F5.3 Revisar consola: 0 errores, 0 warnings de Chart.js.
- F5.4 Probar en 1280, 1440, 1920.
- F5.5 Revisar accesibilidad básica (tab navigation, focus visible).
- F5.6 Documentar en bitacora.md cómo ejecutar y limitaciones conocidas.

---

## 9. Convenciones de Código

- 2 espacios de indentación.
- Strings con comillas simples, JSX-style nope (no JSX).
- Funciones puras donde se pueda. Side effects en `main.js`, vistas y
  componentes que tocan DOM.
- Naming: variables `camelCase`, constantes globales `UPPER_SNAKE`,
  archivos `kebab-case`.
- Comentarios solo cuando expliquen el "por qué". No describir lo obvio.
- En CSS, BEM ligero: `.kpi-card`, `.kpi-card__label`, `.kpi-card--hero`.
- IDs solo para anclajes únicos del shell (`#app`, `#sidebar`).

---

## 10. Diccionario de Términos (para coherencia del UI)

| Término | Forma canónica en UI |
|---------|----------------------|
| Cotización | "Cotización" / plural "Cotizaciones" |
| Supervisor | "Supervisor" / "Supervisora" según corresponda; usar nombre tal cual viene en el JSON |
| Compra | "Compra" — gasto con proveedor |
| Factura cliente | "Factura al cliente" |
| Pago a proveedor | "Pago a proveedor" |
| Margen real | "Margen real" — venta menos gasto |
| Margen estimado | "Margen estimado" — del presupuesto |
| Oportunidad | "Oportunidad" — cotización con código OP del cliente |
| YTD | "Acumulado" |
| MXN | siempre con `$` y separador miles, sin decimales si > 10,000; con 2 decimales si menor |

---

## 11. Cómo correr el dashboard

Servidor estático local (Windows):

```powershell
cd "C:\Users\mario\Raycy Dashboard\new_dashboard"
python -m http.server 8000
```

Luego abrir `http://localhost:8000/`.

(Si se abre por `file://` directo, el `fetch` del JSON falla por CORS.)

---

## 12. No hacer (recordatorio final)

- No frameworks, no bundlers, no preprocesadores.
- No emojis, no íconos de fuente, no PNG cuando hay SVG.
- No mezclar idiomas en el UI.
- No colores fuera de paleta.
- No modificar `dashboard_data.json`.
- No agregar vistas o KPIs no especificados sin actualizar este documento.

---

Fin del CLAUDE.md.
