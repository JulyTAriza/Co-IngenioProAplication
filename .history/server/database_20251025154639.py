# server/database.py

#import pyodbc
#from dotenv import load_dotenv
#import os

# Carga variables de entorno
#load_dotenv()

#DB_SERVER = os.getenv("DB_SERVER")
#DB_NAME   = os.getenv("DB_NAME")
#DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

#def get_db_connection():

    #conn_str = (
     #   f"DRIVER={{{DB_DRIVER}}};"
    #    f"SERVER={DB_SERVER};"
     #   f"DATABASE={DB_NAME};"
      #  "Trusted_Connection=yes;"
       # "Encrypt=no;"
    #)
   # return pyodbc.connect(conn_str)
# server/database.py

import pyodbc
from dotenv import load_dotenv
import os
import logging

logger = logging.getLogger(__name__)

# Carga variables de entorno
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "sql-server-coingeniopro.database.windows.net")
DB_NAME = os.getenv("DB_NAME", "CoIngenioPro")
DB_USER = os.getenv("DB_USER", "CoIngenio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Tatiana3456.")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

def get_db_connection():
    """
    Retorna una conexión pyodbc a Azure SQL Database
    """
    try:
        conn_str = (
            f"DRIVER={{{DB_DRIVER}}};"
            f"SERVER={DB_SERVER};"
            f"DATABASE={DB_NAME};"
            f"UID={DB_USER};"
            f"PWD={DB_PASSWORD};"
            "Encrypt=yes;"
            "TrustServerCertificate=yes;"
            "Connection Timeout=60;"
        )
        logger.debug(f"🔗 Intentando conectar a: {DB_SERVER}")
        conn = pyodbc.connect(conn_str)
        logger.debug("✅ Conexión a BD establecida")
        return conn
    except Exception as e:
        logger.error(f"💥 ERROR de conexión a BD: {str(e)}")
        raise