# routes/auth.py
from flask import Blueprint, request, jsonify, render_template
import bcrypt
import random
import datetime
from database import get_db_connection
import config
from extensions import mail, redis_client
from flask_mail import Message
import traceback
import json

auth_bp = Blueprint("auth", __name__)

print("🔍 [DEBUG INIT] Módulo auth cargado")
print(f"🔍 [DEBUG INIT] Redis client configurado: {redis_client is not None}")
print(f"🔍 [DEBUG INIT] Mail configurado: {mail is not None}")

@auth_bp.route("/verificar-usuario", methods=["POST"])
def verificar_usuario():
    print("🔍 [DEBUG] ========== INICIANDO verificar-usuario ==========")
    print(f"🔍 [DEBUG] Redis client: {redis_client}")
    
    data = request.get_json()
    print(f"🔍 [DEBUG] Datos recibidos: {data}")
    
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    ip_address = request.remote_addr

    print(f"🔍 [DEBUG] Email: {email}, Username: {username}, IP: {ip_address}")

    if not email or not username:
        print("❌ [DEBUG] Faltan email o username")
        return jsonify({"success": False, "message": "Email y usuario son requeridos"}), 400

    try:
        # Verificar intentos fallidos con Redis
        redis_key = f"intentos_fallidos:{ip_address}"
        print(f"🔍 [DEBUG] Buscando clave Redis: {redis_key}")
        
        intentos_data = None
        try:
            intentos_data = redis_client.get(redis_key)
            print(f"🔍 [DEBUG] Datos de intentos desde Redis: {intentos_data}")
        except Exception as redis_error:
            print(f"❌ [DEBUG] Error accediendo a Redis: {redis_error}")
            traceback.print_exc()
        
        if intentos_data:
            try:
                intentos_info = json.loads(intentos_data)
                print(f"🔍 [DEBUG] Intentos info parseada: {intentos_info}")
                
                intentos = intentos_info['intentos']
                ultimo_intento = datetime.datetime.fromisoformat(intentos_info['ultimo_intento'])
                tiempo_transcurrido = (datetime.datetime.now() - ultimo_intento).total_seconds() / 60
                
                print(f"🔍 [DEBUG] Intentos: {intentos}, Tiempo transcurrido: {tiempo_transcurrido} minutos")
                
                if intentos >= 3 and tiempo_transcurrido < 15:
                    print("🚫 [DEBUG] Usuario bloqueado por demasiados intentos")
                    # Enviar email de alerta por bloqueo
                    try:
                        html_body = render_template(
                            "emails/alerta_bloqueo.html",
                            email=email,
                            username=username,
                            ip_address=ip_address,
                            timestamp=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            minutos_restantes=int(15 - tiempo_transcurrido)
                        )

                        msg = Message(
                            subject="🚫 Bloqueo por seguridad - Co-IngenioPro",
                            recipients=[email],
                            html=html_body
                        )
                        mail.send(msg)
                        print("✅ [DEBUG] Email de bloqueo enviado")
                    except Exception as mail_error:
                        print(f"❌ [DEBUG] Error enviando email de bloqueo: {mail_error}")
                        traceback.print_exc()
                    
                    return jsonify({
                        "success": False, 
                        "message": f"Demasiados intentos fallidos. Contacte al administrador. Podrá intentar nuevamente en {int(15 - tiempo_transcurrido)} minutos."
                    }), 429
            except Exception as parse_error:
                print(f"❌ [DEBUG] Error parseando datos de Redis: {parse_error}")
                traceback.print_exc()

        print("🔍 [DEBUG] Conectando a la base de datos...")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que el email y username coincidan
        print(f"🔍 [DEBUG] Ejecutando query: SELECT id, username, e_mail FROM Usuarios WHERE LOWER(e_mail) = '{email}' AND username = '{username}'")
        
        cursor.execute("""
            SELECT id, username, e_mail 
            FROM Usuarios 
            WHERE LOWER(e_mail) = ? AND username = ?
        """, (email, username))
        
        usuario = cursor.fetchone()
        print(f"🔍 [DEBUG] Resultado de la consulta: {usuario}")

        if not usuario:
            print("❌ [DEBUG] Usuario no encontrado en la base de datos")
            # Registrar intento fallido en Redis
            intentos_info = {}
            if intentos_data:
                try:
                    intentos_info = json.loads(intentos_data)
                    intentos_info['intentos'] += 1
                    intentos_info['ultimo_intento'] = datetime.datetime.now().isoformat()
                    print(f"🔍 [DEBUG] Incrementando intentos existentes: {intentos_info}")
                except Exception as e:
                    print(f"❌ [DEBUG] Error procesando intentos existentes: {e}")
                    traceback.print_exc()
                    intentos_info = {
                        'intentos': 1,
                        'ultimo_intento': datetime.datetime.now().isoformat(),
                        'email_intentado': email,
                        'username_intentado': username
                    }
            else:
                intentos_info = {
                    'intentos': 1,
                    'ultimo_intento': datetime.datetime.now().isoformat(),
                    'email_intentado': email,
                    'username_intentado': username
                }
                print(f"🔍 [DEBUG] Creando nuevo registro de intentos: {intentos_info}")
            
            # Guardar en Redis por 15 minutos
            try:
                redis_client.setex(
                    redis_key, 
                    900,  # 15 minutos en segundos
                    json.dumps(intentos_info)
                )
                print("✅ [DEBUG] Intentos guardados en Redis")
            except Exception as redis_save_error:
                print(f"❌ [DEBUG] Error guardando en Redis: {redis_save_error}")
                traceback.print_exc()
            
            conn.close()
            
            # Enviar email de alerta por intento fallido
            try:
                html_body = render_template(
                    "emails/alerta_intento.html",
                    email=email,
                    username=username,
                    ip_address=ip_address,
                    timestamp=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    intentos_actuales=intentos_info['intentos']
                )

                msg = Message(
                    subject="⚠️ Intento de recuperación de contraseña - Co-IngenioPro",
                    recipients=[email],
                    html=html_body
                )
                mail.send(msg)
                print("✅ [DEBUG] Email de alerta enviado")
            except Exception as mail_error:
                print(f"❌ [DEBUG] Error enviando email de alerta: {mail_error}")
                traceback.print_exc()
            
            return jsonify({
                "success": False, 
                "message": "El correo electrónico y usuario no coinciden"
            }), 404

        id_usuario = usuario[0]
        username_db = usuario[1]
        email_db = usuario[2]

        print(f"✅ [DEBUG] Usuario verificado: ID={id_usuario}, Username={username_db}, Email={email_db}")

        # Limpiar intentos fallidos si la verificación es exitosa
        try:
            redis_client.delete(redis_key)
            print("✅ [DEBUG] Intentos fallidos limpiados de Redis")
        except Exception as redis_del_error:
            print(f"❌ [DEBUG] Error limpiando Redis: {redis_del_error}")
            traceback.print_exc()

        # Generar código de 4 dígitos
        codigo = str(random.randint(1000, 9999))
        fecha_expiracion = datetime.datetime.now() + datetime.timedelta(minutes=5)

        print(f"🔍 [DEBUG] Código generado: {codigo}, Expira: {fecha_expiracion}")

        # Guardar código en Redis con expiración
        codigo_key = f"codigo_verificacion:{id_usuario}"
        codigo_data = {
            'codigo': codigo,
            'email': email_db,
            'username': username_db,
            'fecha_expiracion': fecha_expiracion.isoformat(),
            'intentos': 0
        }
        
        try:
            redis_client.setex(
                codigo_key,
                300,  # 5 minutos en segundos
                json.dumps(codigo_data)
            )
            print(f"✅ [DEBUG] Código guardado en Redis con clave: {codigo_key}")
        except Exception as redis_code_error:
            print(f"❌ [DEBUG] Error guardando código en Redis: {redis_code_error}")
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "message": "Error interno al guardar el código"
            }), 500

        conn.close()

        # Enviar email con código de verificación
        try:
            print("🔍 [DEBUG] Preparando envío de email...")
            html_body = render_template(
                "emails/codigo_verificacion.html",
                username=username_db,
                codigo=codigo
            )

            msg = Message(
                subject="🔐 Código de Verificación - Co-IngenioPro",
                recipients=[email_db],
                html=html_body
            )
            mail.send(msg)
            print(f"✅ [DEBUG] Código de verificación {codigo} enviado a {email_db}")

        except Exception as mail_error:
            print(f"❌ [DEBUG] Error enviando código de verificación: {mail_error}")
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "message": "Error enviando código de verificación"
            }), 500

        print("✅ [DEBUG] Proceso completado exitosamente")
        return jsonify({
            "success": True,
            "message": "Se ha enviado un código de verificación a tu correo electrónico",
            "id_usuario": id_usuario
        })

    except Exception as e:
        print(f"❌ [DEBUG] Error general en verificar-usuario: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/verificar-codigo", methods=["POST"])
