from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

my_tasks_bp = Blueprint("my_tasks", __name__)

# ---------------------------
# DECORADOR: TOKEN JWT
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # ✅ Manejar OPTIONS antes de cualquier verificación de token
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'preflight ok'})
            return response, 200
            
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"success": False, "message": "Token es requerido"}), 401

        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            current_user = payload.get("username")
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Token inválido"}), 401

        return f(current_user, *args, **kwargs)
    return decorated


# ---------------------------
# GET MIS TAREAS
# ---------------------------
@my_tasks_bp.route("/", methods=["GET", "OPTIONS"])
@token_required
def get_my_tasks(current_user):
    """
    Retorna las tareas asignadas al usuario logueado
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        print(f"🔍 Buscando tareas para usuario: {current_user}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1️⃣ Obtener id_usuario desde username
        cursor.execute("SELECT id_usuario FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        
        # 2️⃣ Buscar personal_proyecto asociado a este usuario
        cursor.execute("""
            SELECT id_personal_proyecto 
            FROM personal_proyecto 
            WHERE id_usuario = ?
        """, (id_usuario,))
        personal_row = cursor.fetchone()
        
        if not personal_row:
            conn.close()
            return jsonify(success=True, data={"pending": [], "completed": []}), 200
        
        id_personal = personal_row[0]
        
        # 3️⃣ Obtener tareas asignadas a este personal
        cursor.execute("""
            SELECT 
                a.id_actividad,
                a.nombre_actividad,
                a.descripcion,
                a.fecha_inicio,
                a.fecha_fin,
                a.estado,
                p.nombre_proyecto,
                p.id_proyecto,
                e.nombre_etapa
            FROM actividades_cronograma a
            INNER JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            INNER JOIN etapas_proyecto e ON a.id_etapa = e.id_etapa
            WHERE a.id_personal_proyecto = ?
            ORDER BY a.fecha_fin ASC
        """, (id_personal,))
        
        rows = cursor.fetchall()
        conn.close()
        
        # 4️⃣ Separar pendientes y completadas
        pending = []
        completed = []
        
        for r in rows:
            task = {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "startDate": r[3],
                "endDate": r[4],
                "status": r[5],
                "project": r[6],
                "projectId": r[7],
                "stage": r[8]
            }
            
            if r[5] and r[5].lower() == 'completada':
                completed.append(task)
            else:
                pending.append(task)
        
        print(f"✅ Tareas encontradas - Pendientes: {len(pending)}, Completadas: {len(completed)}")
        
        return jsonify(success=True, data={
            "pending": pending,
            "completed": completed
        }), 200

    except Exception as e:
        print(f"❌ ERROR en get_my_tasks: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# COMPLETAR TAREA
# ---------------------------
@my_tasks_bp.route("/<int:task_id>/complete", methods=["PUT", "OPTIONS"])
@token_required
def complete_task(current_user, task_id):
    """
    Marca una tarea como completada (solo el usuario asignado puede hacerlo)
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        print(f"🔍 Usuario {current_user} intenta completar actividad {task_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1️⃣ Verificar que la tarea existe y está asignada a este usuario
        cursor.execute("SELECT id_usuario FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        
        cursor.execute("""
            SELECT a.id_actividad, a.id_personal_proyecto, pp.id_usuario
            FROM actividades_cronograma a
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            WHERE a.id_actividad = ?
        """, (task_id,))
        
        task = cursor.fetchone()
        
        if not task:
            conn.close()
            return jsonify(success=False, message="Tarea no encontrada"), 404
        
        # Verificar que la tarea está asignada a este usuario
        if task[2] != id_usuario:
            conn.close()
            return jsonify(success=False, message="No tienes permiso para completar esta tarea"), 403
        
        # 2️⃣ Actualizar estado a "Completada"
        cursor.execute("""
            UPDATE actividades_cronograma
            SET estado = 'Completada'
            WHERE id_actividad = ?
        """, (task_id,))
        
        conn.commit()
        conn.close()
        
        print(f"✅ Tarea {task_id} completada por {current_user}")
        
        return jsonify(success=True, message="Tarea completada correctamente"), 200

    except Exception as e:
        print(f"❌ ERROR completando tarea: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# REABRIR TAREA (OPCIONAL)
# ---------------------------
@my_tasks_bp.route("/<int:task_id>/reopen", methods=["PUT", "OPTIONS"])
@token_required
def reopen_task(current_user, task_id):
    """
    Reabre una tarea completada (cambia estado a Pendiente)
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar permisos (igual que complete_task)
        cursor.execute("SELECT id_usuario FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        
        cursor.execute("""
            SELECT a.id_actividad, pp.id_usuario
            FROM actividades_cronograma a
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            WHERE a.id_actividad = ?
        """, (task_id,))
        
        task = cursor.fetchone()
        
        if not task or task[1] != id_usuario:
            conn.close()
            return jsonify(success=False, message="No tienes permiso"), 403
        
        # Actualizar estado
        cursor.execute("""
            UPDATE actividades_cronograma
            SET estado = 'Pendiente'
            WHERE id_actividad = ?
        """, (task_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify(success=True, message="Tarea reabierta correctamente"), 200

    except Exception as e:
        print(f"❌ ERROR reabriendo tarea: {str(e)}")
        return jsonify(success=False, message="Error interno del servidor"), 500