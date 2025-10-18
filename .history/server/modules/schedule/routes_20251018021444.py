from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
import json

from database import get_db_connection
import config

# Blueprint renombrado a "schedule"
schedule_bp = Blueprint("schedule", __name__)


@schedule_bp.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

# ---------------------------
# DECORADOR: TOKEN JWT
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # PERMITIR OPTIONS SIN TOKEN 
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
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
        def decorated(*args, **kwargs):
            if not hasattr(request, 'usuario'):
                return jsonify({'success': False, 'message': 'Autenticación requerida'}), 401
            
            rol_usuario = request.usuario.get('rol')
            
            if rol_usuario not in roles_permitidos:
                return jsonify({
                    'success': False, 
                    'message': f'Acceso denegado. Se requiere rol: {", ".join(roles_permitidos)}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator

# ---------------------------
# LISTAR ETAPAS DE UN PROYECTO
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/etapas", methods=["GET", "OPTIONS"])
@token_required
# @role_required(['Administrador', 'Supervisor', 'Operario'])
def listar_etapas(current_user, id_proyecto):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'preflight ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_etapa, nombre_etapa, descripcion, fecha_inicio, fecha_fin, estado
            FROM etapas_proyecto
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio ASC
        """, (id_proyecto,))
        rows = cursor.fetchall()
        conn.close()

        etapas = [
            {
                "id_etapa": r[0],
                "nombre": r[1],  # nombre_etapa
                "descripcion": r[2],
                "fecha_inicio": r[3],
                "fecha_fin": r[4],
                "estado": r[5]
            } for r in rows
        ]
        return jsonify(success=True, data=etapas), 200

    except Exception:
        current_app.logger.error("Error listando etapas:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# LISTAR ACTIVIDADES DE UNA ETAPA
# ---------------------------
@schedule_bp.route("/etapas/<int:id_etapa>/actividades", methods=["GET", "OPTIONS"])
@token_required
# @role_required(['Administrador', 'Supervisor', 'Operario'])
def listar_actividades(current_user, id_etapa):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id_actividad, a.nombre_actividad, a.descripcion, a.fecha_inicio, a.fecha_fin,
                   a.estado, pp.id_personal_proyecto, pp.nombre AS personal
            FROM actividades_cronograma a
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            WHERE a.id_etapa = ?
            ORDER BY a.fecha_inicio ASC
        """, (id_etapa,))
        rows = cursor.fetchall()
        conn.close()

        actividades = [
            {
                "id_actividad": r[0],
                "nombre": r[1],  # nombre_actividad
                "descripcion": r[2],
                "fecha_inicio": r[3],
                "fecha_fin": r[4],
                "estado": r[5],
                "id_personal": r[6],
                "personal": r[7]
            } for r in rows
        ]
        return jsonify(success=True, data=actividades), 200

    except Exception:
        current_app.logger.error("Error listando actividades:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# CREAR NUEVA ACTIVIDAD EN ETAPA (CON DIAGNÓSTICO ESPECÍFICO)
# ---------------------------
@schedule_bp.route("/etapas/<int:id_etapa>/actividades", methods=["POST", "OPTIONS"])
@token_required
def crear_actividad(current_user, id_etapa):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["nombre", "fecha_inicio", "fecha_fin", "estado"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False, message=f"Faltan campos: {', '.join(missing)}"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔍 [CREAR-ACTIVIDAD] Datos recibidos: {data}")
        
        # 1️⃣ OBTENER EL id_proyecto DE LA ETAPA
        cursor.execute("SELECT id_proyecto, nombre_etapa FROM etapas_proyecto WHERE id_etapa = ?", (id_etapa,))
        etapa = cursor.fetchone()
        
        if not etapa:
            conn.close()
            return jsonify(success=False, message="Etapa no encontrada"), 404
            
        id_proyecto = etapa[0]
        nombre_etapa = etapa[1]
        print(f"✅ [CREAR-ACTIVIDAD] Etapa '{nombre_etapa}' pertenece al proyecto: {id_proyecto}")
        
        # 2️⃣ OBTENER EL ID DEL USUARIO ACTUAL
        cursor.execute("SELECT id FROM Usuarios WHERE username = ?", (current_user,))
        usuario = cursor.fetchone()
        id_usuario = usuario[0] if usuario else None
        print(f"✅ [CREAR-ACTIVIDAD] Usuario actual: {current_user} (ID: {id_usuario})")
        
        # 3️⃣ BUSCAR EL PERSONAL_PROYECTO DEL USUARIO EN ESTE PROYECTO ESPECÍFICO
        cursor.execute("""
            SELECT id_personal_proyecto, nombre, rol
            FROM personal_proyecto 
            WHERE id_proyecto = ? AND id_usuario = ?
        """, (id_proyecto, id_usuario))
        
        personal_usuario = cursor.fetchall()
        
        print(f"👤 [CREAR-ACTIVIDAD] Personal del usuario {current_user} en proyecto {id_proyecto}:")
        for personal in personal_usuario:
            print(f"   - ID: {personal[0]}, Nombre: {personal[1]}, Rol: {personal[2]}")
        
        # 4️⃣ VALIDAR Y CORREGIR EL ID_PERSONAL
        id_personal = data.get("id_personal")
        print(f"🔍 [CREAR-ACTIVIDAD] ID Personal recibido del frontend: {id_personal}")
        
        # Si el usuario tiene personal en este proyecto, usar el primero
        if personal_usuario and not id_personal:
            id_personal = personal_usuario[0][0]
            print(f"🔄 [CREAR-ACTIVIDAD] Auto-asignando personal: {id_personal}")
        
        # Si se proporcionó un ID, verificar que sea válido para ESTE proyecto
        if id_personal:
            personal_valido = any(p[0] == id_personal for p in personal_usuario)
            if not personal_valido:
                print(f"❌ [CREAR-ACTIVIDAD] ID {id_personal} no válido para proyecto {id_proyecto}")
                # Buscar todos los personal disponibles en este proyecto
                cursor.execute("""
                    SELECT id_personal_proyecto, nombre, rol 
                    FROM personal_proyecto 
                    WHERE id_proyecto = ?
                """, (id_proyecto,))
                todo_personal = cursor.fetchall()
                
                print(f"👥 [CREAR-ACTIVIDAD] Personal disponible en proyecto {id_proyecto}:")
                for personal in todo_personal:
                    print(f"   - ID: {personal[0]}, Nombre: {personal[1]}, Rol: {personal[2]}")
                
                conn.close()
                return jsonify(
                    success=False, 
                    message=f"El personal con ID {id_personal} no está asignado a este proyecto. Personal válido: {[p[0] for p in todo_personal]}"
                ), 400
        
        # 5️⃣ SI NO HAY PERSONAL VÁLIDO, USAR NULL
        if not id_personal:
            id_personal = None
            print("ℹ️  [CREAR-ACTIVIDAD] No se asignó personal, usando NULL")
        
        # 6️⃣ INSERTAR LA ACTIVIDAD
        print(f"🔄 [CREAR-ACTIVIDAD] Insertando actividad:")
        print(f"   - Proyecto: {id_proyecto}")
        print(f"   - Etapa: {id_etapa}")
        print(f"   - Nombre: {data['nombre']}")
        print(f"   - Personal: {id_personal}")
        
        cursor.execute("""
            INSERT INTO actividades_cronograma (
                id_proyecto, id_etapa, nombre_actividad, descripcion, 
                fecha_inicio, fecha_fin, estado, id_personal_proyecto
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            id_proyecto,
            id_etapa,
            data["nombre"],
            data.get("descripcion", ""),
            data["fecha_inicio"],
            data["fecha_fin"],
            data["estado"],
            id_personal
        ))
        
        conn.commit()
        conn.close()

        print(f"✅ [CREAR-ACTIVIDAD] Actividad creada exitosamente")
        return jsonify(success=True, message="Actividad creada correctamente"), 201

    except Exception as e:
        print(f"❌ [CREAR-ACTIVIDAD] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
    
# ---------------------------
# OBTENER PERSONAL DISPONIBLE PARA UN PROYECTO
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/personal", methods=["GET", "OPTIONS"])
@token_required
def obtener_personal_proyecto(current_user, id_proyecto):
    """
    Retorna todo el personal asignado a un proyecto
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                pp.id_personal_proyecto,
                pp.nombre,
                pp.rol,
                u.username,
                u.id as id_usuario
            FROM personal_proyecto pp
            LEFT JOIN Usuarios u ON pp.id_usuario = u.id
            WHERE pp.id_proyecto = ?
            ORDER BY pp.nombre
        """, (id_proyecto,))
        
        rows = cursor.fetchall()
        conn.close()
        
        personal = [
            {
                "id_personal_proyecto": r[0],
                "nombre": r[1],
                "rol": r[2],
                "username": r[3],
                "id_usuario": r[4]
            } for r in rows
        ]
        
        print(f"✅ Personal encontrado para proyecto {id_proyecto}: {len(personal)}")
        return jsonify(success=True, data=personal), 200
        
    except Exception as e:
        print(f"❌ ERROR obteniendo personal: {str(e)}")
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# ACTUALIZAR ACTIVIDAD
# ---------------------------
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["PUT", "OPTIONS"])
@token_required
# @role_required(['Administrador', 'Supervisor'])
def actualizar_actividad(current_user, id_actividad):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE actividades_cronograma
            SET nombre_actividad = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?, id_personal_proyecto = ?
            WHERE id_actividad = ?
        """, (
            data.get("nombre"),
            data.get("descripcion"),
            data.get("fecha_inicio"),
            data.get("fecha_fin"),
            data.get("estado"),
            data.get("id_personal"),
            id_actividad
        ))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Actividad actualizada correctamente"), 200

    except Exception:
        current_app.logger.error("Error actualizando actividad:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
    
# ---------------------------
# ELIMINAR ACTIVIDAD
# ---------------------------
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["DELETE", "OPTIONS"])
@token_required
# @role_required(['Administrador', 'Supervisor'])
def eliminar_actividad(current_user, id_actividad):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM actividades_cronograma WHERE id_actividad = ?", (id_actividad,))
        conn.commit()
        conn.close()
        return jsonify(success=True, message="Actividad eliminada correctamente"), 200

    except Exception:
        current_app.logger.error("Error eliminando actividad:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# LISTAR CRONOGRAMA COMPLETO DE UN PROYECTO (GANTT)
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/gantt", methods=["GET", "OPTIONS"])
@token_required
# @role_required(['Administrador', 'Supervisor', 'Operario'])
def obtener_schedule_completo(current_user, id_proyecto):
    """
    Retorna estructura jerárquica para visualizar el schedule tipo Gantt
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        print(f"🔍 Solicitando Gantt para proyecto: {id_proyecto}")
        
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1️⃣ Traer las etapas del proyecto (CON NOMBRES CORRECTOS)
        cursor.execute("""
            SELECT id_etapa, nombre_etapa, fecha_inicio, fecha_fin, estado
            FROM etapas_proyecto
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio
        """, (id_proyecto,))
        etapas = cursor.fetchall()

        print(f"🔍 Etapas encontradas: {len(etapas)}")

        data_final = []

        # 2️⃣ Por cada etapa, traer sus actividades (CON NOMBRES CORRECTOS)
        for e in etapas:
            cursor.execute("""
                SELECT id_actividad, nombre_actividad, fecha_inicio, fecha_fin, estado
                FROM actividades_cronograma
                WHERE id_etapa = ?
                ORDER BY fecha_inicio
            """, (e[0],))  # e[0] = id_etapa
            acts = cursor.fetchall()

            data_final.append({
                "id_etapa": e[0],
                "nombre": e[1],  # nombre_etapa
                "fecha_inicio": e[2],
                "fecha_fin": e[3],
                "estado": e[4],
                "actividades": [
                    {
                        "id_actividad": a[0],
                        "nombre": a[1],  # nombre_actividad
                        "fecha_inicio": a[2],
                        "fecha_fin": a[3],
                        "estado": a[4]
                    } for a in acts
                ]
            })

        conn.close()
        print(f"✅ Datos preparados: {len(data_final)} etapas")
        return jsonify(success=True, data=data_final), 200

    except Exception as e:
        print(f"❌ ERROR en obtener_schedule_completo: {str(e)}")
        print(traceback.format_exc())
        current_app.logger.error("Error obteniendo schedule completo:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500