from flask import Blueprint, request, jsonify, render_template
import bcrypt
import jwt
import datetime
import re
from database import get_db_connection
import config
from extensions import mail
from flask_mail import Message
import os
import traceback

register_bp = Blueprint("register",__name__,template_folder="../../templates")

# Regex para validar emails comunes
EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

@register_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    e_mail = data.get("e_mail", "").strip()

    # Validar campos requeridos
    if not username or not password or not e_mail:
        return jsonify({"success": False, "message": "Usuario, contraseña y correo son requeridos"}), 400

    # Validar longitud de username y password
    if len(username) < 3 or len(username) > 50:
        return jsonify({"success": False, "message": "El usuario debe tener entre 3 y 50 caracteres"}), 400

    if len(password) < 6:
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    # Validar email con regex
    if not re.match(EMAIL_REGEX, e_mail):
        return jsonify({"success": False, "message": "El correo no es válido"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Validar si el usuario ya existe
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "El usuario ya existe"}), 409

        # Validar si el email ya está registrado
        cursor.execute("SELECT id FROM Usuarios WHERE e_mail = ?", (e_mail,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "El correo ya está registrado"}), 409

        # Hashear la contraseña
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # Guardar en BD con email
        cursor.execute(
            "INSERT INTO Usuarios (username, password, e_mail) VALUES (?, ?, ?)",
            (username, hashed.decode("utf-8"), e_mail)
        )
        conn.commit()

        cursor.execute("SELECT SCOPE_IDENTITY()")
        user_id = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        # Generar token
        token = jwt.encode(
            {"username": username, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            config.SECRET_KEY,
            algorithm="HS256"
        )

        # -------------------------
        # Envío del correo de bienvenida
        # -------------------------
        try:
            # Ruta base actual para verificar en consola
            base_dir = os.getcwd()
            print(f"📂 Directorio actual: {base_dir}")

            # Verificación extra del archivo
            plantilla_path = os.path.join(base_dir, "templates", "emails", "bienvenida.html")
            print(f"📄 Verificando plantilla: {plantilla_path}")
            print(f"¿Existe? {'✅ Sí' if os.path.exists(plantilla_path) else '❌ No'}")

            # Renderizar plantilla
            html_body = render_template("emails/bienvenida.html", username=username)

            msg = Message(
                subject="¡Bienvenido a IntelliSolve!",
                recipients=[e_mail],
                html=html_body
            )
            mail.send(msg)
            print("✅ Correo de bienvenida enviado con éxito")

        except Exception as mail_error:
            # Mostrar error completo (no solo el mensaje)
            print("❌ Error exacto enviando correo de bienvenida:")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Usuario registrado con éxito (correo de bienvenida enviado o ignorado si falló)",
            "token": token
        }), 201

    except Exception as e:
        print("❌ Error en registro general:")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error en el registro del usuario"}), 500
