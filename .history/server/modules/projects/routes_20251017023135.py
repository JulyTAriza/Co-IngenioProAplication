from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
import json

from database import get_db_connection
import config

projects_bp = Blueprint("projects", __name__)

@projects_bp.route("/projects/", methods=["GET"])
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

# -------------------------
# CREAR PROYECTO COMPLETO
# -------------------------
@projects_bp.route("/", methods=["POST"])
@token_required
def crear_proyecto(current_user):
    try:
        # DEBUG: Ver qué está llegando realmente
        raw_data = request.get_data(as_text=True)
        current_app.logger.info("[CREATE PROYECTO] Raw data recibido: %s", raw_data)
        
        data = request.get_json(force=True)
        current_app.logger.info("[CREATE PROYECTO] JSON parseado: %s", data)
        
    except Exception as e:
        current_app.logger.error("[CREATE PROYECTO] Error parseando JSON: %s", str(e))
        return jsonify(success=False, message=f"JSON inválido: {str(e)}"), 400

    # Campos obligatorios mínimos según SP
    required = ["nombre", "fecha_inicio", "nombre_ciudad", "nombre_cliente", "equipo", "materiales"]
    print("DEBUG FRONTEND PAYLOAD:", data)


    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify(success=False, message=f"Faltan campos obligatorios: {', '.join(missing)}"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            EXEC sp_CrearProyectoCompleto 
                @nombre=?,
                @descripcion=?,
                @nombre_ciudad=?,
                @departamento=?,
                @nombre_cliente=?,
                @email_cliente=?,
                @telefono_cliente=?,
                @direccion_cliente=?,
                @fecha_inicio=?,
                @fecha_fin=?,
                @presupuesto=?,
                @equipo=?,
                @materiales=?
        """, (
            data["nombre"].strip(),
            data.get("descripcion", "").strip(),
            data["nombre_ciudad"].strip(),
            data.get("departamento"),
            data["nombre_cliente"].strip(),
            data.get("email_cliente"),
            data.get("telefono_cliente"),
            data.get("direccion_cliente"),
            data["fecha_inicio"],
            data.get("fecha_fin"),
            float(data["presupuesto"]) if data.get("presupuesto") else None,
            json.dumps(data["equipo"]),
            json.dumps(data["materiales"])
        ))

        result = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        conn.commit()
        conn.close()

        if result and "id_proyecto" in columns:
            return jsonify(success=True, data={
                "estado": result[0],
                "mensaje": result[1],
                "id_proyecto": result[2]
            }), 201
        elif result and "CodigoError" in columns:
            return jsonify(success=False, message=result[1]), 400
        else:
            return jsonify(success=False, message="No se pudo crear el proyecto"), 400
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
                "id_proyecto": r[0],                            # id_proyecto
                "nombre": r[1],                                 # nombre
                "descripcion": r[2],                            # descripcion
                "fecha_inicio": r[3],                           # fecha_inicio
                "fecha_fin": r[4],                              # fecha_fin
                "estado": r[5],                                 # estado
                "presupuesto": float(r[6]) if r[6] else None,   # presupuesto
                "fecha_creacion": r[7],                         # fecha_creacion
                "ciudad": r[8],                                 # ciudad
                "cliente": r[9]                                 # cliente
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
        
        print(f"🔍 DEBUG: Buscando proyecto con ID: {proyecto_id}")
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        rows = cursor.fetchall()
        
        print(f"🔍 DEBUG: Filas devueltas: {len(rows) if rows else 0}")
        if rows:
            print(f"🔍 DEBUG: Primera fila: {rows[0]}")
            print(f"🔍 DEBUG: Columnas: {[col[0] for col in cursor.description]}")
        
        conn.close()

        if not rows:
            print("❌ DEBUG: No se encontraron filas")
            return jsonify(success=False, message="Proyecto no encontrado"), 404

        try:
            # Si el SP devuelve JSON en la primera columna
            detalle = rows[0][0]
            print(f"🔍 DEBUG: Detalle raw: {detalle}")
            
            if isinstance(detalle, str):
                parsed_data = json.loads(detalle)
            else:
                parsed_data = detalle
                
            print(f"✅ DEBUG: Datos parseados correctamente")
            return jsonify(success=True, data=parsed_data), 200
            
        except (json.JSONDecodeError, IndexError) as e:
            print(f"❌ DEBUG: Error parseando JSON: {e}")
            # FALLBACK: Construir manualmente
            return construir_detalle_manualmente(rows, cursor.description)

    except Exception as e:
        print(f"❌ DEBUG: Error en endpoint: {e}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
# -------------------------
# LISTAR CLIENTES
# -------------------------
@projects_bp.route("/clientes", methods=["GET"])
@token_required
def listar_clientes(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_cliente, nombre 
            FROM clientes
            ORDER BY nombre ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        clientes = [{"id": r[0], "nombre": r[1]} for r in rows]
        return jsonify(success=True, data=clientes), 200

    except Exception:
        current_app.logger.error("Error listando clientes:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR CIUDADES (incluye departamento)
# -------------------------
@projects_bp.route("/ciudades", methods=["GET"])
@token_required
def listar_ciudades(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_ciudad, nombre, departamento
            FROM ciudades
            ORDER BY nombre ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        ciudades = [{"id": r[0], "nombre": r[1], "departamento": r[2]} for r in rows]
        return jsonify(success=True, data=ciudades), 200

    except Exception:
        current_app.logger.error("Error listando ciudades:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR DEPARTAMENTOS (únicos)
# -------------------------
@projects_bp.route("/departamentos", methods=["GET"])
@token_required
def listar_departamentos(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT departamento
            FROM ciudades
            ORDER BY departamento ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        departamentos = [{"nombre": r[0]} for r in rows]
        return jsonify(success=True, data=departamentos), 200

    except Exception:
        current_app.logger.error("Error listando departamentos:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500