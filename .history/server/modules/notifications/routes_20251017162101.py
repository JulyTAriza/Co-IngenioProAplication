from flask import Blueprint, request, jsonify, render_template
import os
import logging
from database import get_db_connection
from flask_mail import Message
from extensions import mail

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications",template_folder="../../templates")

# -------------------------
# Obtener notificaciones por username
# -------------------------
@notifications_bp.route("/user/<string:username>", methods=["GET"])
def get_notifications_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT n.Id, n.Title, n.Message, n.IsRead, n.CreatedAt
        FROM Notifications n
        JOIN Usuarios u ON n.UserId = u.Id
        WHERE u.Username = ?
        ORDER BY n.CreatedAt DESC
    """, (username,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    notifications = [
        {
            "id": row[0],
            "title": row[1],
            "message": row[2],
            "is_read": bool(row[3]),
            "created_at": row[4].strftime("%Y-%m-%d %H:%M:%S")
        }
        for row in rows
    ]

    return jsonify(notifications)

# -------------------------
# Crear notificación
# -------------------------
@notifications_bp.route("/", methods=["POST"])
def create_notification():
    data = request.get_json()

    user_id = data.get("user_id")
    title = data.get("title")
    message = data.get("message")

    if not user_id or not title or not message:
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Notifications (UserId, Title, Message)
        VALUES (?, ?, ?)
    """, (user_id, title, message))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Notificación creada"}), 201

# -------------------------
# Marcar notificación como leída
# -------------------------
@notifications_bp.route("/<int:notif_id>/read", methods=["PUT"])
def mark_as_read(notif_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT IsRead FROM Notifications WHERE Id = ?", (notif_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"error": "Notificación no encontrada"}), 404
        
        if row[0]:
            return jsonify({"message": "Notificación ya estaba marcada como leída"}), 200
        
        cursor.execute("""
            UPDATE Notifications
            SET IsRead = 1
            WHERE Id = ?
        """, (notif_id,))
        conn.commit()
        
        return jsonify({"message": "Notificación marcada como leída"}), 200
    
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()


# -------------------------
# Ejecutar SP y mandar correos (HTML bonitos)
# -------------------------
@notifications_bp.route("/check/critical", methods=["GET", "POST"])
def check_critical_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Ejecutar procedimiento almacenado
        cursor.execute("EXEC sp_GenerarNotificacionesCriticas @HorasAviso = 24;")
        conn.commit()

        # Traer notificaciones NO LEÍDAS y NO ENVIADAS creadas en los últimos 90 minutos
        cursor.execute("""
            SELECT n.Id, n.Title, n.Message, n.Priority, u.e_mail
            FROM Notifications n
            JOIN Usuarios u ON n.UserId = u.Id
            WHERE n.IsRead = 0
              AND n.EmailSent = 0
              AND n.CreatedAt >= DATEADD(MINUTE, -90, SYSUTCDATETIME())
        """)
        rows = cursor.fetchall()

        enviados = []
        for row in rows:
            notif_id, title, message, priority, email = row
            if not email:
                continue

            # Determinar plantilla según prioridad o título
            if priority == 3 or "vencer" in title or "Stock bajo" in title:
                template_name = "emails/alerta_alta.html"
            elif priority == 2:
                template_name = "emails/alerta_media.html"
            else:
                template_name = "emails/bienvenida.html"

            # Renderizar plantilla HTML
            html_content = render_template(template_name, titulo=title, mensaje=message)

            # Crear mensaje con contenido HTML
            msg = Message(subject=title, recipients=[email])
            msg.html = html_content
            mail.send(msg)

            # Marcar notificación como enviada
            cursor.execute("""
                UPDATE Notifications
                SET EmailSent = 1
                WHERE Id = ?
            """, notif_id)
            conn.commit()

            enviados.append({"to": email, "title": title, "template": template_name})

        return jsonify({
            "message": "SP ejecutado y correos HTML enviados correctamente",
            "enviados": enviados
        })

    except Exception as e:
        logging.error(f"Error al enviar notificaciones: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
