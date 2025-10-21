# server/config.py

import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "clave_super_secreta")
DB_SERVER  = os.getenv("DB_SERVER")
DB_NAME    = os.getenv("DB_NAME")
DB_DRIVER  = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")


REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)
REDIS_DB = int(os.environ.get('REDIS_DB', 0))