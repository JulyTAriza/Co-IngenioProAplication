# auth_bp.py - Rutas de autenticación
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


@auth_bp.route("/olvidar-contrasena", methods=["POST"])
def olvidar_contrasena():
    data = request.get_json()
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"success": False, "message": "El correo es requerido"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar si el email existe
        cursor.execute("SELECT id, username FROM Usuarios WHERE e_mail = ?", (email,))
        usuario = cursor.fetchone()

        if not usuario:
            conn.close()
            # Por seguridad, no revelamos si el email existe o no
            return jsonify({
                "success": True, 
                "message": "Si el email existe, recibirás un enlace de recuperación"
            })

        id_usuario = usuario[0]
        username = usuario[1]

        # Generar token de recuperación (válido por 1 hora)
        token = secrets.token_urlsafe(32)
        
        # Guardar token en la base de datos
        cursor.execute(
            "INSERT INTO ReseteosContrasena (id_usuario, token, fecha_expiracion) VALUES (?, ?, DATEADD(hour, 1, GETDATE()))",
            (id_usuario, token)
        )
        conn.commit()
        conn.close()

        # Enviar email de recuperación
        try:
            enlace_recuperacion = f"{config.FRONTEND_URL}/resetear-contrasena?token={token}"
            
            html_body = render_template(
                "emails/recuperar_contrasena.html",
                username=username,
                enlace_recuperacion=enlace_recuperacion
            )

            msg = Message(
                subject="Recupera tu contraseña - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            print(f"✅ Email de recuperación enviado a {email}")

        except Exception as error_email:
            print("❌ Error enviando email de recuperación:")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Si el email existe, recibirás un enlace de recuperación"
        })

    except Exception as e:
        print("❌ Error en olvidar-contrasena:")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/resetear-contrasena", methods=["POST"])
def resetear_contrasena():
    data = request.get_json()
    token = data.get("token", "").strip()
    nueva_contrasena = data.get("password", "").strip()

    if not token or not nueva_contrasena:
        return jsonify({"success": False, "message": "Token y nueva contraseña son requeridos"}), 400

    if len(nueva_contrasena) < 6:
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar token válido y no expirado
        cursor.execute("""
            SELECT rc.id_usuario, u.username, u.e_mail 
            FROM ReseteosContrasena rc 
            JOIN Usuarios u ON rc.id_usuario = u.id 
            WHERE rc.token = ? AND rc.fecha_expiracion > GETDATE() AND rc.utilizado = 0
        """, (token,))
        
        registro_reset = cursor.fetchone()

        if not registro_reset:
            conn.close()
            return jsonify({"success": False, "message": "Token inválido o expirado"}), 400

        id_usuario = registro_reset[0]
        username = registro_reset[1]
        email = registro_reset[2]

        # Hashear nueva contraseña (igual que en tu registro)
        contrasena_hasheada = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt())

        # ⭐⭐ ACTUALIZAR CONTRASEÑA EN LA TABLA Usuarios ⭐⭐
        cursor.execute(
            "UPDATE Usuarios SET password = ? WHERE id = ?",
            (contrasena_hasheada.decode("utf-8"), id_usuario)
        )

        # Marcar token como usado
        cursor.execute(
            "UPDATE ReseteosContrasena SET utilizado = 1 WHERE token = ?",
            (token,)
        )

        conn.commit()
        conn.close()

        # Opcional: Enviar email de confirmación
        try:
            html_body = render_template(
                "emails/contrasena_actualizada.html",
                username=username
            )

            msg = Message(
                subject="Contraseña actualizada - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            print("✅ Email de confirmación de cambio de contraseña enviado")

        except Exception as error_email:
            print("❌ Error enviando email de confirmación:")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Contraseña restablecida exitosamente"
        })

    except Exception as e:
        print("❌ Error en resetear-contrasena:")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500