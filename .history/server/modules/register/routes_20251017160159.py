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

register_bp = Blueprint("register", __name__)

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

        # Obtener ID insertado (por si se necesita)
        cursor.execute("SELECT SCOPE_IDENTITY()")
        user_id = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        # Generar token al registrar
        token = jwt.encode(
            {"username": username, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            config.SECRET_KEY,
            algorithm="HS256"
        )

        # -------------------------
        # Envío del correo de bienvenida
        # -------------------------
        try:
            # Renderizar la plantilla HTML (ubicada en templates/emails/welcome.html)
            html_body = render_template("emails/bienvenida.html", username=username)

            msg = Message(
                subject="¡Bienvenido a IntelliSolve!",
                recipients=[e_mail],
                html=html_body
            )
            mail.send(msg)

        except Exception as mail_error:
            # No interrumpir el registro si el correo falla
            print(f"Error enviando correo de bienvenida: {mail_error}")

        return jsonify({
            "success": True,
            "message": "Usuario registrado con éxito y correo de bienvenida enviado",
            "token": token
        }), 201

    except Exception as e:
        print(f"Error en registro: {e}")
        return jsonify({"success": False, "message": "Error en el registro del usuario"}), 500
