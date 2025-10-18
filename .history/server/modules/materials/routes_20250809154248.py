from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

materials_bp = Blueprint("materials", __name__)

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


@materials_bp.route("/", methods=["GET"])
@token_required
def list_materials(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nombre, descripcion, cantidad, precio_unitario
            FROM Materiales
        """)
        rows = cursor.fetchall()
        conn.close()

        materiales = [
            {
                "id": row[0],
                "nombre": row[1],
                "descripcion": row[2],
                "cantidad": row[3],
                "precio_unitario": float(row[4]) if row[4] is not None else None
            }
            for row in rows
        ]
        return jsonify(success=True, data=materiales), 200

    except Exception:
        current_app.logger.error("Error listando materiales:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


@materials_bp.route("/<int:material_id>", methods=["GET"])
@token_required
def get_material(current_user, material_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nombre, descripcion, cantidad, precio_unitario
            FROM Materiales
            WHERE id = ?
        """, (material_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify(success=False, message="Material no encontrado"), 404

        material = {
            "id": row[0],
            "nombre": row[1],
            "descripcion": row[2],
            "cantidad": row[3],
            "precio_unitario": float(row[4]) if row[4] is not None else None
        }
        return jsonify(success=True, data=material), 200

    except Exception:
        current_app.logger.error("Error obteniendo material %s:\n%s", material_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


@materials_bp.route("/", methods=["POST"])
@token_required
def create_material(current_user):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE MATERIAL] Payload: %s", data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    required = ["nombre", "cantidad"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False,
                       message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    try:
        cantidad = int(data["cantidad"])
        precio_unitario = None
        if any(k in data for k in ["precio_unitario", "precioUnitario"]):
            raw_precio = data.get("precio_unitario", data.get("precioUnitario"))
            if raw_precio is not None:
                precio_unitario = float(raw_precio)
    except (ValueError, TypeError):
        return jsonify(success=False,
                       message="cantidad debe ser entero y precio_unitario numérico"), 400

    nombre = data["nombre"].strip()
    descripcion = data.get("descripcion", "").strip()

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO Materiales (nombre, descripcion, cantidad, precio_unitario)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?)
        """, (nombre, descripcion, cantidad, precio_unitario))

        result = cursor.fetchone()
        if not result or result[0] is None:
            raise Exception("No se pudo obtener el ID del nuevo material.")
        
        new_id = int(result[0])

        conn.commit()
        conn.close()

        nuevo = {
            "id": new_id,
            "nombre": nombre,
            "descripcion": descripcion,
            "cantidad": cantidad,
            "precio_unitario": precio_unitario
        }
        return jsonify(success=True, data=nuevo), 201

    except Exception:
        current_app.logger.error("Error creando material:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


@materials_bp.route("/<int:material_id>", methods=["PUT"])
@token_required
def update_material(current_user, material_id):
    try:
        data = request.get_json(force=True)
        current_app.logger.info("[UPDATE MATERIAL %s] Payload: %s", material_id, data)
    except Exception:
        return jsonify(success=False, message="JSON inválido"), 400

    fields = []
    values = []
    if "nombre" in data:
        fields.append("nombre = ?")
        values.append(data["nombre"].strip())
    if "descripcion" in data:
        fields.append("descripcion = ?")
        values.append(data["descripcion"].strip())
    if "cantidad" in data:
        try:
            values.append(int(data["cantidad"]))
            fields.append("cantidad = ?")
        except (ValueError, TypeError):
            return jsonify(success=False, message="cantidad inválida"), 400
    if "precio_unitario" in data or "precioUnitario" in data:
        try:
            raw_precio = data.get("precio_unitario", data.get("precioUnitario"))
            values.append(float(raw_precio))
            fields.append("precio_unitario = ?")
        except (ValueError, TypeError):
            return jsonify(success=False, message="precio_unitario inválido"), 400

    if not fields:
        return jsonify(success=False, message="Nada para actualizar"), 400

    values.append(material_id)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM Materiales WHERE id = ?", (material_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Material no encontrado"), 404

        sql = f"UPDATE Materiales SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(sql, tuple(values))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Material actualizado"), 200

    except Exception:
        current_app.logger.error("Error actualizando material %s:\n%s", material_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


@materials_bp.route("/<int:material_id>", methods=["DELETE"])
@token_required
def delete_material(current_user, material_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM Materiales WHERE id = ?", (material_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify(success=False, message="Material no encontrado"), 404

        cursor.execute("DELETE FROM Materiales WHERE id = ?", (material_id,))
        conn.commit()
        conn.close()

        return jsonify(success=True, message="Material eliminado"), 200

    except Exception:
        current_app.logger.error("Error eliminando material %s:\n%s", material_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
