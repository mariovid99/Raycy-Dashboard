# RAYCY · Dashboard de Compras — Plan de trabajo para agentes

> Trabajo paralelo. Dos agentes corriendo a la vez:
> - **Agente A — Backend (Python + SQL)**
> - **Agente B — Frontend (HTML/CSS/JS vanilla)**
>
> Antes de tocar código, **ambos** agentes deben:
> 1. Leer `MODELOS.md` (contexto de modelos del negocio).
> 2. Leer `ESPECIFICACION_JSON.md` (contrato del JSON; es la frontera entre
>    los dos).
> 3. Leer la sección que les corresponde de este documento.
>
> Si A y B necesitan cambiar la forma del JSON, el cambio se hace
> primero en `ESPECIFICACION_JSON.md` y se notifica al otro agente. Si no
> se actualiza el contrato, el cambio no es válido.

---

## 0. Convenciones comunes a los dos agentes

- **Idioma del UI / mensajes**: español de México.
- **Moneda**: MXN, formato `$` con separador de miles, sin decimales si
  el monto es ≥ 10,000; con dos decimales si es menor.
- **Sin emojis** en el código ni en el UI. Iconos SVG inline (Lucide
  paths). En logs de Python sí están permitidos los símbolos ✅ ❌ 🔄
  porque imitan el script `generar_dashboard_json.py` existente.
- **Sin frameworks** en el frontend (ver §5 más abajo).
- **Sin emojis** en commits ni en archivos `.md` que los agentes generen.
- Indentación de 2 espacios en JS/HTML/CSS, 4 espacios en Python.
- Encoding UTF-8.

---

## AGENTE A · Backend — `generar_dashboard_compras_json.py`

### Archivo a producir
- `new_dashboard/generar_dashboard_compras_json.py`

### Archivo a consumir / leer
- `MODELOS.md` (contexto de la base de datos).
- `ESPECIFICACION_JSON.md` (forma exacta del JSON de salida).
- `new_dashboard/../azure_postgres_connection.py` para obtener la
  conexión (`get_connection()`).
- `new_dashboard/../generar_dashboard_json.py` como **referencia
  estructural únicamente** (clase `DecimalEncoder`, función
  `ejecutar_query`, helper `get_fecha_rango`, manejo de `MESES_NOMBRES`).
  No se reusa el script tal cual; se construye uno nuevo enfocado en
  compras.

### Salida
- `new_dashboard/dashboard_compras/dashboard_compras_data.json`
- Forma exacta definida en `ESPECIFICACION_JSON.md`.
- Validaciones obligatorias (§11 de ese mismo archivo) antes de escribir.

### Tareas concretas

**A.1 — Setup**
- Importar psycopg2, json, decimal, datetime, calendar, sys.
- Reusar `DecimalEncoder` y patrón `ejecutar_query(query, descripcion)` del
  script existente.
- Definir constante `MESES_A_PROCESAR = [(2026,1),(2026,2),(2026,3),(2026,4)]`.
- Definir helpers: `get_fecha_rango(year, month)`,
  `get_fecha_rango_acumulado()` (devuelve `2026-01-01` y `2026-05-01`
  como exclusivo, `2026-04-30` como display).

**A.2 — Queries base por rango (`fecha_inicio` exclusivo, `fecha_fin`
exclusivo)**

Cada query DEBE filtrar `eliminado=FALSE` en TODAS las tablas
involucradas. Cada query recibe `fecha_inicio` y `fecha_fin` y trabaja
sobre `core_compra.fecha_compra >= fecha_inicio AND fecha_compra < fecha_fin`.

Implementar las siguientes funciones:

1. `kpis_compras(fecha_inicio, fecha_fin) -> dict` — devuelve el objeto §4
   de la especificación. Una sola query con CASE/SUM.

2. `oportunidades_con_compras(fecha_inicio, fecha_fin) -> list[dict]` —
   1 query JOIN entre `core_oportunidad` ↔
   `core_oportunidad_cotizaciones` ↔ `core_cotizacion` ↔ `core_compra`,
   filtrando OPs cuyas cotizaciones tengan compras en el rango. Después
   en Python se reagrupan en la estructura anidada de §5
   (oportunidad → cotizaciones → compras_mes). Acompañar con queries
   auxiliares para `supervisores` (M2M) y `cliente.nombre`.

