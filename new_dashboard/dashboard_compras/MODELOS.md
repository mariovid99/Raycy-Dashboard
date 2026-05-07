# RAYCY · Contexto de Modelos para Dashboard de Compras

> Este documento describe **únicamente** los modelos Django (`new_dashboard/models.py`)
> y las relaciones que necesitas entender para construir el dashboard de
> compras. NO listamos campos cosméticos: solo los que se usan para alimentar
> la base de datos del dashboard. La fuente de verdad es `models.py`; este
> archivo lo resume y lo aterriza al dominio del negocio.

---

## 1. Vocabulario del negocio (léelo antes que cualquier otra cosa)

- **Compra**: cualquier salida de dinero. Se divide en dos:
  - **Compra de proyecto** (`tipo_compra = 'proyecto'`): gasto ligado a una
    cotización (y por extensión a una oportunidad si la cotización está
    asignada). Tiene además una sub-categoría: **material** o **mano de obra**.
  - **Gasto interno** (`tipo_compra = 'interno'`): gasto operativo de la
    empresa, NO ligado a ningún proyecto. Ej: muebles, activo fijo,
    mantenimiento de oficina. Está clasificado por una **Nomenclatura**
    (clave corta interna del negocio).
- **Cotización**: propuesta enviada al cliente. **No es venta todavía**. Una
  cotización puede no convertirse en nada. Pero si una cotización ya tiene
  **al menos una compra de proyecto** asignada, eso es una alerta de que la
  ejecución empezó y debería convertirse pronto en Oportunidad.
- **Oportunidad (OP)**: cotización(es) ya con orden de compra del cliente
  por contrato. **Aquí sí cuenta como ingreso esperado**. La oportunidad
  tiene su propio ciclo: facturado / pagado / concluido (esto es el ciclo
  con el cliente).
- **Cadena de valor (importante para el director)**:
  ```
  Cotización enviada
        │
        ├──► (Si tiene compras pero NO oportunidad) → "Cotización con compras, sin OP"
        │      Riesgo: ya se está gastando sin contrato firme.
        │
        └──► Asignada a Oportunidad
                 │
                 ├── Oportunidad facturada (existe factura al cliente)
                 │       │
                 │       └── Oportunidad pagada (ingreso real cobrado)
                 │
                 └── Oportunidad concluida (proyecto cerrado)
  ```
- **Estado de una compra (no confundir con el de la oportunidad)**:
  - `facturado`: existe factura del proveedor.
  - `pagado`: ya se le pagó al proveedor.
  - `concluido`: ya se recibió lo comprado.

---

## 2. Modelos relevantes

Tabla del CRUD vía Django, en Postgres (Azure). Los nombres de tabla siguen la
convención `core_<modelo>` (ej. `core_compra`, `core_cotizacion`,
`core_oportunidad`). Los M2M se llaman `core_oportunidad_cotizaciones`,
`core_cotizacion_supervisores`, `core_oportunidad_supervisores`.

Todos los modelos tienen **soft delete**: campo `eliminado BOOLEAN`. **Filtra
SIEMPRE `eliminado = FALSE`** en cada query.

### 2.1 `Compra` (tabla `core_compra`)

Es el corazón del dashboard. Todos los KPIs se construyen sobre este modelo.

