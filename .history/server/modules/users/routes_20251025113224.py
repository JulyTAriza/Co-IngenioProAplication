from flask import Blueprint, request, jsonify, current_app, render_template
from functools import wraps
import jwt
import traceback
import bcrypt
import os
from extensions import mail
from flask_mail import Message
from database import get_db_connection
import config

users_bp = Blueprint("usuarios", __name__)

# ---------------------------
# FUNCIONES AUXILIARES PARA CORREOS
# ---------------------------
def enviar_correo_usuario(asunto, template, usuario_email, datos_usuario):
    """
    Función genérica para enviar correos sobre usuarios
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
        html_body = render_template(f"emails/{template}.html", **datos_usuario)

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

def obtener_datos_usuario(user_id):
    """
    Obtiene los datos completos de un usuario por su ID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT username, e_mail, rol
            FROM Usuarios
            WHERE id = ?
        """, (user_id,))
        
        usuario = cursor.fetchone()
        conn.close()
        
        if usuario:
            return {
                "username": usuario[0],
                "email": usuario[1],
                "rol": usuario[2]
            }
        return None
    except Exception as e:
        print(f"❌ Error obteniendo datos del usuario {user_id}: {str(e)}")
        return None

def es_usuario_administrador(user_id):
    """
    Verifica si un usuario es administrador
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT rol FROM Usuarios WHERE id = ?", (user_id,))
        usuario = cursor.fetchone()
        conn.close()
        
        return usuario and usuario[0] == 'Administrador'
    except Exception as e:
        print(f"❌ Error verificando rol del usuario {user_id}: {str(e)}")
        return False

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

