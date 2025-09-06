from flask import Blueprint, request, jsonify
from database import get_db_connection

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

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
    cursor.execute("""
        UPDATE Notifications
        SET IsRead = 1
        WHERE Id = ?
    """, (notif_id,))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Notificación marcada como leída"})