| Campo | Tipo | Para qué lo usamos |
|---|---|---|
| `id` | int | identidad |
| `tipo_compra` | `'proyecto' \| 'interno'` | separa los dos universos de compra |
| `tipo_compra_proyecto` | `'material' \| 'mano_obra' \| null` | sólo aplica si `tipo_compra='proyecto'` |
| `cotizacion_id` | FK → Cotizacion | sólo en compras de proyecto. Es el "proyecto" al que pertenece el gasto |
| `oportunidad_id` | FK → Oportunidad | redundante con la cotización (si la cotización está en una OP, debería estar aquí también). **Para el dashboard, la fuente confiable es `cotizacion_id`** y de ahí derivar la oportunidad vía `core_oportunidad_cotizaciones`. Usar `oportunidad_id` directo sólo como verificación. |
| `nomenclatura_id` | FK → Nomenclatura | obligatorio en gastos internos, prohibido en compras de proyecto |
| `proveedor_id` | FK → Proveedor | siempre presente |
| `metodo_pago_id` | FK → TarjetaPago | tipo de método y alias del medio de pago |
| `supervisor_id` | FK → Supervisor | el supervisor *del proyecto* — se hereda de la cotización seleccionada |
| `supervisor_responsable_compra_id` | FK → Supervisor | el supervisor que solicitó/autorizó la compra (puede diferir del supervisor del proyecto; en gastos internos es el único supervisor presente) |
| `concepto` | str | título corto |
| `descripcion` | text | detalle |
| `fecha_compra` | date | la fecha que **filtra el mes** del dashboard |
| `unidades` | int | piezas |
| `costo_total` | decimal | **monto que mostramos como "compra"** |
| `facturado`, `fecha_facturado` | bool, date | estado factura del proveedor |
| `pagado`, `fecha_pagado` | bool, date | estado pago al proveedor |
| `concluido`, `fecha_concluido` | bool, date | recepción |
| `numero_factura` | str | referencia |
| `es_mano_obra` | bool | banderita redundante con `tipo_compra_proyecto='mano_obra'` |
| `total_mano_obra` | decimal | total agregado del bloque mano de obra |
| `mano_obra_detalle` | JSON | bloques con puesto, horas, tarifa (no lo necesitamos para los KPIs base, sí para el drawer de detalle) |
| `eliminado` | bool | soft delete — **siempre filtrar a FALSE** |

Reglas clave:
- `tipo_compra = 'proyecto'` ⇒ `cotizacion_id` puede o no existir; si existe,
  ese es el proyecto. **Para este dashboard sólo nos interesan las compras
  de proyecto que tienen `cotizacion_id IS NOT NULL`** (las "PENDIENTE-ASIGN"
  son ruido para los KPIs por proyecto, pero deben sumar al total de compras
  del mes y debe llevarse el conteo).
- `tipo_compra = 'interno'` ⇒ `nomenclatura_id` siempre presente,
  `cotizacion_id` y `oportunidad_id` siempre nulos.
- El monto SIEMPRE es `costo_total`. No hay otro.

### 2.2 `Cotizacion` (tabla `core_cotizacion`)

| Campo | Para qué |
|---|---|
| `id`, `numero_cotizacion` | identidad |
| `fecha_cotizacion` | fecha del documento (no es la fecha de la compra) |
| `cliente_id` | FK Cliente |
| `estado` | `'borrador' \| 'enviada' \| 'aceptada' \| 'rechazada' \| 'vencida'` |
| `precio_total` | **lo que se cobra al cliente** (la "venta") |
| `costo_total` | costo presupuestado (interno) |
| `margen_estimado` | precio − costo |
| `currency` | normalmente MXN |
| `asignado` | bool — true si está en alguna OP |
| `supervisores` (M2M) | `core_cotizacion_supervisores` |
| `eliminado` | soft delete |

**Para el dashboard usamos `precio_total` como la "venta esperada" de la
cotización**. Y `costo_total` como referencia para comparar contra `gasto
real` (suma de `core_compra.costo_total`).

### 2.3 `Oportunidad` (tabla `core_oportunidad`)

| Campo | Para qué |
|---|---|
| `id`, `codigo_op` | identidad |
| `categoria` | tipo de proyecto |
| `cliente_id` | FK Cliente |
| `cotizaciones` (M2M `core_oportunidad_cotizaciones`) | una OP agrupa varias cotizaciones |
| `supervisores` (M2M `core_oportunidad_supervisores`) | supervisores responsables |
| `facturado`, `fecha_facturado` | factura **al cliente** |
| `pagado`, `fecha_pagado` | cobro **al cliente** |
| `concluido`, `fecha_concluido` | proyecto cerrado |
| `numero_factura`, `oc`, `albarran` | trazabilidad documental |
| `eliminado` | soft delete |

**Importante**: el `precio_total` de la OP NO existe como campo. Se calcula
sumando `precio_total` de las cotizaciones asignadas a la OP (filtrando
cotizaciones por mes según el criterio que se use).

### 2.4 `Supervisor` (tabla `core_supervisor`)

| Campo | Para qué |
|---|---|
| `id`, `nombre`, `email` | identidad |
| `estado` | `'active' \| 'inactive'` |
| `eliminado` | soft delete |

### 2.5 `Proveedor` (tabla `core_proveedor`)

| Campo | Para qué |
|---|---|
| `id`, `nombre`, `telefono`, `email` | identidad |
| `maneja_credito`, `dias_credito` | crédito (no clave para el dashboard) |
| `activo` | filtra activos |