3. `cotizaciones_con_compras_sin_op(fecha_inicio, fecha_fin) -> list[dict]` —
   cotizaciones con compras del mes que NO existen en
   `core_oportunidad_cotizaciones` (LEFT JOIN ... WHERE oc.cotizacion_id
   IS NULL, considerando o.eliminado=FALSE).

4. `compras_proyecto_pendientes_asignar(fecha_inicio, fecha_fin) -> list[dict]` —
   `tipo_compra='proyecto' AND cotizacion_id IS NULL`.

5. `gastos_internos_por_nomenclatura(fecha_inicio, fecha_fin) -> list[dict]` —
   GROUP BY nomenclatura + lista anidada de compras.

6. `supervisores_actividad(fecha_inicio, fecha_fin, datos_globales_mes) -> list[dict]` —
   determina el universo de supervisores con actividad y filtra los
   bloques globales para cada uno.

> **Recomendación de implementación**: para evitar 6 queries × 5 períodos =
> 30 queries pesadas, traer los datos crudos de `core_compra` con todos
> los joins **una vez por período** y luego agrupar/calcular en Python con
> diccionarios. Esto simplifica las validaciones cruzadas también.

**A.3 — Construcción del objeto MES**

Función `generar_datos_periodo(fecha_inicio, fecha_fin, label, mes, year) -> dict`
que orquesta las funciones anteriores y arma el objeto MES completo (§3
de la especificación).

**A.4 — Acumulado**

Llamar a `generar_datos_periodo('2026-01-01', '2026-05-01',
'Acumulado 2026', None, 2026)` con la misma lógica. **No se reaprovechan**
los KPIs sumando los meses (puede haber duplicados en cotizaciones que
aparecen en varios meses). Se vuelve a correr la lógica sobre el rango
agregado.

**A.5 — Validaciones (§11 de la especificación)**

Implementar `validar(datos)` que aborte el proceso si alguna falla.

**A.6 — Escritura del archivo**

```python
out_path = os.path.join(os.path.dirname(__file__),
                        'dashboard_compras',
                        'dashboard_compras_data.json')
```

Usar `json.dump(datos, f, cls=DecimalEncoder, ensure_ascii=False, indent=2)`.

**A.7 — Resumen en consola**

Imprimir resumen por período como en §11.

### Definition of done para Agente A
- Script corre sin errores: `python generar_dashboard_compras_json.py`.
- Archivo `dashboard_compras_data.json` queda escrito.
- Las 7 validaciones de §11 pasan.
- El JSON valida contra la forma de §3–§10 de `ESPECIFICACION_JSON.md`.
- Comentarios sólo donde el "por qué" no sea evidente.

---

## AGENTE B · Frontend — Dashboard

### Carpeta de trabajo
`new_dashboard/dashboard_compras/`

> Es un dashboard **nuevo**. No se reusan archivos del dashboard de
> `new_dashboard/`. Se puede mirar el original como referencia visual,
> pero los archivos se crean nuevos en esta carpeta.

### Archivos a leer (sólo de referencia)
- `MODELOS.md` para entender qué representan los datos.
- `ESPECIFICACION_JSON.md` para saber qué campos pedir.
- `new_dashboard/CLAUDE.md` § 4 (Sistema de Diseño) — **se reusa el sistema
  de diseño**: tokens de color, tipografía Inter, espacios, sombras,
  iconos Lucide. Misma identidad visual.
- `new_dashboard/index.html` y `assets/` como ejemplo de cómo se ve la
  marca en el dashboard original.

### Archivos a producir

