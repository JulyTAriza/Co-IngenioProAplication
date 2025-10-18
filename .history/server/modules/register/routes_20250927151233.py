from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from database import get_db_connection
import config

register_bp = Blueprint("register", __name__)

@register_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Usuario y contraseña son requeridos"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si ya existe
        cursor.execute("SELECT username FROM Usuarios WHERE username = ?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "El usuario ya existe"}), 409

        # Hashear la contraseña
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # Guardar en BD
        cursor.execute(
            "INSERT INTO Usuarios (username, password) VALUES (?, ?)",
            (username, hashed.decode("utf-8"))
        )
        conn.commit()
        conn.close()

        # Generar token al registrar
        token = jwt.encode(
            {"username": username, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            config.SECRET_KEY,
            algorithm="HS256"
        )

        return jsonify({"success": True, "message": "Usuario registrado con éxito", "token": token}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
