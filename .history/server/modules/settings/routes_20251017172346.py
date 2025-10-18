from flask import Blueprint, request, jsonify, current_app
import traceback
from functools import wraps
import jwt
import config
from database import get_db_connection

settings_bp = Blueprint("settings", __name__)

# ===================================
#  TOKEN VALIDATION
# ===================================
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


# ===================================
# 📋 OBTENER CONFIGURACIÓN DE USUARIO
# ===================================
@settings_bp.route("/<int:id_usuario>", methods=["GET"])
@token_required
def get_user_settings(current_user, id_usuario):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                u.e_mail,
                ISNULL(c.idioma, 'Español') AS idioma,
                ISNULL(c.avatar, 'avataaars') AS avatar
            FROM usuarios u
            LEFT JOIN ConfiguracionUsuario c ON u.id = c.id_usuario
            WHERE u.id = ?
        """, (id_usuario,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify(success=False, message="Usuario no encontrado"), 404

        user_data = {
            "id_config": id_usuario,
            "user_id": row[0],
            "email": row[2],
            "language": row[3],
            "avatar_style": row[4]
        }

        return jsonify(success=True, data=user_data), 200

    except Exception:
        current_app.logger.error("Error obteniendo configuración de usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ===================================
# 🛠️ ACTUALIZAR CONFIGURACIÓN DE USUARIO
# ===================================
@settings_bp.route("/<int:id_usuario>", methods=["PUT"])
@token_required
def update_user_settings(current_user, id_usuario):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[UPDATE SETTINGS] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    idioma = data.get("language")
    avatar = data.get("avatar_style")
    email = data.get("email")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # ✅ Actualiza el email si se envió
        if email:
            cursor.execute("UPDATE usuarios SET e_mail = ? WHERE id = ?", (email, id_usuario))

        # ✅ Verifica si ya existe configuración
        cursor.execute("SELECT COUNT(*) FROM ConfiguracionUsuario WHERE id_usuario = ?", (id_usuario,))
        exists = cursor.fetchone()[0]

        if exists:
            cursor.execute("""
                UPDATE ConfiguracionUsuario
                SET idioma = ?, avatar = ?, fecha_actualizacion = GETDATE()
                WHERE id_usuario = ?
            """, (idioma, avatar, id_usuario))
        else:
            cursor.execute("""
                INSERT INTO ConfiguracionUsuario (id_usuario, idioma, avatar)
                VALUES (?, ?, ?)
            """, (id_usuario, idioma or "Español", avatar or "avataaars"))

        conn.commit()
        conn.close()

        return jsonify(success=True, message="Configuración actualizada correctamente"), 200

    except Exception:
        current_app.logger.error("Error actualizando configuración de usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
