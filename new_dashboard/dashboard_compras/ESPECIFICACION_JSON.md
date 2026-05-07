# RAYCY · Contrato del JSON `dashboard_compras_data.json`

> Este archivo es el **contrato vinculante** entre el agente A (script Python
> que genera el JSON) y el agente B (dashboard que lo consume). Si un agente
> necesita cambiar la forma del JSON, debe actualizar PRIMERO este archivo y
> avisar al otro agente. Ningún agente improvisa la forma.
>
> Los nombres de campos están **fijos**. Los tipos están **fijos**. El
> orden no importa.

---

## 1. Ubicación del archivo

`new_dashboard/dashboard_compras/dashboard_compras_data.json`

Lo escribe el script `generar_dashboard_compras_json.py` (que vive en la
raíz `new_dashboard/`, junto al original). Lo consume `index.html` en
`new_dashboard/dashboard_compras/`.

---

## 2. Estructura raíz

```jsonc
{
  "fecha_generacion": "2026-05-06T12:34:56.789",
  "rango_global": {
    "fecha_inicio": "2026-01-01",
    "fecha_fin":    "2026-04-30"
  },
  "meses_disponibles": [
    { "key": "2026-01",   "label": "Enero 2026",   "mes": 1, "year": 2026 },
    { "key": "2026-02",   "label": "Febrero 2026", "mes": 2, "year": 2026 },
    { "key": "2026-03",   "label": "Marzo 2026",   "mes": 3, "year": 2026 },
    { "key": "2026-04",   "label": "Abril 2026",   "mes": 4, "year": 2026 },
    { "key": "acumulado", "label": "Acumulado 2026", "mes": null, "year": 2026 }
  ],
  "datos_por_mes": {
    "2026-01":   { /* objeto MES — ver §3 */ },
    "2026-02":   { /* ... */ },
    "2026-03":   { /* ... */ },
    "2026-04":   { /* ... */ },
    "acumulado": { /* mismo objeto, agregado del 2026-01-01 al 2026-04-30 */ }
  }
}
```

---

## 3. Objeto MES (`datos_por_mes[<key>]`)

```jsonc
{
  "mes": 1,                             // null en "acumulado"
  "year": 2026,
  "mes_nombre": "Enero",                // "Acumulado" en "acumulado"
  "periodo": "Enero 2026",              // "Acumulado 2026" en "acumulado"
  "fecha_inicio": "2026-01-01",
  "fecha_fin":    "2026-01-31",         // último día del mes; en "acumulado" es 2026-04-30

  "kpis_compras": { /* §4 */ },
  "oportunidades":                              [ /* §5  */ ],
  "cotizaciones_con_compras_sin_oportunidad":   [ /* §6  */ ],
  "compras_proyecto_pendientes_asignar":        [ /* §7  */ ],
  "gastos_internos_por_nomenclatura":           [ /* §8  */ ],
  "supervisores":                               [ /* §9  */ ]
}
```

Reglas generales para todo objeto MES:
- Montos en **MXN**, número decimal (`float`), nunca `Decimal` ni string.
- Fechas en formato ISO `YYYY-MM-DD` (date) o `YYYY-MM-DDTHH:MM:SS` (datetime).
- Cuando un campo no aplica, valor `null` (no string vacío, no 0).
- Ordenamiento sugerido (no obligatorio): listas ordenadas por monto desc.
- Si un mes no tiene datos en alguna sección, devolver `[]` (no omitir el campo).

---

## 4. `kpis_compras` (objeto)

```jsonc
{
  "total_compras":                   1234567.89,  // SUM(costo_total) del mes
  "num_compras":                     42,
  "monto_proyecto":                  900000.00,   // tipo_compra='proyecto'
  "num_proyecto":                    30,
  "monto_proyecto_materiales":       650000.00,   // tipo_compra_proyecto='material'
  "monto_proyecto_mano_obra":        250000.00,   // tipo_compra_proyecto='mano_obra'
  "monto_interno":                   334567.89,   // tipo_compra='interno'
  "num_interno":                     12,
  "monto_facturado":                 800000.00,   // facturado=TRUE
  "monto_pagado":                    700000.00,   // pagado=TRUE
  "monto_concluido":                 500000.00,   // concluido=TRUE
  "monto_pendiente_pago":            534567.89    // pagado=FALSE
}
```

Todos los KPIs se calculan sobre las compras `eliminado=FALSE` cuya
`fecha_compra` cae en el rango `[fecha_inicio, fecha_fin]`.

---

## 5. `oportunidades` (array de objetos)

Una entrada por cada Oportunidad activa cuyas cotizaciones asignadas tienen
**al menos una compra en el mes**. (Si una OP no tuvo compras en el mes, se
omite — no aparecerá en este array para ese mes.)