def verificar_codigo():
    print("🔍 [DEBUG] ========== INICIANDO verificar-codigo ==========")
    data = request.get_json()
    print(f"🔍 [DEBUG] Datos recibidos: {data}")
    
    id_usuario = data.get("id_usuario")
    codigo_ingresado = data.get("codigo", "").strip()

    print(f"🔍 [DEBUG] ID Usuario: {id_usuario}, Código: {codigo_ingresado}")

    if not id_usuario or not codigo_ingresado:
        print("❌ [DEBUG] Faltan id_usuario o código")
        return jsonify({"success": False, "message": "ID de usuario y código son requeridos"}), 400

    try:
        # Verificar código en Redis
        codigo_key = f"codigo_verificacion:{id_usuario}"
        print(f"🔍 [DEBUG] Buscando código en Redis: {codigo_key}")
        
        codigo_data = None
        try:
            codigo_data = redis_client.get(codigo_key)
            print(f"🔍 [DEBUG] Código data desde Redis: {codigo_data}")
        except Exception as redis_error:
            print(f"❌ [DEBUG] Error accediendo a Redis: {redis_error}")
            traceback.print_exc()
        
        if not codigo_data:
            print("❌ [DEBUG] Código no encontrado en Redis")
            return jsonify({
                "success": False, 
                "message": "Código expirado o inválido. Solicite uno nuevo."
            }), 400

        codigo_info = json.loads(codigo_data)
        print(f"🔍 [DEBUG] Código info: {codigo_info}")
        
        # Verificar si ha excedido los intentos
        if codigo_info['intentos'] >= 3:
            print("❌ [DEBUG] Demasiados intentos fallidos")
            try:
                redis_client.delete(codigo_key)
                print("✅ [DEBUG] Código eliminado de Redis por demasiados intentos")
            except Exception as redis_del_error:
                print(f"❌ [DEBUG] Error eliminando código: {redis_del_error}")
                traceback.print_exc()
                
            return jsonify({
                "success": False, 
                "message": "Demasiados intentos fallidos. Solicite un nuevo código."
            }), 400

        # Verificar si el código coincide
        if codigo_ingresado != codigo_info['codigo']:
            print(f"❌ [DEBUG] Código incorrecto. Esperado: {codigo_info['codigo']}, Recibido: {codigo_ingresado}")
            # Incrementar intentos en Redis
            codigo_info['intentos'] += 1
            try:
                ttl = redis_client.ttl(codigo_key)
                print(f"🔍 [DEBUG] TTL actual: {ttl}")
                redis_client.setex(
                    codigo_key,
                    ttl if ttl > 0 else 300,  # Mantener el mismo TTL o 5 min si es -1
                    json.dumps(codigo_info)
                )
                print(f"✅ [DEBUG] Intentos incrementados: {codigo_info['intentos']}")
            except Exception as redis_update_error:
                print(f"❌ [DEBUG] Error actualizando intentos: {redis_update_error}")
                traceback.print_exc()
            
            intentos_restantes = 3 - codigo_info['intentos']
            return jsonify({
                "success": False, 
                "message": f"Código incorrecto. Te quedan {intentos_restantes} intentos."
            }), 400

        print("✅ [DEBUG] Código verificado correctamente")

        # Código correcto - generar token para reset
        token_reset = f"reset_token_{random.randint(100000, 999999)}"
        token_key = f"token_reset:{id_usuario}"
        
        try:
            redis_client.setex(
                token_key,
                600,  # 10 minutos para completar el reset
                json.dumps({
                    'id_usuario': id_usuario,
                    'email': codigo_info['email'],
                    'username': codigo_info['username']
                })
            )
            print(f"✅ [DEBUG] Token de reset guardado: {token_key}")
        except Exception as redis_token_error:
            print(f"❌ [DEBUG] Error guardando token: {redis_token_error}")
            traceback.print_exc()

        # Limpiar código de verificación
        try:
            redis_client.delete(codigo_key)
            print("✅ [DEBUG] Código eliminado de Redis")
        except Exception as redis_del_error:
            print(f"❌ [DEBUG] Error eliminando código: {redis_del_error}")
            traceback.print_exc()

        return jsonify({
            "success": True,
            "message": "Código verificado correctamente",
            "token_reset": token_reset
        })

    except Exception as e:
        print(f"❌ [DEBUG] Error general en verificar-codigo: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/resetear-contrasena", methods=["POST"])
