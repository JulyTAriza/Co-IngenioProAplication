from flask import Blueprint, request, jsonify, current_app, render_template
from functools import wraps
import jwt
import traceback
import json
import os
from extensions import mail
from flask_mail import Message

from database import get_db_connection
from datetime import datetime
import config

# Blueprint renombrado a "schedule"
schedule_bp = Blueprint("schedule", __name__)

# ---------------------------
# FUNCIONES AUXILIARES PARA CORREOS
# ---------------------------
def enviar_correo_actividad(asunto, template, usuario_email, datos_actividad):
    """
    Función genérica para enviar correos sobre actividades
    """
    try:
        # Verificar si el sistema de correos está configurado
        if not mail:
            print("⚠️  Sistema de correos no configurado, omitiendo envío")
            return False

        # Verificar que el email del destinatario esté presente
        if not usuario_email:
            print("⚠️  No hay email destinatario, omitiendo envío")
            return False

        # Ruta base para verificar plantillas
        base_dir = os.getcwd()
        plantilla_path = os.path.join(base_dir, "templates", "emails", f"{template}.html")
        
        print(f"📂 Verificando plantilla: {plantilla_path}")
        print(f"¿Existe? {'✅ Sí' if os.path.exists(plantilla_path) else '❌ No'}")
        
        if not os.path.exists(plantilla_path):
            print(f"❌ Plantilla {template}.html no encontrada")
            return False
        
        # Renderizar plantilla
        html_body = render_template(f"emails/{template}.html", **datos_actividad)

        # Crear y enviar mensaje
        msg = Message(
            subject=asunto,
            recipients=[usuario_email],
            html=html_body
        )
        
        mail.send(msg)
        print(f"✅ Correo '{asunto}' enviado con éxito a: {usuario_email}")
        return True
        
    except Exception as mail_error:
        print(f"❌ Error enviando correo a {usuario_email}:")
        traceback.print_exc()
        return False