```jsonc
{
  "oportunidad_id":     123,
  "codigo_op":          "OP-0042",
  "categoria":          "instalacion_electrica",
  "categoria_display":  "Instalación Eléctrica",
  "cliente":            "ACME S.A. de C.V.",
  "cliente_id":         55,
  "supervisores": [
    { "id": 7, "nombre": "Juan Pérez" },
    { "id": 9, "nombre": "Marta Ríos" }
  ],
  "estado_oportunidad": {
    "facturado":       true,
    "fecha_facturado": "2026-01-15",
    "pagado":          false,
    "fecha_pagado":    null,
    "concluido":       false,
    "fecha_concluido": null,
    "numero_factura":  "F-12345",
    "oc":              "OC-9988"
  },
  "cotizaciones": [
    {
      "cotizacion_id":      456,
      "numero_cotizacion":  "COT-101",
      "fecha_cotizacion":   "2025-12-20",
      "estado_cotizacion":  "aceptada",
      "precio_total":       300000.00,         // VENTA
      "costo_cotizado":     220000.00,
      "margen_estimado":    80000.00,
      "supervisores": [
        { "id": 7, "nombre": "Juan Pérez" }
      ],
      "compras_mes":      [ /* §10 */ ],
      "num_compras_mes":  5,
      "total_compras_mes": 180000.00,
      "diferencia":        120000.00,          // precio_total - total_compras_mes
      "porcentaje_avance_gasto": 60.0           // total_compras_mes / precio_total * 100
    }
  ],
  "venta_total":               300000.00,       // SUM(cotizaciones[].precio_total)
  "costo_cotizado_total":      220000.00,       // SUM(cotizaciones[].costo_cotizado)
  "gasto_total_mes":           180000.00,       // SUM(cotizaciones[].total_compras_mes)
  "diferencia":                120000.00,       // venta_total - gasto_total_mes
  "porcentaje_avance_gasto":   60.0,
  "alerta_sobre_presupuesto":  false            // gasto_total_mes > venta_total
}
```

---

## 6. `cotizaciones_con_compras_sin_oportunidad` (array)

Cotizaciones con compras del mes que **no están asignadas a ninguna OP**.

```jsonc
{
  "cotizacion_id":      789,
  "numero_cotizacion":  "COT-202",
  "fecha_cotizacion":   "2026-01-05",
  "estado_cotizacion":  "enviada",
  "cliente":            "Beta Industrial",
  "cliente_id":         77,
  "precio_total":       150000.00,
  "costo_cotizado":     110000.00,
  "margen_estimado":    40000.00,
  "supervisores": [ { "id": 9, "nombre": "Marta Ríos" } ],
  "compras_mes":        [ /* §10 */ ],
  "num_compras_mes":    3,
  "total_compras_mes":  95000.00,
  "diferencia":         55000.00,
  "porcentaje_avance_gasto": 63.3,
  "alerta_sobre_presupuesto": false
}
```

---

## 7. `compras_proyecto_pendientes_asignar` (array)

Compras con `tipo_compra='proyecto'` y **sin** `cotizacion_id`. Sólo el
detalle de cada compra; agregar también totales arriba si se quiere.

```jsonc
{
  "compra_id":   333,
  "fecha_compra":"2026-01-12",
  "concepto":    "Cable THW",
  "descripcion": "...",
  "tipo_compra_proyecto": "material",
  "costo_total": 12000.00,
  "proveedor":   "Eléctrica Norte",
  "metodo_pago": "Transferencia Banamex",
  "supervisor":  null,
  "supervisor_responsable": "Marta Ríos",
  "facturado":   false,
  "pagado":      false,
  "concluido":   false,
  "numero_factura": null
}
```

---

## 8. `gastos_internos_por_nomenclatura` (array)

```jsonc
{
  "nomenclatura_id": 4,
  "clave":           "MUEBLES",
  "descripcion":     "Mobiliario y enseres",
  "num_compras":     6,
  "monto_total":     85000.00,
  "compras": [
    {
      "compra_id":   500,
      "fecha_compra":"2026-01-08",
      "concepto":    "Sillas ejecutivas",
      "descripcion": "Lote de 4 sillas",
      "costo_total": 12000.00,
      "proveedor":   "Office Depot",
      "metodo_pago": "Tarjeta Azul ****1234",
      "supervisor_responsable": "Juan Pérez",
      "supervisor_responsable_id": 7,
      "facturado":   true,
      "pagado":      true,
      "concluido":   true,
      "numero_factura": "FOD-2233"
    }
  ]
}
```

---

## 9. `supervisores` (array)

