# test_azure.py
import pyodbc
import os

def test_connection():
    try:
        conn_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=sql-server-coingeniopro.database.windows.net;"
            "DATABASE=CoIngenioPro;"
            "UID=CoIngenioPro;"
            "PWD=Tatiana3456.;"
            "Encrypt=yes;"
            "TrustServerCertificate=no;"
            "Connection Timeout=30;"
        )
        
        print("🔧 Intentando conectar...")
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Prueba simple
        cursor.execute("SELECT COUNT(*) FROM Usuarios")
        count = cursor.fetchone()[0]
        
        print(f"✅ CONEXIÓN EXITOSA! Usuarios en la BD: {count}")
        conn.close()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_connection()