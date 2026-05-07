"""
Script de conexión a Azure Database for PostgreSQL
Configurar los valores de conexión en la sección de configuración
"""

import psycopg2
from psycopg2 import Error

# ==============================================
# CONFIGURACIÓN DE CONEXIÓN
# ==============================================
# Modifica estos valores con los de tu base de datos de Azure

DB_HOST = "raycysoftwaredb.postgres.database.azure.com"  # Ejemplo: myserver.postgres.database.azure.com
DB_NAME = "raycysoftwaredb"                # Nombre de la base de datos

# IMPORTANTE: Azure tiene 2 tipos de servidores PostgreSQL:
# - Flexible Server (nuevo): usa solo "usuario"
# - Single Server (legacy): usa "usuario@servidor"
# Prueba primero sin @, si no funciona, usa con @

DB_USER = "raycysoftwareadmin"  # Flexible Server (prueba primero este)
# DB_USER = "raycysoftwareadmin@raycysoftwaredb"  # Single Server (descomenta si el de arriba falla)

DB_PASSWORD = "rQhTB4fKB7Yy6HkV"  # Contraseña del servidor
DB_PORT = "5432"                                      # Puerto (por defecto 5432)

# Parámetros SSL (requerido para Azure PostgreSQL)
SSL_MODE = "require"


def test_connection():
    """
    Prueba la conexión a la base de datos de Azure PostgreSQL
    """
    connection = None
    cursor = None
    
    try:
        # Establecer conexión
        print("🔄 Intentando conectar a Azure PostgreSQL...")
        print(f"   Host: {DB_HOST}")
        print(f"   Base de datos: {DB_NAME}")
        print(f"   Usuario: {DB_USER}")
        print("-" * 50)
        
        connection = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            sslmode=SSL_MODE
        )
        
        # Crear cursor
        cursor = connection.cursor()
        
        # Ejecutar query de prueba
        print("✅ ¡Conexión establecida exitosamente!")
        print("-" * 50)
        
        # Obtener versión de PostgreSQL
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        print(f"📊 Versión de PostgreSQL:")
        print(f"   {db_version[0]}")
        print("-" * 50)
        
        # Obtener información de la base de datos actual
        cursor.execute("SELECT current_database();")
        current_db = cursor.fetchone()
        print(f"🗄️  Base de datos actual: {current_db[0]}")
        
        # Obtener el usuario actual
        cursor.execute("SELECT current_user;")
        current_user = cursor.fetchone()
        print(f"👤 Usuario conectado: {current_user[0]}")
        print("-" * 50)
        
        # Listar tablas disponibles (schema public)
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"📋 Tablas disponibles en 'public' schema ({len(tables)}):")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("📋 No se encontraron tablas en el schema 'public'")
        
        print("-" * 50)
        print("✅ Prueba de conexión completada exitosamente")
        
    except Error as e:
        print("❌ Error al conectar a PostgreSQL:")
        print(f"   {e}")
        return False
        
    finally:
        # Cerrar cursor y conexión
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            print("\n🔒 Conexión cerrada")
    
    return True


def get_connection():
    """
    Retorna una conexión a la base de datos
    Útil para usar en otros scripts
    """
    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            sslmode=SSL_MODE
        )
        return connection
    except Error as e:
        print(f"Error al crear conexión: {e}")
        return None


if __name__ == "__main__":
    # Ejecutar prueba de conexión
    print("=" * 50)
    print("PRUEBA DE CONEXIÓN A AZURE POSTGRESQL")
    print("=" * 50)
    print()
    
    test_connection()
