"""
Script para calcular KPIs por Supervisor - Enero 2026
Calcula ingresos (cotizaciones) y gastos (compras) por supervisor
"""

import psycopg2
from psycopg2 import Error
from decimal import Decimal
from datetime import datetime
import sys

# Importar la configuración de conexión
try:
    from azure_postgres_connection import get_connection
except ImportError:
    print("❌ Error: No se pudo importar azure_postgres_connection.py")
    print("   Asegúrate de que el archivo existe en el mismo directorio")
    sys.exit(1)


def obtener_kpis_supervisor_enero_2026():
    """
    Obtiene los KPIs de ingresos y gastos por supervisor para enero 2026
    
    Returns:
        list: Lista de diccionarios con KPIs por supervisor
    """
    connection = None
    cursor = None
    
    try:
        # Conectar a la base de datos
        print("🔄 Conectando a la base de datos...")
        connection = get_connection()
        
        if not connection:
            print("❌ No se pudo establecer la conexión")
            return None
        
        cursor = connection.cursor()
        print("✅ Conexión establecida\n")
        
        # ==================================================
        # QUERY PRINCIPAL: KPIs por Supervisor - Enero 2026
        # ==================================================
        
        query = """
        WITH ingresos_por_supervisor AS (
            -- Calcular ingresos totales por supervisor desde cotizaciones
            SELECT 
                s.id as supervisor_id,
                s.nombre as supervisor_nombre,
                s.email as supervisor_email,
                COALESCE(SUM(c.precio_total), 0) as total_ingresos,
                COUNT(DISTINCT c.id) as num_cotizaciones
            FROM core_supervisor s
            LEFT JOIN core_cotizacion_supervisores cs ON s.id = cs.supervisor_id
            LEFT JOIN core_cotizacion c ON cs.cotizacion_id = c.id 
                AND c.fecha_cotizacion >= '2026-01-01'
                AND c.fecha_cotizacion <= '2026-01-31'
                AND c.eliminado = FALSE
            WHERE s.eliminado = FALSE
            GROUP BY s.id, s.nombre, s.email
        ),
        gastos_por_supervisor AS (
            -- Calcular gastos totales por supervisor desde compras
            SELECT 
                s.id as supervisor_id,
                COALESCE(SUM(co.costo_total), 0) as total_gastos,
                COUNT(co.id) as num_compras
            FROM core_supervisor s
            LEFT JOIN core_compra co ON s.id = co.supervisor_id
                AND co.fecha_compra >= '2026-01-01'
                AND co.fecha_compra <= '2026-01-31'
                AND co.eliminado = FALSE
            WHERE s.eliminado = FALSE
            GROUP BY s.id
        )
        SELECT 
            i.supervisor_id,
            i.supervisor_nombre,
            i.supervisor_email,
            i.total_ingresos,
            i.num_cotizaciones,
            g.total_gastos,
            g.num_compras,
            (i.total_ingresos - g.total_gastos) as margen,
            CASE 
                WHEN g.total_gastos > 0 THEN 
                    ROUND(((i.total_ingresos - g.total_gastos) / g.total_gastos * 100)::numeric, 2)
                ELSE 0 
            END as porcentaje_margen
        FROM ingresos_por_supervisor i
        INNER JOIN gastos_por_supervisor g ON i.supervisor_id = g.supervisor_id
        WHERE i.total_ingresos > 0 OR g.total_gastos > 0  -- Solo supervisores con actividad
        ORDER BY margen DESC;
        """
        
        print("📊 Ejecutando consulta de KPIs...")
        cursor.execute(query)
        resultados = cursor.fetchall()
        
        # Convertir resultados a lista de diccionarios
        kpis = []
        for row in resultados:
            kpi = {
                'supervisor_id': row[0],
                'supervisor_nombre': row[1],
                'supervisor_email': row[2],
                'total_ingresos': float(row[3]) if row[3] else 0.0,
                'num_cotizaciones': row[4] if row[4] else 0,
                'total_gastos': float(row[5]) if row[5] else 0.0,
                'num_compras': row[6] if row[6] else 0,
                'margen': float(row[7]) if row[7] else 0.0,
                'porcentaje_margen': float(row[8]) if row[8] else 0.0
            }
            kpis.append(kpi)
        
        return kpis
        
    except Error as e:
        print(f"❌ Error al ejecutar la consulta: {e}")
        return None
        
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def mostrar_kpis(kpis):
    """
    Muestra los KPIs de forma formateada
    
    Args:
        kpis (list): Lista de diccionarios con KPIs
    """
    if not kpis:
        print("⚠️  No se encontraron datos para mostrar")
        return
    
    print("\n" + "="*120)
    print("📊 KPIs POR SUPERVISOR - ENERO 2026")
    print("="*120)
    
    # Calcular totales generales
    total_ingresos_general = sum(k['total_ingresos'] for k in kpis)
    total_gastos_general = sum(k['total_gastos'] for k in kpis)
    margen_general = total_ingresos_general - total_gastos_general
    
    # Mostrar resumen general
    print(f"\n{'RESUMEN GENERAL':^120}")
    print("-"*120)
    print(f"{'Total Ingresos:':<30} ${total_ingresos_general:>20,.2f}")
    print(f"{'Total Gastos:':<30} ${total_gastos_general:>20,.2f}")
    print(f"{'Margen Total:':<30} ${margen_general:>20,.2f}")
    if total_gastos_general > 0:
        porcentaje_general = (margen_general / total_gastos_general) * 100
        print(f"{'Porcentaje de Margen:':<30} {porcentaje_general:>20.2f}%")
    print("-"*120)
    
    # Tabla de KPIs por supervisor
    print(f"\n{'DETALLE POR SUPERVISOR':^120}")
    print("="*120)
    
    # Encabezados
    print(f"{'Supervisor':<25} {'Ingresos':>15} {'#Cot':>6} {'Gastos':>15} {'#Com':>6} {'Margen':>15} {'%Marg':>8}")
    print("-"*120)
    
    # Datos por supervisor
    for kpi in kpis:
        nombre = kpi['supervisor_nombre'][:24]  # Truncar si es muy largo
        ingresos = kpi['total_ingresos']
        num_cot = kpi['num_cotizaciones']
        gastos = kpi['total_gastos']
        num_com = kpi['num_compras']
        margen = kpi['margen']
        porcentaje = kpi['porcentaje_margen']
        
        print(f"{nombre:<25} ${ingresos:>13,.2f} {num_cot:>6} ${gastos:>13,.2f} {num_com:>6} ${margen:>13,.2f} {porcentaje:>7.2f}%")
    
    print("="*120)
    print(f"\nTotal de supervisores con actividad: {len(kpis)}")
    print()


