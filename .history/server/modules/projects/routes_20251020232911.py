from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback
import json

from database import get_db_connection
import config

projects_bp = Blueprint("projects", __name__)

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


# -------------------------
# CREAR PROYECTO COMPLETO - SOLO ADMIN
# -------------------------
@projects_bp.route("/", methods=["POST"])
@token_required
@role_required(['Administrador'])
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
# ACTUALIZAR PROYECTO - SOLO ADMIN
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["PUT"])
@token_required
@role_required(['Administrador'])
def actualizar_proyecto(current_user, proyecto_id):
    try:
        data = request.get_json(force=True)
        
        # DEBUG EXHAUSTIVO
        print(f"🔍 [UPDATE PROYECTO {proyecto_id}] ========== INICIO DEBUG =========")
        print(f"📦 Payload completo recibido: {json.dumps(data, indent=2)}")
        
        # DEBUG DETALLADO DE MATERIALES
        if 'materiales' in data:
            print(f"📋 MATERIALES ENVIADOS POR FRONTEND (total: {len(data['materiales'])}):")
            for i, material in enumerate(data['materiales']):
                print(f"   Material {i}:")
                print(f"     - id_material: {material.get('id_material', 'NO TIENE!')}")
                print(f"     - cantidad: {material.get('cantidad', 'NO TIENE!')}")
                print(f"     - unidad: {material.get('unidad', 'NO TIENE!')}")
                print(f"     - costo_unitario: {material.get('costo_unitario', 'NO TIENE!')}")
                
                # Validaciones críticas
                if 'id_material' not in material:
                    print(f"❌ ERROR CRÍTICO: Material {i} NO tiene id_material")
                if 'cantidad' not in material:
                    print(f"❌ ERROR CRÍTICO: Material {i} NO tiene cantidad")
                    
        else:
            print("❌ NO hay campo 'materiales' en el payload")
            
        # DEBUG de equipo
        if 'equipo' in data:
            print(f"👥 EQUIPO enviado (total: {len(data['equipo'])} miembros)")
        else:
            print("❌ NO hay campo 'equipo' en el payload")
            
        print(f"🔍 [UPDATE PROYECTO {proyecto_id}] ========== FIN DEBUG ===========")
        
    except Exception as e:
        print(f"❌ ERROR parseando JSON: {str(e)}")
        return jsonify(success=False, message="JSON inválido"), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # PREPARAR DATOS CON VALIDACIÓN
        equipo_data = data.get("equipo", [])
        materiales_data = data.get("materiales", [])
        
        # Validar materiales antes de enviar al SP
        materiales_validados = []
        for material in materiales_data:
            if 'id_material' not in material or 'cantidad' not in material:
                print(f"❌ Material inválido omitido: {material}")
                continue
                
            materiales_validados.append({
                'id_material': material['id_material'],
                'cantidad': material['cantidad'],
                'unidad': material.get('unidad', 'unidades'),
                'costo_unitario': material.get('costo_unitario', 0)
            })
        
        print(f"✅ Materiales validados para SP: {len(materiales_validados)} de {len(materiales_data)} originales")
        
        # DEBUG del llamado al SP
        print(f"🔧 Ejecutando SP con parámetros:")
        print(f"   - id_proyecto: {proyecto_id}")
        print(f"   - materiales: {json.dumps(materiales_validados, indent=4)}")
        
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
            json.dumps(equipo_data),
            json.dumps(materiales_validados)  # Usar los materiales validados
        ))

        # Obtener resultado del SP
        result = cursor.fetchall()
        print(f"📊 Resultado del SP: {len(result)} filas devueltas")
        for i, row in enumerate(result):
            print(f"   Fila {i}: {row}")

        conn.commit()
        conn.close()

        print(f"✅ Proyecto {proyecto_id} actualizado exitosamente por {current_user}")
        return jsonify(success=True, message="Proyecto actualizado"), 200

    except Exception as e:
        print(f"❌ ERROR actualizando proyecto {proyecto_id}:")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# ELIMINAR PROYECTO - SOLO ADMIN
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["DELETE"])
@token_required
@role_required(['Administrador'])
def eliminar_proyecto(current_user, proyecto_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("EXEC sp_EliminarProyecto @id_proyecto=?", (proyecto_id,))
        conn.commit()
        conn.close()
        print(f"✅ Proyecto {proyecto_id} eliminado por {current_user}")
        return jsonify(success=True, message="Proyecto eliminado"), 200
    except Exception:
        current_app.logger.error("Error eliminando proyecto %s:\n%s", proyecto_id, traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR PROYECTOS - SOLO ADMIN
# -------------------------
@projects_bp.route("/", methods=["GET"])
@token_required
@role_required(['Administrador'])
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
        print(f"✅ {len(proyectos)} proyectos listados por {current_user}")
        return jsonify(success=True, data=proyectos), 200

    except Exception:
        current_app.logger.error("Error listando proyectos:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

# -------------------------
# OBTENER DETALLE DE PROYECTO - SOLO ADMIN
# -------------------------
@projects_bp.route("/<int:proyecto_id>", methods=["GET"])
@token_required
@role_required(['Administrador'])
def obtener_proyecto_detalle(current_user, proyecto_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔍 [PROYECTO-DETALLE] Buscando proyecto ID: {proyecto_id} para {current_user}")
        
        # Ejecutar el stored procedure
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        
        # PROCESAR MÚLTIPLES RESULTSETS
        resultados = {}
        
        # 1. Primer resultset: Datos básicos del proyecto
        proyecto_data = cursor.fetchall()
        proyecto_columns = [col[0] for col in cursor.description] if cursor.description else []
        print(f"✅ [PROYECTO] {len(proyecto_data)} filas, columnas: {proyecto_columns}")
        
        if proyecto_data:
            resultados['proyecto'] = proyecto_data
            resultados['proyecto_columns'] = proyecto_columns
        
        # 2. Segundo resultset: Equipo
        if cursor.nextset():
            equipo_data = cursor.fetchall()
            equipo_columns = [col[0] for col in cursor.description] if cursor.description else []
            print(f"✅ [EQUIPO] {len(equipo_data)} filas, columnas: {equipo_columns}")
            resultados['equipo'] = equipo_data
            resultados['equipo_columns'] = equipo_columns
        
        # 3. Tercer resultset: Etapas
        if cursor.nextset():
            etapas_data = cursor.fetchall()
            etapas_columns = [col[0] for col in cursor.description] if cursor.description else []
            print(f"✅ [ETAPAS] {len(etapas_data)} filas, columnas: {etapas_columns}")
            resultados['etapas'] = etapas_data
            resultados['etapas_columns'] = etapas_columns
        
        # 4. Cuarto resultset: Materiales
        if cursor.nextset():
            materiales_data = cursor.fetchall()
            materiales_columns = [col[0] for col in cursor.description] if cursor.description else []
            print(f"✅ [MATERIALES] {len(materiales_data)} filas, columnas: {materiales_columns}")
            resultados['materiales'] = materiales_data
            resultados['materiales_columns'] = materiales_columns
        
        conn.close()

        if not proyecto_data:
            print("❌ [PROYECTO-DETALLE] Proyecto no encontrado")
            return jsonify(success=False, message="Proyecto no encontrado"), 404

        # Construir respuesta unificada
        detalle = construir_detalle_completo(resultados)
        
        print(f"✅ [PROYECTO-DETALLE] Datos preparados para {current_user}: {len(detalle.get('materiales', []))} materiales, {len(detalle.get('equipo', []))} equipo")
        return jsonify(success=True, data=detalle), 200

    except Exception as e:
        print(f"❌ [PROYECTO-DETALLE] ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500

def construir_detalle_completo(resultados):
    """Construye el detalle completo del proyecto desde múltiples resultsets"""
    try:
        # 1. DATOS BÁSICOS DEL PROYECTO
        proyecto_data = resultados.get('proyecto', [])
        proyecto_columns = resultados.get('proyecto_columns', [])
        
        if not proyecto_data:
            return {"error": "No se encontraron datos del proyecto"}
        
        first_row = proyecto_data[0]
        
        detalle = {
            # Datos básicos
            "id_proyecto": get_column_value(first_row, proyecto_columns, "id_proyecto"),
            "nombre": get_column_value(first_row, proyecto_columns, "nombre"),
            "descripcion": get_column_value(first_row, proyecto_columns, "descripcion", ""),
            "fecha_inicio": format_date(get_column_value(first_row, proyecto_columns, "fecha_inicio")),
            "fecha_fin": format_date(get_column_value(first_row, proyecto_columns, "fecha_fin")),
            "estado": get_column_value(first_row, proyecto_columns, "estado"),
            "presupuesto": float(get_column_value(first_row, proyecto_columns, "presupuesto")) if get_column_value(first_row, proyecto_columns, "presupuesto") else None,
            "id_ciudad": get_column_value(first_row, proyecto_columns, "id_ciudad"),
            "id_cliente": get_column_value(first_row, proyecto_columns, "id_cliente"),
            "nombre_ciudad": get_column_value(first_row, proyecto_columns, "ciudad"),  # IMPORTANTE: nombre que espera el frontend
            "departamento": get_column_value(first_row, proyecto_columns, "departamento"),
            "nombre_cliente": get_column_value(first_row, proyecto_columns, "cliente"),  # IMPORTANTE: nombre que espera el frontend
            "email_cliente": get_column_value(first_row, proyecto_columns, "cliente_email"),
            "telefono_cliente": get_column_value(first_row, proyecto_columns, "cliente_telefono"),
            "direccion_cliente": get_column_value(first_row, proyecto_columns, "cliente_direccion"),
            
            # Arrays que espera el frontend
            "equipo": [],
            "materiales": []
        }
        
        # 2. EQUIPO - ESTRUCTURA QUE ESPERA EL FRONTEND
        equipo_data = resultados.get('equipo', [])
        equipo_columns = resultados.get('equipo_columns', [])
        
        for row in equipo_data:
            # ESTRUCTURA: { id_usuario, id_estado, rol } - como espera el frontend
            equipo_member = {
                "id_usuario": get_column_value(row, equipo_columns, "id_usuario"),
                "id_estado": get_column_value(row, equipo_columns, "id_estado", 1),
                "rol": get_column_value(row, equipo_columns, "rol", "")
            }
            
            # Solo agregar si tiene id_usuario válido
            if equipo_member["id_usuario"]:
                # Evitar duplicados
                if not any(e["id_usuario"] == equipo_member["id_usuario"] for e in detalle["equipo"]):
                    detalle["equipo"].append(equipo_member)
        
        # 3. MATERIALES - ESTRUCTURA QUE ESPERA EL FRONTEND  
        materiales_data = resultados.get('materiales', [])
        materiales_columns = resultados.get('materiales_columns', [])
        
        materiales_vistos = set()  # Para evitar duplicados
        
        for row in materiales_data:
            material_id = get_column_value(row, materiales_columns, "id_material")
            
            # Solo procesar si tiene id_material válido y no es duplicado
            if material_id and material_id not in materiales_vistos:
                materiales_vistos.add(material_id)
                
                material = {
                    "id_material": material_id,
                    "cantidad": float(get_column_value(row, materiales_columns, "cantidad", 0)),
                    "unidad": get_column_value(row, materiales_columns, "unidad", "unidades"),
                    "costo_unitario": float(get_column_value(row, materiales_columns, "costo_unitario", 0)),
                    "nombre_etapa": get_column_value(row, materiales_columns, "nombre_etapa", "")
                }
                
                detalle["materiales"].append(material)
        
        print(f"✅ [CONSTRUIR-DETALLE] Proyecto {detalle['id_proyecto']}: {len(detalle['materiales'])} materiales únicos")
        return detalle
        
    except Exception as e:
        print(f"❌ [CONSTRUIR-DETALLE] ERROR: {str(e)}")
        print(traceback.format_exc())
        return {"error": "No se pudo construir el detalle"}

def get_column_value(row, columns, column_name, default=None):
    """Obtiene el valor de una columna por nombre de manera segura"""
    try:
        if column_name in columns:
            index = columns.index(column_name)
            return row[index] if row[index] is not None else default
        return default
    except:
        return default

def format_date(date_value):
    """Formatea fecha a string YYYY-MM-DD"""
    try:
        if date_value and hasattr(date_value, 'strftime'):
            return date_value.strftime('%Y-%m-%d')
        return date_value
    except:
        return date_value

# -------------------------
# DEBUG: VER ESTRUCTURA DEL SP - SOLO ADMIN
# -------------------------
@projects_bp.route("/<int:proyecto_id>/debug", methods=["GET"])
@token_required
@role_required(['Administrador'])
def debug_proyecto_detalle(current_user, proyecto_id):
    """Endpoint temporal para debuggear qué devuelve el SP - SOLO ADMINISTRADORES"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"🔍 [DEBUG] Ejecutando SP para proyecto {proyecto_id} por {current_user}")
        cursor.execute("EXEC sp_ObtenerProyectoDetalle @id_proyecto=?", (proyecto_id,))
        
        # Procesar todos los resultsets
        resultsets = []
        resultset_count = 0
        
        while True:
            rows = cursor.fetchall()
            columns = [col[0] for col in cursor.description] if cursor.description else []
            
            resultsets.append({
                "resultset": resultset_count,
                "row_count": len(rows),
                "columns": columns,
                "first_row": str(rows[0]) if rows else None,
                "all_rows_sample": [str(row) for row in rows[:2]] if len(rows) > 2 else [str(row) for row in rows]
            })
            
            resultset_count += 1
            
            if not cursor.nextset():
                break
        
        conn.close()
        
        print(f"✅ [DEBUG] Encontrados {len(resultsets)} resultsets para {current_user}")
        return jsonify(success=True, data=resultsets), 200
        
    except Exception as e:
        print(f"❌ [DEBUG] ERROR: {str(e)}")
        return jsonify(success=False, message=str(e)), 500

# -------------------------
# LISTAR CLIENTES - SOLO ADMIN
# -------------------------
@projects_bp.route("/clientes", methods=["GET"])
@token_required
@role_required(['Administrador'])
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
        print(f"✅ {len(clientes)} clientes listados por {current_user}")
        return jsonify(success=True, data=clientes), 200

    except Exception:
        current_app.logger.error("Error listando clientes:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR CIUDADES - SOLO ADMIN
# -------------------------
@projects_bp.route("/ciudades", methods=["GET"])
@token_required
@role_required(['Administrador'])
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
        print(f"✅ {len(ciudades)} ciudades listadas por {current_user}")
        return jsonify(success=True, data=ciudades), 200

    except Exception:
        current_app.logger.error("Error listando ciudades:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# -------------------------
# LISTAR DEPARTAMENTOS - SOLO ADMIN
# -------------------------
@projects_bp.route("/departamentos", methods=["GET"])
@token_required
@role_required(['Administrador'])
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
        print(f"✅ {len(departamentos)} departamentos listados por {current_user}")
        return jsonify(success=True, data=departamentos), 200

    except Exception:
        current_app.logger.error("Error listando departamentos:\n%s", traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500