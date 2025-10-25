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

# Carga variables de entorno
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", "sql-server-coingeniopro.database.windows.net")
DB_NAME = os.getenv("DB_NAME", "CoIngenioPro")
DB_USER = os.getenv("DB_USER", "Co-Ingenio")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Tatiana3456.")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

def get_db_connection():
    """
    Retorna una conexión pyodbc a Azure SQL Database
    """
    conn_str = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )
    return pyodbc.connect(conn_str)