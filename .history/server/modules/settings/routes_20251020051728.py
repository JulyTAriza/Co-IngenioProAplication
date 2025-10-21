# settings.py - CON LOGS DETALLADOS Y CAMBIO DE CONTRASEÑA

from flask import Blueprint, request, jsonify, current_app, render_template
import traceback
from functools import wraps
import jwt
import config
from database import get_db_connection
import bcrypt
import datetime
import random
from extensions import mail, redis_client
from flask_mail import Message
import json

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
            current_user_id = payload.get("user_id")
            current_app.logger.info("✅ [AUTH] Token válido para usuario: %s (ID: %s)", current_user, current_user_id)
        except jwt.ExpiredSignatureError:
            current_app.logger.error("❌ [AUTH] Token expirado")
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError as e:
            current_app.logger.error("❌ [AUTH] Token inválido: %s", str(e))
            return jsonify({"success": False, "message": "Token inválido"}), 401

        return f(current_user, current_user_id, *args, **kwargs)
    return decorated


# ===================================
# 📋 OBTENER CONFIGURACIÓN DE USUARIO
# ===================================
@settings_bp.route("/<int:id_usuario>", methods=["GET"])
@token_required
def get_user_settings(current_user, current_user_id, id_usuario):
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
def update_user_settings(current_user, current_user_id, id_usuario):
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


