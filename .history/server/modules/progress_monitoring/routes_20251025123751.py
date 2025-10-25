from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

progress_bp = Blueprint("progress", __name__)

# ---------------------------
# DECORADORES: TOKEN JWT + ROLES
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

def role_required(roles_permitidos):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute("SELECT rol FROM usuarios WHERE username = ?", (current_user,))
                usuario = cursor.fetchone()
                conn.close()
                
                if not usuario:
                    return jsonify({'success': False, 'message': 'Usuario no encontrado'}), 404
                
                rol_usuario = usuario[0]
                
                if rol_usuario not in roles_permitidos:
                    return jsonify({
                        'success': False, 
                        'message': f'Acceso denegado. Se requiere uno de estos roles: {", ".join(roles_permitidos)}. Tu rol actual: {rol_usuario}'
                    }), 403
                
                return f(current_user, *args, **kwargs)
                
            except Exception as e:
                print(f"❌ ERROR en role_required: {str(e)}")
                return jsonify({'success': False, 'message': 'Error verificando permisos'}), 500
                
        return decorated
    return decorator


# ---------------------------
# PROGRESO POR PROYECTOS - SOLO ADMIN
# ---------------------------
@progress_bp.route("/projects", methods=["GET", "OPTIONS"])
@token_required
@role_required(['Administrador'])
def get_projects_progress(current_user):
    """
    Retorna el % de avance de todos los proyectos - SOLO ADMINISTRADORES
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener todos los proyectos con sus tareas (CORREGIDO: 'finalizada' y filtro eliminados)
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
        
        print(f"✅ Progreso de {len(projects)} proyectos calculado por {current_user}")
        return jsonify(success=True, data=projects), 200

    except Exception as e:
        print(f"❌ ERROR en get_projects_progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# PROGRESO POR USUARIOS - SOLO ADMIN
# ---------------------------
@progress_bp.route("/users", methods=["GET", "OPTIONS"])
@token_required
@role_required(['Administrador'])
def get_users_progress(current_user):
    """
    Retorna el % de avance de tareas por cada usuario con información del proyecto - SOLO ADMINISTRADORES
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Consulta corregida: incluir información del proyecto
        cursor.execute("""
            SELECT 
                pp.id_personal_proyecto,
                u.username as nombre_usuario,
                pp.rol,
                p.id_proyecto,
                p.nombre as nombre_proyecto,
                p.estado as estado_proyecto,
                COUNT(a.id_actividad) as total_tasks,
                SUM(CASE WHEN a.estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM personal_proyecto pp
            INNER JOIN Usuarios u ON pp.id_usuario = u.id
            LEFT JOIN actividades_cronograma a ON pp.id_personal_proyecto = a.id_personal_proyecto
            LEFT JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            WHERE (p.estado <> 'Eliminado' OR p.estado IS NULL)
            GROUP BY pp.id_personal_proyecto, u.username, pp.rol, p.id_proyecto, p.nombre, p.estado
            HAVING COUNT(a.id_actividad) > 0
            ORDER BY u.username, p.nombre
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for r in rows:
            total = r[6] or 0
            completed = r[7] or 0
            percentage = round((completed / total * 100), 1) if total > 0 else 0
            
            users.append({
                "id": r[0],
                "name": r[1],
                "role": r[2],
                "project": {
                    "id": r[3],
                    "name": r[4],
                    "status": r[5]
                },
                "totalTasks": total,
                "completedTasks": completed,
                "percentage": percentage
            })
        
        print(f"✅ Progreso de {len(users)} usuarios calculado por {current_user}")
        return jsonify(success=True, data=users), 200

    except Exception as e:
        print(f"❌ ERROR en get_users_progress: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
    
# ---------------------------
# DETALLE DE PROGRESO DE UN PROYECTO - SOLO ADMIN
# ---------------------------
@progress_bp.route("/projects/<int:project_id>", methods=["GET", "OPTIONS"])
@token_required
@role_required(['Administrador'])
def get_project_detail(current_user, project_id):
    """
    Retorna detalle de progreso de un proyecto específico con tareas por etapa - SOLO ADMINISTRADORES
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Primero verificar que el proyecto existe y no está eliminado
        cursor.execute("""
            SELECT id_proyecto, nombre, estado 
            FROM proyectos 
            WHERE id_proyecto = ? AND estado <> 'Eliminado'
        """, (project_id,))
        
        project_exists = cursor.fetchone()
        
        if not project_exists:
            conn.close()
            print(f"❌ Proyecto {project_id} no encontrado o está eliminado")
            return jsonify(success=False, message="Proyecto no encontrado"), 404
        
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
            WHERE p.id_proyecto = ? AND p.estado <> 'Eliminado'
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
            LEFT JOIN proyectos p ON e.id_proyecto = p.id_proyecto
            WHERE e.id_proyecto = ? AND p.estado <> 'Eliminado'
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
        
        print(f"✅ Detalle de proyecto {project_id} calculado por {current_user}")
        return jsonify(success=True, data={
            "project": project_info,
            "stages": stages
        }), 200

    except Exception as e:
        print(f"❌ ERROR en get_project_detail: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# RESUMEN GENERAL (DASHBOARD) - SOLO ADMIN
# ---------------------------
@progress_bp.route("/summary", methods=["GET", "OPTIONS"])
@token_required
@role_required(['Administrador'])
def get_progress_summary(current_user):
    """
    Retorna resumen general para dashboard: proyectos activos, tareas pendientes, etc. - SOLO ADMINISTRADORES
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total de proyectos activos (excluyendo eliminados)
        cursor.execute("""
            SELECT COUNT(*) FROM proyectos WHERE estado = 'finalizada' AND estado <> 'Eliminado'
        """)
        active_projects = cursor.fetchone()[0] or 0
        
        # Total de tareas pendientes (CORREGIDO: 'finalizada' y excluyendo proyectos eliminados)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM actividades_cronograma a
            LEFT JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            WHERE a.estado != 'finalizada' 
            AND (p.estado <> 'Eliminado' OR p.estado IS NULL)
        """)
        pending_tasks = cursor.fetchone()[0] or 0
        
        # Total de tareas completadas (CORREGIDO: 'finalizada' y excluyendo proyectos eliminados)
        cursor.execute("""
            SELECT COUNT(*) 
            FROM actividades_cronograma a
            LEFT JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            WHERE a.estado = 'finalizada' 
            AND (p.estado <> 'Eliminado' OR p.estado IS NULL)
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
        
        print(f"✅ Resumen general calculado por {current_user}")
        return jsonify(success=True, data=summary), 200

    except Exception as e:
        print(f"❌ ERROR en get_progress_summary: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
    

# ---------------------------
# FUNCIÓN AUXILIAR: VERIFICAR Y ACTUALIZAR ESTADO DEL PROYECTO - SOLO ADMIN
# ---------------------------
@token_required
@role_required(['Administrador'])
def check_and_update_project_status(current_user, project_id):
    """
    Verifica si todas las tareas de un proyecto están finalizadas
    y actualiza el estado del proyecto a 'finalizada' si es el caso. - SOLO ADMINISTRADORES
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar si hay tareas pendientes en el proyecto
        cursor.execute("""
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN estado = 'finalizada' THEN 1 ELSE 0 END) as completed_tasks
            FROM actividades_cronograma
            WHERE id_proyecto = ?
        """, (project_id,))
        
        result = cursor.fetchone()
        total_tasks = result[0] or 0
        completed_tasks = result[1] or 0
        
        # Si todas las tareas están completadas y hay al menos una tarea
        if total_tasks > 0 and total_tasks == completed_tasks:
            # Actualizar el estado del proyecto a 'finalizada'
            cursor.execute("""
                UPDATE proyectos 
                SET estado = 'finalizada'
                WHERE id_proyecto = ? AND estado <> 'Eliminado'
            """, (project_id,))
            
            conn.commit()
            print(f"✅ Proyecto {project_id} actualizado a estado 'finalizada' por {current_user}")
            
            conn.close()
            return True
        
        conn.close()
        return False
        
    except Exception as e:
        print(f"❌ ERROR en check_and_update_project_status: {str(e)}")
        print(traceback.format_exc())
        return False