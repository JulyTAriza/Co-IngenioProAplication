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
        # ← AGREGAR 'id', 'e_mail' y 'rol' a la consulta
        cursor.execute(
            "SELECT id, username, password, e_mail, rol FROM Usuarios WHERE username = ?",
            (username,)
        )
        user = cursor.fetchone()

        if not user:
            conn.close()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        user_id = user[0]          # ← CAPTURAR ID
        username_db = user[1]
        stored_password = user[2]
        email = user[3]            # ← CAPTURAR EMAIL
        rol = user[4]              # ← CAPTURAR ROL

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
                    "id": user_id,          # ← AGREGAR AL TOKEN
                    "username": username_db,
                    "email": email,         # ← AGREGAR AL TOKEN
                    "rol": rol,             # ← AGREGAR AL TOKEN
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
                },
                config.SECRET_KEY,
                algorithm="HS256"
            )
            # ← DEVOLVER TAMBIÉN LA INFO DEL USUARIO
            return jsonify({
                "success": True, 
                "message": "Login exitoso", 
                "token": token,
                "usuario": {
                    "id": user_id,
                    "username": username_db,
                    "email": email,
                    "rol": rol
                }
            })
        else:
            return jsonify({"success": False, "message": "Contraseña incorrecta"}), 401

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500