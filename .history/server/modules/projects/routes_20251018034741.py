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
# OBTENER DETALLE DE PROYECTO (CORREGIDO)
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["GET"])
@token_required
def obtener_proyecto_detalle(current_user, proyecto_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔍 [PROYECTO-DETALLE] Buscando proyecto ID: {proyecto_id}")
        
        # Ejecutar el stored procedure
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        rows = cursor.fetchall()
        
        print(f"🔍 [PROYECTO-DETALLE] Filas devueltas: {len(rows)}")
        
        if not rows:
            conn.close()
            print("❌ [PROYECTO-DETALLE] Proyecto no encontrado")
            return jsonify(success=False, message="Proyecto no encontrado"), 404

        # Obtener nombres de columnas
        columns = [col[0] for col in cursor.description]
        print(f"🔍 [PROYECTO-DETALLE] Columnas: {columns}")
        
        # Ver qué devuelve exactamente el SP
        first_row = rows[0]
        print(f"🔍 [PROYECTO-DETALLE] Primera fila: {first_row}")
        
        conn.close()

        # Diferentes estrategias para parsear la respuesta
        detalle = None
        
        # Estrategia 1: Si el SP devuelve JSON en alguna columna
        for i, col in enumerate(columns):
            if first_row[i] and isinstance(first_row[i], str) and first_row[i].strip().startswith('{'):
                try:
                    detalle = json.loads(first_row[i])
                    print(f"✅ [PROYECTO-DETALLE] JSON encontrado en columna {col}")
                    break
                except json.JSONDecodeError:
                    continue
        
        # Estrategia 2: Si no hay JSON, construir manualmente
        if not detalle:
            print("🔄 [PROYECTO-DETALLE] Construyendo detalle manualmente")
            detalle = construir_detalle_manualmente(rows, columns)
        
        print(f"✅ [PROYECTO-DETALLE] Datos preparados: {detalle.keys() if detalle else 'None'}")
        return jsonify(success=True, data=detalle), 200

    except Exception as e:
        print(f"❌ [PROYECTO-DETALLE] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

def construir_detalle_manualmente(rows, columns):
    """Construye el detalle del proyecto manualmente desde las filas"""
    try:
        # Asumiendo que la primera fila contiene los datos básicos del proyecto
        first_row = rows[0]
        
        detalle = {
            "id_proyecto": first_row[columns.index("id_proyecto")] if "id_proyecto" in columns else None,
            "nombre": first_row[columns.index("nombre")] if "nombre" in columns else None,
            "descripcion": first_row[columns.index("descripcion")] if "descripcion" in columns else "",
            "fecha_inicio": first_row[columns.index("fecha_inicio")].strftime('%Y-%m-%d') if "fecha_inicio" in columns and first_row[columns.index("fecha_inicio")] else None,
            "fecha_fin": first_row[columns.index("fecha_fin")].strftime('%Y-%m-%d') if "fecha_fin" in columns and first_row[columns.index("fecha_fin")] else None,
            "estado": first_row[columns.index("estado")] if "estado" in columns else None,
            "presupuesto": float(first_row[columns.index("presupuesto")]) if "presupuesto" in columns and first_row[columns.index("presupuesto")] else None,
            "id_ciudad": first_row[columns.index("id_ciudad")] if "id_ciudad" in columns else None,
            "id_cliente": first_row[columns.index("id_cliente")] if "id_cliente" in columns else None,
            "ciudad_nombre": first_row[columns.index("ciudad_nombre")] if "ciudad_nombre" in columns else None,
            "cliente_nombre": first_row[columns.index("cliente_nombre")] if "cliente_nombre" in columns else None,
            "cliente_email": first_row[columns.index("cliente_email")] if "cliente_email" in columns else None,
            "cliente_telefono": first_row[columns.index("cliente_telefono")] if "cliente_telefono" in columns else None,
            "cliente_direccion": first_row[columns.index("cliente_direccion")] if "cliente_direccion" in columns else None,
            "equipo": [],
            "materiales": []
        }
        
        print(f"🔍 [CONSTRUIR-MANUAL] Procesando {len(rows)} filas...")
        print(f"🔍 [CONSTRUIR-MANUAL] Columnas disponibles: {columns}")
        
        # Procesar equipo (personal_proyecto)
        for row in rows:
            # Buscar equipo por diferentes nombres de columna posibles
            equipo_id = None
            if "id_personal_proyecto" in columns and row[columns.index("id_personal_proyecto")]:
                equipo_id = row[columns.index("id_personal_proyecto")]
            elif "personal_id" in columns and row[columns.index("personal_id")]:
                equipo_id = row[columns.index("personal_id")]
                
            if equipo_id:
                equipo_member = {
                    "id_personal_proyecto": equipo_id,
                    "nombre": row[columns.index("personal_nombre")] if "personal_nombre" in columns else 
                             row[columns.index("nombre_personal")] if "nombre_personal" in columns else 
                             row[columns.index("usuario_nombre")] if "usuario_nombre" in columns else None,
                    "rol": row[columns.index("rol")] if "rol" in columns else None,
                    "id_usuario": row[columns.index("id_usuario")] if "id_usuario" in columns else None
                }
                
                # Evitar duplicados
                if not any(e["id_personal_proyecto"] == equipo_member["id_personal_proyecto"] for e in detalle["equipo"]):
                    detalle["equipo"].append(equipo_member)
                    print(f"✅ [EQUIPO] Agregado: {equipo_member}")
        
        # Procesar materiales
        for row in rows:
            # Buscar materiales por diferentes nombres de columna posibles
            material_id = None
            if "id_material" in columns and row[columns.index("id_material")]:
                material_id = row[columns.index("id_material")]
            elif "material_id" in columns and row[columns.index("material_id")]:
                material_id = row[columns.index("material_id")]
                
            if material_id:
                material = {
                    "id_material": material_id,
                    "nombre": row[columns.index("material_nombre")] if "material_nombre" in columns else 
                              row[columns.index("nombre_material")] if "nombre_material" in columns else None,
                    "cantidad": float(row[columns.index("cantidad")]) if "cantidad" in columns and row[columns.index("cantidad")] else None,
                    "unidad": row[columns.index("unidad")] if "unidad" in columns else None,
                    "categoria": row[columns.index("categoria")] if "categoria" in columns else None
                }
                
                # Evitar duplicados
                if not any(m["id_material"] == material["id_material"] for m in detalle["materiales"]):
                    detalle["materiales"].append(material)
                    print(f"✅ [MATERIAL] Agregado: {material}")
        
        print(f"✅ [CONSTRUIR-MANUAL] Final: {len(detalle['equipo'])} equipo, {len(detalle['materiales'])} materiales")
        return detalle
        
    except Exception as e:
        print(f"❌ [CONSTRUIR-MANUAL] ERROR: {str(e)}")
        print(traceback.format_exc())
        return {"error": "No se pudo construir el detalle"}
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