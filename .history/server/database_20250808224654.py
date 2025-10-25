# server/database.py

import pyodbc
from dotenv import load_dotenv
import os

# Carga variables de entorno
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER")
DB_NAME   = os.getenv("DB_NAME")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

def get_db_connection():
    """
    Retorna una conexión pyodbc a SQL Server
    usando Windows Authentication y sin cifrado.
    """
    conn_str = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        "Trusted_Connection=yes;"
        "Encrypt=no;"
    )
    return pyodbc.connect(conn_str)
