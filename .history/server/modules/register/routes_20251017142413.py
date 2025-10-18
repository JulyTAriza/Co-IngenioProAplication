from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import re
from database import get_db_connection
import config
import requests
import logging

register_bp = Blueprint("register", __name__)
logger = logging.getLogger(__name__)

# Regex para validar emails comunes
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


@register_bp.route("/register", methods=["POST"])
def register():
    """
    Registra un nuevo usuario y envía email de bienvenida
    """
    data = request.get_json()

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    e_mail = data.get("e_mail", "").strip()

    # Validar campos requeridos
    if not username or not password or not e_mail:
        return jsonify({
            "success": False,
            "message": "Usuario, contraseña y correo son requeridos"
        }), 400

    # Validar longitud de username y password
    if len(username) < 3 or len(username) > 50:
        return jsonify({
            "success": False,
            "message": "El usuario debe tener entre 3 y 50 caracteres"
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "La contraseña debe tener al menos 6 caracteres"
        }), 400

    # Validar email con regex
    if not re.match(EMAIL_REGEX, e_mail):
        return jsonify({
            "success": False,
            "message": "El correo no es válido"
        }), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Validar si el usuario ya existe
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({
                "success": False,
                "message": "El usuario ya existe"
            }), 409

        # Validar si el email ya está registrado
        cursor.execute("SELECT id FROM Usuarios WHERE e_mail = ?", (e_mail,))
        if cursor.fetchone():
            conn.close()
            return jsonify({
                "success": False,
                "message": "El correo ya está registrado"
            }), 409

        # Hashear la contraseña
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # Guardar en BD con email
        cursor.execute(
            "INSERT INTO Usuarios (username, password, e_mail) VALUES (?, ?, ?)",
            (username, hashed.decode("utf-8"), e_mail)
        )
        conn.commit()
        conn.close()

        # Generar token al registrar
        token = jwt.encode(
            {
                "username": username,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            },
            config.SECRET_KEY,
            algorithm="HS256"
        )

        # Enviar email de bienvenida de forma asincrónica
        # No bloqueamos el registro si falla el email
        try:
            response = requests.post(
                'http://localhost:5000/api/notifications/send-welcome/' + username,
                timeout=5
            )
            if response.status_code == 200:
                logger.info(f"✅ Email de bienvenida enviado a {username}")
            else:
                logger.warning(f"⚠️ Error al enviar email a {username}: {response.text}")
        except requests.exceptions.Timeout:
            logger.warning(f"⚠️ Timeout al enviar email a {username}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ Error de conexión al enviar email a {username}: {str(e)}")
        except Exception as e:
            logger.warning(f"⚠️ Error inesperado al enviar email a {username}: {str(e)}")

        return jsonify({
            "success": True,
            "message": "Usuario registrado con éxito",
            "token": token
        }), 201

    except Exception as e:
        # No devolver errores internos directamente por seguridad
        logger.error(f"❌ Error en registro: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Error en el registro del usuario"
        }), 500
