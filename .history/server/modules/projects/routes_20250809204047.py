from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
import json

from database import get_db_connection
import config

projects_bp = Blueprint("projects", __name__)

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


# -------------------------
# CREAR PROYECTO COMPLETO
# -------------------------
@projects_bp.route("/", methods=["POST"])
@token_required
def crear_proyecto(current_user):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE PROYECTO] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["nombre", "id_ciudad", "id_cliente", "fecha_inicio", "estado", "equipo", "materiales"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False, message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            EXEC sp_CrearProyectoCompleto 
                @nombre=?, @descripcion=?, @id_ciudad=?, @id_cliente=?, 
                @fecha_inicio=?, @fecha_fin=?, @estado=?, @presupuesto=?, 
                @equipo=?, @materiales=?
        """, (
            data["nombre"].strip(),
            data.get("descripcion", "").strip(),
            int(data["id_ciudad"]),
            int(data["id_cliente"]),
            data["fecha_inicio"],
            data.get("fecha_fin"),
            data["estado"],
            float(data.get("presupuesto", 0)) if data.get("presupuesto") else None,
            json.dumps(data["equipo"]),
            json.dumps(data["materiales"])
        ))

        result = cursor.fetchone()
        conn.commit()
        conn.close()

        return jsonify(success=True, data={"id_proyecto": result[0]}), 201

    except Exception:
        current_app.logger.error("Error creando proyecto:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# ACTUALIZAR PROYECTO
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["PUT"])
@token_required
def actualizar_proyecto(current_user, proyecto_id):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[UPDATE PROYECTO %s] Payload: %s", proyecto_id, data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            EXEC sp_ActualizarProyectoCompleto 
                @id_proyecto=?, @nombre=?, @descripcion=?, @id_ciudad=?, @id_cliente=?, 
                @fecha_inicio=?, @fecha_fin=?, @estado=?, @presupuesto=?, 
                @equipo=?, @materiales=?
        """, (
            proyecto_id,
            data.get("nombre"),
            data.get("descripcion"),
            data.get("id_ciudad"),
            data.get("id_cliente"),
            data.get("fecha_inicio"),
            data.get("fecha_fin"),
            data.get("estado"),
            float(data.get("presupuesto", 0)) if data.get("presupuesto") else None,
            json.dumps(data.get("equipo", [])),
            json.dumps(data.get("materiales", []))
        ))

        conn.commit()
        conn.close()

        return jsonify(success=True, message="Proyecto actualizado"), 200

    except Exception:
        current_app.logger.error("Error actualizando proyecto %s:\n%s", proyecto_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# ELIMINAR PROYECTO
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["DELETE"])
@token_required
def eliminar_proyecto(current_user, proyecto_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC sp_EliminarProyecto @id_proyecto=?", (proyecto_id,))
        conn.commit()
        conn.close()
        return jsonify(success=True, message="Proyecto eliminado"), 200
    except Exception:
        current_app.logger.error("Error eliminando proyecto %s:\n%s", proyecto_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR PROYECTOS
# -------------------------
@projects_bp.route("/", methods=["GET"])
@token_required
def listar_proyectos(current_user):
    filtros = {
        "estado": request.args.get("estado"),
        "id_cliente": request.args.get("id_cliente"),
        "id_ciudad": request.args.get("id_ciudad")
    }

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            EXEC sp_ListarProyectos 
                @estado=?, @id_cliente=?, @id_ciudad=?
        """, (
            filtros["estado"],
            filtros["id_cliente"],
            filtros["id_ciudad"]
        ))

        rows = cursor.fetchall()
        conn.close()

        proyectos = [
            {
                "id_proyecto": r[0],
                "nombre": r[1],
                "estado": r[2],
                "fecha_inicio": r[3],
                "fecha_fin": r[4],
                "presupuesto": float(r[5]) if r[5] else None
            }
            for r in rows
        ]
        return jsonify(success=True, data=proyectos), 200

    except Exception:
        current_app.logger.error("Error listando proyectos:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# OBTENER DETALLE DE PROYECTO
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["GET"])
@token_required
def obtener_proyecto_detalle(current_user, proyecto_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return jsonify(success=False, message="Proyecto no encontrado"), 404

        # Aquí adaptas a la estructura de datos que devuelva tu SP
        detalle = rows[0][0]  # Ejemplo si el SP devuelve un JSON consolidado

        return jsonify(success=True, data=json.loads(detalle)), 200

    except Exception:
        current_app.logger.error("Error obteniendo detalle del proyecto %s:\n%s", proyecto_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
