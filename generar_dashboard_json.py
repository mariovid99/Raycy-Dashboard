"""
Script para generar JSON con todos los KPIs por mes
Genera un archivo JSON completo con datos de múltiples meses para consumir en un dashboard web
"""

import psycopg2
from psycopg2 import Error
from decimal import Decimal
from datetime import datetime, date
import json
import sys
import calendar

# Importar la configuración de conexión
try:
    from azure_postgres_connection import get_connection
except ImportError:
    print("❌ Error: No se pudo importar azure_postgres_connection.py")
    sys.exit(1)


# Convertidor personalizado para JSON
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super(DecimalEncoder, self).default(obj)


def ejecutar_query(query, descripcion):
    """
    Ejecuta un query y retorna los resultados como lista de diccionarios
    """
    connection = None
    cursor = None
    
    try:
        print(f"🔄 Ejecutando: {descripcion}...")
        connection = get_connection()
        
        if not connection:
            print(f"❌ No se pudo establecer la conexión para {descripcion}")
            return None
        
        cursor = connection.cursor()
        cursor.execute(query)
        
        # Obtener nombres de columnas
        columnas = [desc[0] for desc in cursor.description]
        
        # Convertir resultados a lista de diccionarios
        resultados = []
        for fila in cursor.fetchall():
            resultado = {}
            for i, columna in enumerate(columnas):
                resultado[columna] = fila[i]
            resultados.append(resultado)
        
        print(f"✅ {descripcion}: {len(resultados)} registros")
        return resultados
        
    except Error as e:
        print(f"❌ Error en {descripcion}: {e}")
        return None
        
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def get_fecha_rango(year, month):
    """Retorna fecha_inicio y fecha_fin para un mes dado"""
    fecha_inicio = f"{year}-{month:02d}-01"
    if month == 12:
        fecha_fin = f"{year + 1}-01-01"
    else:
        fecha_fin = f"{year}-{month + 1:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    fecha_fin_display = f"{year}-{month:02d}-{last_day}"
    return fecha_inicio, fecha_fin, fecha_fin_display


