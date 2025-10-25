from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
from database import get_db_connection
import config
import logging

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

login_bp = Blueprint("login", __name__)

@login_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    logger.debug(f"🔍 Iniciando login para usuario: {username}")

    try:
        # 1. Intentar conexión
        logger.debug("🔧 Intentando conectar a la base de datos...")
        conn = get_db_connection()
        logger.debug("✅ Conexión a BD exitosa")
        
        cursor = conn.cursor()
        
        # 2. Ejecutar consulta
        logger.debug(f"🔍 Ejecutando consulta para usuario: {username}")
        cursor.execute(
            "SELECT id, username, password, e_mail, rol FROM Usuarios WHERE username = ?",
            (username,)
        )
        user = cursor.fetchone()
        logger.debug(f"📊 Resultado de consulta: {user}")

        if not user:
            conn.close()
            logger.warning(f"❌ Usuario no encontrado: {username}")
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        user_id = user[0]
        username_db = user[1]
        stored_password = user[2]
        email = user[3]
        rol = user[4]

        logger.debug(f"📋 Usuario encontrado - ID: {user_id}, Rol: {rol}")

        # 3. Verificar contraseña
        logger.debug("🔐 Verificando contraseña...")
        if stored_password.startswith("$2b$"):
            logger.debug("🔐 Contraseña está hasheada con bcrypt")
            password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            logger.debug("🔐 Contraseña en texto plano, hasheando...")
            password_matches = (password == stored_password)
            if password_matches:
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
                cursor.execute(
                    "UPDATE Usuarios SET password = ? WHERE username = ?",
                    (hashed.decode('utf-8'), username)
                )
                conn.commit()
                logger.debug("✅ Contraseña hasheada y actualizada")

        conn.close()
        logger.debug("🔒 Conexión cerrada")

        if password_matches:
            logger.debug("✅ Contraseña correcta, generando token...")
            token = jwt.encode(
                {
                    "id": user_id,
                    "username": username_db,
                    "email": email,
                    "rol": rol,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
                },
                config.SECRET_KEY,
                algorithm="HS256"
            )
            logger.debug("✅ Login exitoso")
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
            logger.warning("❌ Contraseña incorrecta")
            return jsonify({"success": False, "message": "Contraseña incorrecta"}), 401

    except Exception as e:
        logger.error(f"💥 ERROR en login: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500