# LISTAR TODOS LOS USUARIOS
@users_bp.route("/", methods=["GET"])
@token_required
@role_required(['Administrador'])
def list_users(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, e_mail, rol
            FROM Usuarios
        """)
        rows = cursor.fetchall()
        conn.close()

        usuarios = [
            {
                "id": row[0],
                "username": row[1],
                "e_mail": row[2],
                "rol": row[3]
            }
            for row in rows
        ]
        return jsonify(success=True, data=usuarios), 200

    except Exception:
        current_app.logger.error("Error listando usuarios:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# CREAR UN NUEVO USUARIO
@users_bp.route("/", methods=["POST"])
@token_required
@role_required(['Administrador'])
def create_user(current_user):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE USER] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["username", "password", "e_mail"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False,
                       message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    username = data["username"].strip()
    password = data["password"].strip()
    e_mail = data["e_mail"].strip()

    try:
        # Hashear la contraseña antes de guardarla
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO Usuarios (username, password, e_mail, rol)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?)
        """, (username, hashed_password.decode("utf-8"), e_mail, 'Operario'))

        result = cursor.fetchone()
        if not result or result[0] is None:
            raise Exception("No se pudo obtener el ID del nuevo usuario.")

        new_id = int(result[0])

        conn.commit()
        conn.close()

        nuevo = {
            "id": new_id,
            "username": username,
            "e_mail": e_mail
        }
        return jsonify(success=True, data=nuevo), 201

    except Exception:
        current_app.logger.error("Error creando usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ACTUALIZAR USUARIO (INCLUYENDO CAMBIO DE ROL) - CON PROTECCIÓN PARA ADMINISTRADOR
@users_bp.route("/<int:user_id>", methods=["PUT"])
@token_required
@role_required(['Administrador'])
def update_user(current_user, user_id):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[UPDATE USER] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1️⃣ Verificar si el usuario a modificar es administrador
        if es_usuario_administrador(user_id):
            conn.close()
            return jsonify({
                "success": False, 
                "message": "No se puede modificar el rol de un usuario administrador"
            }), 403

        # 2️⃣ Obtener datos actuales del usuario para comparar
        cursor.execute("SELECT username, e_mail, rol FROM Usuarios WHERE id = ?", (user_id,))
        usuario_actual = cursor.fetchone()
        
        if not usuario_actual:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404

        username_actual = usuario_actual[0]
        email_actual = usuario_actual[1]
        rol_actual = usuario_actual[2]

        # 3️⃣ Preparar datos para actualización
        nuevo_username = data.get("username", username_actual)
        nuevo_email = data.get("e_mail", email_actual)
        nuevo_rol = data.get("rol", rol_actual)

        # 4️⃣ Validar que el nuevo rol sea válido
        roles_permitidos = ['Operario', 'Supervisor']
        if nuevo_rol not in roles_permitidos:
            conn.close()
            return jsonify({
                "success": False,
                "message": f"Rol no válido. Roles permitidos: {', '.join(roles_permitidos)}"
            }), 400

        # 5️⃣ Actualizar el usuario
        cursor.execute("""
            UPDATE Usuarios 
            SET username = ?, e_mail = ?, rol = ?
            WHERE id = ?
        """, (nuevo_username, nuevo_email, nuevo_rol, user_id))

        conn.commit()

        # 6️⃣ ENVIAR CORREO SI CAMBIÓ EL ROL
        if nuevo_rol != rol_actual and email_actual:
            datos_correo = {
                "username": username_actual,
                "rol_anterior": rol_actual,
                "rol_nuevo": nuevo_rol
            }
            
            enviar_correo_usuario(
                asunto="🔄 Cambio de rol en Co-IngenioPro",
                template="nuevo_rol",
                usuario_email=email_actual,
                datos_usuario=datos_correo
            )
            print(f"✅ Notificación de cambio de rol enviada a {email_actual}")

        conn.close()

        return jsonify(success=True, message="Usuario actualizado correctamente"), 200

    except Exception as e:
        current_app.logger.error("Error actualizando usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# ELIMINAR USUARIO (CON NOTIFICACIÓN POR CORREO) - CON PROTECCIÓN PARA ADMINISTRADOR
@users_bp.route("/<int:user_id>", methods=["DELETE"])
@token_required
@role_required(['Administrador'])
def delete_user(current_user, user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1️⃣ Verificar si el usuario a eliminar es el admin principal (ID 1)
        if user_id == 1:
            conn.close()
            return jsonify({
                "success": False, 
                "message": "No se puede eliminar el usuario administrador principal"
            }), 403

        # 2️⃣ Obtener datos del usuario antes de eliminar (para el correo)
        cursor.execute("SELECT username, e_mail FROM Usuarios WHERE id = ?", (user_id,))
        usuario_info = cursor.fetchone()
        
        if not usuario_info:
            conn.close()
            return jsonify(success=False, message="Usuario no encontrado"), 404

        username = usuario_info[0]
        email = usuario_info[1]

        # 3️⃣ ELIMINAR REGISTROS RELACIONADOS EN ORDEN (para evitar errores de integridad referencial)

        # 3.1 Eliminar códigos de verificación
        try:
            cursor.execute("DELETE FROM CodigosVerificacion WHERE id_usuario = ?", (user_id,))
            current_app.logger.info(f"Códigos de verificación del usuario {user_id} eliminados correctamente.")
        except Exception as e:
            current_app.logger.warning(f"No se pudieron eliminar códigos de verificación del usuario {user_id}: {str(e)}")

        # 3.2 Eliminar notificaciones
        try:
            cursor.execute("DELETE FROM Notifications WHERE UserId = ?", (user_id,))
            current_app.logger.info(f"Notificaciones del usuario {user_id} eliminadas correctamente.")
        except Exception as e:
            current_app.logger.warning(f"No se pudieron eliminar notificaciones del usuario {user_id}: {str(e)}")

        # 3.3 Eliminar configuraciones de usuario
        try:
            cursor.execute("DELETE FROM UserConfig WHERE user_id = ?", (user_id,))
            current_app.logger.info(f"Configuraciones del usuario {user_id} eliminadas correctamente.")
        except Exception as e:
            current_app.logger.warning(f"No se pudieron eliminar configuraciones del usuario {user_id}: {str(e)}")

        # 3.4 Actualizar o eliminar referencias en personal_proyecto
        try:
            # Primero verificar si el usuario está asignado a algún proyecto
            cursor.execute("SELECT COUNT(*) FROM personal_proyecto WHERE id_usuario = ?", (user_id,))
            count = cursor.fetchone()[0]
            
            if count > 0:
                # Opción 1: Eliminar las asignaciones (recomendado si quieres remover completamente al usuario)
                cursor.execute("DELETE FROM personal_proyecto WHERE id_usuario = ?", (user_id,))
                current_app.logger.info(f"Asignaciones de proyecto del usuario {user_id} eliminadas correctamente.")
                
                # Opción 2: O podrías setear el id_usuario a NULL si prefieres mantener los registros
                # cursor.execute("UPDATE personal_proyecto SET id_usuario = NULL WHERE id_usuario = ?", (user_id,))
        except Exception as e:
            current_app.logger.warning(f"No se pudieron manejar las asignaciones de proyecto del usuario {user_id}: {str(e)}")

        # 3.5 Actualizar actividades que tengan asignado este usuario
        try:
            # Obtener los id_personal_proyecto asociados a este usuario
            cursor.execute("""
                SELECT pp.id_personal_proyecto 
                FROM personal_proyecto pp 
                WHERE pp.id_usuario = ?
            """, (user_id,))
            
            personal_proyectos = cursor.fetchall()
            
            for pp in personal_proyectos:
                id_personal_proyecto = pp[0]
                # Setear a NULL las actividades que referencian este personal_proyecto
                cursor.execute("""
                    UPDATE actividades_cronograma 
                    SET id_personal_proyecto = NULL 
                    WHERE id_personal_proyecto = ?
                """, (id_personal_proyecto,))
            
            current_app.logger.info(f"Actividades actualizadas para usuario {user_id}.")
        except Exception as e:
            current_app.logger.warning(f"No se pudieron actualizar actividades del usuario {user_id}: {str(e)}")

        # 4️⃣ FINALMENTE Eliminar el usuario
        cursor.execute("DELETE FROM Usuarios WHERE id = ?", (user_id,))

        # 5️⃣ Confirmar los cambios
        conn.commit()
        conn.close()

        # 6️⃣ ENVIAR CORREO DE NOTIFICACIÓN DE ELIMINACIÓN
        if email:
            datos_correo = {
                "username": username
            }
            
            enviar_correo_usuario(
                asunto="🗑️ Tu cuenta ha sido eliminada - Co-IngenioPro",
                template="cuenta_eliminada",
                usuario_email=email,
                datos_usuario=datos_correo
            )
            print(f"✅ Notificación de eliminación de cuenta enviada a {email}")

        return jsonify(success=True, message=f"Usuario {user_id} y sus datos relacionados fueron eliminados."), 200

    except Exception as e:
        # Si algo falla, revertimos los cambios
        if 'conn' in locals():
            conn.rollback()
            conn.close()

        current_app.logger.error(f"Error eliminando usuario {user_id}:\n{traceback.format_exc()}")
        return jsonify(success=False, message="Error interno del servidor al eliminar el usuario."), 500

# OBTENER DATOS DE UN USUARIO ESPECÍFICO
@users_bp.route("/<int:user_id>", methods=["GET"])
@token_required
@role_required(['Administrador'])
def get_user(current_user, user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, username, e_mail, rol
            FROM Usuarios
            WHERE id = ?
        """, (user_id,))
        
        usuario = cursor.fetchone()
        conn.close()

        if not usuario:
            return jsonify(success=False, message="Usuario no encontrado"), 404

        usuario_data = {
            "id": usuario[0],
            "username": usuario[1],
            "e_mail": usuario[2],
            "rol": usuario[3]
        }

        return jsonify(success=True, data=usuario_data), 200

    except Exception:
        current_app.logger.error("Error obteniendo usuario:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
