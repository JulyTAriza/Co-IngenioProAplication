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
# GET MIS TAREAS (CON DEBUG Y FILTRO DE PROYECTOS ELIMINADOS)
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
        print(f"🔍 [MY-TASKS] Buscando tareas para usuario: {current_user}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1️⃣ Obtener id del usuario desde username
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            print("❌ [MY-TASKS] Usuario no encontrado en la base de datos")
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        print(f"✅ [MY-TASKS] ID de usuario encontrado: {id_usuario}")
        
        # 2️⃣ Buscar personal_proyecto asociado a este usuario (solo de proyectos no eliminados)
        cursor.execute("""
            SELECT pp.id_personal_proyecto, pp.id_proyecto, pp.rol, p.nombre as proyecto_nombre
            FROM personal_proyecto pp
            INNER JOIN proyectos p ON pp.id_proyecto = p.id_proyecto
            WHERE pp.id_usuario = ? AND p.estado <> 'Eliminado'
        """, (id_usuario,))
        personal_rows = cursor.fetchall()
        
        if not personal_rows:
            conn.close()
            print(f"⚠️  [MY-TASKS] No se encontró personal_proyecto para el usuario ID: {id_usuario}")
            print("💡 [MY-TASKS] Esto significa que el usuario no está asignado a ningún proyecto activo")
            return jsonify(success=True, data={"pending": [], "completed": []}), 200
        
        print(f"✅ [MY-TASKS] Personal proyectos encontrados (proyectos activos): {len(personal_rows)}")
        for personal in personal_rows:
            print(f"   - ID Personal: {personal[0]}, Proyecto: {personal[1]}, Nombre: '{personal[3]}', Rol: {personal[2]}")
        
        # 3️⃣ Obtener tareas asignadas a todos los personal_proyecto de este usuario (solo de proyectos no eliminados)
        personal_ids = [personal[0] for personal in personal_rows]
        placeholders = ','.join('?' for _ in personal_ids)
        
        cursor.execute(f"""
            SELECT 
                a.id_actividad,
                a.nombre_actividad,
                a.descripcion,
                a.fecha_inicio,
                a.fecha_fin,
                a.estado,
                p.nombre as nombre_proyecto,
                p.id_proyecto,
                e.nombre_etapa,
                a.id_personal_proyecto
            FROM actividades_cronograma a
            INNER JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            INNER JOIN etapas_proyecto e ON a.id_etapa = e.id_etapa
            WHERE a.id_personal_proyecto IN ({placeholders})
            AND p.estado <> 'Eliminado'
            ORDER BY a.fecha_fin ASC
        """, personal_ids)
        
        rows = cursor.fetchall()
        conn.close()
        
        print(f"📊 [MY-TASKS] Tareas encontradas en BD (proyectos activos): {len(rows)}")
        
        # Mostrar detalles de cada tarea encontrada
        for i, r in enumerate(rows):
            print(f"   Tarea {i+1}: ID={r[0]}, Nombre='{r[1]}', Estado='{r[5]}', Proyecto='{r[6]}', Personal={r[9]}")
        
        # 4️⃣ Separar pendientes y completadas
        pending = []
        completed = []
        
        for r in rows:
            task = {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "startDate": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "endDate": r[4].strftime('%Y-%m-%d') if r[4] else None,
                "status": r[5],
                "project": r[6],
                "projectId": r[7],
                "stage": r[8],
                "personalId": r[9]  # Para debug
            }
            
            if r[5] and r[5].lower() == 'finalizada':
                completed.append(task)
            else:
                pending.append(task)
        
        print(f"✅ [MY-TASKS] Tareas procesadas - Pendientes: {len(pending)}, Completadas: {len(completed)}")
        
        return jsonify(success=True, data={
            "pending": pending,
            "completed": completed
        }), 200

    except Exception as e:
        print(f"❌ [MY-TASKS] ERROR en get_my_tasks: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# COMPLETAR TAREA (CON FILTRO DE PROYECTOS ELIMINADOS)
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
        print(f"🔍 [COMPLETE-TASK] Usuario {current_user} intenta completar actividad {task_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1️⃣ Verificar que el usuario existe
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        
        # 2️⃣ Obtener todos los personal_proyecto del usuario (solo de proyectos no eliminados)
        cursor.execute("""
            SELECT pp.id_personal_proyecto 
            FROM personal_proyecto pp
            INNER JOIN proyectos p ON pp.id_proyecto = p.id_proyecto
            WHERE pp.id_usuario = ? AND p.estado <> 'Eliminado'
        """, (id_usuario,))
        personal_rows = cursor.fetchall()
        personal_ids = [p[0] for p in personal_rows]
        
        # 3️⃣ Verificar que la tarea existe y está asignada a este usuario (solo de proyectos no eliminados)
        cursor.execute("""
            SELECT 
                a.id_actividad, 
                a.nombre_actividad, 
                a.estado,
                a.id_personal_proyecto,
                p.nombre as proyecto_nombre,
                p.estado as proyecto_estado
            FROM actividades_cronograma a
            INNER JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            WHERE a.id_actividad = ?
        """, (task_id,))
        
        task = cursor.fetchone()
        
        if not task:
            conn.close()
            return jsonify(success=False, message="Tarea no encontrada"), 404
        
        print(f"📝 [COMPLETE-TASK] Tarea encontrada: ID={task[0]}, Nombre='{task[1]}', Proyecto='{task[4]}', EstadoProyecto='{task[5]}'")
        
        # 4️⃣ Verificar que el proyecto no esté eliminado
        if task[5] == 'Eliminado':
            conn.close()
            print(f"🚫 [COMPLETE-TASK] No se puede completar tarea de proyecto eliminado")
            return jsonify(success=False, message="No se puede completar tarea de un proyecto eliminado"), 403
        
        # 5️⃣ Verificar que la tarea está asignada a alguno de los personal_proyecto del usuario
        if task[3] not in personal_ids:
            conn.close()
            return jsonify(success=False, message="No tienes permiso para completar esta tarea"), 403
        
        # 6️⃣ USAR EL VALOR CORRECTO: 'finalizada'
        print(f"🔄 [COMPLETE-TASK] Actualizando estado a: 'finalizada'")
        
        cursor.execute("""
            UPDATE actividades_cronograma
            SET estado = 'finalizada'
            WHERE id_actividad = ?
        """, (task_id,))
        
        conn.commit()
        conn.close()
        
        print(f"✅ [COMPLETE-TASK] Tarea {task_id} marcada como 'finalizada' exitosamente")
        return jsonify(success=True, message="Tarea completada correctamente"), 200

    except Exception as e:
        print(f"❌ [COMPLETE-TASK] ERROR completando tarea: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# REABRIR TAREA (CON FILTRO DE PROYECTOS ELIMINADOS)
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
        print(f"🔍 [REOPEN-TASK] Usuario {current_user} intenta reabrir actividad {task_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar permisos
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (current_user,))
        user_row = cursor.fetchone()
        
        if not user_row:
            conn.close()
            print("❌ [REOPEN-TASK] Usuario no encontrado")
            return jsonify(success=False, message="Usuario no encontrado"), 404
        
        id_usuario = user_row[0]
        
        # Verificar que la tarea existe y el proyecto no está eliminado
        cursor.execute("""
            SELECT 
                a.id_actividad, 
                a.nombre_actividad, 
                pp.id_usuario,
                p.estado as proyecto_estado
            FROM actividades_cronograma a
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            LEFT JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            WHERE a.id_actividad = ?
        """, (task_id,))
        
        task = cursor.fetchone()
        
        if not task:
            conn.close()
            print(f"❌ [REOPEN-TASK] Tarea {task_id} no encontrada")
            return jsonify(success=False, message="Tarea no encontrada"), 404
        
        print(f"📝 [REOPEN-TASK] Tarea encontrada: ID={task[0]}, Nombre='{task[1]}', UsuarioAsignado={task[2]}, EstadoProyecto='{task[3]}'")
        
        # Verificar que el proyecto no esté eliminado
        if task[3] == 'Eliminado':
            conn.close()
            print(f"🚫 [REOPEN-TASK] No se puede reabrir tarea de proyecto eliminado")
            return jsonify(success=False, message="No se puede reabrir tarea de un proyecto eliminado"), 403
        
        if task[2] != id_usuario:
            conn.close()
            print(f"🚫 [REOPEN-TASK] Permiso denegado")
            return jsonify(success=False, message="No tienes permiso"), 403
        
        # Actualizar estado
        cursor.execute("""
            UPDATE actividades_cronograma
            SET estado = 'pendiente'
            WHERE id_actividad = ?
        """, (task_id,))
        
        conn.commit()
        conn.close()
        
        print(f"✅ [REOPEN-TASK] Tarea {task_id} reabierta por {current_user}")
        
        return jsonify(success=True, message="Tarea reabierta correctamente"), 200

    except Exception as e:
        print(f"❌ [REOPEN-TASK] ERROR reabriendo tarea: {str(e)}")
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# DIAGNÓSTICO COMPLETO (ACTUALIZADO)
# ---------------------------
@my_tasks_bp.route("/debug", methods=["GET", "OPTIONS"])
@token_required
def debug_my_tasks(current_user):
    """
    Endpoint temporal para diagnosticar por qué no aparecen las tareas
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔧 [DEBUG] Diagnóstico completo para usuario: {current_user}")
        
        # 1. Verificar que el usuario existe
        cursor.execute("SELECT id, username, rol FROM Usuarios WHERE username = ?", (current_user,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({"success": False, "error": "Usuario no encontrado"}), 404
        
        user_id, username, user_role = user
        print(f"👤 [DEBUG] Usuario en BD: ID={user_id}, Username={username}, Rol={user_role}")
        
        # 2. Verificar personal_proyecto (solo proyectos no eliminados)
        cursor.execute("""
            SELECT pp.id_personal_proyecto, pp.id_proyecto, pp.rol, p.nombre as proyecto_nombre, p.estado as proyecto_estado
            FROM personal_proyecto pp
            LEFT JOIN proyectos p ON pp.id_proyecto = p.id_proyecto
            WHERE pp.id_usuario = ? AND p.estado <> 'Eliminado'
        """, (user_id,))
        personal_data = cursor.fetchall()
        
        print(f"👥 [DEBUG] Personal proyectos encontrados (proyectos activos): {len(personal_data)}")
        personal_ids = []
        for p in personal_data:
            print(f"   - ID Personal: {p[0]}, Proyecto ID: {p[1]}, Proyecto: '{p[3]}', Estado: '{p[4]}', Rol: {p[2]}")
            personal_ids.append(p[0])
        
        # 3. Verificar actividades_cronograma (solo de proyectos no eliminados)
        actividades_data = []
        if personal_ids:
            placeholders = ','.join('?' for _ in personal_ids)
            
            cursor.execute(f"""
                SELECT 
                    a.id_actividad, 
                    a.nombre_actividad, 
                    a.estado, 
                    a.id_personal_proyecto,
                    a.fecha_inicio,
                    a.fecha_fin,
                    p.nombre as proyecto_nombre,
                    e.nombre_etapa,
                    p.estado as proyecto_estado
                FROM actividades_cronograma a
                LEFT JOIN proyectos p ON a.id_proyecto = p.id_proyecto
                LEFT JOIN etapas_proyecto e ON a.id_etapa = e.id_etapa
                WHERE a.id_personal_proyecto IN ({placeholders})
                AND p.estado <> 'Eliminado'
                ORDER BY a.fecha_fin ASC
            """, personal_ids)
            
            actividades_data = cursor.fetchall()
        
        print(f"📝 [DEBUG] Actividades encontradas (proyectos activos): {len(actividades_data)}")
        for a in actividades_data:
            print(f"   - ID: {a[0]}, Nombre: '{a[1]}', Estado: '{a[2]}', Personal: {a[3]}, Proyecto: '{a[6]}', Etapa: '{a[7]}', EstadoProyecto: '{a[8]}'")
        
        # 4. Verificar todos los proyectos existentes (para referencia)
        cursor.execute("SELECT id_proyecto, nombre, estado FROM proyectos")
        proyectos_data = cursor.fetchall()
        
        print(f"🏗️  [DEBUG] Proyectos totales en sistema: {len(proyectos_data)}")
        for p in proyectos_data:
            print(f"   - ID: {p[0]}, Nombre: '{p[1]}', Estado: '{p[2]}'")
        
        conn.close()
        
        # Preparar respuesta detallada
        response_data = {
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "role": user_role
            },
            "personal_projects": [
                {
                    "id_personal": p[0],
                    "id_proyecto": p[1],
                    "rol": p[2],
                    "proyecto_nombre": p[3],
                    "proyecto_estado": p[4]
                } for p in personal_data
            ],
            "activities": [
                {
                    "id_actividad": a[0],
                    "nombre_actividad": a[1],
                    "estado": a[2],
                    "id_personal_proyecto": a[3],
                    "fecha_inicio": a[4].strftime('%Y-%m-%d') if a[4] else None,
                    "fecha_fin": a[5].strftime('%Y-%m-%d') if a[5] else None,
                    "proyecto_nombre": a[6],
                    "etapa": a[7],
                    "proyecto_estado": a[8]
                } for a in actividades_data
            ],
            "summary": {
                "personal_projects_count": len(personal_data),
                "activities_count": len(actividades_data),
                "pending_activities": len([a for a in actividades_data if a[2] != 'finalizada']),
                "completed_activities": len([a for a in actividades_data if a[2] == 'finalizada'])
            }
        }
        
        print(f"✅ [DEBUG] Diagnóstico completado")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ [DEBUG] ERROR en diagnóstico: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500