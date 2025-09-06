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
from modules.users.routes import users_bp


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
app.register_blueprint(users_bp, url_prefix="/usuarios")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