```
new_dashboard/dashboard_compras/
├── index.html
├── dashboard_compras_data.json    (lo escribe Agente A)
├── assets/
│   ├── css/
│   │   ├── variables.css     (mismos tokens del CLAUDE.md §4)
│   │   ├── base.css          (reset + tipografía base)
│   │   ├── layout.css        (topbar + content; este dashboard NO usa sidebar — sólo dos vistas, se cambian con tabs)
│   │   ├── components.css    (cards, KPIs, tablas, badges, drawer, tabs)
│   │   └── views.css         (ajustes específicos)
│   └── js/
│       ├── main.js           (boot + carga de JSON + render inicial)
│       ├── data.js           (fetch + caché)
│       ├── format.js         (currency MXN, %, fecha)
│       ├── state.js          (store: { mesKey, vista })
│       ├── icons.js          (SVG inline Lucide; al menos: filter, search, download, chevron-down, chevron-right, x, building-2, package, hammer, wallet, receipt, more-horizontal, alert-triangle)
│       ├── components/
│       │   ├── kpi-card.js
│       │   ├── month-selector.js   (segmented control con los 4 meses + "Acumulado")
│       │   ├── view-tabs.js        (segmented control para alternar las 2 vistas)
│       │   ├── data-table.js       (sortable, sticky header)
│       │   ├── badge.js
│       │   ├── drawer.js           (slide-in derecha, ESC, click fuera)
│       │   └── search.js           (filtro de texto en cards/tablas)
│       └── views/
│           ├── compras-general.js
│           └── compras-supervisor.js
```

### Estructura del UI

**Topbar (sticky)**
```
[ RAYCY · Compras ]   [ Mes: Ene · Feb · Mar · Abr · Acumulado ]   [ Vista: General · Por Supervisor ]   [ buscar... ]
```

Sin sidebar. El cambio entre vista General y Por Supervisor se hace con
tabs en la topbar (segmented control).

#### Vista 1 — Compras (General)  · `view = 'general'`

Contenido vertical:

1. **KPI strip — 5 KPIs** (alto uniforme, label uppercase, valor display):
   - Total compras del mes
   - Compras de proyecto · materiales
   - Compras de proyecto · mano de obra
   - Gastos internos
   - Pendiente pagar a proveedores

   Cada KPI con sub-texto: "X compras" o "% del total" según corresponda.

2. **Sección "Oportunidades del mes"**
   - Header: título "Oportunidades del mes" + contador "(N)".
   - Lista de cards de Oportunidad. Cada card:
     - Header: `codigo_op` + categoría · cliente · supervisores (chips).
     - Fila económica: Venta · Gasto · Diferencia · % avance gasto (barra
       de progreso; rojo si > 100%).
     - Badges de estatus: Facturado / Pagado / Concluido (color según
       §4.7 del CLAUDE.md).
     - Botón "Ver detalle" (o card entera clickeable) → abre **drawer**
       con desglose:
       - Tabla de cotizaciones (numero · precio · gasto · diferencia).
       - Por cada cotización, lista de compras: fecha · concepto ·
         tipo (material/mano obra) · proveedor · monto · estados.
       - Totales abajo.

3. **Sección "Cotizaciones con compras (sin OP)"**
   - Misma plantilla de cards que las OPs, pero sin código OP.
   - Aviso visual sutil (badge): "Sin OP asignada".
   - Drawer al click con desglose de compras de la cotización.

4. **Sección "Gastos internos por nomenclatura"**
   - Grid de cards de nomenclatura: `clave` · descripción ·
     `num_compras` · `monto_total`. Ordenado por monto desc.
   - Click → drawer con tabla de las compras del mes ligadas a esa
     nomenclatura (fecha · concepto · proveedor · supervisor responsable
     · monto · estados).

5. **Sección "Compras de proyecto sin asignar"** (sólo si existe alguna)
   - Tabla simple con esas compras. Header con explicación corta.

#### Vista 2 — Por Supervisor  · `view = 'por-supervisor'`

1. **Selector de supervisor** (sub-tabs o dropdown según número):
   - Si hay ≤ 6 supervisores con actividad → segmented control horizontal.
   - Si hay > 6 → dropdown con buscador.

2. Una vez elegido un supervisor, render:
   - **KPI strip propio del supervisor** (mismo layout que vista 1, pero
     filtrado a sus números).
   - **Sus oportunidades** (mismas cards que vista 1).
   - **Sus cotizaciones con compras sin OP** (mismas cards).
   - **Sus gastos internos** (los que él autorizó como
     `supervisor_responsable_compra`).

3. Vacíos elegantes ("Este supervisor no tiene gastos internos en el mes").

> El propósito declarado por el usuario es: "yo sentarme con un supervisor
> y mostrarle todos sus gastos, proyectos cotizaciones activas
> oportunidades y que sepa el gasto que tiene de cada Oportunidad o
> cotización". Diseñar pensando en esa conversación 1:1.

### Comportamientos compartidos

