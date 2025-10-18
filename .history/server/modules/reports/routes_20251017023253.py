from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
from database import get_db_connection
import config

reports_bp = Blueprint("reports", __name__)

@schedule_bp.route("/schedule/<int:id_proyecto>/gantt", methods=["GET"])
@token_required
@role_required(['Administrador', 'Supervisor'])

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


# Utilidad para ejecutar SP y retornar lista de dicts
def execute_sp(sp_name, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if params:
        placeholders = ", ".join(["?"] * len(params))
        cursor.execute(f"EXEC {sp_name} {placeholders}", params)
    else:
        cursor.execute(f"EXEC {sp_name}")
    cols = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(cols, row)) for row in rows]


# ---- Endpoints de reportes ----

@reports_bp.route("/avances/<int:id_etapa>", methods=["GET"])
@token_required
def reporte_avances(current_user, id_etapa):
    try:
        data = execute_sp("sp_reporte_avances_por_etapa", [id_etapa])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte avances:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/etapas/<int:id_proyecto>", methods=["GET"])
@token_required
def reporte_etapas(current_user, id_proyecto):
    try:
        data = execute_sp("sp_reporte_etapas_proyecto", [id_proyecto])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte etapas:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/materiales", methods=["GET"])
@token_required
def reporte_materiales(current_user):
    try:
        data = execute_sp("sp_reporte_materiales")
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte materiales:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/materiales/etapa/<int:id_etapa>", methods=["GET"])
@token_required
def reporte_materiales_por_etapa(current_user, id_etapa):
    try:
        data = execute_sp("sp_reporte_materiales_por_etapa", [id_etapa])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte materiales etapa:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/personal/<int:id_proyecto>", methods=["GET"])
@token_required
def reporte_personal(current_user, id_proyecto):
    try:
        data = execute_sp("sp_reporte_personal_proyecto", [id_proyecto])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte personal:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/estados-personal", methods=["GET"])
@token_required
def reporte_estados_personal(current_user):
    try:
        data = execute_sp("sp_reporte_estados_personal")
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte estados personal:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/clientes", methods=["GET"])
@token_required
def reporte_clientes(current_user):
    try:
        data = execute_sp("sp_reporte_clientes")
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte clientes:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/resumen/<int:id_proyecto>", methods=["GET"])
@token_required
def reporte_resumen_proyecto(current_user, id_proyecto):
    try:
        data = execute_sp("sp_reporte_resumen_proyecto", [id_proyecto])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte resumen proyecto:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500


@reports_bp.route("/consumo-materiales/<int:id_proyecto>", methods=["GET"])
@token_required
def reporte_consumo_materiales(current_user, id_proyecto):
    try:
        data = execute_sp("sp_reporte_consumo_materiales", [id_proyecto])
        return jsonify(success=True, data=data), 200
    except Exception:
        current_app.logger.error("Error reporte consumo materiales:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno"), 500
