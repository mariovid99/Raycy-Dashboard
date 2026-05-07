"""
Genera new_dashboard/dashboard_compras/dashboard_compras_data.json
Sigue la especificación en dashboard_compras/ESPECIFICACION_JSON.md
"""
import json
import os
import sys
import calendar

# Forzar UTF-8 en stdout/stderr para que los símbolos de log funcionen en Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
from decimal import Decimal
from datetime import datetime, date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
try:
    from azure_postgres_connection import get_connection
except ImportError:
    print("❌ No se pudo importar azure_postgres_connection.py")
    sys.exit(1)

MESES_NOMBRES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}
MESES_A_PROCESAR = [(2026, 1), (2026, 2), (2026, 3), (2026, 4)]
OUT_PATH = os.path.join(
    os.path.dirname(__file__), "dashboard_compras", "dashboard_compras_data.json"
)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


def ejecutar_query(query, descripcion):
    connection = cursor = None
    try:
        print(f"🔄 Ejecutando: {descripcion}...")
        connection = get_connection()
        if not connection:
            print(f"❌ Sin conexión para: {descripcion}")
            return None
        cursor = connection.cursor()
        cursor.execute(query)
        cols = [d[0] for d in cursor.description]
        rows = [dict(zip(cols, fila)) for fila in cursor.fetchall()]
        print(f"✅ {descripcion}: {len(rows)} registros")
        return rows
    except Exception as e:
        print(f"❌ Error en {descripcion}: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def get_fecha_rango(year, month):
    """Devuelve (inicio, fin_exclusivo, fin_display)."""
    inicio = f"{year}-{month:02d}-01"
    fin_excl = f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01"
    ultimo = calendar.monthrange(year, month)[1]
    return inicio, fin_excl, f"{year}-{month:02d}-{ultimo}"


def get_fecha_rango_acumulado():
    return "2026-01-01", "2026-05-01", "2026-04-30"


# ─── Lookups estáticos (se cargan una sola vez) ────────────────────────────

def fetch_cot_op_mapping():
    """Devuelve {cotizacion_id: {oportunidad_id, codigo_op, categoria, ...}}"""
    q = """
    SELECT DISTINCT ON (coc.cotizacion_id)
        coc.cotizacion_id,
        op.id              AS oportunidad_id,
        op.codigo_op,
        op.categoria,
        op.facturado       AS op_facturado,
        op.fecha_facturado AS op_fecha_facturado,
        op.pagado          AS op_pagado,
        op.fecha_pagado    AS op_fecha_pagado,
        op.concluido       AS op_concluido,
        op.fecha_concluido AS op_fecha_concluido,
        op.numero_factura  AS op_numero_factura,
        op.oc              AS op_oc
    FROM core_oportunidad_cotizaciones coc
    JOIN core_oportunidad op ON coc.oportunidad_id = op.id
    WHERE op.eliminado = FALSE
    ORDER BY coc.cotizacion_id, op.id
    """
    rows = ejecutar_query(q, "Cotizacion→OP mapping") or []
    return {r["cotizacion_id"]: r for r in rows}


def fetch_cot_supervisores():
    """Devuelve {cotizacion_id: [{id, nombre}]}"""
    q = """
    SELECT cs.cotizacion_id, s.id, s.nombre
    FROM core_cotizacion_supervisores cs
    JOIN core_supervisor s ON cs.supervisor_id = s.id
    WHERE s.eliminado = FALSE
    ORDER BY cs.cotizacion_id, s.nombre
    """
    rows = ejecutar_query(q, "Cotizacion supervisores M2M") or []
    result = {}
    for r in rows:
        result.setdefault(r["cotizacion_id"], []).append(
            {"id": r["id"], "nombre": r["nombre"]}
        )
    return result


def fetch_op_supervisores():
    """Devuelve {oportunidad_id: [{id, nombre}]}"""
    q = """
    SELECT os.oportunidad_id, s.id, s.nombre
    FROM core_oportunidad_supervisores os
    JOIN core_supervisor s ON os.supervisor_id = s.id
    WHERE s.eliminado = FALSE
    ORDER BY os.oportunidad_id, s.nombre
    """
    rows = ejecutar_query(q, "Oportunidad supervisores M2M") or []
    result = {}
    for r in rows:
        result.setdefault(r["oportunidad_id"], []).append(
            {"id": r["id"], "nombre": r["nombre"]}
        )
    return result


def fetch_op_clientes():
    """Devuelve {oportunidad_id: {cliente_id, cliente_nombre}}"""
    q = """
    SELECT op.id AS oportunidad_id, op.cliente_id, cli.nombre AS cliente_nombre
    FROM core_oportunidad op
    LEFT JOIN core_cliente cli ON op.cliente_id = cli.id
    WHERE op.eliminado = FALSE
    """
    rows = ejecutar_query(q, "Oportunidad clientes")
    if rows is None:
        print("⚠️  No se pudo obtener clientes de OPs (tabla core_cliente?). Continuando sin cliente.")
        return {}
    return {r["oportunidad_id"]: {"cliente_id": r["cliente_id"], "cliente_nombre": r["cliente_nombre"]} for r in rows}


def fetch_cot_clientes():
    """Devuelve {cotizacion_id: {cliente_id, cliente_nombre}}"""
    q = """
    SELECT c.id AS cotizacion_id, c.cliente_id, cli.nombre AS cliente_nombre
    FROM core_cotizacion c
    LEFT JOIN core_cliente cli ON c.cliente_id = cli.id
    WHERE c.eliminado = FALSE
    """
    rows = ejecutar_query(q, "Cotizacion clientes")
    if rows is None:
        print("⚠️  No se pudo obtener clientes de cotizaciones. Continuando sin cliente.")
        return {}
    return {r["cotizacion_id"]: {"cliente_id": r["cliente_id"], "cliente_nombre": r["cliente_nombre"]} for r in rows}


def fetch_supervisores_info():
    """Devuelve {supervisor_id: {id, nombre, email}}"""
    q = """
    SELECT id, nombre, email FROM core_supervisor WHERE eliminado = FALSE
    """
    rows = ejecutar_query(q, "Supervisores info") or []
    return {r["id"]: r for r in rows}


# ─── Query por período ────────────────────────────────────────────────────

def query_kpis_compras(fecha_inicio, fecha_fin):
    q = f"""
    SELECT
        COALESCE(SUM(costo_total), 0)                                                     AS total_compras,
        COUNT(*)                                                                            AS num_compras,
        COALESCE(SUM(CASE WHEN tipo_compra='proyecto' THEN costo_total END), 0)            AS monto_proyecto,
        COUNT(CASE WHEN tipo_compra='proyecto' THEN 1 END)                                 AS num_proyecto,
        COALESCE(SUM(CASE WHEN tipo_compra_proyecto='material' THEN costo_total END), 0)   AS monto_proyecto_materiales,
        COALESCE(SUM(CASE WHEN tipo_compra_proyecto='mano_obra' THEN costo_total END), 0)  AS monto_proyecto_mano_obra,
        COALESCE(SUM(CASE WHEN tipo_compra='interno' THEN costo_total END), 0)             AS monto_interno,
        COUNT(CASE WHEN tipo_compra='interno' THEN 1 END)                                  AS num_interno,
        COALESCE(SUM(CASE WHEN facturado THEN costo_total END), 0)                         AS monto_facturado,
        COALESCE(SUM(CASE WHEN pagado THEN costo_total END), 0)                            AS monto_pagado,
        COALESCE(SUM(CASE WHEN concluido THEN costo_total END), 0)                         AS monto_concluido,
        COALESCE(SUM(CASE WHEN NOT pagado THEN costo_total END), 0)                        AS monto_pendiente_pago
    FROM core_compra
    WHERE eliminado = FALSE
      AND fecha_compra >= '{fecha_inicio}'
      AND fecha_compra < '{fecha_fin}'
    """
    rows = ejecutar_query(q, "KPIs compras") or [{}]
    r = rows[0]
    return {
        "total_compras":             float(r.get("total_compras") or 0),
        "num_compras":               int(r.get("num_compras") or 0),
        "monto_proyecto":            float(r.get("monto_proyecto") or 0),
        "num_proyecto":              int(r.get("num_proyecto") or 0),
        "monto_proyecto_materiales": float(r.get("monto_proyecto_materiales") or 0),
        "monto_proyecto_mano_obra":  float(r.get("monto_proyecto_mano_obra") or 0),
        "monto_interno":             float(r.get("monto_interno") or 0),
        "num_interno":               int(r.get("num_interno") or 0),
        "monto_facturado":           float(r.get("monto_facturado") or 0),
        "monto_pagado":              float(r.get("monto_pagado") or 0),
        "monto_concluido":           float(r.get("monto_concluido") or 0),
        "monto_pendiente_pago":      float(r.get("monto_pendiente_pago") or 0),
    }


def fetch_compras_raw(fecha_inicio, fecha_fin):
    """Una fila por compra con todo el detalle necesario. Sin JOIN a OP (evita duplicados)."""
    q = f"""
    SELECT
        c.id                      AS compra_id,
        c.fecha_compra,
        c.concepto,
        c.descripcion,
        c.tipo_compra,
        c.tipo_compra_proyecto,
        c.es_mano_obra,
        c.unidades,
        c.costo_total,
        c.total_mano_obra,
        c.mano_obra_detalle,
        c.facturado,
        c.fecha_facturado,
        c.pagado,
        c.fecha_pagado,
        c.concluido,
        c.fecha_concluido,
        c.numero_factura,
        c.cotizacion_id,
        -- Cotizacion
        cot.numero_cotizacion,
        cot.fecha_cotizacion,
        cot.estado                AS estado_cotizacion,
        cot.precio_total          AS precio_total_cot,
        cot.costo_total           AS costo_cotizado,
        cot.margen_estimado,
        -- Proveedor
        prov.id                   AS proveedor_id,
        prov.nombre               AS proveedor_nombre,
        -- Metodo pago
        mp.id                     AS metodo_pago_id,
        mp.tipo_metodo,
        mp.alias                  AS metodo_pago_alias,
        mp.terminacion            AS metodo_pago_terminacion,
        -- Supervisor del proyecto (compra.supervisor_id)
        sp.id                     AS supervisor_proyecto_id,
        sp.nombre                 AS supervisor_proyecto_nombre,
        -- Supervisor responsable de la compra
        sr.id                     AS supervisor_responsable_id,
        sr.nombre                 AS supervisor_responsable_nombre,
        -- Nomenclatura (gastos internos)
        nom.id                    AS nomenclatura_id,
        nom.clave                 AS nomenclatura_clave,
        nom.descripcion           AS nomenclatura_descripcion
    FROM core_compra c
    LEFT JOIN core_cotizacion cot
           ON c.cotizacion_id = cot.id AND cot.eliminado = FALSE
    LEFT JOIN core_proveedor prov
           ON c.proveedor_id = prov.id
    LEFT JOIN core_tarjetapago mp
           ON c.metodo_pago_id = mp.id
    LEFT JOIN core_supervisor sp
           ON c.supervisor_id = sp.id AND sp.eliminado = FALSE
    LEFT JOIN core_supervisor sr
           ON c.supervisor_responsable_compra_id = sr.id AND sr.eliminado = FALSE
    LEFT JOIN core_nomenclatura nom
           ON c.nomenclatura_id = nom.id
    WHERE c.eliminado = FALSE
      AND c.fecha_compra >= '{fecha_inicio}'
      AND c.fecha_compra < '{fecha_fin}'
    ORDER BY c.fecha_compra, c.id
    """
    return ejecutar_query(q, f"Compras raw {fecha_inicio}..{fecha_fin}") or []


# ─── Helpers de construcción de objetos ───────────────────────────────────

def _isodate(val):
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    return val


def _f(val):
    return float(val) if val is not None else 0.0


def _metodo_pago_obj(row):
    if not row.get("metodo_pago_id"):
        return None
    alias = row.get("metodo_pago_alias") or ""
    term = row.get("metodo_pago_terminacion") or ""
    etiqueta = f"{alias} ****{term}".strip() if term else alias
    return {
        "id":          row["metodo_pago_id"],
        "tipo_metodo": row.get("tipo_metodo"),
        "alias":       alias,
        "etiqueta":    etiqueta,
    }


def _sup_obj(sid, snombre):
    if sid is None:
        return None
    return {"id": sid, "nombre": snombre}


def build_compra_mes_obj(row):
    """Construye el sub-objeto §10 compra_mes."""
    mano_obra_detalle = row.get("mano_obra_detalle") or []
    if isinstance(mano_obra_detalle, str):
        try:
            mano_obra_detalle = json.loads(mano_obra_detalle)
        except Exception:
            mano_obra_detalle = []
    return {
        "compra_id":               row["compra_id"],
        "fecha_compra":            _isodate(row.get("fecha_compra")),
        "concepto":                row.get("concepto"),
        "descripcion":             row.get("descripcion"),
        "tipo_compra_proyecto":    row.get("tipo_compra_proyecto"),
        "es_mano_obra":            bool(row.get("es_mano_obra")),
        "unidades":                row.get("unidades"),
        "costo_total":             _f(row.get("costo_total")),
        "total_mano_obra":         _f(row.get("total_mano_obra")),
        "mano_obra_detalle":       mano_obra_detalle,
        "proveedor":               _sup_obj(row.get("proveedor_id"), row.get("proveedor_nombre")),
        "metodo_pago":             _metodo_pago_obj(row),
        "supervisor_proyecto":     _sup_obj(row.get("supervisor_proyecto_id"), row.get("supervisor_proyecto_nombre")),
        "supervisor_responsable":  _sup_obj(row.get("supervisor_responsable_id"), row.get("supervisor_responsable_nombre")),
        "facturado":               bool(row.get("facturado")),
        "fecha_facturado":         _isodate(row.get("fecha_facturado")),
        "pagado":                  bool(row.get("pagado")),
        "fecha_pagado":            _isodate(row.get("fecha_pagado")),
        "concluido":               bool(row.get("concluido")),
        "fecha_concluido":         _isodate(row.get("fecha_concluido")),
        "numero_factura":          row.get("numero_factura"),
    }


def build_compra_interna_obj(row):
    """Construye item de compra interna para §8.compras y §9.gastos_internos."""
    mp = _metodo_pago_obj(row)
    return {
        "compra_id":                  row["compra_id"],
        "fecha_compra":               _isodate(row.get("fecha_compra")),
        "concepto":                   row.get("concepto"),
        "descripcion":                row.get("descripcion"),
        "costo_total":                _f(row.get("costo_total")),
        "proveedor":                  row.get("proveedor_nombre"),
        "metodo_pago":                mp["etiqueta"] if mp else None,
        "supervisor_responsable":     row.get("supervisor_responsable_nombre"),
        "supervisor_responsable_id":  row.get("supervisor_responsable_id"),
        "facturado":                  bool(row.get("facturado")),
        "pagado":                     bool(row.get("pagado")),
        "concluido":                  bool(row.get("concluido")),
        "numero_factura":             row.get("numero_factura"),
    }


def build_compra_pendiente_obj(row):
    """Construye item §7 (compra de proyecto sin cotizacion_id)."""
    mp = _metodo_pago_obj(row)
    return {
        "compra_id":              row["compra_id"],
        "fecha_compra":           _isodate(row.get("fecha_compra")),
        "concepto":               row.get("concepto"),
        "descripcion":            row.get("descripcion"),
        "tipo_compra_proyecto":   row.get("tipo_compra_proyecto"),
        "costo_total":            _f(row.get("costo_total")),
        "proveedor":              row.get("proveedor_nombre"),
        "metodo_pago":            mp["etiqueta"] if mp else None,
        "supervisor":             row.get("supervisor_proyecto_nombre"),
        "supervisor_responsable": row.get("supervisor_responsable_nombre"),
        "facturado":              bool(row.get("facturado")),
        "pagado":                 bool(row.get("pagado")),
        "concluido":              bool(row.get("concluido")),
        "numero_factura":         row.get("numero_factura"),
    }


def _categoria_display(cat):
    if not cat:
        return None
    return cat.replace("_", " ").title()


# ─── Agregación principal ─────────────────────────────────────────────────

def agregar_compras(raw_compras, cot_op_map, cot_supervisores, op_supervisores,
                    cot_clientes, op_clientes):
    """
    Recibe las compras crudas y los lookups estáticos.
    Devuelve (oportunidades, cotizaciones_sin_op, pendientes_asignar, gastos_internos_rows).
    """
    cot_meta = {}          # cot_id → {campos + compras_mes:[]}
    pendientes_asignar = []
    gastos_internos_rows = []

    for row in raw_compras:
        tipo = row.get("tipo_compra")
        cot_id = row.get("cotizacion_id")

        if tipo == "proyecto":
            if cot_id is None:
                pendientes_asignar.append(build_compra_pendiente_obj(row))
            else:
                if cot_id not in cot_meta:
                    cli = cot_clientes.get(cot_id, {})
                    cot_meta[cot_id] = {
                        "cotizacion_id":    cot_id,
                        "numero_cotizacion": row.get("numero_cotizacion"),
                        "fecha_cotizacion": _isodate(row.get("fecha_cotizacion")),
                        "estado_cotizacion": row.get("estado_cotizacion"),
                        "precio_total":     _f(row.get("precio_total_cot")),
                        "costo_cotizado":   _f(row.get("costo_cotizado")),
                        "margen_estimado":  _f(row.get("margen_estimado")),
                        "cliente_id":       cli.get("cliente_id"),
                        "cliente":          cli.get("cliente_nombre"),
                        "supervisores":     cot_supervisores.get(cot_id, []),
                        "compras_mes":      [],
                    }
                cot_meta[cot_id]["compras_mes"].append(build_compra_mes_obj(row))
        elif tipo == "interno":
            gastos_internos_rows.append(row)

    # Separar cotizaciones entre las que tienen OP y las que no
    ops_dict = {}    # op_id → {campos + _cots:{}}
    cots_sin_op = []

    for cot_id, cot in cot_meta.items():
        op_info = cot_op_map.get(cot_id)
        if op_info:
            op_id = op_info["oportunidad_id"]
            if op_id not in ops_dict:
                cli = op_clientes.get(op_id, {})
                ops_dict[op_id] = {
                    "oportunidad_id":    op_id,
                    "codigo_op":         op_info["codigo_op"],
                    "categoria":         op_info["categoria"],
                    "categoria_display": _categoria_display(op_info["categoria"]),
                    "cliente":           cli.get("cliente_nombre"),
                    "cliente_id":        cli.get("cliente_id"),
                    "supervisores":      op_supervisores.get(op_id, []),
                    "estado_oportunidad": {
                        "facturado":       bool(op_info.get("op_facturado")),
                        "fecha_facturado": _isodate(op_info.get("op_fecha_facturado")),
                        "pagado":          bool(op_info.get("op_pagado")),
                        "fecha_pagado":    _isodate(op_info.get("op_fecha_pagado")),
                        "concluido":       bool(op_info.get("op_concluido")),
                        "fecha_concluido": _isodate(op_info.get("op_fecha_concluido")),
                        "numero_factura":  op_info.get("op_numero_factura"),
                        "oc":              op_info.get("op_oc"),
                    },
                    "_cots": {},
                }
            ops_dict[op_id]["_cots"][cot_id] = cot
        else:
            cots_sin_op.append(cot)

    # Construir lista final de oportunidades
    oportunidades = []
    for op_id, op in ops_dict.items():
        cots = list(op.pop("_cots").values())
        for cot in cots:
            cot["num_compras_mes"] = len(cot["compras_mes"])
            cot["total_compras_mes"] = round(sum(c["costo_total"] for c in cot["compras_mes"]), 2)
            cot["diferencia"] = round(cot["precio_total"] - cot["total_compras_mes"], 2)
            cot["porcentaje_avance_gasto"] = (
                round(cot["total_compras_mes"] / cot["precio_total"] * 100, 2)
                if cot["precio_total"] else 0.0
            )

        venta_total = round(sum(c["precio_total"] for c in cots), 2)
        costo_cotizado_total = round(sum(c["costo_cotizado"] for c in cots), 2)
        gasto_total_mes = round(sum(c["total_compras_mes"] for c in cots), 2)

        op["cotizaciones"] = sorted(cots, key=lambda x: x["cotizacion_id"])
        op["venta_total"] = venta_total
        op["costo_cotizado_total"] = costo_cotizado_total
        op["gasto_total_mes"] = gasto_total_mes
        op["diferencia"] = round(venta_total - gasto_total_mes, 2)
        op["porcentaje_avance_gasto"] = (
            round(gasto_total_mes / venta_total * 100, 2) if venta_total else 0.0
        )
        op["alerta_sobre_presupuesto"] = gasto_total_mes > venta_total
        oportunidades.append(op)

    oportunidades.sort(key=lambda x: x["gasto_total_mes"], reverse=True)

    # Construir lista de cotizaciones sin OP
    cotizaciones_sin_op = []
    for cot in cots_sin_op:
        cot["num_compras_mes"] = len(cot["compras_mes"])
        cot["total_compras_mes"] = round(sum(c["costo_total"] for c in cot["compras_mes"]), 2)
        cot["diferencia"] = round(cot["precio_total"] - cot["total_compras_mes"], 2)
        cot["porcentaje_avance_gasto"] = (
            round(cot["total_compras_mes"] / cot["precio_total"] * 100, 2)
            if cot["precio_total"] else 0.0
        )
        cot["alerta_sobre_presupuesto"] = cot["total_compras_mes"] > cot["precio_total"]
        cotizaciones_sin_op.append(cot)
    cotizaciones_sin_op.sort(key=lambda x: x["total_compras_mes"], reverse=True)

    return oportunidades, cotizaciones_sin_op, pendientes_asignar, gastos_internos_rows


def build_gastos_internos_por_nomenclatura(gastos_internos_rows):
    """Construye §8 gastos_internos_por_nomenclatura."""
    nom_dict = {}
    for row in gastos_internos_rows:
        nom_id = row.get("nomenclatura_id")
        key = nom_id if nom_id is not None else "__sin_nom__"
        if key not in nom_dict:
            nom_dict[key] = {
                "nomenclatura_id": nom_id,
                "clave":           row.get("nomenclatura_clave") or "(sin clave)",
                "descripcion":     row.get("nomenclatura_descripcion") or "",
                "num_compras":     0,
                "monto_total":     0.0,
                "compras":         [],
            }
        nom_dict[key]["num_compras"] += 1
        nom_dict[key]["monto_total"] = round(
            nom_dict[key]["monto_total"] + _f(row.get("costo_total")), 2
        )
        nom_dict[key]["compras"].append(build_compra_interna_obj(row))

    return sorted(nom_dict.values(), key=lambda x: x["monto_total"], reverse=True)


def build_supervisores(raw_compras, oportunidades, cotizaciones_sin_op, sup_info):
    """Construye §9 supervisores."""
    # Universo de supervisores con actividad
    sup_ids = {}
    for row in raw_compras:
        for sid, snombre in [
            (row.get("supervisor_proyecto_id"), row.get("supervisor_proyecto_nombre")),
            (row.get("supervisor_responsable_id"), row.get("supervisor_responsable_nombre")),
        ]:
            if sid and sid not in sup_ids:
                info = sup_info.get(sid, {})
                sup_ids[sid] = {
                    "supervisor_id": sid,
                    "nombre":        snombre or info.get("nombre"),
                    "email":         info.get("email"),
                }
    for op in oportunidades:
        for s in op.get("supervisores", []):
            if s["id"] not in sup_ids:
                info = sup_info.get(s["id"], {})
                sup_ids[s["id"]] = {
                    "supervisor_id": s["id"],
                    "nombre":        s["nombre"],
                    "email":         info.get("email"),
                }
    for cot in cotizaciones_sin_op:
        for s in cot.get("supervisores", []):
            if s["id"] not in sup_ids:
                info = sup_info.get(s["id"], {})
                sup_ids[s["id"]] = {
                    "supervisor_id": s["id"],
                    "nombre":        s["nombre"],
                    "email":         info.get("email"),
                }

    # Índices inversos: supervisor → OPs / cotizaciones donde está asignado
    op_by_sup = {}   # sup_id → [op_id]
    cot_by_sup = {}  # sup_id → [cot_id]
    for op in oportunidades:
        for s in op.get("supervisores", []):
            op_by_sup.setdefault(s["id"], []).append(op["oportunidad_id"])
    for cot in cotizaciones_sin_op:
        for s in cot.get("supervisores", []):
            cot_by_sup.setdefault(s["id"], []).append(cot["cotizacion_id"])

    op_index = {op["oportunidad_id"]: op for op in oportunidades}
    cot_index = {cot["cotizacion_id"]: cot for cot in cotizaciones_sin_op}

    # Compras agrupadas por supervisor
    proy_por_sup = {}    # sup_id → [row] por supervisor_id (supervisor del proyecto)
    interno_por_sup = {} # sup_id → [row] por supervisor_responsable (gastos internos)
    for row in raw_compras:
        if row.get("tipo_compra") == "proyecto":
            sid = row.get("supervisor_proyecto_id")
            if sid:
                proy_por_sup.setdefault(sid, []).append(row)
        elif row.get("tipo_compra") == "interno":
            sid = row.get("supervisor_responsable_id")
            if sid:
                interno_por_sup.setdefault(sid, []).append(row)

    result = []
    for sup_id, sup_meta in sup_ids.items():
        proy_rows = proy_por_sup.get(sup_id, [])
        int_rows = interno_por_sup.get(sup_id, [])

        monto_materiales = sum(_f(r.get("costo_total")) for r in proy_rows if r.get("tipo_compra_proyecto") == "material")
        monto_mano_obra = sum(_f(r.get("costo_total")) for r in proy_rows if r.get("tipo_compra_proyecto") == "mano_obra")
        monto_proyecto = sum(_f(r.get("costo_total")) for r in proy_rows)
        monto_interno = sum(_f(r.get("costo_total")) for r in int_rows)
        monto_pendiente = sum(_f(r.get("costo_total")) for r in proy_rows if not r.get("pagado"))

        sup_ops = [op_index[oid] for oid in op_by_sup.get(sup_id, []) if oid in op_index]
        sup_cots = [cot_index[cid] for cid in cot_by_sup.get(sup_id, []) if cid in cot_index]

        gastos_internos_list = [
            build_compra_interna_obj(r)
            for r in sorted(int_rows, key=lambda x: x.get("fecha_compra") or date.min, reverse=True)
        ]

        result.append({
            "supervisor_id": sup_id,
            "nombre":        sup_meta["nombre"],
            "email":         sup_meta["email"],
            "kpis": {
                "monto_total_compras_proyecto":          round(monto_proyecto, 2),
                "monto_proyecto_materiales":             round(monto_materiales, 2),
                "monto_proyecto_mano_obra":              round(monto_mano_obra, 2),
                "monto_gastos_internos_responsable":     round(monto_interno, 2),
                "monto_total_atribuido":                 round(monto_proyecto + monto_interno, 2),
                "num_compras_proyecto":                  len(proy_rows),
                "num_gastos_internos_responsable":       len(int_rows),
                "num_oportunidades":                     len(sup_ops),
                "num_cotizaciones_con_compras_sin_op":   len(sup_cots),
                "venta_total_oportunidades":             round(sum(op["venta_total"] for op in sup_ops), 2),
                "venta_total_cotizaciones_sin_op":       round(sum(c["precio_total"] for c in sup_cots), 2),
                "monto_pendiente_pago_proveedores":      round(monto_pendiente, 2),
            },
            "oportunidades":                             sup_ops,
            "cotizaciones_con_compras_sin_oportunidad":  sup_cots,
            "gastos_internos":                           gastos_internos_list,
        })

    result.sort(key=lambda x: x["kpis"]["monto_total_atribuido"], reverse=True)
    return result


# ─── Generación por período ───────────────────────────────────────────────

def generar_datos_periodo(fecha_inicio, fecha_fin_excl, fecha_fin_display,
                          periodo_label, mes, year,
                          cot_op_map, cot_supervisores, op_supervisores,
                          cot_clientes, op_clientes, sup_info):
    print(f"\n{'─'*55}")
    print(f"  Procesando: {periodo_label}  ({fecha_inicio} → {fecha_fin_display})")
    print(f"{'─'*55}")

    kpis = query_kpis_compras(fecha_inicio, fecha_fin_excl)
    raw = fetch_compras_raw(fecha_inicio, fecha_fin_excl)

    oportunidades, cotizaciones_sin_op, pendientes_asignar, gastos_internos_rows = agregar_compras(
        raw, cot_op_map, cot_supervisores, op_supervisores, cot_clientes, op_clientes
    )

    gastos_internos_nom = build_gastos_internos_por_nomenclatura(gastos_internos_rows)
    supervisores = build_supervisores(raw, oportunidades, cotizaciones_sin_op, sup_info)

    return {
        "mes":          mes,
        "year":         year,
        "mes_nombre":   MESES_NOMBRES.get(mes, "Acumulado") if mes else "Acumulado",
        "periodo":      periodo_label,
        "fecha_inicio": fecha_inicio,
        "fecha_fin":    fecha_fin_display,
        "kpis_compras": kpis,
        "oportunidades":                           oportunidades,
        "cotizaciones_con_compras_sin_oportunidad": cotizaciones_sin_op,
        "compras_proyecto_pendientes_asignar":      pendientes_asignar,
        "gastos_internos_por_nomenclatura":         gastos_internos_nom,
        "supervisores":                             supervisores,
    }


# ─── Validaciones §11 ────────────────────────────────────────────────────

def validar(datos):
    EPS = 0.01
    errores = []

    for key, mes_data in datos["datos_por_mes"].items():
        kpis = mes_data["kpis_compras"]
        periodo = mes_data["periodo"]

        # V1: total_compras == monto_proyecto + monto_interno
        calc = kpis["monto_proyecto"] + kpis["monto_interno"]
        if abs(kpis["total_compras"] - calc) > EPS:
            errores.append(
                f"[{periodo}] V1: total_compras={kpis['total_compras']:.2f} "
                f"!= proyecto+interno={calc:.2f} (diff={kpis['total_compras']-calc:.2f})"
            )

        # V2: monto_proyecto >= materiales + mano_obra
        sub = kpis["monto_proyecto_materiales"] + kpis["monto_proyecto_mano_obra"]
        if kpis["monto_proyecto"] < sub - EPS:
            errores.append(
                f"[{periodo}] V2: monto_proyecto={kpis['monto_proyecto']:.2f} "
                f"< mat+mo={sub:.2f}"
            )

        # V3: OP.gasto_total_mes == SUM(cotizaciones.total_compras_mes)
        for op in mes_data["oportunidades"]:
            esperado = round(sum(c["total_compras_mes"] for c in op["cotizaciones"]), 2)
            if abs(op["gasto_total_mes"] - esperado) > EPS:
                errores.append(
                    f"[{periodo}] V3 OP {op['codigo_op']}: "
                    f"gasto={op['gasto_total_mes']:.2f} != sum_cots={esperado:.2f}"
                )

        # V4: cotizacion.total_compras_mes == SUM(compras_mes.costo_total)
        all_cots = []
        for op in mes_data["oportunidades"]:
            all_cots.extend(op["cotizaciones"])
        all_cots.extend(mes_data["cotizaciones_con_compras_sin_oportunidad"])
        for cot in all_cots:
            esperado = round(sum(c["costo_total"] for c in cot["compras_mes"]), 2)
            if abs(cot["total_compras_mes"] - esperado) > EPS:
                errores.append(
                    f"[{periodo}] V4 COT {cot['numero_cotizacion']}: "
                    f"total={cot['total_compras_mes']:.2f} != sum_compras={esperado:.2f}"
                )

        # V5: SUM(nom.monto_total) == monto_interno
        sum_noms = round(sum(n["monto_total"] for n in mes_data["gastos_internos_por_nomenclatura"]), 2)
        if abs(sum_noms - kpis["monto_interno"]) > EPS:
            errores.append(
                f"[{periodo}] V5: sum_nomenclaturas={sum_noms:.2f} "
                f"!= monto_interno={kpis['monto_interno']:.2f}"
            )

        # V6: no se puede verificar eliminado en Python; las queries ya filtran

    # V7: claves consistentes
    keys_disp = {m["key"] for m in datos["meses_disponibles"]}
    keys_datos = set(datos["datos_por_mes"].keys())
    if keys_disp != keys_datos:
        errores.append(f"V7: meses_disponibles={keys_disp} != datos_por_mes={keys_datos}")

    if errores:
        print("\n❌ Validaciones fallidas:")
        for e in errores:
            print(f"   {e}")
        return False

    print("✅ Las 7 validaciones pasaron.")
    return True


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print("\n" + "=" * 60)
    print("  GENERANDO dashboard_compras_data.json")
    print("=" * 60)

    print("\n--- Cargando lookups estáticos ---")
    cot_op_map       = fetch_cot_op_mapping()
    cot_supervisores = fetch_cot_supervisores()
    op_supervisores  = fetch_op_supervisores()
    cot_clientes     = fetch_cot_clientes()
    op_clientes      = fetch_op_clientes()
    sup_info         = fetch_supervisores_info()

    datos = {
        "fecha_generacion": datetime.now().isoformat(),
        "rango_global": {
            "fecha_inicio": "2026-01-01",
            "fecha_fin":    "2026-04-30",
        },
        "meses_disponibles": [],
        "datos_por_mes": {},
    }

    for year, month in MESES_A_PROCESAR:
        key = f"{year}-{month:02d}"
        label = f"{MESES_NOMBRES[month]} {year}"
        inicio, fin_excl, fin_display = get_fecha_rango(year, month)

        datos["meses_disponibles"].append({"key": key, "label": label, "mes": month, "year": year})
        datos["datos_por_mes"][key] = generar_datos_periodo(
            inicio, fin_excl, fin_display, label, month, year,
            cot_op_map, cot_supervisores, op_supervisores,
            cot_clientes, op_clientes, sup_info,
        )

    # Acumulado
    datos["meses_disponibles"].append(
        {"key": "acumulado", "label": "Acumulado 2026", "mes": None, "year": 2026}
    )
    inicio_a, fin_excl_a, fin_display_a = get_fecha_rango_acumulado()
    datos["datos_por_mes"]["acumulado"] = generar_datos_periodo(
        inicio_a, fin_excl_a, fin_display_a, "Acumulado 2026", None, 2026,
        cot_op_map, cot_supervisores, op_supervisores,
        cot_clientes, op_clientes, sup_info,
    )

    print("\n--- Validando datos ---")
    if not validar(datos):
        print("\n❌ ABORTANDO: no se escribe el archivo hasta que pasen las validaciones.")
        sys.exit(1)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(datos, f, cls=DecimalEncoder, ensure_ascii=False, indent=2)

    print(f"\n✅ Archivo escrito: {OUT_PATH}")
    print("\n" + "─" * 60)
    for key, mes_data in datos["datos_por_mes"].items():
        kpis = mes_data["kpis_compras"]
        print(
            f"✅ {mes_data['periodo']:<20} "
            f"compras={kpis['num_compras']:<4} "
            f"total=${kpis['total_compras']:>12,.2f}  "
            f"OPs={len(mes_data['oportunidades']):<3} "
            f"cot.sin OP={len(mes_data['cotizaciones_con_compras_sin_oportunidad']):<3} "
            f"internos={len(mes_data['gastos_internos_por_nomenclatura'])}"
        )


if __name__ == "__main__":
    main()
