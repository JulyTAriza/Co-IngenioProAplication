# auth_bp.py - Agregar estas rutas a tu Blueprint existente
from flask import Blueprint, request, jsonify, render_template
import bcrypt
import jwt
import datetime
import secrets
import re
from database import get_db_connection
import config
from extensions import mail
from flask_mail import Message
import os
import traceback

auth_bp = Blueprint("auth", __name__)

# ... (tu código de login y register existente) ...

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"success": False, "message": "El correo es requerido"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si el email existe
        cursor.execute("SELECT id, username FROM Usuarios WHERE e_mail = ?", (email,))
        user = cursor.fetchone()

        if not user:
            conn.close()
            # Por seguridad, no revelamos si el email existe o no
            return jsonify({
                "success": True, 
                "message": "Si el email existe, recibirás un enlace de recuperación"
            })

        user_id = user[0]
        username = user[1]

        # Generar token de recuperación (válido por 1 hora)
        reset_token = secrets.token_urlsafe(32)
        
        # Guardar token en la base de datos
        cursor.execute(
            "INSERT INTO PasswordResets (user_id, token, expires_at) VALUES (?, ?, DATEADD(hour, 1, GETDATE()))",
            (user_id, reset_token)
        )
        conn.commit()
        conn.close()

        # Enviar email de recuperación
        try:
            reset_link = f"{config.FRONTEND_URL}/reset-password?token={reset_token}"
            
            html_body = render_template(
                "emails/reset_password.html",
                username=username,
                reset_link=reset_link
            )

            msg = Message(
                subject="Recupera tu contraseña - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            print(f"✅ Email de recuperación enviado a {email}")

        except Exception as mail_error:
            print("❌ Error enviando email de recuperación:")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Si el email existe, recibirás un enlace de recuperación"
        })

    except Exception as e:
        print("❌ Error en forgot-password:")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()

    if not token or not new_password:
        return jsonify({"success": False, "message": "Token y nueva contraseña son requeridos"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar token válido y no expirado
        cursor.execute("""
            SELECT pr.user_id, u.username 
            FROM PasswordResets pr 
            JOIN Usuarios u ON pr.user_id = u.id 
            WHERE pr.token = ? AND pr.expires_at > GETDATE() AND pr.used = 0
        """, (token,))
        
        reset_record = cursor.fetchone()

        if not reset_record:
            conn.close()
            return jsonify({"success": False, "message": "Token inválido o expirado"}), 400

        user_id = reset_record[0]
        username = reset_record[1]

        # Hashear nueva contraseña
        hashed_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())

        # Actualizar contraseña del usuario
        cursor.execute(
            "UPDATE Usuarios SET password = ? WHERE id = ?",
            (hashed_password.decode("utf-8"), user_id)
        )

        # Marcar token como usado
        cursor.execute(
            "UPDATE PasswordResets SET used = 1 WHERE token = ?",
            (token,)
        )

        conn.commit()
        conn.close()

        # Opcional: Enviar email de confirmación
        try:
            html_body = render_template(
                "emails/password_changed.html",
                username=username
            )

            msg = Message(
                subject="Contraseña actualizada - Co-IngenioPro",
                recipients=[email],  # Necesitarías guardar el email en el reset record
                html=html_body
            )
            mail.send(msg)
            print("✅ Email de confirmación de cambio de contraseña enviado")

        except Exception as mail_error:
            print("❌ Error enviando email de confirmación:")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Contraseña restablecida exitosamente"
        })

    except Exception as e:
        print("❌ Error en reset-password:")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500