def obtener_cotizaciones_por_supervisor(fecha_inicio, fecha_fin, mes_label):
    """Query 1: Cotizaciones completas por supervisor para un mes dado"""
    query = f"""
    WITH cotizaciones_mes AS (
        SELECT 
            c.id as cotizacion_id,
            c.numero_cotizacion,
            c.fecha_cotizacion,
            c.precio_total,
            c.costo_total as costo_cotizado,
            c.margen_estimado,
            c.estado
        FROM public.core_cotizacion c
        WHERE c.fecha_cotizacion >= '{fecha_inicio}' 
          AND c.fecha_cotizacion < '{fecha_fin}'
          AND c.eliminado = FALSE
    ),
    compras_mes_proyecto AS (
        SELECT 
            co.supervisor_id,
            COUNT(co.id) as num_compras,
            SUM(co.costo_total) as gasto_total,
            SUM(co.total_mano_obra) as suma_mano_obra,
            COUNT(CASE WHEN co.facturado = TRUE THEN 1 END) as compras_facturadas,
            COUNT(CASE WHEN co.pagado = TRUE THEN 1 END) as compras_pagadas,
            COUNT(CASE WHEN co.concluido = TRUE THEN 1 END) as compras_concluidas,
            SUM(CASE WHEN co.tipo_compra_proyecto = 'material' THEN co.costo_total ELSE 0 END) as total_materiales,
            SUM(CASE WHEN co.tipo_compra_proyecto = 'mano_obra' THEN co.costo_total ELSE 0 END) as total_mano_obra_tipo,
            SUM(CASE WHEN co.pagado = FALSE THEN co.costo_total ELSE 0 END) as monto_pendiente_pago
        FROM public.core_compra co
        WHERE co.fecha_compra >= '{fecha_inicio}' 
          AND co.fecha_compra < '{fecha_fin}' 
          AND co.tipo_compra = 'proyecto'
          AND co.eliminado = FALSE
        GROUP BY co.supervisor_id
    )
    SELECT 
        s.id as supervisor_id,
        s.nombre as supervisor_nombre,
        s.email as supervisor_email,
        COUNT(DISTINCT cm.cotizacion_id) as num_cotizaciones,
        SUM(cm.precio_total) as venta_total,
        ROUND(AVG(cm.precio_total)::numeric, 2) as venta_promedio,
        COALESCE(cmp.gasto_total, 0) as gasto_mes,
        COALESCE(cmp.num_compras, 0) as num_compras_mes,
        COALESCE(cmp.suma_mano_obra, 0) as suma_mano_obra,
        SUM(cm.margen_estimado) as margen_estimado,
        SUM(cm.precio_total) - COALESCE(cmp.gasto_total, 0) as margen_real,
        CASE 
            WHEN COALESCE(cmp.gasto_total, 0) > 0 THEN 
                ROUND(((SUM(cm.precio_total) - COALESCE(cmp.gasto_total, 0)) / 
                       cmp.gasto_total * 100)::numeric, 2)
            ELSE 0 
        END as porcentaje_margen,
        CASE 
            WHEN COALESCE(cmp.gasto_total, 0) = 0 THEN 
                ROUND((SUM(cm.costo_cotizado) / NULLIF(SUM(cm.precio_total), 0) * 100)::numeric, 2)
            ELSE 
                ROUND((cmp.gasto_total / NULLIF(SUM(cm.costo_cotizado), 0) * 100)::numeric, 2)
        END as porcentaje_ejecucion_presupuesto,
        COALESCE(cmp.compras_facturadas, 0) as compras_facturadas,
        COALESCE(cmp.compras_pagadas, 0) as compras_pagadas,
        COALESCE(cmp.compras_concluidas, 0) as compras_concluidas,
        COALESCE(cmp.total_materiales, 0) as total_materiales,
        COALESCE(cmp.total_mano_obra_tipo, 0) as total_mano_obra_tipo,
        COALESCE(cmp.monto_pendiente_pago, 0) as monto_pendiente_pagar_proveedores
    FROM public.core_supervisor s
    INNER JOIN public.core_cotizacion_supervisores cs ON s.id = cs.supervisor_id
    INNER JOIN cotizaciones_mes cm ON cs.cotizacion_id = cm.cotizacion_id
    LEFT JOIN compras_mes_proyecto cmp ON s.id = cmp.supervisor_id
    WHERE s.eliminado = FALSE
    GROUP BY s.id, s.nombre, s.email, cmp.gasto_total, cmp.num_compras, cmp.suma_mano_obra,
             cmp.compras_facturadas, cmp.compras_pagadas, cmp.compras_concluidas,
             cmp.total_materiales, cmp.total_mano_obra_tipo, cmp.monto_pendiente_pago
    ORDER BY venta_total DESC;
    """
    return ejecutar_query(query, f"Cotizaciones por Supervisor - {mes_label}")


def obtener_cotizaciones_con_gastos(fecha_inicio, fecha_fin, mes_label):
    """Query 2: Cotizaciones del mes con compras en el mes"""
    query = f"""
    SELECT 
        c.id as cotizacion_id,
        c.numero_cotizacion,
        c.fecha_cotizacion,
        c.precio_total,
        c.costo_total as costo_cotizado,
        c.estado as estado_cotizacion,
        COUNT(co.id) as num_compras_mes,
        SUM(co.costo_total) as total_compras_mes,
        (c.precio_total - SUM(co.costo_total)) as diferencia,
        BOOL_OR(co.pagado) as alguna_pagada,
        BOOL_AND(co.pagado) as todas_pagadas,
        BOOL_OR(co.facturado) as alguna_facturada,
        BOOL_AND(co.facturado) as todas_facturadas,
        BOOL_OR(co.concluido) as alguna_concluida,
        BOOL_AND(co.concluido) as todas_concluidas
    FROM public.core_cotizacion c
    INNER JOIN public.core_compra co ON c.id = co.cotizacion_id
    WHERE co.fecha_compra >= '{fecha_inicio}' 
      AND co.fecha_compra < '{fecha_fin}'
      AND co.eliminado = FALSE
      AND c.eliminado = FALSE
      AND c.fecha_cotizacion >= '{fecha_inicio}'
      AND c.fecha_cotizacion < '{fecha_fin}'
    GROUP BY c.id, c.numero_cotizacion, c.fecha_cotizacion, 
             c.precio_total, c.costo_total, c.estado
    ORDER BY c.numero_cotizacion;
    """
    return ejecutar_query(query, f"Cotizaciones con Gastos - {mes_label}")


