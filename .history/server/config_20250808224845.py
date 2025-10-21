# server/config.py

import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "clave_super_secreta")
DB_SERVER  = os.getenv("DB_SERVER")
DB_NAME    = os.getenv("DB_NAME")
DB_DRIVER  = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