def obtener_detalle_cotizaciones_supervisor(supervisor_id, supervisor_nombre):
    """
    Obtiene el detalle de cotizaciones de un supervisor específico
    
    Args:
        supervisor_id (int): ID del supervisor
        supervisor_nombre (str): Nombre del supervisor
    """
    connection = None
    cursor = None
    
    try:
        connection = get_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        
        query = """
        SELECT 
            c.numero_cotizacion,
            c.fecha_cotizacion,
            cl.nombre as cliente_nombre,
            c.precio_total,
            c.costo_total,
            c.margen_estimado,
            c.estado
        FROM core_cotizacion c
        INNER JOIN core_cotizacion_supervisores cs ON c.id = cs.cotizacion_id
        LEFT JOIN core_cliente cl ON c.cliente_id = cl.id
        WHERE cs.supervisor_id = %s
            AND c.fecha_cotizacion >= '2026-01-01'
            AND c.fecha_cotizacion <= '2026-01-31'
            AND c.eliminado = FALSE
        ORDER BY c.fecha_cotizacion DESC;
        """
        
        cursor.execute(query, (supervisor_id,))
        cotizaciones = cursor.fetchall()
        
        print(f"\n{'='*100}")
        print(f"COTIZACIONES DE {supervisor_nombre.upper()} - ENERO 2026")
        print("="*100)
        print(f"{'Núm. Cotización':<18} {'Fecha':^12} {'Cliente':<25} {'Precio':>15} {'Estado':<12}")
        print("-"*100)
        
        for cot in cotizaciones:
            num_cot = cot[0]
            fecha = cot[1].strftime('%Y-%m-%d') if cot[1] else 'N/A'
            cliente = (cot[2][:24] if cot[2] else 'Sin cliente')
            precio = float(cot[3]) if cot[3] else 0.0
            estado = cot[6] if cot[6] else 'N/A'
            
            print(f"{num_cot:<18} {fecha:^12} {cliente:<25} ${precio:>13,.2f} {estado:<12}")
        
        print("="*100)
        
    except Error as e:
        print(f"❌ Error: {e}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def obtener_detalle_compras_supervisor(supervisor_id, supervisor_nombre):
    """
    Obtiene el detalle de compras de un supervisor específico
    
    Args:
        supervisor_id (int): ID del supervisor
        supervisor_nombre (str): Nombre del supervisor
    """
    connection = None
    cursor = None
    
    try:
        connection = get_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        
        query = """
        SELECT 
            co.concepto,
            co.fecha_compra,
            p.nombre as proveedor_nombre,
            co.costo_total,
            co.tipo_compra,
            co.facturado,
            co.pagado
        FROM core_compra co
        INNER JOIN core_proveedor p ON co.proveedor_id = p.id
        WHERE co.supervisor_id = %s
            AND co.fecha_compra >= '2026-01-01'
            AND co.fecha_compra <= '2026-01-31'
            AND co.eliminado = FALSE
        ORDER BY co.fecha_compra DESC;
        """
        
        cursor.execute(query, (supervisor_id,))
        compras = cursor.fetchall()
        
        print(f"\n{'='*110}")
        print(f"COMPRAS DE {supervisor_nombre.upper()} - ENERO 2026")
        print("="*110)
        print(f"{'Concepto':<30} {'Fecha':^12} {'Proveedor':<25} {'Costo':>15} {'Fact':^6} {'Pag':^6}")
        print("-"*110)
        
        for comp in compras:
            concepto = comp[0][:29] if comp[0] else 'N/A'
            fecha = comp[1].strftime('%Y-%m-%d') if comp[1] else 'N/A'
            proveedor = comp[2][:24] if comp[2] else 'N/A'
            costo = float(comp[3]) if comp[3] else 0.0
            facturado = '✓' if comp[5] else '✗'
            pagado = '✓' if comp[6] else '✗'
            
            print(f"{concepto:<30} {fecha:^12} {proveedor:<25} ${costo:>13,.2f} {facturado:^6} {pagado:^6}")
        
        print("="*110)
        
    except Error as e:
        print(f"❌ Error: {e}")
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def menu_interactivo():
    """
    Menú interactivo para consultar KPIs
    """
    while True:
        print("\n" + "="*60)
        print("MENÚ DE CONSULTA DE KPIs - ENERO 2026")
        print("="*60)
        print("1. Ver resumen de KPIs por supervisor")
        print("2. Ver detalle de cotizaciones de un supervisor")
        print("3. Ver detalle de compras de un supervisor")
        print("4. Salir")
        print("="*60)
        
        opcion = input("\nSelecciona una opción (1-4): ").strip()
        
        if opcion == '1':
            kpis = obtener_kpis_supervisor_enero_2026()
            if kpis:
                mostrar_kpis(kpis)
                
        elif opcion == '2':
            supervisor_id = input("Ingresa el ID del supervisor: ").strip()
            supervisor_nombre = input("Ingresa el nombre del supervisor: ").strip()
            try:
                supervisor_id = int(supervisor_id)
                obtener_detalle_cotizaciones_supervisor(supervisor_id, supervisor_nombre)
            except ValueError:
                print("❌ ID inválido")
                
        elif opcion == '3':
            supervisor_id = input("Ingresa el ID del supervisor: ").strip()
            supervisor_nombre = input("Ingresa el nombre del supervisor: ").strip()
            try:
                supervisor_id = int(supervisor_id)
                obtener_detalle_compras_supervisor(supervisor_id, supervisor_nombre)
            except ValueError:
                print("❌ ID inválido")
                
        elif opcion == '4':
            print("\n👋 ¡Hasta luego!")
            break
        else:
            print("❌ Opción inválida")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("ANÁLISIS DE KPIs POR SUPERVISOR - ENERO 2026")
    print("Sistema de Gestión Raycy Software")
    print("="*60)
    
    # Ejecutar consulta principal
    kpis = obtener_kpis_supervisor_enero_2026()
    
    if kpis:
        mostrar_kpis(kpis)
        
        # Preguntar si quiere ver más detalles
        print("\n¿Deseas ver más detalles?")
        respuesta = input("Escribe 's' para entrar al menú interactivo o cualquier otra tecla para salir: ").strip().lower()
        
        if respuesta == 's':
            menu_interactivo()
    else:
        print("\n❌ No se pudieron obtener los KPIs")
