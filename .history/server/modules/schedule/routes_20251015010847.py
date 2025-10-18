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


# ---------------------------
# LISTAR ETAPAS DE UN PROYECTO
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/etapas", methods=["GET","OPTIONS"])
@token_required
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
            SELECT id_etapa, nombre, descripcion, fecha_inicio, fecha_fin, estado
            FROM etapas_proyecto
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio ASC
        """, (id_proyecto,))
        rows = cursor.fetchall()
        conn.close()

        etapas = [
            {
                "id_etapa": r[0],
                "nombre": r[1],
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
@schedule_bp.route("/etapas/<int:id_etapa>/actividades", methods=["GET"])
@token_required
def listar_actividades(current_user, id_etapa):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id_actividad, a.nombre, a.descripcion, a.fecha_inicio, a.fecha_fin,
                   a.estado, p.id_personal, p.nombre AS personal
            FROM actividades_proyecto a
            LEFT JOIN personal_proyecto p ON a.id_personal = p.id_personal
            WHERE a.id_etapa = ?
            ORDER BY a.fecha_inicio ASC
        """, (id_etapa,))
        rows = cursor.fetchall()
        conn.close()

        actividades = [
            {
                "id_actividad": r[0],
                "nombre": r[1],
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
# CREAR NUEVA ACTIVIDAD EN ETAPA
# ---------------------------
@schedule_bp.route("/etapas/<int:id_etapa>/actividades", methods=["POST"])
@token_required
def crear_actividad(current_user, id_etapa):
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
        cursor.execute("""
            INSERT INTO actividades_proyecto (id_etapa, nombre, descripcion, fecha_inicio, fecha_fin, estado, id_personal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            id_etapa,
            data["nombre"],
            data.get("descripcion"),
            data["fecha_inicio"],
            data["fecha_fin"],
            data["estado"],
            data.get("id_personal")
        ))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Actividad creada correctamente"), 201

    except Exception:
        current_app.logger.error("Error creando actividad:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# ACTUALIZAR ACTIVIDAD
# ---------------------------
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["PUT"])
@token_required
def actualizar_actividad(current_user, id_actividad):
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE actividades_proyecto
            SET nombre = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?, id_personal = ?
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
@schedule_bp.route("/actividades/<int:id_actividad>", methods=["DELETE"])
@token_required
def eliminar_actividad(current_user, id_actividad):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM actividades_proyecto WHERE id_actividad = ?", (id_actividad,))
        conn.commit()
        conn.close()
        return jsonify(success=True, message="Actividad eliminada correctamente"), 200

    except Exception:
        current_app.logger.error("Error eliminando actividad:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# LISTAR CRONOGRAMA COMPLETO DE UN PROYECTO (GANTT)
# ---------------------------
@schedule_bp.route("/<int:id_proyecto>/gantt", methods=["GET"])
@token_required
def obtener_schedule_completo(current_user, id_proyecto):
    """
    Retorna estructura jerárquica para visualizar el schedule tipo Gantt:
    [
      {
        "id_etapa": 1,
        "nombre": "Diseño",
        "fecha_inicio": "2025-10-01",
        "fecha_fin": "2025-10-15",
        "actividades": [
          { "id_actividad": 1, "nombre": "Mockups", "inicio": "...", "fin": "...", "estado": "Pendiente" },
          ...
        ]
      }
    ]
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1️⃣ Traer las etapas del proyecto
        cursor.execute("""
            SELECT id_etapa, nombre, fecha_inicio, fecha_fin, estado
            FROM etapas_proyecto
            WHERE id_proyecto = ?
            ORDER BY fecha_inicio
        """, (id_proyecto,))
        etapas = cursor.fetchall()

        data_final = []

        # 2️⃣ Por cada etapa, traer sus actividades
        for e in etapas:
            cursor.execute("""
                SELECT id_actividad, nombre, fecha_inicio, fecha_fin, estado
                FROM actividades_proyecto
                WHERE id_etapa = ?
                ORDER BY fecha_inicio
            """, (e[0],))
            acts = cursor.fetchall()

            data_final.append({
                "id_etapa": e[0],
                "nombre": e[1],
                "fecha_inicio": e[2],
                "fecha_fin": e[3],
                "estado": e[4],
                "actividades": [
                    {
                        "id_actividad": a[0],
                        "nombre": a[1],
                        "fecha_inicio": a[2],
                        "fecha_fin": a[3],
                        "estado": a[4]
                    } for a in acts
                ]
            })

        conn.close()
        return jsonify(success=True, data=data_final), 200

    except Exception:
        current_app.logger.error("Error obteniendo schedule completo:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
