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
def listar_actividades(current_user, id_etapa):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id_actividad, a.nombre_actividad, a.descripcion, a.fecha_inicio, a.fecha_fin,
                   a.estado, pp.id_personal_proyecto, pp.id_usuario, u.username AS personal
            FROM actividades_cronograma a
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            LEFT JOIN Usuarios u ON pp.id_usuario = u.id
            WHERE a.id_etapa = ?
            ORDER BY a.fecha_inicio ASC
        """, (id_etapa,))
        rows = cursor.fetchall()
        conn.close()

        print(f"🔍 [LISTAR-ACTIVIDADES] Actividades encontradas para etapa {id_etapa}: {len(rows)}")
        
        actividades = []
        for r in rows:
            actividad = {
                "id_actividad": r[0],
                "nombre": r[1],
                "descripcion": r[2],
                "fecha_inicio": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "fecha_fin": r[4].strftime('%Y-%m-%d') if r[4] else None,
                "estado": r[5],
                "id_personal": r[7],  # ← ENVIAR id_usuario (NO id_personal_proyecto)
                "personal": r[8]      # ← username del personal
            }
            print(f"   - Actividad {r[0]}: nombre='{r[1]}', id_personal={r[7]}, personal='{r[8]}'")
            actividades.append(actividad)

        print(f"✅ [LISTAR-ACTIVIDADES] Enviando {len(actividades)} actividades al frontend")
        return jsonify(success=True, data=actividades), 200

    except Exception as e:
        print(f"❌ [LISTAR-ACTIVIDADES] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# CREAR NUEVA ACTIVIDAD EN ETAPA (ACEPTA ID_USUARIO Y HACE VALIDACIONES COMPLETAS)
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
        
        # 1️⃣ OBTENER EL id_proyecto DE LA ETAPA Y VERIFICAR QUE EL PROYECTO ESTÉ ACTIVO
        cursor.execute("""
            SELECT ep.id_proyecto, p.nombre as proyecto_nombre, p.estado as proyecto_estado
            FROM etapas_proyecto ep
            INNER JOIN proyectos p ON ep.id_proyecto = p.id_proyecto
            WHERE ep.id_etapa = ? AND p.estado <> 'Eliminado'
        """, (id_etapa,))
        
        etapa_info = cursor.fetchone()
        
        if not etapa_info:
            conn.close()
            return jsonify(success=False, message="Etapa no encontrada o proyecto eliminado"), 404
            
        id_proyecto_etapa = etapa_info[0]
        nombre_proyecto = etapa_info[1]
        estado_proyecto = etapa_info[2]
        
        print(f"✅ [CREAR-ACTIVIDAD] Etapa pertenece al proyecto: {nombre_proyecto} (ID:{id_proyecto_etapa}, Estado:{estado_proyecto})")
        
        # 2️⃣ CONVERTIR ID_USUARIO EN ID_PERSONAL_PROYECTO Y VALIDAR
        id_usuario_asignado = data.get("id_personal")  # Este es el id_usuario del frontend
        id_personal_final = None
        
        print(f"🔍 [CREAR-ACTIVIDAD] ID Usuario recibido: {id_usuario_asignado}")
        
        if id_usuario_asignado:
            # VERIFICAR QUE EL USUARIO EXISTA
            cursor.execute("SELECT id, username FROM Usuarios WHERE id = ?", (id_usuario_asignado,))
            usuario_info = cursor.fetchone()
            
            if not usuario_info:
                conn.close()
                return jsonify(success=False, message=f"El usuario con ID {id_usuario_asignado} no existe"), 400
            
            # BUSCAR EL PERSONAL_PROYECTO DE ESTE USUARIO EN ESTE PROYECTO ACTIVO
            cursor.execute("""
                SELECT pp.id_personal_proyecto, pp.rol
                FROM personal_proyecto pp
                INNER JOIN proyectos p ON pp.id_proyecto = p.id_proyecto
                WHERE pp.id_usuario = ? AND pp.id_proyecto = ? AND p.estado <> 'Eliminado'
            """, (id_usuario_asignado, id_proyecto_etapa))
            
            personal_info = cursor.fetchone()
            
            if not personal_info:
                conn.close()
                return jsonify(
                    success=False, 
                    message=f"El usuario {usuario_info[1]} (ID:{id_usuario_asignado}) no está asignado al proyecto {nombre_proyecto} o el proyecto no está activo"
                ), 400
            
            id_personal_final = personal_info[0]
            rol_personal = personal_info[1]
            
            print(f"✅ [CREAR-ACTIVIDAD] Conversión válida: Usuario {usuario_info[1]} (ID:{id_usuario_asignado}) → Personal {id_personal_final} (Rol:{rol_personal}) en proyecto {nombre_proyecto}")
        
        # 3️⃣ INSERTAR LA ACTIVIDAD
        print(f"🔄 [CREAR-ACTIVIDAD] Insertando actividad con personal: {id_personal_final}")
        
        cursor.execute("""
            INSERT INTO actividades_cronograma (
                id_proyecto, id_etapa, nombre_actividad, descripcion, 
                fecha_inicio, fecha_fin, estado, id_personal_proyecto
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            id_proyecto_etapa,
            id_etapa,
            data["nombre"],
            data.get("descripcion", ""),
            data["fecha_inicio"],
            data["fecha_fin"],
            data["estado"],
            id_personal_final  # El id_personal_proyecto correcto
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
# ACTUALIZAR ACTIVIDAD (CON MANEJO SEGURO DE FECHAS)
# ---------------------------
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["PUT", "OPTIONS"])
@token_required
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
        
        print(f"🔍 [ACTUALIZAR-ACTIVIDAD] Datos recibidos: {data}")
        
        # 1️⃣ OBTENER LOS DATOS ACTUALES DE LA ACTIVIDAD (para preservar fechas si no se envían)
        cursor.execute("""
            SELECT nombre_actividad, descripcion, fecha_inicio, fecha_fin, estado, id_personal_proyecto
            FROM actividades_cronograma 
            WHERE id_actividad = ?
        """, (id_actividad,))
        
        actividad_actual = cursor.fetchone()
        
        if not actividad_actual:
            conn.close()
            return jsonify(success=False, message="Actividad no encontrada"), 404
        
        # 2️⃣ PREPARAR DATOS PARA ACTUALIZACIÓN (manejo seguro de fechas)
        nombre = data.get("nombre", actividad_actual[0])
        descripcion = data.get("descripcion", actividad_actual[1])
        
        # Manejo seguro de fechas - si no se envían, mantener las actuales
        fecha_inicio = data.get("fecha_inicio")
        if not fecha_inicio or fecha_inicio == "":
            fecha_inicio = actividad_actual[2]  # Mantener fecha actual
        else:
            # Validar formato de fecha
            try:
                datetime.strptime(fecha_inicio, '%Y-%m-%d')
            except ValueError:
                conn.close()
                return jsonify(success=False, message="Formato de fecha_inicio inválido. Use YYYY-MM-DD"), 400
        
        fecha_fin = data.get("fecha_fin")
        if not fecha_fin or fecha_fin == "":
            fecha_fin = actividad_actual[3]  # Mantener fecha actual
        else:
            # Validar formato de fecha
            try:
                datetime.strptime(fecha_fin, '%Y-%m-%d')
            except ValueError:
                conn.close()
                return jsonify(success=False, message="Formato de fecha_fin inválido. Use YYYY-MM-DD"), 400
        
        estado = data.get("estado", actividad_actual[4])
        
        print(f"📅 [ACTUALIZAR-ACTIVIDAD] Fechas procesadas - Inicio: {fecha_inicio}, Fin: {fecha_fin}")
        
        # 3️⃣ CONVERTIR ID_USUARIO EN ID_PERSONAL_PROYECTO (si se proporciona)
        id_usuario_asignado = data.get("id_personal")
        id_personal_final = actividad_actual[5]  # Mantener el actual por defecto
        
        if id_usuario_asignado is not None:  # Incluye el caso de id_personal: null/undefined
            if id_usuario_asignado:  # Si es un número (no cero)
                # Validar usuario y conversión
                cursor.execute("SELECT id FROM Usuarios WHERE id = ?", (id_usuario_asignado,))
                if not cursor.fetchone():
                    conn.close()
                    return jsonify(success=False, message=f"El usuario con ID {id_usuario_asignado} no existe"), 400
                
                # Obtener el proyecto de la actividad
                cursor.execute("SELECT id_proyecto FROM actividades_cronograma WHERE id_actividad = ?", (id_actividad,))
                proyecto_info = cursor.fetchone()
                
                if proyecto_info:
                    cursor.execute("""
                        SELECT id_personal_proyecto
                        FROM personal_proyecto 
                        WHERE id_usuario = ? AND id_proyecto = ?
                    """, (id_usuario_asignado, proyecto_info[0]))
                    
                    personal_info = cursor.fetchone()
                    
                    if personal_info:
                        id_personal_final = personal_info[0]
                        print(f"✅ [ACTUALIZAR-ACTIVIDAD] Personal asignado: {id_personal_final}")
                    else:
                        conn.close()
                        return jsonify(success=False, message="El usuario no está asignado a este proyecto"), 400
            else:
                # Si id_personal es null/0/empty, dejar como NULL
                id_personal_final = None
                print("ℹ️  [ACTUALIZAR-ACTIVIDAD] Sin personal asignado")
        
        # 4️⃣ ACTUALIZAR LA ACTIVIDAD
        print(f"🔄 [ACTUALIZAR-ACTIVIDAD] Actualizando actividad {id_actividad}...")
        
        cursor.execute("""
            UPDATE actividades_cronograma
            SET nombre_actividad = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, 
                estado = ?, id_personal_proyecto = ?
            WHERE id_actividad = ?
        """, (
            nombre,
            descripcion,
            fecha_inicio,
            fecha_fin,
            estado,
            id_personal_final,
            id_actividad
        ))
        
        conn.commit()
        conn.close()

        print(f"✅ [ACTUALIZAR-ACTIVIDAD] Actividad {id_actividad} actualizada exitosamente")
        return jsonify(success=True, message="Actividad actualizada correctamente"), 200

    except Exception as e:
        print(f"❌ [ACTUALIZAR-ACTIVIDAD] ERROR: {str(e)}")
        print(traceback.format_exc())
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