### 2.6 `Nomenclatura` (tabla `core_nomenclatura`)

| Campo | Para qué |
|---|---|
| `id`, `clave`, `descripcion` | tipo de gasto interno (ej. ALM, MTTO, MUEBLES) |

### 2.7 `TarjetaPago` (tabla `core_tarjetapago`)

| Campo | Para qué |
|---|---|
| `id`, `tipo_metodo`, `alias`, `terminacion`, `banco` | método de pago |

---

## 3. Relaciones (resumen visual)

```
Cliente ──< Cotizacion >── Supervisor          (M2M core_cotizacion_supervisores)
   │            │
   │            └── M2M ──> Oportunidad        (M2M core_oportunidad_cotizaciones)
   │                             │
   │                             └── M2M ──> Supervisor (core_oportunidad_supervisores)
   │
   └──< Oportunidad

Compra
  ├── proyecto: → Cotizacion (FK)  → (Cotizacion ↔ Oportunidad vía M2M)
  │              → Oportunidad (FK, redundante; ignorar en favor de cotizacion→OP)
  │              → Supervisor (FK del proyecto)
  │              → Supervisor (FK responsable_compra)
  ├── interno:  → Nomenclatura (FK)
  │              → Supervisor (FK responsable_compra)
  ├── proveedor (FK siempre)
  └── metodo_pago (FK opcional)
```

---

## 4. Reglas de negocio que condicionan cada query

1. **Filtrado por mes**: el "mes" del dashboard se filtra por
   `core_compra.fecha_compra` cuando se trata de compras o KPIs derivados de
   compras. Cuando se trata de la cotización en sí (la fila padre) NO se
   filtra por `fecha_cotizacion`: lo que importa es que la **compra** caiga
   en el mes. Una cotización puede ser de diciembre y tener compras en
   enero — esa cotización aparece en enero.
2. **Soft delete**: filtrar `eliminado = FALSE` en `compra`, `cotizacion`,
   `oportunidad`, `supervisor`. (Proveedor y Nomenclatura no lo tienen.)
3. **De-duplicación cotización vs oportunidad**: en el dashboard el bloque
   "Cotizaciones con compras del mes" debe excluir las cotizaciones que ya
   están asignadas a una Oportunidad (esas se muestran en el bloque de
   Oportunidades). Comprobación: si la cotización aparece en
   `core_oportunidad_cotizaciones` con una OP no eliminada → va al bloque
   de OP; si no → va al bloque de cotizaciones sueltas.
4. **Compras de proyecto sin cotización asignada**
   (`tipo_compra='proyecto' AND cotizacion_id IS NULL`): suman al **total de
   compras del mes** y al KPI de compras de proyecto, pero NO se ligan a
   ninguna cotización u oportunidad. Mostrarlas en una sección "Compras de
   proyecto pendientes de asignar" si las hay (puede empezar vacía).
5. **Ciclo de la compra (proveedor)** ≠ **ciclo de la oportunidad
   (cliente)**. Nunca mezclar columnas: la columna "facturado/pagado" en una
   compra se refiere al proveedor. La columna "facturado/pagado" en una OP
   se refiere al cliente.
6. **Supervisor del proyecto** = `compra.supervisor_id` (el del proyecto,
   heredado de la cotización). En la vista por supervisor para compras de
   proyecto, ese es el campo que agrupa. Para gastos internos no aplica;
   esos los agrupa `compra.supervisor_responsable_compra_id` si se quiere
   atribuir a alguien (puede no haber).
7. **Mano de obra**: `tipo_compra_proyecto = 'mano_obra'` (o flag
   `es_mano_obra=TRUE`). El monto sigue siendo `costo_total`.

---

## 5. Cálculos que el script debe producir

Por cada mes (Enero, Febrero, Marzo, Abril 2026) y para el **Acumulado**
(suma de los cuatro):

### 5.1 KPIs globales de compras (`kpis_compras`)
- `total_compras` = SUM(costo_total) de todas las compras del mes
- `num_compras` = COUNT
- `monto_proyecto` = SUM donde `tipo_compra='proyecto'`
- `num_proyecto`
- `monto_proyecto_materiales` = SUM donde `tipo_compra_proyecto='material'`
- `monto_proyecto_mano_obra` = SUM donde `tipo_compra_proyecto='mano_obra'`
- `monto_interno` = SUM donde `tipo_compra='interno'`
- `num_interno`
- `monto_pagado` = SUM donde `pagado=TRUE`
- `monto_facturado` = SUM donde `facturado=TRUE`
- `monto_concluido` = SUM donde `concluido=TRUE`
- `monto_pendiente_pago` = SUM donde `pagado=FALSE`