def obtener_cotizaciones_con_gastos_por_supervisor(fecha_inicio, fecha_fin, mes_label):
    """Query 3: Cotizaciones con gastos agrupadas por supervisor"""
    query = f"""
    SELECT 
        s.id as supervisor_id,
        s.nombre as supervisor_nombre,
        COUNT(DISTINCT c.id) as num_cotizaciones_con_gastos,
        SUM(c.precio_total) as total_presupuestado,
        SUM(c.costo_total) as total_costo_cotizado,
        SUM(gastos_mes.total_compras) as total_gastado_mes,
        SUM(c.precio_total - gastos_mes.total_compras) as diferencia_presupuesto_vs_gasto,
        COUNT(CASE WHEN gastos_mes.todas_pagadas = TRUE THEN 1 END) as cotizaciones_totalmente_pagadas,
        COUNT(CASE WHEN gastos_mes.todas_pagadas = FALSE THEN 1 END) as cotizaciones_con_pagos_pendientes,
        COUNT(CASE WHEN gastos_mes.todas_facturadas = TRUE THEN 1 END) as cotizaciones_totalmente_facturadas,
        COUNT(CASE WHEN gastos_mes.todas_concluidas = TRUE THEN 1 END) as cotizaciones_concluidas,
        SUM(CASE WHEN gastos_mes.todas_pagadas = FALSE THEN gastos_mes.total_compras ELSE 0 END) as monto_pendiente_pago
    FROM public.core_supervisor s
    INNER JOIN public.core_cotizacion_supervisores cs ON s.id = cs.supervisor_id
    INNER JOIN public.core_cotizacion c ON cs.cotizacion_id = c.id
    INNER JOIN (
        SELECT 
            co.cotizacion_id,
            COUNT(co.id) as num_compras,
            SUM(co.costo_total) as total_compras,
            BOOL_AND(co.pagado) as todas_pagadas,
            BOOL_AND(co.facturado) as todas_facturadas,
            BOOL_AND(co.concluido) as todas_concluidas
        FROM public.core_compra co
        WHERE co.fecha_compra >= '{fecha_inicio}' 
          AND co.fecha_compra < '{fecha_fin}'
          AND co.eliminado = FALSE
          AND co.cotizacion_id IS NOT NULL
        GROUP BY co.cotizacion_id
    ) gastos_mes ON c.id = gastos_mes.cotizacion_id
    WHERE s.eliminado = FALSE
      AND c.eliminado = FALSE
      AND c.fecha_cotizacion >= '{fecha_inicio}'
      AND c.fecha_cotizacion < '{fecha_fin}'
    GROUP BY s.id, s.nombre
    ORDER BY total_presupuestado DESC;
    """
    return ejecutar_query(query, f"Cotizaciones con Gastos por Supervisor - {mes_label}")


