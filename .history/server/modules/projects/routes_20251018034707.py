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

def role_required(roles_permitidos):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'usuario'):
                return jsonify({'success': False, 'message': 'Autenticación requerida'}), 401
            
            rol_usuario = request.usuario.get('rol')
            
            if rol_usuario not in roles_permitidos:
                return jsonify({
                    'success': False, 
                    'message': f'Acceso denegado. Se requiere rol: {", ".join(roles_permitidos)}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator
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
# OBTENER DETALLE ALTERNATIVO (si el SP no funciona)
# -------------------------
@projects_bp.route("/<int:proyecto_id>/completo", methods=["GET"])
@token_required
def obtener_proyecto_completo(current_user, proyecto_id):
    """Obtiene el proyecto con equipo y materiales usando consultas separadas"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Datos básicos del proyecto
        cursor.execute("""
            SELECT p.id_proyecto, p.nombre, p.descripcion, p.fecha_inicio, p.fecha_fin,
                   p.estado, p.presupuesto, p.id_ciudad, p.id_cliente,
                   c.nombre as ciudad_nombre, cl.nombre as cliente_nombre,
                   cl.email as cliente_email, cl.telefono as cliente_telefono,
                   cl.direccion as cliente_direccion
            FROM proyectos p
            LEFT JOIN ciudades c ON p.id_ciudad = c.id_ciudad
            LEFT JOIN clientes cl ON p.id_cliente = cl.id_cliente
            WHERE p.id_proyecto = ?
        """, (proyecto_id,))
        
        proyecto_data = cursor.fetchone()
        
        if not proyecto_data:
            conn.close()
            return jsonify(success=False, message="Proyecto no encontrado"), 404
        
        # 2. Obtener equipo del proyecto
        cursor.execute("""
            SELECT pp.id_personal_proyecto, pp.nombre, pp.rol, pp.id_usuario, u.username
            FROM personal_proyecto pp
            LEFT JOIN Usuarios u ON pp.id_usuario = u.id
            WHERE pp.id_proyecto = ?
        """, (proyecto_id,))
        
        equipo_rows = cursor.fetchall()
        
        # 3. Obtener materiales del proyecto
        cursor.execute("""
            SELECT m.id_material, m.nombre, m.categoria, m.unidad,
                   pm.cantidad, pm.precio_unitario
            FROM materiales m
            INNER JOIN proyecto_materiales pm ON m.id_material = pm.id_material
            WHERE pm.id_proyecto = ?
        """, (proyecto_id,))
        
        materiales_rows = cursor.fetchall()
        
        conn.close()

        # Construir respuesta
        detalle = {
            "id_proyecto": proyecto_data[0],
            "nombre": proyecto_data[1],
            "descripcion": proyecto_data[2] or "",
            "fecha_inicio": proyecto_data[3].strftime('%Y-%m-%d') if proyecto_data[3] else None,
            "fecha_fin": proyecto_data[4].strftime('%Y-%m-%d') if proyecto_data[4] else None,
            "estado": proyecto_data[5],
            "presupuesto": float(proyecto_data[6]) if proyecto_data[6] else None,
            "id_ciudad": proyecto_data[7],
            "id_cliente": proyecto_data[8],
            "ciudad_nombre": proyecto_data[9],
            "cliente_nombre": proyecto_data[10],
            "cliente_email": proyecto_data[11],
            "cliente_telefono": proyecto_data[12],
            "cliente_direccion": proyecto_data[13],
            "equipo": [
                {
                    "id_personal_proyecto": row[0],
                    "nombre": row[1],
                    "rol": row[2],
                    "id_usuario": row[3],
                    "username": row[4]
                } for row in equipo_rows
            ],
            "materiales": [
                {
                    "id_material": row[0],
                    "nombre": row[1],
                    "categoria": row[2],
                    "unidad": row[3],
                    "cantidad": float(row[4]) if row[4] else None,
                    "precio_unitario": float(row[5]) if row[5] else None
                } for row in materiales_rows
            ]
        }
        
        print(f"✅ [COMPLETO] Proyecto: {detalle['nombre']}")
        print(f"✅ [COMPLETO] Equipo: {len(detalle['equipo'])} miembros")
        print(f"✅ [COMPLETO] Materiales: {len(detalle['materiales'])} items")
        
        return jsonify(success=True, data=detalle), 200

    except Exception as e:
        print(f"❌ [COMPLETO] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500
# -------------------------
# DEBUG: VER ESTRUCTURA DEL SP
# -------------------------
@projects_bp.route("/<int:proyecto_id>/debug", methods=["GET"])
@token_required
def debug_proyecto_detalle(current_user, proyecto_id):
    """Endpoint temporal para debuggear qué devuelve el SP"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔍 [DEBUG] Ejecutando SP para proyecto {proyecto_id}")
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        rows = cursor.fetchall()
        
        response_data = {
            "row_count": len(rows),
            "columns": [col[0] for col in cursor.description] if cursor.description else [],
            "first_row": str(rows[0]) if rows else None,
            "all_rows_sample": [str(row) for row in rows[:3]] if len(rows) > 3 else [str(row) for row in rows]
        }
        
        conn.close()
        
        print(f"✅ [DEBUG] Response: {response_data}")
        return jsonify(success=True, data=response_data), 200
        
    except Exception as e:
        print(f"❌ [DEBUG] ERROR: {str(e)}")
        return jsonify(success=False, message=str(e)), 500
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