- Cambiar el mes recalcula y re-renderiza todo. Animación count-up para
  KPIs (200–700ms).
- Drawer cierra con ESC, X, o click en el backdrop.
- Buscador en topbar filtra por número de cotización, código OP, cliente,
  proveedor o concepto en tablas/cards visibles.
- Si la URL tiene hash `#supervisor=<id>` o `#mes=<key>`, restaurar
  estado al cargar.

### Estados del store

```js
state = {
  mesKey: '2026-01',          // o 'acumulado'
  vista:  'general',          // o 'por-supervisor'
  supervisorId: null,         // sólo en vista por-supervisor
  filtroTexto: '',            // del buscador global
}
```

### Tareas concretas

**B.1** — Crear `index.html` con scaffolding (head con Inter + Chart.js
sólo si se usa para alguna gráfica, links a CSS, scripts en orden,
contenedor `#app`).

**B.2** — Stylesheets: copiar tokens del `CLAUDE.md` §4 a
`assets/css/variables.css`. Implementar `base.css`, `layout.css`,
`components.css`, `views.css`.

**B.3** — `data.js` con `loadData()` que hace `fetch('./dashboard_compras_data.json')`.

**B.4** — `state.js` con `createStore()` (subscribe / set / get).

**B.5** — Componentes en orden: `format.js`, `icons.js`, `badge.js`,
`kpi-card.js`, `month-selector.js`, `view-tabs.js`, `drawer.js`,
`data-table.js`, `search.js`.

**B.6** — Vista `compras-general.js`. Renderiza secciones 1–5 descritas
arriba.

**B.7** — Vista `compras-supervisor.js`. Renderiza el flujo de selección
y bloques del supervisor.

**B.8** — `main.js`: boot, monta topbar, monta contenedor de vista, se
suscribe al store y renderiza la vista correspondiente.

**B.9** — Mientras Agente A no haya generado `dashboard_compras_data.json`,
trabajar contra un **mock** mínimo creado por el Agente B en
`dashboard_compras/dashboard_compras_data.SAMPLE.json` con un objeto MES
y un objeto `acumulado` poblado con 1 OP, 1 cotización suelta, 2
nomenclaturas, 2 supervisores. Forma 100% conforme a
`ESPECIFICACION_JSON.md`. Esto desbloquea el desarrollo en paralelo.

### Definition of done para Agente B
- Cambiar de mes (incluido "Acumulado") actualiza todo, sin recargar la
  página.
- Cambiar entre vistas (General / Por Supervisor) funciona sin perder el
  mes seleccionado.
- Las OPs y cotizaciones nunca se duplican entre la sección "Oportunidades"
  y "Cotizaciones con compras sin OP".
- Click en cualquier card o fila abre el drawer con el desglose de
  compras correspondiente.
- Buscador filtra resultados visibles en tiempo real.
- 0 errores en consola, 0 warnings.
- Probado en Chrome y Edge a 1440 y 1920 de ancho.
- Servido por `python -m http.server 8000` desde
  `new_dashboard/dashboard_compras/`.

---

## Coordinación entre A y B

- **Punto único de sincronización**: `ESPECIFICACION_JSON.md`.
- A entrega el JSON real → B reemplaza el SAMPLE con el real y verifica
  que todo se vea bien.
- Si B encuentra que la espec quedó corta para algo (por ejemplo necesita
  un `cliente` que no estaba en la espec), abre el `ESPECIFICACION_JSON.md`,
  lo edita explícitamente con el cambio y lo notifica en el commit /
  PR / mensaje de hand-off para que A actualice el script.

## Ejecución (orden sugerido para correr ambos agentes en paralelo)

1. Lanzar al mismo tiempo:
   - Agente A: "Lee `prompt.txt` y haz tus tareas marcadas como AGENTE A."
   - Agente B: "Lee `prompt.txt` y haz tus tareas marcadas como AGENTE B."
2. Cada uno lee `prompt.txt`, que les dirige a leer `MODELOS.md` y
   `ESPECIFICACION_JSON.md` antes que cualquier otra cosa.
3. Cuando A termina, el JSON real reemplaza al SAMPLE en
   `dashboard_compras/`.
4. B prueba con el JSON real; si algo no cuadra, abre la espec, la actualiza
   y deja una nota para A.
