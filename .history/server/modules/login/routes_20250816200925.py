from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from database import get_db_connection
import config

login_bp = Blueprint("login", __name__)

@login_bp.route("/login", methods=["POST"])
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

        # Verificar si la contraseña ya está hasheada con bcrypt
        if stored_password.startswith("$2b$"):
            password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            password_matches = (password == stored_password)
            if password_matches:
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
                config.SECRET_KEY,
                algorithm="HS256"
            )
            return jsonify({"success": True, "message": "Login exitoso", "token": token})
        else:
            return jsonify({"success": False, "message": "Contraseña incorrecta"}), 401

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