def obtener_cotizaciones_con_oportunidad(fecha_inicio, fecha_fin, mes_label):
    """Query 4: Cotizaciones del mes con oportunidades"""
    query = f"""
    WITH cotizaciones_mes AS (
        SELECT 
            c.id as cotizacion_id,
            c.numero_cotizacion,
            c.fecha_cotizacion,
            c.precio_total,
            c.costo_total as costo_cotizado,
            c.margen_estimado,
            c.estado as estado_cotizacion
        FROM public.core_cotizacion c
        WHERE c.fecha_cotizacion >= '{fecha_inicio}' 
          AND c.fecha_cotizacion < '{fecha_fin}'
          AND c.eliminado = FALSE
    ),
    cotizaciones_con_oportunidad AS (
        SELECT 
            cm.cotizacion_id,
            cm.numero_cotizacion,
            cm.fecha_cotizacion,
            cm.precio_total,
            cm.costo_cotizado,
            cm.margen_estimado,
            cm.estado_cotizacion,
            o.id as oportunidad_id,
            o.codigo_op,
            o.facturado as op_facturado,
            o.pagado as op_pagado,
            o.concluido as op_concluido
        FROM cotizaciones_mes cm
        INNER JOIN public.core_oportunidad_cotizaciones oc ON cm.cotizacion_id = oc.cotizacion_id
        INNER JOIN public.core_oportunidad o ON oc.oportunidad_id = o.id
        WHERE o.eliminado = FALSE
    ),
    compras_mes_por_cotizacion AS (
        SELECT 
            co.cotizacion_id,
            COUNT(co.id) as num_compras,
            SUM(co.costo_total) as total_gastado,
            BOOL_AND(co.pagado) as todas_compras_pagadas,
            BOOL_AND(co.facturado) as todas_compras_facturadas,
            BOOL_AND(co.concluido) as todas_compras_concluidas,
            SUM(CASE WHEN co.pagado = FALSE THEN co.costo_total ELSE 0 END) as monto_compras_pendiente
        FROM public.core_compra co
        INNER JOIN cotizaciones_mes cm ON co.cotizacion_id = cm.cotizacion_id
        WHERE co.fecha_compra >= '{fecha_inicio}' 
          AND co.fecha_compra < '{fecha_fin}'
          AND co.eliminado = FALSE
        GROUP BY co.cotizacion_id
    ),
    supervisores_por_cotizacion AS (
        SELECT 
            cs.cotizacion_id,
            STRING_AGG(s.nombre, ', ' ORDER BY s.nombre) as supervisores
        FROM public.core_cotizacion_supervisores cs
        INNER JOIN public.core_supervisor s ON cs.supervisor_id = s.id
        WHERE s.eliminado = FALSE
        GROUP BY cs.cotizacion_id
    )
    SELECT 
        cco.cotizacion_id,
        cco.numero_cotizacion,
        cco.fecha_cotizacion,
        cco.estado_cotizacion,
        cco.oportunidad_id,
        cco.codigo_op,
        COALESCE(spc.supervisores, 'Sin supervisor') as supervisores_asignados,
        cco.precio_total as ingreso_presupuestado,
        cco.costo_cotizado,
        cco.margen_estimado,
        COALESCE(cme.num_compras, 0) as num_compras_mes,
        COALESCE(cme.total_gastado, 0) as gasto_real_mes,
        cco.precio_total - COALESCE(cme.total_gastado, 0) as margen_real,
        CASE 
            WHEN COALESCE(cme.total_gastado, 0) > 0 THEN 
                ROUND(((cco.precio_total - COALESCE(cme.total_gastado, 0)) / 
                       cme.total_gastado * 100)::numeric, 2)
            ELSE 0 
        END as porcentaje_margen,
        cco.costo_cotizado - COALESCE(cme.total_gastado, 0) as diferencia_costo_vs_gasto,
        CASE WHEN cco.op_facturado THEN 'Facturado' ELSE 'Pendiente Facturar' END as estado_facturacion,
        CASE WHEN cco.op_pagado THEN 'Cobrado' ELSE 'Pendiente Cobro' END as estado_cobro,
        CASE WHEN cco.op_concluido THEN 'Concluido' ELSE 'En Proceso' END as estado_conclusion,
        CASE 
            WHEN cme.num_compras IS NULL THEN 'Sin compras'
            WHEN cme.todas_compras_pagadas THEN 'Todo pagado'
            ELSE 'Pendiente pago'
        END as estado_pago_compras,
        CASE 
            WHEN cme.num_compras IS NULL THEN 'Sin compras'
            WHEN cme.todas_compras_facturadas THEN 'Todo facturado'
            ELSE 'Pendiente facturación'
        END as estado_facturacion_compras,
        CASE 
            WHEN cme.num_compras IS NULL THEN 'Sin compras'
            WHEN cme.todas_compras_concluidas THEN 'Todo concluido'
            ELSE 'Pendiente conclusión'
        END as estado_conclusion_compras,
        COALESCE(cme.monto_compras_pendiente, 0) as monto_pendiente_pagar_proveedores,
        CASE 
            WHEN cco.op_pagado AND (cme.todas_compras_pagadas OR cme.num_compras IS NULL) THEN 'Operación cerrada'
            WHEN cco.op_pagado AND NOT cme.todas_compras_pagadas THEN 'Cliente pagó, faltan proveedores'
            WHEN NOT cco.op_pagado AND cme.todas_compras_pagadas THEN 'Proveedores pagados, falta cliente'
            WHEN NOT cco.op_pagado AND NOT COALESCE(cme.todas_compras_pagadas, TRUE) THEN 'Pendiente cobro y pago'
            ELSE 'En proceso'
        END as analisis_flujo_efectivo
    FROM cotizaciones_con_oportunidad cco
    LEFT JOIN compras_mes_por_cotizacion cme ON cco.cotizacion_id = cme.cotizacion_id
    LEFT JOIN supervisores_por_cotizacion spc ON cco.cotizacion_id = spc.cotizacion_id
    ORDER BY cco.fecha_cotizacion DESC, cco.numero_cotizacion;
    """
    return ejecutar_query(query, f"Cotizaciones con Oportunidad - {mes_label}")