def obtener_email_usuario(id_usuario):
    """
    Obtiene el email de un usuario por su ID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT e_mail FROM Usuarios WHERE id = ?", (id_usuario,))
        resultado = cursor.fetchone()
        conn.close()
        
        return resultado[0] if resultado else None
    except Exception as e:
        print(f"❌ Error obteniendo email del usuario {id_usuario}: {str(e)}")
        return None

def obtener_datos_actividad(id_actividad):
    """
    Obtiene los datos completos de una actividad para el correo
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                a.nombre_actividad,
                a.descripcion,
                a.fecha_inicio,
                a.fecha_fin,
                a.estado,
                p.nombre as proyecto_nombre,
                ep.nombre_etapa as etapa_nombre,
                u.username as usuario_asignado,
                u.id as id_usuario
            FROM actividades_cronograma a
            INNER JOIN etapas_proyecto ep ON a.id_etapa = ep.id_etapa
            INNER JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            LEFT JOIN Usuarios u ON pp.id_usuario = u.id
            WHERE a.id_actividad = ?
        """, (id_actividad,))
        
        actividad = cursor.fetchone()
        conn.close()
        
        if actividad:
            return {
                "nombre_actividad": actividad[0],
                "descripcion": actividad[1] or "",
                "fecha_inicio": actividad[2].strftime('%Y-%m-%d') if actividad[2] else "No definida",
                "fecha_fin": actividad[3].strftime('%Y-%m-%d') if actividad[3] else "No definida",
                "estado": actividad[4],
                "proyecto_nombre": actividad[5],
                "etapa_nombre": actividad[6],
                "usuario_asignado": actividad[7] or "Sin asignar",
                "id_usuario": actividad[8]
            }
        return None
    except Exception as e:
        print(f"❌ Error obteniendo datos de actividad {id_actividad}: {str(e)}")
        return None

def verificar_tareas_proximas_a_vencer():
    """
    Verifica tareas que están próximas a vencer (en los próximos 3 días)
    y envía notificaciones por correo
    """
    try:
        print("🔍 [VENCIMIENTO] Verificando tareas próximas a vencer...")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calcular fecha límite (3 días desde hoy)
        fecha_limite = datetime.now() + timedelta(days=3)
        fecha_hoy = datetime.now()
        
        print(f"📅 [VENCIMIENTO] Fecha actual: {fecha_hoy.strftime('%Y-%m-%d')}")
        print(f"📅 [VENCIMIENTO] Verificando tareas que vencen antes de: {fecha_limite.strftime('%Y-%m-%d')}")
        
        # Buscar tareas que:
        # - No estén finalizadas
        # - Fecha_fin esté entre hoy y los próximos 3 días
        # - Proyecto no esté eliminado
        cursor.execute("""
            SELECT 
                a.id_actividad,
                a.nombre_actividad,
                a.descripcion,
                a.fecha_fin,
                a.estado,
                pp.id_usuario,
                u.username,
                u.e_mail,
                p.nombre as proyecto_nombre,
                e.nombre_etapa as etapa_nombre
            FROM actividades_cronograma a
            INNER JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
            INNER JOIN Usuarios u ON pp.id_usuario = u.id
            INNER JOIN proyectos p ON a.id_proyecto = p.id_proyecto
            INNER JOIN etapas_proyecto e ON a.id_etapa = e.id_etapa
            WHERE a.estado <> 'finalizada'
            AND a.fecha_fin BETWEEN ? AND ?
            AND p.estado <> 'Eliminado'
            AND a.fecha_fin >= ?  -- Excluir tareas ya vencidas
        """, (fecha_hoy, fecha_limite, fecha_hoy))
        
        tareas_proximas = cursor.fetchall()
        conn.close()
        
        print(f"📊 [VENCIMIENTO] Tareas próximas a vencer encontradas: {len(tareas_proximas)}")
        
        # Enviar notificaciones por cada tarea
        notificaciones_enviadas = 0
        for tarea in tareas_proximas:
            try:
                id_actividad = tarea[0]
                nombre_tarea = tarea[1]
                descripcion = tarea[2]
                fecha_fin = tarea[3]
                estado = tarea[4]
                id_usuario = tarea[5]
                username = tarea[6]
                email = tarea[7]
                proyecto_nombre = tarea[8]
                etapa_nombre = tarea[9]
                
                # Calcular días restantes
                dias_restantes = (fecha_fin - fecha_hoy).days
                
                print(f"   - Tarea {id_actividad}: '{nombre_tarea}', Vence: {fecha_fin.strftime('%Y-%m-%d')}, Días restantes: {dias_restantes}, Usuario: {username}")
                
                # Preparar datos para el correo
                datos_tarea = {
                    "username": username,
                    "nombre_tarea": nombre_tarea,
                    "descripcion": descripcion or "Sin descripción",
                    "fecha_vencimiento": fecha_fin.strftime('%d/%m/%Y'),
                    "dias_restantes": dias_restantes,
                    "proyecto_nombre": proyecto_nombre,
                    "etapa_nombre": etapa_nombre,
                    "estado_actual": estado
                }
                
                # Enviar correo
                if enviar_correo_actividad(
                    asunto=f"⏰ Tarea próxima a vencer - {proyecto_nombre}",
                    template="vencimiento",
                    usuario_email=email,
                    datos_actividad=datos_tarea
                ):
                    notificaciones_enviadas += 1
                    print(f"   ✅ Notificación enviada a {username} ({email})")
                else:
                    print(f"   ❌ Error enviando notificación a {username}")
                    
            except Exception as e:
                print(f"   ❌ Error procesando tarea {tarea[0]}: {str(e)}")
                continue
        
        print(f"✅ [VENCIMIENTO] Proceso completado. Notificaciones enviadas: {notificaciones_enviadas}/{len(tareas_proximas)}")
        return notificaciones_enviadas
        
    except Exception as e:
        print(f"❌ [VENCIMIENTO] ERROR en verificar_tareas_proximas_a_vencer: {str(e)}")
        print(traceback.format_exc())
        return 0

# ---------------------------
# DECORADORES: TOKEN JWT + ROLES
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
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
# LISTAR ETAPAS DE UN PROYECTO
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/etapas", methods=["GET", "OPTIONS"])
@token_required
@role_required(['Administrador','Operario'])
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
@role_required(['Administrador','Operario'])
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
                "descripcion": r[2] or "",  # ← Asegurar que la descripción se envíe
                "fecha_inicio": r[3].strftime('%Y-%m-%d') if r[3] else None,
                "fecha_fin": r[4].strftime('%Y-%m-%d') if r[4] else None,
                "estado": r[5],
                "id_personal": r[7],  # id_usuario
                "personal": r[8]      # username del personal
            }
            print(f"   - Actividad {r[0]}: nombre='{r[1]}', descripción='{r[2]}', id_personal={r[7]}")
            actividades.append(actividad)

        print(f"✅ [LISTAR-ACTIVIDADES] Enviando {len(actividades)} actividades al frontend")
        return jsonify(success=True, data=actividades), 200

    except Exception as e:
        print(f"❌ [LISTAR-ACTIVIDADES] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ---------------------------
# CREAR NUEVA ACTIVIDAD EN ETAPA (CON NOTIFICACIÓN POR CORREO)
# ---------------------------
@schedule_bp.route("/etapas/<int:id_etapa>/actividades", methods=["POST", "OPTIONS"])
@token_required
@role_required(['Administrador'])
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
        usuario_asignado_info = None
        
        print(f"🔍 [CREAR-ACTIVIDAD] ID Usuario recibido: {id_usuario_asignado}")
        
        if id_usuario_asignado:
            # VERIFICAR QUE EL USUARIO EXISTA Y OBTENER SUS DATOS (INCLUYENDO EMAIL)
            cursor.execute("SELECT id, username, e_mail FROM Usuarios WHERE id = ?", (id_usuario_asignado,))
            usuario_info = cursor.fetchone()
            
            if not usuario_info:
                conn.close()
                return jsonify(success=False, message=f"El usuario con ID {id_usuario_asignado} no existe"), 400
            
            usuario_asignado_info = {
                "id": usuario_info[0],
                "username": usuario_info[1],
                "email": usuario_info[2]
            }
            
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
        
        # Obtener el ID de la actividad recién creada
        cursor.execute("SELECT SCOPE_IDENTITY()")
        id_actividad_nueva = cursor.fetchone()[0]
        
        conn.commit()

        # 4️⃣ ENVIAR CORREO DE NOTIFICACIÓN SI LA ACTIVIDAD ESTÁ ASIGNADA A UN USUARIO
        if usuario_asignado_info and usuario_asignado_info["email"]:
            # Obtener el nombre de la etapa para el correo
            cursor.execute("SELECT nombre_etapa FROM etapas_proyecto WHERE id_etapa = ?", (id_etapa,))
            etapa_nombre = cursor.fetchone()
            etapa_nombre = etapa_nombre[0] if etapa_nombre else "Nueva Etapa"
            
            datos_correo = {
                "username": usuario_asignado_info["username"],
                "nombre_actividad": data["nombre"],
                "descripcion": data.get("descripcion", ""),
                "fecha_inicio": data["fecha_inicio"],
                "fecha_fin": data["fecha_fin"],
                "estado": data["estado"],
                "proyecto_nombre": nombre_proyecto,
                "etapa_nombre": etapa_nombre,
                "usuario_asignado": usuario_asignado_info["username"]
            }
            
            # AQUÍ PASAS EL NOMBRE DE LA PLANTILLA CORRECTA
            enviar_correo_actividad(
                asunto="🎯 Nueva tarea asignada - Co-IngenioPro",
                template="nueva_tarea",  # ← ESTE BUSCARÁ: templates/emails/nueva_tarea.html
                usuario_email=usuario_asignado_info["email"],
                datos_actividad=datos_correo
            )
        
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
@role_required(['Administrador'])
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
@role_required(['Administrador'])
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
# ELIMINAR ACTIVIDAD (CON NOTIFICACIÓN POR CORREO)
# ---------------------------
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["DELETE", "OPTIONS"])
@token_required
@role_required(['Administrador'])
def eliminar_actividad(current_user, id_actividad):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1️⃣ OBTENER DATOS DE LA ACTIVIDAD ANTES DE ELIMINAR (PARA EL CORREO)
        datos_actividad = obtener_datos_actividad(id_actividad)
        id_usuario_asignado = datos_actividad["id_usuario"] if datos_actividad else None
        
        # 2️⃣ ELIMINAR LA ACTIVIDAD
        cursor.execute("DELETE FROM actividades_cronograma WHERE id_actividad = ?", (id_actividad,))
        conn.commit()
        
        # 3️⃣ ENVIAR CORREO DE NOTIFICACIÓN SI LA ACTIVIDAD ESTABA ASIGNADA A UN USUARIO
        if id_usuario_asignado and datos_actividad:
            email_usuario = obtener_email_usuario(id_usuario_asignado)
            if email_usuario:
                datos_correo = {
                    "username": datos_actividad["usuario_asignado"],
                    "nombre_actividad": datos_actividad["nombre_actividad"],
                    "proyecto_nombre": datos_actividad["proyecto_nombre"],
                    "etapa_nombre": datos_actividad["etapa_nombre"]
                }
                
                # AQUÍ PASAS EL NOMBRE DE LA PLANTILLA CORRECTA
                enviar_correo_actividad(
                    asunto="🗑️ Tarea eliminada - Co-IngenioPro",
                    template="tarea_eliminada",  # ← ESTE BUSCARÁ: templates/emails/tarea_eliminada.html
                    usuario_email=email_usuario,
                    datos_actividad=datos_correo
                )
        
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
@role_required(['Administrador'])
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

        # 1️⃣ Traer las etapas del proyecto
        cursor.execute("""
            SELECT id_etapa, nombre_etapa, fecha_inicio, fecha_fin, estado
            FROM etapas_proyecto
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio
        """, (id_proyecto,))
        etapas = cursor.fetchall()

        print(f"🔍 Etapas encontradas: {len(etapas)}")

        data_final = []

        # 2️⃣ Por cada etapa, traer sus actividades CON DESCRIPCIÓN
        for e in etapas:
            cursor.execute("""
                SELECT a.id_actividad, a.nombre_actividad, a.descripcion, a.fecha_inicio, a.fecha_fin, 
                       a.estado, a.id_personal_proyecto, pp.id_usuario, u.username
                FROM actividades_cronograma a
                LEFT JOIN personal_proyecto pp ON a.id_personal_proyecto = pp.id_personal_proyecto
                LEFT JOIN Usuarios u ON pp.id_usuario = u.id
                WHERE a.id_etapa = ?
                ORDER BY a.fecha_inicio
            """, (e[0],))  # e[0] = id_etapa
            acts = cursor.fetchall()

            data_final.append({
                "id_etapa": e[0],
                "nombre": e[1],
                "fecha_inicio": e[2].strftime('%Y-%m-%d') if e[2] else None,
                "fecha_fin": e[3].strftime('%Y-%m-%d') if e[3] else None,
                "estado": e[4],
                "actividades": [
                    {
                        "id_actividad": a[0],
                        "nombre": a[1],
                        "descripcion": a[2] or "",  # ← Asegurar que la descripción se envíe
                        "fecha_inicio": a[3].strftime('%Y-%m-%d') if a[3] else None,
                        "fecha_fin": a[4].strftime('%Y-%m-%d') if a[4] else None,
                        "estado": a[5],
                        "id_personal": a[7],  # id_usuario
                        "personal": a[8]      # username del personal
                    } for a in acts
                ]
            })

        conn.close()
        print(f"✅ Datos preparados: {len(data_final)} etapas")
        return jsonify(success=True, data=data_final), 200

    except Exception as e:
        print(f"❌ ERROR en obtener_schedule_completo: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500