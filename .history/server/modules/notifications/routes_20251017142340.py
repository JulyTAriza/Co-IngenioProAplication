from flask import Blueprint, request, jsonify, render_template_string
import os
import logging
from database import get_db_connection
from flask_mail import Message
from extensions import mail
from datetime import datetime

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")
logger = logging.getLogger(__name__)

# ========================
# FUNCIONES AUXILIARES
# ========================

def load_email_template(template_name, **context):
    """
    Carga una plantilla HTML desde templates/emails/
    y reemplaza las variables con los valores que pasamos
    """
    template_path = os.path.join(
        os.path.dirname(__file__), 
        '..', 'templates', 'emails', 
        f'{template_name}.html'
    )
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Renderizar con Jinja2 (reemplaza {{ variables }})
        return render_template_string(template_content, **context)
    
    except FileNotFoundError:
        logger.error(f"❌ Plantilla no encontrada: {template_path}")
        raise Exception(f"Plantilla '{template_name}' no existe")
    except Exception as e:
        logger.error(f"❌ Error cargando plantilla: {str(e)}")
        raise


def send_email_with_log(recipient_email, subject, html_content, notification_id=None):
    """
    Envía un correo HTML y registra si fue exitoso o falló
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=html_content
        )
        mail.send(msg)
        
        # Marcar como enviado en BD
        if notification_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE Notifications
                SET EmailSent = 1, EmailSentAt = SYSUTCDATETIME()
                WHERE Id = ?
            """, (notification_id,))
            conn.commit()
            cursor.close()
            conn.close()
        
        logger.info(f"✅ Email enviado a {recipient_email}")
        return True, None
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error al enviar email a {recipient_email}: {error_msg}")
        return False, error_msg


# ========================
# RUTAS
# ========================

@notifications_bp.route("/user/<string:username>", methods=["GET"])
def get_notifications_by_username(username):
    """
    Obtiene todas las notificaciones de un usuario
    """
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


@notifications_bp.route("/", methods=["POST"])
def create_notification():
    """
    Crea una notificación manualmente
    """
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


@notifications_bp.route("/<int:notif_id>/read", methods=["PUT"])
def mark_as_read(notif_id):
    """
    Marca una notificación como leída
    """
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


@notifications_bp.route("/send-welcome/<string:username>", methods=["POST"])
def send_welcome_email(username):
    """
    Envía email de bienvenida cuando un usuario se registra
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Obtener email del usuario
        cursor.execute("""
            SELECT Id, e_mail FROM Usuarios WHERE Username = ?
        """, (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user_id, email = user
        
        if not email:
            return jsonify({"error": "Usuario sin email"}), 400
        
        # Cargar plantilla de bienvenida
        html_content = load_email_template('bienvenida', username=username)
        
        # Enviar email
        success, error = send_email_with_log(
            email, 
            "¡Bienvenido a CO-INGENIO!", 
            html_content
        )
        
        if success:
            return jsonify({"message": "Email de bienvenida enviado"}), 200
        else:
            return jsonify({"error": error}), 500
    
    except Exception as e:
        logger.error(f"Error en send_welcome_email: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route("/check/critical", methods=["GET", "POST"])
def check_critical_notifications():
    """
    Ejecuta SP para generar notificaciones críticas y las envía por email
    con plantillas HTML profesionales
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Ejecutar SP (exactamente como lo hacías)
        cursor.execute("EXEC sp_GenerarNotificacionesCriticas @HorasAviso = 24;")
        conn.commit()

        # Traer notificaciones NO LEÍDAS y NO ENVIADAS
        cursor.execute("""
            SELECT n.Id, n.Title, n.Message, u.Username, u.e_mail, n.Priority
            FROM Notifications n
            JOIN Usuarios u ON n.UserId = u.Id
            WHERE n.IsRead = 0
              AND n.EmailSent = 0
              AND n.CreatedAt >= DATEADD(MINUTE, -90, SYSUTCDATETIME())
        """)
        rows = cursor.fetchall()

        enviados = []
        fallos = []
        
        for row in rows:
            notif_id, title, message, username, email, priority = row
            
            # Si no tiene email, registra fallo y continúa
            if not email:
                logger.warning(f"⚠️ Notificación {notif_id}: Usuario sin email")
                fallos.append({"notif_id": notif_id, "error": "Sin email"})
                continue
            
            try:
                # Determinar plantilla según Priority (del SP)
                # Priority 3 = crítica, así que será "alta"
                # Puedes ajustar esto según tus valores
                if priority and priority >= 3:
                    template_name = 'alerta_alta'
                else:
                    template_name = 'alerta_media'
                
                # Cargar plantilla con las variables del SP
                html_content = load_email_template(
                    template_name,
                    username=username,
                    title=title,
                    message=message,
                    timestamp=datetime.now().strftime('%d/%m/%Y %H:%M:%S')
                )
                
                # Enviar email
                success, error = send_email_with_log(
                    email, 
                    f"⚠️ Alerta: {title}", 
                    html_content, 
                    notif_id
                )
                
                if success:
                    enviados.append({
                        "to": email, 
                        "title": title, 
                        "username": username
                    })
                else:
                    fallos.append({
                        "notif_id": notif_id, 
                        "error": error
                    })
            
            except Exception as e:
                logger.error(f"❌ Error procesando notificación {notif_id}: {str(e)}")
                fallos.append({
                    "notif_id": notif_id,
                    "error": str(e)
                })

        return jsonify({
            "message": "Verificación completada",
            "enviados": len(enviados),
            "fallos": len(fallos),
            "detalles": enviados
        }), 200

    except Exception as e:
        logger.error(f"❌ Error crítico: {str(e)}")
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()