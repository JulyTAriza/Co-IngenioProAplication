from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
from dotenv import load_dotenv
import os
import bcrypt
import jwt
import datetime
from functools import wraps
from modules.materials.routes import materials_bp



# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)

# Clave secreta para JWT
SECRET_KEY = os.getenv("SECRET_KEY", "clave_super_secreta")

# Configuración conexión SQL Server (Windows Authentication)
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")

def get_db_connection():
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        "Trusted_Connection=yes;"
        "Encrypt=no;"
    )
    return pyodbc.connect(conn_str)

# Decorador para proteger rutas
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"success": False, "message": "Token es requerido"}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = data["username"]
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Token inválido"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, password FROM Usuarios WHERE username = ?",
            (username,)
        )
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        stored_password = user[1]

        # Si ya está en formato bcrypt
        if stored_password.startswith("$2b$"):
            password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            # Compara en texto plano
            password_matches = (password == stored_password)
            if password_matches:
                # Si es correcto, actualiza a hash bcrypt
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                cursor.execute(
                    "UPDATE Usuarios SET password = ? WHERE username = ?",
                    (hashed.decode('utf-8'), username)
                )
                conn.commit()

        conn.close()

        if password_matches:
            token = jwt.encode(
                {
                    "username": username,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
                },
                SECRET_KEY,
                algorithm="HS256"
            )
            return jsonify({"success": True, "message": "Login exitoso", "token": token})
        else:
            return jsonify({"success": False, "message": "Contraseña incorrecta"}), 401

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/dashboard", methods=["GET"])
@token_required
def get_dashboard(current_user):
    return jsonify({
        "user": current_user,
        "popularProducts": [],
        "salesSummary": [],
        "purchaseSummary": [],
        "expenseSummary": [],
        "expenseByCategorySummary": []
    })


@app.route("/users", methods=["GET"])
@token_required
def get_users(current_user):
    return jsonify([])

@app.route("/expenses", methods=["GET"])
@token_required
def get_expenses(current_user):
    return jsonify([])
# ———— REGISTRAR RUTAS DE MATERIALES ————
# Esto no toca tu login; sólo añade /materials/**
app.register_blueprint(materials_bp, url_prefix="/materials")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

"""
# Importación de librerías necesarias
from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
from dotenv import load_dotenv
import os
import bcrypt
import jwt
import datetime
from functools import wraps

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Inicializar la aplicación Flask
app = Flask(__name__)

# Configurar CORS para permitir solicitudes desde cualquier origen
CORS(app, resources={r"/*": {"origins": "*"}})

# Clave secreta para firmar tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY", "clave_super_secreta")

# Configuración de conexión a SQL Server usando autenticación de Windows
DB_SERVER = os.getenv("DB_SERVER")
DB_NAME = os.getenv("DB_NAME")

# Función para obtener una conexión a la base de datos
def get_db_connection():
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        "Trusted_Connection=yes;"
        "Encrypt=no;"
    )
    return pyodbc.connect(conn_str)

# Decorador para proteger rutas con autenticación JWT
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Extraer token del header Authorization
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        # Si no hay token, rechazar la solicitud
        if not token:
            return jsonify({"success": False, "message": "Token es requerido"}), 401

        try:
            # Decodificar el token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = data["username"]
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Token inválido"}), 401

        # Si el token es válido, continuar con la función original
        return f(current_user, *args, **kwargs)
    return decorated

# Ruta para iniciar sesión y generar token JWT
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Buscar usuario en la base de datos
        cursor.execute(
            "SELECT username, password FROM Usuarios WHERE username = ?",
            (username,)
        )
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        stored_password = user[1]

        # Verificar contraseña (bcrypt o texto plano)
        if stored_password.startswith("$2b$"):
            password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            password_matches = (password == stored_password)
            if password_matches:
                # Actualizar contraseña a formato bcrypt si era texto plano
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                cursor.execute(
                    "UPDATE Usuarios SET password = ? WHERE username = ?",
                    (hashed.decode('utf-8'), username)
                )
                conn.commit()

        conn.close()

        # Si la contraseña es correcta, generar token
        if password_matches:
            token = jwt.encode(
                {
                    "username": username,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
                },
                SECRET_KEY,
                algorithm="HS256"
            )
            return jsonify({"success": True, "message": "Login exitoso", "token": token})
        else:
            return jsonify({"success": False, "message": "Contraseña incorrecta"}), 401

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Ruta protegida: dashboard
@app.route("/dashboard", methods=["GET"])
@token_required
def get_dashboard(current_user):
    return jsonify({
        "user": current_user,
        "popularProducts": [],
        "salesSummary": [],
        "purchaseSummary": [],
        "expenseSummary": [],
        "expenseByCategorySummary": []
    })

# Ruta protegida: productos
@app.route("/products", methods=["GET"])
@token_required
def get_products(current_user):
    return jsonify([
        {"id": 1, "name": "Producto A", "price": 100},
        {"id": 2, "name": "Producto B", "price": 200}
    ])

# Ruta protegida: usuarios
@app.route("/users", methods=["GET"])
@token_required
def get_users(current_user):
    return jsonify([
        {"id": 1, "username": "admin"},
        {"id": 2, "username": "july"}
    ])

# Ruta protegida: gastos
@app.route("/expenses", methods=["GET"])
@token_required
def get_expenses(current_user):
    return jsonify([
        {"id": 1, "category": "Transporte", "amount": 50},
        {"id": 2, "category": "Materiales", "amount": 300}
    ])

# Ejecutar el servidor Flask
if __name__ == "__main__":
    app.run(debug=True, port=5000)
"""