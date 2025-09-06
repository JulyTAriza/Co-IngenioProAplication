from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

usuarios_bp = Blueprint("usuarios", __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"success": False, "message": "Token es requerido"}), 401

        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            current_user = payload.get("username")
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Token inválido"}), 401

        return f(current_user, *args, **kwargs)
    return decorated


# LISTAR TODOS LOS USUARIOS
@usuarios_bp.route("/", methods=["GET"])
@token_required
def list_users(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, e_mail
            FROM Usuarios
        """)
        rows = cursor.fetchall()
        conn.close()

        usuarios = [
            {
                "id": row[0],
                "username": row[1],
                "e_mail": row[2]
            }
            for row in rows
        ]
        return jsonify(success=True, data=usuarios), 200

    except Exception:
        current_app.logger.error("Error listando usuarios:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# CREAR UN NUEVO USUARIO
@usuarios_bp.route("/", methods=["POST"])
@token_required
def create_user(current_user):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE USER] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["username", "password", "e_mail"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False,
                       message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    username = data["username"].strip()
    password = data["password"].strip()
    e_mail = data["e_mail"].strip()

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO Usuarios (username, password, e_mail)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?)
        """, (username, password, e_mail))

        result = cursor.fetchone()
        if not result or result[0] is None:
            raise Exception("No se pudo obtener el ID del nuevo usuario.")

        new_id = int(result[0])

        conn.commit()
        conn.close()

        nuevo = {
            "id": new_id,
            "username": username,
            "e_mail": e_mail
        }
        return jsonify(success=True, data=nuevo), 201

    except Exception:
        current_app.logger.error("Error creando usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ELIMINAR USUARIO
@usuarios_bp.route("/<int:user_id>", methods=["DELETE"])
@token_required
def delete_user(current_user, user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM Usuarios WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404

        cursor.execute("DELETE FROM Usuarios WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Usuario eliminado"), 200

    except Exception:
        current_app.logger.error("Error eliminando usuario %s:\n%s", user_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