# ===================================
# 🔐 SOLICITAR CÓDIGO PARA CAMBIO DE CONTRASEÑA
# ===================================
@settings_bp.route("/<int:id_usuario>/solicitar-codigo-contrasena", methods=["POST"])
@token_required
def solicitar_codigo_contrasena(current_user, current_user_id, id_usuario):
    current_app.logger.info("🔐 [SOLICITAR CODIGO] Iniciando para user_id: %s", id_usuario)
    
    try:
        data = request.get_json()
        contrasena_actual = data.get("current_password", "").strip()
        
        if not contrasena_actual:
            current_app.logger.warning("❌ [SOLICITAR CODIGO] Contraseña actual no proporcionada")
            return jsonify({"success": False, "message": "La contraseña actual es requerida"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar contraseña actual
        cursor.execute("SELECT password, e_mail, username FROM usuarios WHERE id = ?", (id_usuario,))
        usuario = cursor.fetchone()
        
        if not usuario:
            current_app.logger.error("❌ [SOLICITAR CODIGO] Usuario no encontrado")
            conn.close()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        contrasena_hash, email, username = usuario

        # Verificar contraseña actual
        if not bcrypt.checkpw(contrasena_actual.encode('utf-8'), contrasena_hash.encode('utf-8')):
            current_app.logger.warning("❌ [SOLICITAR CODIGO] Contraseña actual incorrecta")
            conn.close()
            return jsonify({"success": False, "message": "La contraseña actual es incorrecta"}), 400

        # Generar código de 4 dígitos
        codigo = str(random.randint(1000, 9999))
        fecha_expiracion = datetime.datetime.now() + datetime.timedelta(minutes=5)

        current_app.logger.info("🔐 [SOLICITAR CODIGO] Código generado: %s para %s", codigo, email)

        # Guardar código en la base de datos
        cursor.execute("""
            INSERT INTO CodigosVerificacion (id_usuario, codigo, intentos, fecha_expiracion, utilizado, fecha_creacion)
            VALUES (?, ?, 0, ?, 0, ?)
        """, (id_usuario, codigo, fecha_expiracion))
        
        conn.commit()
        conn.close()

        # Enviar email con código de verificación
        try:
            html_body = render_template(
                "emails/codigo_verificacion.html",
                username=username,
                codigo=codigo,
                tipo_operacion="cambio de contraseña"
            )

            msg = Message(
                subject="🔐 Código de Verificación - Cambio de Contraseña - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            current_app.logger.info("✅ [SOLICITAR CODIGO] Código enviado a %s", email)

        except Exception as mail_error:
            current_app.logger.error("❌ [SOLICITAR CODIGO] Error enviando email: %s", mail_error)
            return jsonify({
                "success": False, 
                "message": "Error enviando código de verificación"
            }), 500

        return jsonify({
            "success": True,
            "message": "Se ha enviado un código de verificación a tu correo electrónico"
        })

    except Exception as e:
        current_app.logger.error("❌ [SOLICITAR CODIGO] Error general: %s", traceback.format_exc())
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500


# ===================================
# 🔐 CAMBIAR CONTRASEÑA CON CÓDIGO
# ===================================
@settings_bp.route("/<int:id_usuario>/cambiar-contrasena", methods=["POST"])
@token_required
def cambiar_contrasena(current_user, current_user_id, id_usuario):
    current_app.logger.info("🔐 [CAMBIAR CONTRASEÑA] Iniciando para user_id: %s", id_usuario)
    
    try:
        data = request.get_json()
        codigo_ingresado = data.get("codigo", "").strip()
        nueva_contrasena = data.get("new_password", "").strip()
        contrasena_actual = data.get("current_password", "").strip()

        current_app.logger.info("📦 [CAMBIAR CONTRASEÑA] Datos recibidos - Código: %s, Nueva contraseña: %s", 
                               codigo_ingresado, "***" if nueva_contrasena else "VACÍA")

        if not codigo_ingresado or not nueva_contrasena or not contrasena_actual:
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Faltan datos requeridos")
            return jsonify({"success": False, "message": "Todos los campos son requeridos"}), 400

        if len(nueva_contrasena) < 6:
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Contraseña demasiado corta")
            return jsonify({"success": False, "message": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar contraseña actual primero
        cursor.execute("SELECT password, e_mail, username FROM usuarios WHERE id = ?", (id_usuario,))
        usuario = cursor.fetchone()
        
        if not usuario:
            current_app.logger.error("❌ [CAMBIAR CONTRASEÑA] Usuario no encontrado")
            conn.close()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        contrasena_hash, email, username = usuario

        if not bcrypt.checkpw(contrasena_actual.encode('utf-8'), contrasena_hash.encode('utf-8')):
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Contraseña actual incorrecta")
            conn.close()
            return jsonify({"success": False, "message": "La contraseña actual es incorrecta"}), 400

        # Verificar código de verificación
        cursor.execute("""
            SELECT id, codigo, intentos, fecha_expiracion, utilizado
            FROM CodigosVerificacion 
            WHERE id_usuario = ? AND fecha_expiracion > GETDATE() AND utilizado = 0
            ORDER BY fecha_creacion DESC
        """, (id_usuario,))
        
        codigo_db = cursor.fetchone()

        if not codigo_db:
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Código no encontrado o expirado")
            conn.close()
            return jsonify({
                "success": False, 
                "message": "Código expirado o inválido. Solicite uno nuevo."
            }), 400

        id_codigo, codigo_correcto, intentos, fecha_expiracion, utilizado = codigo_db

        # Verificar intentos
        if intentos >= 3:
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Demasiados intentos fallidos")
            cursor.execute(
                "UPDATE CodigosVerificacion SET utilizado = 1 WHERE id = ?",
                (id_codigo,)
            )
            conn.commit()
            conn.close()
            return jsonify({
                "success": False, 
                "message": "Demasiados intentos fallidos. Solicite un nuevo código."
            }), 400

        # Verificar código
        if codigo_ingresado != codigo_correcto:
            current_app.logger.warning("❌ [CAMBIAR CONTRASEÑA] Código incorrecto")
            cursor.execute(
                "UPDATE CodigosVerificacion SET intentos = intentos + 1 WHERE id = ?",
                (id_codigo,)
            )
            conn.commit()
            conn.close()
            
            intentos_restantes = 3 - (intentos + 1)
            return jsonify({
                "success": False, 
                "message": f"Código incorrecto. Te quedan {intentos_restantes} intentos."
            }), 400

        # ✅ Código correcto - Cambiar contraseña
        nueva_contrasena_hash = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt())
        
        cursor.execute(
            "UPDATE usuarios SET password = ? WHERE id = ?",
            (nueva_contrasena_hash.decode("utf-8"), id_usuario)
        )

        # Marcar código como utilizado
        cursor.execute(
            "UPDATE CodigosVerificacion SET utilizado = 1 WHERE id = ?",
            (id_codigo,)
        )

        conn.commit()
        conn.close()
        current_app.logger.info("✅ [CAMBIAR CONTRASEÑA] Contraseña actualizada exitosamente")

        # Enviar email de confirmación
        try:
            html_body = render_template(
                "emails/contrasena_actualizada.html",
                username=username
            )

            msg = Message(
                subject="✅ Contraseña actualizada - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            current_app.logger.info("✅ [CAMBIAR CONTRASEÑA] Email de confirmación enviado")

        except Exception as mail_error:
            current_app.logger.error("❌ [CAMBIAR CONTRASEÑA] Error enviando email: %s", mail_error)

        return jsonify({
            "success": True,
            "message": "Contraseña cambiada exitosamente"
        })

    except Exception as e:
        current_app.logger.error("❌ [CAMBIAR CONTRASEÑA] Error general: %s", traceback.format_exc())
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500