# settings.py - CON LOGS DETALLADOS

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
        
        current_app.logger.info("🔐 [AUTH] Header recibido: %s", auth_header[:50] if auth_header else "VACÍO")
        
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            current_app.logger.warning("⚠️ [AUTH] Token no proporcionado")
            return jsonify({"success": False, "message": "Token es requerido"}), 401

        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            current_user = payload.get("username")
            current_app.logger.info("✅ [AUTH] Token válido para usuario: %s", current_user)
        except jwt.ExpiredSignatureError:
            current_app.logger.error("❌ [AUTH] Token expirado")
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError as e:
            current_app.logger.error("❌ [AUTH] Token inválido: %s", str(e))
            return jsonify({"success": False, "message": "Token inválido"}), 401

        return f(current_user, *args, **kwargs)
    return decorated


# ===================================
# 📋 OBTENER CONFIGURACIÓN DE USUARIO
# ===================================
@settings_bp.route("/<int:id_usuario>", methods=["GET"])
@token_required
def get_user_settings(current_user, id_usuario):
    current_app.logger.info("📥 [GET CONFIG] Solicitando config para user_id: %s", id_usuario)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        current_app.logger.info("🔗 [DB] Conexión establecida")

        query = """
            SELECT 
                u.id,
                u.username,
                u.e_mail,
                ISNULL(c.idioma, 'Español') AS idioma,
                ISNULL(c.avatar, 'adventurer:Felix') AS avatar,
                ISNULL(c.banner_gradient, 'gradient1') AS banner_gradient
            FROM usuarios u
            LEFT JOIN ConfiguracionUsuario c ON u.id = c.id_usuario
            WHERE u.id = ?
        """
        
        current_app.logger.info("📊 [SQL] Ejecutando query: %s", query)
        cursor.execute(query, (id_usuario,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            current_app.logger.warning("⚠️ [GET CONFIG] Usuario no encontrado: %s", id_usuario)
            return jsonify(success=False, message="Usuario no encontrado"), 404

        user_data = {
            "id_config": id_usuario,
            "user_id": row[0],
            "username": row[1],
            "email": row[2],
            "language": row[3],
            "avatar_style": row[4],
            "banner_gradient": row[5]
        }
        
        current_app.logger.info("✅ [GET CONFIG] Datos recuperados: %s", user_data)

        return jsonify(success=True, data=user_data), 200

    except Exception as e:
        current_app.logger.error("❌ [GET CONFIG] Error:\n%s", traceback.format_exc())
        return jsonify(success=False, message=f"Error: {str(e)}"), 500


# ===================================
# 🛠️ ACTUALIZAR CONFIGURACIÓN DE USUARIO
# ===================================
@settings_bp.route("/<int:id_usuario>", methods=["PUT"])
@token_required
def update_user_settings(current_user, id_usuario):
    current_app.logger.info("=" * 80)
    current_app.logger.info("📝 [UPDATE CONFIG] Iniciando actualización para user_id: %s", id_usuario)
    current_app.logger.info("=" * 80)
    
    try:
        data = request.get_json(force=True)
        current_app.logger.info("📦 [PAYLOAD] Datos recibidos: %s", data)
    except Exception as e:
        current_app.logger.error("❌ [PAYLOAD] Error parseando JSON: %s", str(e))
        return jsonify(success=False, message=f"JSON inválido: {str(e)}"), 400

    idioma = data.get("language")
    avatar = data.get("avatar_style")
    email = data.get("email")
    banner_gradient = data.get("banner_gradient")
    
    current_app.logger.info("🔧 [VALORES] idioma=%s, avatar=%s, email=%s, banner=%s", 
                           idioma, avatar, email, banner_gradient)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        current_app.logger.info("🔗 [DB] Conexión establecida")

        # ✅ Actualiza el email si se envió
        if email:
            query_email = "UPDATE usuarios SET e_mail = ? WHERE id = ?"
            current_app.logger.info("📧 [SQL] Actualizando email: %s", query_email)
            cursor.execute(query_email, (email, id_usuario))
            current_app.logger.info("✅ [EMAIL] Email actualizado correctamente")

        # ✅ Verifica si ya existe configuración
        query_check = "SELECT COUNT(*) FROM ConfiguracionUsuario WHERE id_usuario = ?"
        current_app.logger.info("🔍 [SQL] Verificando existencia: %s", query_check)
        cursor.execute(query_check, (id_usuario,))
        exists = cursor.fetchone()[0]
        current_app.logger.info("📊 [RESULTADO] Configuración existe: %s", bool(exists))

        if exists:
            query_update = """
                UPDATE ConfiguracionUsuario
                SET idioma = ?, avatar = ?, banner_gradient = ?, fecha_actualizacion = GETDATE()
                WHERE id_usuario = ?
            """
            current_app.logger.info("🔄 [SQL] Ejecutando UPDATE: %s", query_update)
            current_app.logger.info("📊 [PARAMS] %s", (idioma, avatar, banner_gradient, id_usuario))
            cursor.execute(query_update, (idioma, avatar, banner_gradient, id_usuario))
            current_app.logger.info("✅ [UPDATE] Configuración actualizada")
        else:
            query_insert = """
                INSERT INTO ConfiguracionUsuario (id_usuario, idioma, avatar, banner_gradient)
                VALUES (?, ?, ?, ?)
            """
            current_app.logger.info("➕ [SQL] Ejecutando INSERT: %s", query_insert)
            current_app.logger.info("📊 [PARAMS] %s", (id_usuario, idioma or "Español", avatar or "adventurer:Felix", banner_gradient or "gradient1"))
            cursor.execute(query_insert, (id_usuario, idioma or "Español", avatar or "adventurer:Felix", banner_gradient or "gradient1"))
            current_app.logger.info("✅ [INSERT] Configuración creada")

        current_app.logger.info("💾 [COMMIT] Guardando cambios...")
        conn.commit()
        conn.close()
        current_app.logger.info("✅ [SUCCESS] Transacción completada exitosamente")
        current_app.logger.info("=" * 80)

        return jsonify(success=True, message="Configuración actualizada correctamente"), 200

    except Exception as e:
        current_app.logger.error("=" * 80)
        current_app.logger.error("❌ [ERROR CRÍTICO] Excepción capturada:")
        current_app.logger.error("📛 Tipo: %s", type(e).__name__)
        current_app.logger.error("📛 Mensaje: %s", str(e))
        current_app.logger.error("📛 Traceback completo:\n%s", traceback.format_exc())
        current_app.logger.error("=" * 80)
        return jsonify(success=False, message=f"Error interno: {str(e)}"), 500