def obtener_cotizaciones_con_oportunidad_por_supervisor(fecha_inicio, fecha_fin, mes_label):
    """Query 5: Cotizaciones con oportunidades agrupadas por supervisor"""
    query = f"""
    WITH cotizaciones_mes AS (
        SELECT 
            c.id as cotizacion_id,
            c.numero_cotizacion,
            c.fecha_cotizacion,
            c.precio_total,
            c.costo_total as costo_cotizado,
            c.margen_estimado
        FROM public.core_cotizacion c
        WHERE c.fecha_cotizacion >= '{fecha_inicio}' 
          AND c.fecha_cotizacion < '{fecha_fin}'
          AND c.eliminado = FALSE
    ),
    cotizaciones_con_oportunidad AS (
        SELECT 
            cm.cotizacion_id,
            cm.numero_cotizacion,
            cm.fecha_cotizacion,
            cm.precio_total,
            cm.costo_cotizado,
            cm.margen_estimado,
            o.id as oportunidad_id,
            o.codigo_op,
            o.facturado as op_facturado,
            o.pagado as op_pagado,
            o.concluido as op_concluido
        FROM cotizaciones_mes cm
        INNER JOIN public.core_oportunidad_cotizaciones oc ON cm.cotizacion_id = oc.cotizacion_id
        INNER JOIN public.core_oportunidad o ON oc.oportunidad_id = o.id
        WHERE o.eliminado = FALSE
    ),
    compras_mes_por_cotizacion AS (
        SELECT 
            co.cotizacion_id,
            COUNT(co.id) as num_compras,
            SUM(co.costo_total) as total_gastado,
            BOOL_AND(co.pagado) as todas_compras_pagadas,
            BOOL_AND(co.facturado) as todas_compras_facturadas,
            BOOL_AND(co.concluido) as todas_compras_concluidas,
            SUM(CASE WHEN co.pagado = FALSE THEN co.costo_total ELSE 0 END) as monto_compras_pendiente
        FROM public.core_compra co
        INNER JOIN cotizaciones_mes cm ON co.cotizacion_id = cm.cotizacion_id
        WHERE co.fecha_compra >= '{fecha_inicio}' 
          AND co.fecha_compra < '{fecha_fin}'
          AND co.eliminado = FALSE
        GROUP BY co.cotizacion_id
    )
    SELECT 
        s.id as supervisor_id,
        s.nombre as supervisor_nombre,
        s.email as supervisor_email,
        COUNT(DISTINCT cco.cotizacion_id) as num_cotizaciones,
        COUNT(DISTINCT cco.oportunidad_id) as num_oportunidades,
        SUM(cco.precio_total) as ingreso_total_presupuestado,
        SUM(cco.costo_cotizado) as costo_total_cotizado,
        SUM(cco.margen_estimado) as margen_estimado_total,
        COALESCE(SUM(cme.total_gastado), 0) as gasto_real_mes,
        COALESCE(SUM(cme.num_compras), 0) as num_compras_mes,
        SUM(cco.precio_total) - COALESCE(SUM(cme.total_gastado), 0) as margen_real,
        CASE 
            WHEN COALESCE(SUM(cme.total_gastado), 0) > 0 THEN 
                ROUND(((SUM(cco.precio_total) - COALESCE(SUM(cme.total_gastado), 0)) / 
                       COALESCE(SUM(cme.total_gastado), 1) * 100)::numeric, 2)
            ELSE 0 
        END as porcentaje_margen,
        COUNT(CASE WHEN cco.op_facturado = TRUE THEN 1 END) as oportunidades_facturadas,
        COUNT(CASE WHEN cco.op_facturado = FALSE THEN 1 END) as oportunidades_sin_facturar,
        SUM(CASE WHEN cco.op_facturado = TRUE THEN cco.precio_total ELSE 0 END) as monto_facturado,
        SUM(CASE WHEN cco.op_facturado = FALSE THEN cco.precio_total ELSE 0 END) as monto_pendiente_facturar,
        COUNT(CASE WHEN cco.op_pagado = TRUE THEN 1 END) as oportunidades_cobradas,
        COUNT(CASE WHEN cco.op_pagado = FALSE THEN 1 END) as oportunidades_pendiente_cobro,
        SUM(CASE WHEN cco.op_pagado = TRUE THEN cco.precio_total ELSE 0 END) as monto_cobrado,
        SUM(CASE WHEN cco.op_pagado = FALSE THEN cco.precio_total ELSE 0 END) as monto_por_cobrar,
        COUNT(CASE WHEN cco.op_concluido = TRUE THEN 1 END) as oportunidades_concluidas,
        COUNT(CASE WHEN cco.op_concluido = FALSE THEN 1 END) as oportunidades_en_proceso,
        COUNT(CASE WHEN cme.todas_compras_pagadas = TRUE THEN 1 END) as cotizaciones_compras_pagadas,
        COUNT(CASE WHEN cme.todas_compras_pagadas = FALSE THEN 1 END) as cotizaciones_compras_pendientes,
        COALESCE(SUM(cme.monto_compras_pendiente), 0) as monto_pendiente_pagar_proveedores
    FROM public.core_supervisor s
    INNER JOIN public.core_cotizacion_supervisores cs ON s.id = cs.supervisor_id
    INNER JOIN cotizaciones_con_oportunidad cco ON cs.cotizacion_id = cco.cotizacion_id
    LEFT JOIN compras_mes_por_cotizacion cme ON cco.cotizacion_id = cme.cotizacion_id
    WHERE s.eliminado = FALSE
    GROUP BY s.id, s.nombre, s.email
    ORDER BY ingreso_total_presupuestado DESC;
    """
    return ejecutar_query(query, f"Cotizaciones con Oportunidad por Supervisor - {mes_label}")


