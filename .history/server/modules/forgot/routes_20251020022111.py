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

@auth_bp.route("/verificar-usuario", methods=["POST"])
def verificar_usuario():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    ip_address = request.remote_addr

    if not email or not username:
        return jsonify({"success": False, "message": "Email y usuario son requeridos"}), 400

    try:
        # Verificar intentos fallidos con Redis
        redis_key = f"intentos_fallidos:{ip_address}"
        intentos_data = redis_client.get(redis_key)
        
        if intentos_data:
            intentos_info = json.loads(intentos_data)
            intentos = intentos_info['intentos']
            ultimo_intento = datetime.datetime.fromisoformat(intentos_info['ultimo_intento'])
            tiempo_transcurrido = (datetime.datetime.now() - ultimo_intento).total_seconds() / 60
            
            if intentos >= 3 and tiempo_transcurrido < 15:
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
                except Exception as mail_error:
                    print("❌ Error enviando email de bloqueo:", mail_error)
                
                return jsonify({
                    "success": False, 
                    "message": f"Demasiados intentos fallidos. Contacte al administrador. Podrá intentar nuevamente en {int(15 - tiempo_transcurrido)} minutos."
                }), 429

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que el email y username coincidan
        cursor.execute("""
            SELECT id, username, e_mail 
            FROM Usuarios 
            WHERE LOWER(e_mail) = ? AND username = ?
        """, (email, username))
        
        usuario = cursor.fetchone()

        if not usuario:
            # Registrar intento fallido en Redis
            if intentos_data:
                intentos_info = json.loads(intentos_data)
                intentos_info['intentos'] += 1
                intentos_info['ultimo_intento'] = datetime.datetime.now().isoformat()
            else:
                intentos_info = {
                    'intentos': 1,
                    'ultimo_intento': datetime.datetime.now().isoformat(),
                    'email_intentado': email,
                    'username_intentado': username
                }
            
            # Guardar en Redis por 15 minutos
            redis_client.setex(
                redis_key, 
                900,  # 15 minutos en segundos
                json.dumps(intentos_info)
            )
            
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
            except Exception as mail_error:
                print("❌ Error enviando email de alerta:", mail_error)
            
            return jsonify({
                "success": False, 
                "message": "El correo electrónico y usuario no coinciden"
            }), 404

        id_usuario = usuario[0]
        username_db = usuario[1]
        email_db = usuario[2]

        # Limpiar intentos fallidos si la verificación es exitosa
        redis_client.delete(redis_key)

        # Generar código de 4 dígitos
        codigo = str(random.randint(1000, 9999))
        fecha_expiracion = datetime.datetime.now() + datetime.timedelta(minutes=5)

        # Guardar código en Redis con expiración
        codigo_key = f"codigo_verificacion:{id_usuario}"
        codigo_data = {
            'codigo': codigo,
            'email': email_db,
            'username': username_db,
            'fecha_expiracion': fecha_expiracion.isoformat(),
            'intentos': 0
        }
        
        redis_client.setex(
            codigo_key,
            300,  # 5 minutos en segundos
            json.dumps(codigo_data)
        )

        conn.close()

        # Enviar email con código de verificación
        try:
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
            print(f"✅ Código de verificación {codigo} enviado a {email_db}")

        except Exception as mail_error:
            print("❌ Error enviando código de verificación:", mail_error)
            return jsonify({
                "success": False, 
                "message": "Error enviando código de verificación"
            }), 500

        return jsonify({
            "success": True,
            "message": "Se ha enviado un código de verificación a tu correo electrónico",
            "id_usuario": id_usuario
        })

    except Exception as e:
        print("❌ Error en verificar-usuario:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/verificar-codigo", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    id_usuario = data.get("id_usuario")
    codigo_ingresado = data.get("codigo", "").strip()

    if not id_usuario or not codigo_ingresado:
        return jsonify({"success": False, "message": "ID de usuario y código son requeridos"}), 400

    try:
        # Verificar código en Redis
        codigo_key = f"codigo_verificacion:{id_usuario}"
        codigo_data = redis_client.get(codigo_key)
        
        if not codigo_data:
            return jsonify({
                "success": False, 
                "message": "Código expirado o inválido. Solicite uno nuevo."
            }), 400

        codigo_info = json.loads(codigo_data)
        
        # Verificar si ha excedido los intentos
        if codigo_info['intentos'] >= 3:
            redis_client.delete(codigo_key)
            return jsonify({
                "success": False, 
                "message": "Demasiados intentos fallidos. Solicite un nuevo código."
            }), 400

        # Verificar si el código coincide
        if codigo_ingresado != codigo_info['codigo']:
            # Incrementar intentos en Redis
            codigo_info['intentos'] += 1
            redis_client.setex(
                codigo_key,
                redis_client.ttl(codigo_key),  # Mantener el mismo TTL
                json.dumps(codigo_info)
            )
            
            intentos_restantes = 3 - codigo_info['intentos']
            return jsonify({
                "success": False, 
                "message": f"Código incorrecto. Te quedan {intentos_restantes} intentos."
            }), 400

        # Código correcto - generar token para reset
        token_reset = f"reset_token_{random.randint(100000, 999999)}"
        token_key = f"token_reset:{id_usuario}"
        
        redis_client.setex(
            token_key,
            600,  # 10 minutos para completar el reset
            json.dumps({
                'id_usuario': id_usuario,
                'email': codigo_info['email'],
                'username': codigo_info['username']
            })
        )

        # Limpiar código de verificación
        redis_client.delete(codigo_key)

        return jsonify({
            "success": True,
            "message": "Código verificado correctamente",
            "token_reset": token_reset
        })

    except Exception as e:
        print("❌ Error en verificar-codigo:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/resetear-contrasena", methods=["POST"])
def resetear_contrasena():
    data = request.get_json()
    token_reset = data.get("token_reset")
    nueva_contrasena = data.get("password", "").strip()

    if not token_reset or not nueva_contrasena:
        return jsonify({"success": False, "message": "Token y nueva contraseña son requeridos"}), 400

    if len(nueva_contrasena) < 6:
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        # Buscar el token en Redis
        token_key = f"token_reset:{token_reset.split('_')[-1]}"
        token_data = redis_client.get(token_key)
        
        if not token_data:
            return jsonify({"success": False, "message": "Token inválido o expirado"}), 400

        token_info = json.loads(token_data)
        id_usuario = token_info['id_usuario']
        email = token_info['email']
        username = token_info['username']

        conn = get_db_connection()
        cursor = conn.cursor()

        # Hashear nueva contraseña
        contrasena_hasheada = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt())

        # Actualizar contraseña en la tabla Usuarios
        cursor.execute(
            "UPDATE Usuarios SET password = ? WHERE id = ?",
            (contrasena_hasheada.decode("utf-8"), id_usuario)
        )

        conn.commit()
        conn.close()

        # Limpiar token de Redis
        redis_client.delete(token_key)

        # Enviar email de confirmación
        try:
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
            print("✅ Email de confirmación de cambio de contraseña enviado")

        except Exception as mail_error:
            print("❌ Error enviando email de confirmación:", mail_error)

        return jsonify({
            "success": True,
            "message": "Contraseña restablecida exitosamente"
        })

    except Exception as e:
        print("❌ Error en resetear-contrasena:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500# routes/auth.py
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

@auth_bp.route("/verificar-usuario", methods=["POST"])
def verificar_usuario():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    username = data.get("username", "").strip()
    ip_address = request.remote_addr

    if not email or not username:
        return jsonify({"success": False, "message": "Email y usuario son requeridos"}), 400

    try:
        # Verificar intentos fallidos con Redis
        redis_key = f"intentos_fallidos:{ip_address}"
        intentos_data = redis_client.get(redis_key)
        
        if intentos_data:
            intentos_info = json.loads(intentos_data)
            intentos = intentos_info['intentos']
            ultimo_intento = datetime.datetime.fromisoformat(intentos_info['ultimo_intento'])
            tiempo_transcurrido = (datetime.datetime.now() - ultimo_intento).total_seconds() / 60
            
            if intentos >= 3 and tiempo_transcurrido < 15:
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
                except Exception as mail_error:
                    print("❌ Error enviando email de bloqueo:", mail_error)
                
                return jsonify({
                    "success": False, 
                    "message": f"Demasiados intentos fallidos. Contacte al administrador. Podrá intentar nuevamente en {int(15 - tiempo_transcurrido)} minutos."
                }), 429

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que el email y username coincidan
        cursor.execute("""
            SELECT id, username, e_mail 
            FROM Usuarios 
            WHERE LOWER(e_mail) = ? AND username = ?
        """, (email, username))
        
        usuario = cursor.fetchone()

        if not usuario:
            # Registrar intento fallido en Redis
            if intentos_data:
                intentos_info = json.loads(intentos_data)
                intentos_info['intentos'] += 1
                intentos_info['ultimo_intento'] = datetime.datetime.now().isoformat()
            else:
                intentos_info = {
                    'intentos': 1,
                    'ultimo_intento': datetime.datetime.now().isoformat(),
                    'email_intentado': email,
                    'username_intentado': username
                }
            
            # Guardar en Redis por 15 minutos
            redis_client.setex(
                redis_key, 
                900,  # 15 minutos en segundos
                json.dumps(intentos_info)
            )
            
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
            except Exception as mail_error:
                print("❌ Error enviando email de alerta:", mail_error)
            
            return jsonify({
                "success": False, 
                "message": "El correo electrónico y usuario no coinciden"
            }), 404

        id_usuario = usuario[0]
        username_db = usuario[1]
        email_db = usuario[2]

        # Limpiar intentos fallidos si la verificación es exitosa
        redis_client.delete(redis_key)

        # Generar código de 4 dígitos
        codigo = str(random.randint(1000, 9999))
        fecha_expiracion = datetime.datetime.now() + datetime.timedelta(minutes=5)

        # Guardar código en Redis con expiración
        codigo_key = f"codigo_verificacion:{id_usuario}"
        codigo_data = {
            'codigo': codigo,
            'email': email_db,
            'username': username_db,
            'fecha_expiracion': fecha_expiracion.isoformat(),
            'intentos': 0
        }
        
        redis_client.setex(
            codigo_key,
            300,  # 5 minutos en segundos
            json.dumps(codigo_data)
        )

        conn.close()

        # Enviar email con código de verificación
        try:
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
            print(f"✅ Código de verificación {codigo} enviado a {email_db}")

        except Exception as mail_error:
            print("❌ Error enviando código de verificación:", mail_error)
            return jsonify({
                "success": False, 
                "message": "Error enviando código de verificación"
            }), 500

        return jsonify({
            "success": True,
            "message": "Se ha enviado un código de verificación a tu correo electrónico",
            "id_usuario": id_usuario
        })

    except Exception as e:
        print("❌ Error en verificar-usuario:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/verificar-codigo", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    id_usuario = data.get("id_usuario")
    codigo_ingresado = data.get("codigo", "").strip()

    if not id_usuario or not codigo_ingresado:
        return jsonify({"success": False, "message": "ID de usuario y código son requeridos"}), 400

    try:
        # Verificar código en Redis
        codigo_key = f"codigo_verificacion:{id_usuario}"
        codigo_data = redis_client.get(codigo_key)
        
        if not codigo_data:
            return jsonify({
                "success": False, 
                "message": "Código expirado o inválido. Solicite uno nuevo."
            }), 400

        codigo_info = json.loads(codigo_data)
        
        # Verificar si ha excedido los intentos
        if codigo_info['intentos'] >= 3:
            redis_client.delete(codigo_key)
            return jsonify({
                "success": False, 
                "message": "Demasiados intentos fallidos. Solicite un nuevo código."
            }), 400

        # Verificar si el código coincide
        if codigo_ingresado != codigo_info['codigo']:
            # Incrementar intentos en Redis
            codigo_info['intentos'] += 1
            redis_client.setex(
                codigo_key,
                redis_client.ttl(codigo_key),  # Mantener el mismo TTL
                json.dumps(codigo_info)
            )
            
            intentos_restantes = 3 - codigo_info['intentos']
            return jsonify({
                "success": False, 
                "message": f"Código incorrecto. Te quedan {intentos_restantes} intentos."
            }), 400

        # Código correcto - generar token para reset
        token_reset = f"reset_token_{random.randint(100000, 999999)}"
        token_key = f"token_reset:{id_usuario}"
        
        redis_client.setex(
            token_key,
            600,  # 10 minutos para completar el reset
            json.dumps({
                'id_usuario': id_usuario,
                'email': codigo_info['email'],
                'username': codigo_info['username']
            })
        )

        # Limpiar código de verificación
        redis_client.delete(codigo_key)

        return jsonify({
            "success": True,
            "message": "Código verificado correctamente",
            "token_reset": token_reset
        })

    except Exception as e:
        print("❌ Error en verificar-codigo:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500

@auth_bp.route("/resetear-contrasena", methods=["POST"])
def resetear_contrasena():
    data = request.get_json()
    token_reset = data.get("token_reset")
    nueva_contrasena = data.get("password", "").strip()

    if not token_reset or not nueva_contrasena:
        return jsonify({"success": False, "message": "Token y nueva contraseña son requeridos"}), 400

    if len(nueva_contrasena) < 6:
        return jsonify({"success": False, "message": "La contraseña debe tener al menos 6 caracteres"}), 400

    try:
        # Buscar el token en Redis
        token_key = f"token_reset:{token_reset.split('_')[-1]}"
        token_data = redis_client.get(token_key)
        
        if not token_data:
            return jsonify({"success": False, "message": "Token inválido o expirado"}), 400

        token_info = json.loads(token_data)
        id_usuario = token_info['id_usuario']
        email = token_info['email']
        username = token_info['username']

        conn = get_db_connection()
        cursor = conn.cursor()

        # Hashear nueva contraseña
        contrasena_hasheada = bcrypt.hashpw(nueva_contrasena.encode("utf-8"), bcrypt.gensalt())

        # Actualizar contraseña en la tabla Usuarios
        cursor.execute(
            "UPDATE Usuarios SET password = ? WHERE id = ?",
            (contrasena_hasheada.decode("utf-8"), id_usuario)
        )

        conn.commit()
        conn.close()

        # Limpiar token de Redis
        redis_client.delete(token_key)

        # Enviar email de confirmación
        try:
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
            print("✅ Email de confirmación de cambio de contraseña enviado")

        except Exception as mail_error:
            print("❌ Error enviando email de confirmación:", mail_error)

        return jsonify({
            "success": True,
            "message": "Contraseña restablecida exitosamente"
        })

    except Exception as e:
        print("❌ Error en resetear-contrasena:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Error interno del servidor"}), 500