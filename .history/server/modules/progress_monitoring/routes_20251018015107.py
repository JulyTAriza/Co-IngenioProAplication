from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

progress_bp = Blueprint("progress", __name__)

# ---------------------------
# DECORADOR: TOKEN JWT
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
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
# PROGRESO POR PROYECTOS (CORREGIDO)
# ---------------------------
@progress_bp.route("/projects", methods=["GET", "OPTIONS"])
@token_required
def get_projects_progress(current_user):
    """
    Retorna el % de avance de todos los proyectos
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener todos los proyectos con sus tareas (CORREGIDO: 'finalizada')
        cursor.execute("""
            SELECT 
                p.id_proyecto,
                p.nombre,
                p.estado,
                p.fecha_inicio,
                p.fecha_fin,
                COUNT(a.id_actividad) as total_tasks,
                SUM(CASE WHEN a.estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM proyectos p
            LEFT JOIN actividades_cronograma a ON p.id_proyecto = a.id_proyecto
            WHERE p.estado <> 'Eliminado'
            GROUP BY p.id_proyecto, p.nombre, p.estado, p.fecha_inicio, p.fecha_fin
            ORDER BY p.nombre
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        projects = []
        for r in rows:
            total = r[5] or 0
            completed = r[6] or 0
            percentage = round((completed / total * 100), 1) if total > 0 else 0
            
            projects.append({
                "id": r[0],
                "name": r[1],
                "status": r[2],
                "startDate": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "endDate": r[4].strftime('%Y-%m-%d') if r[4] else None,
                "totalTasks": total,
                "completedTasks": completed,
                "percentage": percentage
            })
        
        print(f"✅ Progreso de {len(projects)} proyectos calculado")
        return jsonify(success=True, data=projects), 200

    except Exception as e:
        print(f"❌ ERROR en get_projects_progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# PROGRESO POR USUARIOS (CORREGIDO)
# ---------------------------
@progress_bp.route("/users", methods=["GET", "OPTIONS"])
@token_required
def get_users_progress(current_user):
    """
    Retorna el % de avance de tareas por cada usuario
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Consulta corregida: usar 'finalizada' en lugar de 'Completada'
        cursor.execute("""
            SELECT 
                pp.id_personal_proyecto,
                u.username as nombre_usuario,
                pp.rol,
                COUNT(a.id_actividad) as total_tasks,
                SUM(CASE WHEN a.estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM personal_proyecto pp
            INNER JOIN Usuarios u ON pp.id_usuario = u.id
            LEFT JOIN actividades_cronograma a ON pp.id_personal_proyecto = a.id_personal_proyecto
            GROUP BY pp.id_personal_proyecto, u.username, pp.rol
            HAVING COUNT(a.id_actividad) > 0
            ORDER BY u.username
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for r in rows:
            total = r[3] or 0
            completed = r[4] or 0
            percentage = round((completed / total * 100), 1) if total > 0 else 0
            
            users.append({
                "id": r[0],
                "name": r[1],
                "role": r[2],
                "totalTasks": total,
                "completedTasks": completed,
                "percentage": percentage
            })
        
        print(f"✅ Progreso de {len(users)} usuarios calculado")
        return jsonify(success=True, data=users), 200

    except Exception as e:
        print(f"❌ ERROR en get_users_progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# DETALLE DE PROGRESO DE UN PROYECTO (CORREGIDO)
# ---------------------------
@progress_bp.route("/projects/<int:project_id>", methods=["GET", "OPTIONS"])
@token_required
def get_project_detail(current_user, project_id):
    """
    Retorna detalle de progreso de un proyecto específico con tareas por etapa
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Información general del proyecto (CORREGIDO: 'finalizada')
        cursor.execute("""
            SELECT 
                p.id_proyecto,
                p.nombre,
                p.estado,
                p.fecha_inicio,
                p.fecha_fin,
                COUNT(a.id_actividad) as total_tasks,
                SUM(CASE WHEN a.estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM proyectos p
            LEFT JOIN actividades_cronograma a ON p.id_proyecto = a.id_proyecto
            WHERE p.id_proyecto = ?
            GROUP BY p.id_proyecto, p.nombre, p.estado, p.fecha_inicio, p.fecha_fin
        """, (project_id,))
        
        project_row = cursor.fetchone()
        
        if not project_row:
            conn.close()
            return jsonify(success=False, message="Proyecto no encontrado"), 404
        
        total = project_row[5] or 0
        completed = project_row[6] or 0
        percentage = round((completed / total * 100), 1) if total > 0 else 0
        
        project_info = {
            "id": project_row[0],
            "name": project_row[1],
            "status": project_row[2],
            "startDate": project_row[3].strftime('%Y-%m-%d') if project_row[3] else None,
            "endDate": project_row[4].strftime('%Y-%m-%d') if project_row[4] else None,
            "totalTasks": total,
            "completedTasks": completed,
            "percentage": percentage
        }
        
        # Progreso por etapa (CORREGIDO: 'finalizada')
        cursor.execute("""
            SELECT 
                e.id_etapa,
                e.nombre_etapa,
                e.fecha_inicio,
                e.fecha_fin,
                COUNT(a.id_actividad) as total_tasks,
                SUM(CASE WHEN a.estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM etapas_proyecto e
            LEFT JOIN actividades_cronograma a ON e.id_etapa = a.id_etapa
            WHERE e.id_proyecto = ?
            GROUP BY e.id_etapa, e.nombre_etapa, e.fecha_inicio, e.fecha_fin
            ORDER BY e.fecha_inicio
        """, (project_id,))
        
        stage_rows = cursor.fetchall()
        conn.close()
        
        stages = []
        for r in stage_rows:
            stage_total = r[4] or 0
            stage_completed = r[5] or 0
            stage_percentage = round((stage_completed / stage_total * 100), 1) if stage_total > 0 else 0
            
            stages.append({
                "id": r[0],
                "name": r[1],
                "startDate": r[2].strftime('%Y-%m-%d') if r[2] else None,
                "endDate": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "totalTasks": stage_total,
                "completedTasks": stage_completed,
                "percentage": stage_percentage
            })
        
        print(f"✅ Detalle de proyecto {project_id} calculado")
        return jsonify(success=True, data={
            "project": project_info,
            "stages": stages
        }), 200

    except Exception as e:
        print(f"❌ ERROR en get_project_detail: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# RESUMEN GENERAL (DASHBOARD) (CORREGIDO)
# ---------------------------
@progress_bp.route("/summary", methods=["GET", "OPTIONS"])
@token_required
def get_progress_summary(current_user):
    """
    Retorna resumen general para dashboard: proyectos activos, tareas pendientes, etc.
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total de proyectos activos
        cursor.execute("""
            SELECT COUNT(*) FROM proyectos WHERE estado = 'Activo'
        """)
        active_projects = cursor.fetchone()[0] or 0
        
        # Total de tareas pendientes (CORREGIDO: 'finalizada')
        cursor.execute("""
            SELECT COUNT(*) FROM actividades_cronograma WHERE estado != 'finalizada'
        """)
        pending_tasks = cursor.fetchone()[0] or 0
        
        # Total de tareas completadas (CORREGIDO: 'finalizada')
        cursor.execute("""
            SELECT COUNT(*) FROM actividades_cronograma WHERE estado = 'finalizada'
        """)
        completed_tasks = cursor.fetchone()[0] or 0
        
        # Promedio de avance general
        total_tasks = pending_tasks + completed_tasks
        avg_progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        
        conn.close()
        
        summary = {
            "activeProjects": active_projects,
            "pendingTasks": pending_tasks,
            "completedTasks": completed_tasks,
            "totalTasks": total_tasks,
            "averageProgress": avg_progress
        }
        
        print(f"✅ Resumen general calculado")
        return jsonify(success=True, data=summary), 200

    except Exception as e:
        print(f"❌ ERROR en get_progress_summary: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500