# 📊 Dashboard de KPIs - Enero 2026

Sistema completo para generar y visualizar KPIs de ventas y gastos por supervisor.

## 🚀 Estructura del Proyecto

```
Raycy Dashboard/
├── azure_postgres_connection.py          # Conexión a base de datos
├── generar_dashboard_json.py             # Script para generar JSON
├── dashboard.html                         # Dashboard web interactivo
├── dashboard_enero_2026.json             # JSON generado (se crea automáticamente)
└── README_DASHBOARD.md                   # Este archivo
```

## 📋 Requisitos

1. **Python 3.8+** instalado
2. **Dependencias** de Python:

   ```bash
   pip install psycopg2-binary
   ```

3. **Conexión a Azure PostgreSQL** configurada en `azure_postgres_connection.py`

## ▶️ Cómo Usar

### Paso 1: Generar el JSON con los datos

Ejecuta el script de Python para conectarte a la base de datos y generar el JSON:

```bash
python generar_dashboard_json.py
```

**Esto generará:**

- ✅ Archivo `dashboard_enero_2026.json` con todos los datos
- 📊 Resumen en consola con totales generales

**El JSON contiene:**

- ✅ Resumen general (ventas, gastos, margen total)
- ✅ Cotizaciones por supervisor
- ✅ Cotizaciones con gastos en enero
- ✅ Cotizaciones con gastos por supervisor
- ✅ Cotizaciones con oportunidades
- ✅ Cotizaciones con oportunidades por supervisor

### Paso 2: Abrir el Dashboard

1. **Opción 1 - Abrir directamente:**
   - Doble clic en `dashboard.html`
   - Se abrirá en tu navegador predeterminado

2. **Opción 2 - Con servidor HTTP (recomendado):**

   ```bash
   # Python
   python -m http.server 8000
   ```

   Luego abre en el navegador: `http://localhost:8000/dashboard.html`

## 📊 Funcionalidades del Dashboard

### 1️⃣ Resumen General

- 💰 Ventas Totales
- 💸 Gastos Totales
- 📈 Margen Total y % de Margen
- 👥 Número de Supervisores Activos

### 2️⃣ Por Supervisor

Tabla interactiva con:

- Nombre y email del supervisor
- Número de cotizaciones
- Ventas y gastos totales
- Margen real y porcentaje
- Número de compras realizadas

### 3️⃣ Cotizaciones con Gastos

Listado de cotizaciones de enero que tienen gastos:

- Número y fecha de cotización
- Precio total y compras asociadas
- Diferencia entre precio y gastos
- Estado de pago

### 4️⃣ Oportunidades

Cotizaciones asignadas a oportunidades:

- Código de oportunidad
- Supervisores asignados
- Ingresos vs gastos reales
- Estados de cobro y pago a proveedores

## 🎨 Características Visuales

- ✨ **Animaciones suaves** en carga de datos
- 🎯 **Diseño responsivo** (funciona en móvil y desktop)
- 🔄 **Tabs interactivos** para navegar entre secciones
- 📊 **Tarjetas con métricas** destacadas
- 🏷️ **Badges de estado** con colores semánticos
- 📈 **Tablas ordenadas** y con hover effects

## 🔧 Personalización

### Cambiar el periodo de análisis

Edita el script `generar_dashboard_json.py` y modifica las fechas en cada query:

```python
WHERE c.fecha_cotizacion >= '2026-01-01'  # Fecha inicio
  AND c.fecha_cotizacion < '2026-02-01'    # Fecha fin
```

### Agregar más métricas

1. Agrega un nuevo query en `generar_dashboard_json.py`
2. Crea una nueva función `obtener_nueva_metrica()`
3. Agrégala a `generar_json_dashboard()`
4. Actualiza el dashboard HTML para mostrar los datos

## 📖 Queries Incluidos

### 1. Cotizaciones por Supervisor

Agrupa todas las cotizaciones de enero por supervisor, incluyendo:

- Ventas totales (precio_total)
- Gastos de compras de proyecto en enero
- Margen real y porcentaje
- Desglose por materiales y mano de obra

### 2. Cotizaciones con Gastos

Lista cotizaciones de enero que tienen compras asociadas en el mismo mes:

- Estados de pago, facturación y conclusión
- Suma de gastos por cotización

### 3. Cotizaciones con Gastos por Supervisor

Agrupa las cotizaciones con gastos por supervisor:

- Permite ver cuántas cotizaciones ya iniciaron ejecución
- Estados de pago a proveedores

### 4. Cotizaciones con Oportunidad

Filtra solo cotizaciones que tienen oportunidad asignada:

- Estados de facturación al cliente
- Estados de cobro (ingreso)
- Estados de pago a proveedores (egreso)
- Análisis de flujo de efectivo

### 5. Cotizaciones con Oportunidad por Supervisor

Agrupa las cotizaciones con oportunidad por supervisor:

- Número de oportunidades gestionadas
- Montos facturados vs pendientes
- Montos cobrados vs por cobrar

## 🔄 Actualizar Datos

Para actualizar el dashboard con datos frescos:

```bash
# 1. Regenerar el JSON
python generar_dashboard_json.py

# 2. Refrescar el navegador (F5)
```

## ⚠️ Solución de Problemas

### Error: "No se pudo conectar a la base de datos"

- Verifica las credenciales en `azure_postgres_connection.py`
- Asegúrate de que el firewall de Azure permita tu IP

### Error: "No se encuentra el archivo JSON"

- Asegúrate de ejecutar primero `generar_dashboard_json.py`
- El archivo debe estar en la misma carpeta que `dashboard.html`

### El dashboard no carga datos

- Abre la consola del navegador (F12)
- Revisa los errores de JavaScript
- Verifica que el JSON esté bien formado

## 📱 Compatibilidad

- ✅ Chrome/Edge (Recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (iOS/Android)

## 🎯 Próximos Pasos

Posibles mejoras:

- 📊 Agregar gráficos con Chart.js
- 📅 Selector de rango de fechas
- 💾 Exportar datos a Excel
- 🔍 Filtros y búsqueda en tablas
- 📧 Envío automático de reportes por email

---

**Desarrollado para Raycy Software Dashboard**  
_Última actualización: Febrero 2026_