MESES_NOMBRES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}


def generar_datos_mes(year, month):
    """Ejecuta todas las queries para un mes específico y retorna los datos"""
    mes_label = f"{MESES_NOMBRES[month]} {year}"
    fecha_inicio, fecha_fin, fecha_fin_display = get_fecha_rango(year, month)
    
    print(f"\n{'─'*50}")
    print(f"  Procesando: {mes_label}")
    print(f"  Rango: {fecha_inicio} a {fecha_fin_display}")
    print(f"{'─'*50}")
    
    datos_mes = {
        'mes': month,
        'year': year,
        'mes_nombre': MESES_NOMBRES[month],
        'periodo': mes_label,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin_display,
    }
    
    datos_mes['cotizaciones_por_supervisor'] = obtener_cotizaciones_por_supervisor(fecha_inicio, fecha_fin, mes_label) or []
    datos_mes['cotizaciones_con_gastos'] = obtener_cotizaciones_con_gastos(fecha_inicio, fecha_fin, mes_label) or []
    datos_mes['cotizaciones_con_gastos_por_supervisor'] = obtener_cotizaciones_con_gastos_por_supervisor(fecha_inicio, fecha_fin, mes_label) or []
    datos_mes['cotizaciones_con_oportunidad'] = obtener_cotizaciones_con_oportunidad(fecha_inicio, fecha_fin, mes_label) or []
    datos_mes['cotizaciones_con_oportunidad_por_supervisor'] = obtener_cotizaciones_con_oportunidad_por_supervisor(fecha_inicio, fecha_fin, mes_label) or []
    
    return datos_mes


