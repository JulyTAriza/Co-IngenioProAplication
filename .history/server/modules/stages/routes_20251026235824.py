# etapas_proyecto_bp.py
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
from datetime import datetime

from database import get_db_connection
import config

etapas_proyecto_bp = Blueprint("etapas_proyecto", __name__)

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
# RUTAS DE ETAPAS DE PROYECTO
# ---------------------------

@etapas_proyecto_bp.route("/proyecto/<int:proyecto_id>", methods=["GET"])
@token_required
def list_etapas_proyecto(current_user, proyecto_id):
    """
    Listar todas las etapas de un proyecto
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar que el proyecto existe
        cursor.execute("SELECT id_proyecto FROM proyectos WHERE id_proyecto = ?", (proyecto_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Proyecto no encontrado"), 404
        
        cursor.execute("""
            SELECT 
                id_etapa, 
                id_proyecto, 
                nombre_etapa, 
                description, 
                fecha_inicio, 
                fecha_fin, 
                estado
            FROM etapas_proyecto 
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio
        """, (proyecto_id,))
        rows = cursor.fetchall()
        conn.close()

        etapas = [
            {
                "id_etapa": row[0],
                "id_proyecto": row[1],
                "nombre_etapa": row[2],
                "description": row[3],
                "fecha_inicio": row[4].isoformat() if row[4] else None,
                "fecha_fin": row[5].isoformat() if row[5] else None,
                "estado": row[6]
            }
            for row in rows
        ]
        return jsonify(success=True, data=etapas), 200

    except Exception:
        current_app.logger.error("Error listando etapas del proyecto %s:\n%s", proyecto_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

@etapas_proyecto_bp.route("/proyecto/<int:proyecto_id>", methods=["POST"])
@token_required
@role_required(['Administrador', 'Jefe de Proyecto'])
def create_etapa_proyecto(current_user, proyecto_id):
    """
    Crear nueva etapa para un proyecto - SOLO ADMIN Y JEFE DE PROYECTO
    """
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE ETAPA] Proyecto: %s, Payload: %s", proyecto_id, data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["nombre_etapa", "fecha_inicio", "fecha_fin"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False,
                       message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    # Validar que el nombre de etapa sea uno de los permitidos
    etapas_permitidas = ['Preparación', 'Ejecución', 'Etapa Inicial', 'Etapa Final']
    nombre_etapa = data["nombre_etapa"].strip()
    if nombre_etapa not in etapas_permitidas:
        return jsonify(success=False,
                       message=f"Nombre de etapa inválido. Debe ser uno de: {', '.join(etapas_permitidas)}"), 400

    try:
        # Convertir fechas
        fecha_inicio = datetime.strptime(data["fecha_inicio"], "%Y-%m-%d").date()
        fecha_fin = datetime.strptime(data["fecha_fin"], "%Y-%m-%d").date()
        
        if fecha_inicio > fecha_fin:
            return jsonify(success=False, message="La fecha de inicio no puede ser posterior a la fecha fin"), 400

    except ValueError:
        return jsonify(success=False, message="Formato de fecha inválido. Use YYYY-MM-DD"), 400

    description = data.get("description", "").strip()
    estado = data.get("estado", "Pendiente")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que el proyecto existe
        cursor.execute("SELECT id_proyecto FROM proyectos WHERE id_proyecto = ?", (proyecto_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Proyecto no encontrado"), 404

        # Verificar que no existe ya una etapa con el mismo nombre para este proyecto
        cursor.execute("""
            SELECT 1 FROM etapas_proyecto 
            WHERE id_proyecto = ? AND nombre_etapa = ?
        """, (proyecto_id, nombre_etapa))
        if cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Ya existe una etapa con ese nombre en este proyecto"), 400

        cursor.execute("""
            INSERT INTO etapas_proyecto (
                id_proyecto, nombre_etapa, description, 
                fecha_inicio, fecha_fin, estado
            )
            OUTPUT INSERTED.id_etapa
            VALUES (?, ?, ?, ?, ?, ?)
        """, (proyecto_id, nombre_etapa, description, fecha_inicio, fecha_fin, estado))

        result = cursor.fetchone()
        if not result or result[0] is None:
            raise Exception("No se pudo obtener el ID de la nueva etapa.")
        
        new_id = int(result[0])

        conn.commit()
        conn.close()

        nueva_etapa = {
            "id_etapa": new_id,
            "id_proyecto": proyecto_id,
            "nombre_etapa": nombre_etapa,
            "description": description,
            "fecha_inicio": data["fecha_inicio"],
            "fecha_fin": data["fecha_fin"],
            "estado": estado
        }
        return jsonify(success=True, data=nueva_etapa), 201

    except Exception:
        current_app.logger.error("Error creando etapa:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

@etapas_proyecto_bp.route("/<int:etapa_id>", methods=["PUT"])
@token_required
@role_required(['Administrador', 'Jefe de Proyecto'])
def update_etapa_proyecto(current_user, etapa_id):
    """
    Actualizar etapa de proyecto - SOLO ADMIN Y JEFE DE PROYECTO
    """
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[UPDATE ETAPA %s] Payload: %s", etapa_id, data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que la etapa existe
        cursor.execute("""
            SELECT id_etapa, id_proyecto, nombre_etapa 
            FROM etapas_proyecto 
            WHERE id_etapa = ?
        """, (etapa_id,))
        etapa = cursor.fetchone()
        if not etapa:
            conn.close()
            return jsonify(success=False, message="Etapa no encontrada"), 404

        fields = []
        values = []

        # Validar y procesar campos
        if "nombre_etapa" in data:
            nombre_etapa = data["nombre_etapa"].strip()
            etapas_permitidas = ['Preparación', 'Ejecución', 'Etapa Inicial', 'Etapa Final']
            if nombre_etapa not in etapas_permitidas:
                conn.close()
                return jsonify(success=False,
                               message=f"Nombre de etapa inválido. Debe ser uno de: {', '.join(etapas_permitidas)}"), 400
            fields.append("nombre_etapa = ?")
            values.append(nombre_etapa)

        if "description" in data:
            fields.append("description = ?")
            values.append(data["description"].strip())

        if "estado" in data:
            fields.append("estado = ?")
            values.append(data["estado"].strip())

        if "fecha_inicio" in data:
            try:
                fecha_inicio = datetime.strptime(data["fecha_inicio"], "%Y-%m-%d").date()
                fields.append("fecha_inicio = ?")
                values.append(fecha_inicio)
            except ValueError:
                conn.close()
                return jsonify(success=False, message="Formato de fecha_inicio inválido. Use YYYY-MM-DD"), 400

        if "fecha_fin" in data:
            try:
                fecha_fin = datetime.strptime(data["fecha_fin"], "%Y-%m-%d").date()
                fields.append("fecha_fin = ?")
                values.append(fecha_fin)
            except ValueError:
                conn.close()
                return jsonify(success=False, message="Formato de fecha_fin inválido. Use YYYY-MM-DD"), 400

        if not fields:
            conn.close()
            return jsonify(success=False, message="Nada para actualizar"), 400

        values.append(etapa_id)

        sql = f"UPDATE etapas_proyecto SET {', '.join(fields)} WHERE id_etapa = ?"
        cursor.execute(sql, tuple(values))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Etapa actualizada"), 200

    except Exception:
        current_app.logger.error("Error actualizando etapa %s:\n%s", etapa_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

@etapas_proyecto_bp.route("/<int:etapa_id>", methods=["DELETE"])
@token_required
@role_required(['Administrador', 'Jefe de Proyecto'])
def delete_etapa_proyecto(current_user, etapa_id):
    """
    Eliminar etapa de proyecto - SOLO ADMIN Y JEFE DE PROYECTO
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar que la etapa existe y obtener su nombre
        cursor.execute("""
            SELECT nombre_etapa FROM etapas_proyecto WHERE id_etapa = ?
        """, (etapa_id,))
        etapa = cursor.fetchone()
        if not etapa:
            conn.close()
            return jsonify(success=False, message="Etapa no encontrada"), 404

        # Eliminar la etapa
        cursor.execute("DELETE FROM etapas_proyecto WHERE id_etapa = ?", (etapa_id,))
        conn.commit()
        conn.close()

        return jsonify(success=True, message=f"Etapa '{etapa[0]}' eliminada correctamente"), 200

    except Exception:
        current_app.logger.error("Error eliminando etapa %s:\n%s", etapa_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500