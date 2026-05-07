# Raycy Dashboard - Conexión Azure PostgreSQL

## 🚀 Instalación

### 1. Instalar dependencias de Python

```bash
pip install -r requirements.txt
```

## 🔧 Configuración

### Opción 1: Script Simple (azure_postgres_connection.py)

1. Abre el archivo `azure_postgres_connection.py`
2. Modifica las variables en la sección de CONFIGURACIÓN:
   ```python
   DB_HOST = "tu-servidor.postgres.database.azure.com"
   DB_NAME = "nombre_de_tu_base_de_datos"
   DB_USER = "tu_usuario@tu-servidor"
   DB_PASSWORD = "tu_contraseña"
   ```

### Opción 2: Script Seguro con .env (azure_postgres_connection_secure.py) - **RECOMENDADO**

1. Copia el archivo de ejemplo:

   ```bash
   copy .env.example .env
   ```

2. Edita el archivo `.env` con tus credenciales reales:

   ```
   DB_HOST=tu-servidor.postgres.database.azure.com
   DB_NAME=nombre_de_tu_base_de_datos
   DB_USER=tu_usuario@tu-servidor
   DB_PASSWORD=tu_contraseña
   DB_PORT=5432
   SSL_MODE=require
   ```

3. **IMPORTANTE**: El archivo `.env` debe estar en el `.gitignore` para no subir credenciales

## 📝 Datos de Conexión Azure PostgreSQL

Para obtener tus datos de conexión:

1. Ve al portal de Azure: https://portal.azure.com
2. Busca tu recurso de Azure Database for PostgreSQL
3. En "Overview" encontrarás:
   - **Server name** (DB_HOST): `nombre-servidor.postgres.database.azure.com`
   - **Server admin login name** (DB_USER): `usuario@nombre-servidor`
4. La base de datos (DB_NAME) la puedes ver en la sección "Databases"

### Formato del Usuario

El formato del usuario en Azure PostgreSQL es: `usuario@nombre-servidor`

## ▶️ Ejecutar

### Script Simple:

```bash
python azure_postgres_connection.py
```

### Script Seguro (con .env):

```bash
python azure_postgres_connection_secure.py
```

## ✅ Prueba de Conexión

El script mostrará:

- ✅ Estado de la conexión
- 📊 Versión de PostgreSQL
- 🗄️ Base de datos actual
- 👤 Usuario conectado
- 📋 Lista de tablas disponibles

## 🔒 Seguridad

- **NUNCA** subas el archivo `.env` al repositorio
- Usa `azure_postgres_connection_secure.py` para producción
- El archivo `.env` ya está en `.gitignore`

## 📊 Próximos Pasos para KPIs

Una vez que la conexión funcione, puedes:

1. Consultar datos de tus tablas
2. Procesar la información
3. Calcular KPIs
4. Generar reportes

Ejemplo de uso en otro script:

```python
from azure_postgres_connection_secure import get_connection

# Obtener conexión
conn = get_connection()
cursor = conn.cursor()

# Ejecutar query para KPIs
cursor.execute("SELECT * FROM tu_tabla LIMIT 10")
datos = cursor.fetchall()

# Procesar datos...
cursor.close()
conn.close()
```