def generar_json_dashboard():
    """
    Función principal que ejecuta todos los queries para cada mes y genera el JSON combinado
    """
    meses_a_procesar = [
        (2026, 1),   # Enero 2026
        (2026, 2),   # Febrero 2026
        (2026, 3),   # Marzo 2026
        (2026, 4),   # Abril 2026
    ]
    
    print("\n" + "="*60)
    print("GENERANDO JSON PARA DASHBOARD - MULTI-MES")
    print(f"Meses: {', '.join([f'{MESES_NOMBRES[m]} {y}' for y, m in meses_a_procesar])}")
    print("="*60)
    
    datos = {
        'fecha_generacion': datetime.now().isoformat(),
        'meses_disponibles': [],
        'datos_por_mes': {}
    }
    
    for year, month in meses_a_procesar:
        mes_key = f"{year}-{month:02d}"
        mes_datos = generar_datos_mes(year, month)
        datos['datos_por_mes'][mes_key] = mes_datos
        datos['meses_disponibles'].append({
            'key': mes_key,
            'label': f"{MESES_NOMBRES[month]} {year}",
            'mes': month,
            'year': year
        })
    
    nombre_archivo = 'dashboard_data.json'
    
    try:
        with open(nombre_archivo, 'w', encoding='utf-8') as f:
            json.dump(datos, f, cls=DecimalEncoder, ensure_ascii=False, indent=2)
        
        print("\n" + "="*60)
        print(f"✅ JSON generado exitosamente: {nombre_archivo}")
        print("="*60)
        
        for mes_info in datos['meses_disponibles']:
            mes_key = mes_info['key']
            mes_data = datos['datos_por_mes'][mes_key]
            supervisores = mes_data.get('cotizaciones_por_supervisor', [])
            total_ventas = sum(s.get('venta_total', 0) or 0 for s in supervisores)
            total_gastos = sum(s.get('gasto_mes', 0) or 0 for s in supervisores)
            total_cots = sum(s.get('num_cotizaciones', 0) or 0 for s in supervisores)
            
            print(f"\n📊 {mes_info['label']}:")
            print(f"   - Cotizaciones: {total_cots}")
            print(f"   - Ventas Totales: ${total_ventas:,.2f}")
            print(f"   - Gastos Totales: ${total_gastos:,.2f}")
            print(f"   - Con Gastos: {len(mes_data.get('cotizaciones_con_gastos', []))}")
            print(f"   - Con Oportunidad: {len(mes_data.get('cotizaciones_con_oportunidad', []))}")
        
        print()
        return True
        
    except Exception as e:
        print(f"\n❌ Error al guardar JSON: {e}")
        return False


if __name__ == "__main__":
    exito = generar_json_dashboard()
    
    if exito:
        print("🎉 Proceso completado. El archivo JSON está listo para el dashboard.")
    else:
        print("❌ Hubo errores durante la generación del JSON.")
        sys.exit(1)