Una entrada por cada supervisor que tiene actividad en el mes. "Actividad"
significa: aparece como `compra.supervisor_id`, como
`compra.supervisor_responsable_compra_id`, o como supervisor asignado a una
cotización u oportunidad con compras del mes.

```jsonc
{
  "supervisor_id": 7,
  "nombre":        "Juan Pérez",
  "email":         "juan@raycy.com",
  "kpis": {
    "monto_total_compras_proyecto":         400000.00,
    "monto_proyecto_materiales":            300000.00,
    "monto_proyecto_mano_obra":             100000.00,
    "monto_gastos_internos_responsable":    25000.00,
    "monto_total_atribuido":                425000.00,
    "num_compras_proyecto":                 18,
    "num_gastos_internos_responsable":      3,
    "num_oportunidades":                    2,
    "num_cotizaciones_con_compras_sin_op":  1,
    "venta_total_oportunidades":            500000.00,   // suma cotizaciones de sus OPs (sólo cot. con compras del mes)
    "venta_total_cotizaciones_sin_op":      150000.00,
    "monto_pendiente_pago_proveedores":     90000.00
  },
  "oportunidades":                            [ /* mismo objeto §5, sólo OPs donde este supervisor está asignado */ ],
  "cotizaciones_con_compras_sin_oportunidad": [ /* mismo objeto §6, sólo del supervisor */ ],
  "gastos_internos":                          [ /* mismo objeto §7 (compra interna), filtrado a supervisor_responsable_compra=este supervisor */ ]
}
```

> **Nota de denormalización**: aceptamos duplicación de objetos
> (cotización/compra puede aparecer tanto en el bloque global del mes como
> dentro del supervisor). Esto evita joins en el frontend. El costo en
> tamaño es aceptable para 4 meses + acumulado.

---

## 10. Sub-objeto `compra_mes` (item de `compras_mes`)

Forma única que se reutiliza dentro de `oportunidades[].cotizaciones[].compras_mes`
y dentro de `cotizaciones_con_compras_sin_oportunidad[].compras_mes`.

```jsonc
{
  "compra_id":               901,
  "fecha_compra":            "2026-01-12",
  "concepto":                "Cable THW calibre 12",
  "descripcion":             "200 m de cable...",
  "tipo_compra_proyecto":    "material",        // o "mano_obra"
  "es_mano_obra":            false,
  "unidades":                200,
  "costo_total":             18500.00,
  "total_mano_obra":         0.00,              // sólo relevante si es mano de obra
  "mano_obra_detalle":       [],                // arreglo de bloques (puesto, horas, tarifa) tal cual viene del JSONField
  "proveedor": {
    "id":     12,
    "nombre": "Eléctrica Norte"
  },
  "metodo_pago": {
    "id":          3,
    "tipo_metodo": "transferencia",
    "alias":       "Transferencia Banamex",
    "etiqueta":    "Transferencia Banamex"      // alias compuesto listo para mostrar
  },
  "supervisor_proyecto": {
    "id":     7,
    "nombre": "Juan Pérez"
  },
  "supervisor_responsable": {
    "id":     7,
    "nombre": "Juan Pérez"
  },
  "facturado":         false,
  "fecha_facturado":   null,
  "pagado":            false,
  "fecha_pagado":      null,
  "concluido":         false,
  "fecha_concluido":   null,
  "numero_factura":    null
}
```

Si un FK es null (`metodo_pago` no asignado, `supervisor_proyecto` no
asignado, etc.) el sub-objeto entero es `null`.

---

## 11. Reglas de validación pre-publicación

Antes de escribir el JSON, el script debe correr estas verificaciones de
integridad y abortar si alguna falla (impreso en consola, no silente):

1. `kpis_compras.total_compras ==
    kpis_compras.monto_proyecto + kpis_compras.monto_interno` (±0.01).
2. `monto_proyecto >= monto_proyecto_materiales + monto_proyecto_mano_obra`
   (puede haber compras de proyecto sin sub-tipo).
3. Para cada OP: `gasto_total_mes ==
    SUM(cotizaciones[].total_compras_mes)` (±0.01).
4. Para cada cotización en cualquier bloque: `total_compras_mes ==
    SUM(compras_mes[].costo_total)` (±0.01).
5. La suma de `monto_total` de todas las nomenclaturas == `monto_interno`.
6. Ningún registro con `eliminado=TRUE` debe aparecer.
7. Las claves de `meses_disponibles` deben existir en `datos_por_mes` y
   viceversa.

Si pasa todo, imprimir resumen tipo:

```
✅ Enero 2026   compras=42  total=$1,234,567.89  OPs=8  cot.sin OP=3  internos=12
✅ Febrero 2026 ...
✅ Acumulado    compras=...
```