def resetear_contrasena():
    print("🔍 [DEBUG] ========== INICIANDO resetear-contrasena ==========")
    data = request.get_json()
    print(f"🔍 [DEBUG] Datos recibidos: {data}")
    
    token_reset = data.get("token_reset")
    nueva_contrasena = data.get("password", "").strip()

    print(f"🔍 [DEBUG] Token: {token_reset}, Nueva contraseña: {nueva_contrasena}")

    if not token_reset or not nueva_contrasena:
        print("❌ [DEBUG] Faltan token o nueva contraseña")
        return jsonify({"success": False, "message": "Token y nueva contraseña son requeridos"}), 400

    if len(nueva_contrasena) < 6:
        print("❌ [DEBUG] Contraseña demasiado corta")
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        # Buscar el token en Redis
        token_key = f"token_reset:{token_reset.split('_')[-1]}"
        print(f"🔍 [DEBUG] Buscando token en Redis: {token_key}")
        
        token_data = None
        try:
            token_data = redis_client.get(token_key)
            print(f"🔍 [DEBUG] Token data desde Redis: {token_data}")
        except Exception as redis_error:
            print(f"❌ [DEBUG] Error accediendo a Redis: {redis_error}")
            traceback.print_exc()
        
        if not token_data:
            print("❌ [DEBUG] Token no encontrado en Redis")
            return jsonify({"success": False, "message": "Token inválido o expirado"}), 400

        token_info = json.loads(token_data)
        id_usuario = token_info['id_usuario']
        email = token_info['email']
        username = token_info['username']

        print(f"🔍 [DEBUG] Token info: ID={id_usuario}, Email={email}, Username={username}")

        print("🔍 [DEBUG] Conectando a la base de datos...")
        conn = get_db_connection()
        cursor = conn.cursor()

        # Hashear nueva contraseña
        contrasena_hasheada = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt())
        print("✅ [DEBUG] Contraseña hasheada")

        # Actualizar contraseña en la tabla Usuarios
        print(f"🔍 [DEBUG] Actualizando contraseña para usuario ID: {id_usuario}")
        cursor.execute(
            "UPDATE Usuarios SET password = ? WHERE id = ?",
            (contrasena_hasheada.decode("utf-8"), id_usuario)
        )

        conn.commit()
        conn.close()
        print("✅ [DEBUG] Contraseña actualizada en la base de datos")

        # Limpiar token de Redis
        try:
            redis_client.delete(token_key)
            print("✅ [DEBUG] Token eliminado de Redis")
        except Exception as redis_del_error:
            print(f"❌ [DEBUG] Error eliminando token: {redis_del_error}")
            traceback.print_exc()

        # Enviar email de confirmación
        try:
            print("🔍 [DEBUG] Enviando email de confirmación...")
            html_body = render_template(
                "emails/contrasena_actualizada.html",
                username=username
            )

            msg = Message(
                subject="✅ Contraseña actualizada - Co-IngenioPro",
                recipients=[email],
                html=html_body
            )
            mail.send(msg)
            print("✅ [DEBUG] Email de confirmación de cambio de contraseña enviado")

        except Exception as mail_error:
            print(f"❌ [DEBUG] Error enviando email de confirmación: {mail_error}")
            traceback.print_exc()

        print("✅ [DEBUG] Proceso de reset completado exitosamente")
        return jsonify({
            "success": True,
            "message": "Contraseña restablecida exitosamente"
        })

    except Exception as e:
        print(f"❌ [DEBUG] Error general en resetear-contrasena: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

print("🔍 [DEBUG INIT] Rutas de auth configuradas correctamente")