### 5.2 Bloque Oportunidades (`oportunidades`)
Lista de OPs que tienen al menos una compra en el mes seleccionado (o, en
modo permisivo, todas las OPs activas con cotizaciones; **el equipo decide
en PLAN_TRABAJO.md** — recomendación: incluir OPs cuyas cotizaciones
asignadas tienen al menos una compra en el mes).

Por cada OP:
- Identidad: `oportunidad_id`, `codigo_op`, `categoria`, `cliente`,
  `supervisores` (lista de {id,nombre} desde M2M),
  `facturado`/`pagado`/`concluido` y sus fechas.
- `cotizaciones`: lista de cotizaciones de la OP, cada una con sus
  `compras_mes` (las compras del mes ligadas a esa cotización), totales y
  detalle por compra (concepto, descripción, costo, proveedor, método de
  pago, supervisor, estados).
- Resumen económico:
  - `venta_total` = SUM(cotizacion.precio_total)
  - `gasto_total_mes` = SUM(compras_mes.costo_total) sobre todas las
    cotizaciones de la OP
  - `diferencia` = venta_total − gasto_total_mes
  - `porcentaje_avance_gasto` = gasto / venta * 100 (alerta si > 100)

### 5.3 Bloque Cotizaciones con compras SIN oportunidad
(`cotizaciones_con_compras_sin_oportunidad`)

Cotizaciones que tienen compras del mes pero NO están en ninguna OP.
Por cada una, mismos campos económicos y la lista de `compras_mes`.

### 5.4 Bloque Gastos internos por nomenclatura
(`gastos_internos_por_nomenclatura`)

Agrupa por `nomenclatura_id` las compras internas del mes:
- `clave`, `descripcion`, `num_compras`, `monto_total`
- `compras`: lista detallada para el drawer

### 5.5 Bloque Supervisores (`supervisores`)
Por cada supervisor activo que aparezca en alguna compra/cotización/OP
del mes:
- KPIs propios (mismos del 5.1 pero filtrados a sus compras de proyecto +
  los gastos internos que él autorizó como `supervisor_responsable_compra`).
- `oportunidades`: las OPs en las que él participa (vía
  `core_oportunidad_supervisores`) que tienen actividad en el mes.
- `cotizaciones_con_compras_sin_oportunidad`: cotizaciones suyas (vía
  `core_cotizacion_supervisores`) sin OP, con compras del mes.
- `gastos_internos`: compras internas del mes donde él es
  `supervisor_responsable_compra`.

> Para evitar JSON gigantes, puedes anidar las cotizaciones y compras
> *referencias por id* a las ya listadas en los bloques globales. La
> recomendación, sin embargo, es **denormalizar** (duplicar) para que el
> dashboard renderice sin hacer joins en JS. Decidir en `PLAN_TRABAJO.md`.

### 5.6 Acumulado
Mismo objeto que un mes, pero abarcando del 2026-01-01 al 2026-04-30. La
clave del objeto en `datos_por_mes` es `"acumulado"`. En `meses_disponibles`
se agrega como entrada con `key:"acumulado", label:"Acumulado 2026"`.

---

## 6. Conexión a la base de datos

Reutilizar `azure_postgres_connection.py` que ya está en la raíz del
repositorio (`new_dashboard/../azure_postgres_connection.py`). Expone
`get_connection()` que retorna un `psycopg2.connection`.

---

## 7. Cosas que NO debes hacer

- No modificar `models.py`. Es la fuente, sólo se lee.
- No usar `fecha_cotizacion` para filtrar el mes de las compras. El mes lo
  marca `fecha_compra`.
- No mezclar el ciclo proveedor con el ciclo cliente.
- No incluir registros con `eliminado=TRUE`.
- No depender de `compra.oportunidad_id` directamente; derivar la OP vía
  `compra.cotizacion_id` → `core_oportunidad_cotizaciones`.
- No emitir el JSON con tipos `Decimal` o `date` sin convertir; usar el
  encoder ya existente en `generar_dashboard_json.py` como referencia.
