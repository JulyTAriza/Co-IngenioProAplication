from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
import traceback

from database import get_db_connection
import config

inventory_bp = Blueprint("inventory", __name__)

# ---------------------------
# DECORADOR: TOKEN JWT
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
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


@inventory_bp.after_request
def add_cors_headers(response):
    """Agregar headers CORS a TODAS las respuestas"""
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


# ---------------------------
# RESUMEN GENERAL DE INVENTARIO
# ---------------------------
@inventory_bp.route("/summary", methods=["GET", "OPTIONS"])
@token_required
def get_inventory_summary(current_user):
    """
    Retorna resumen general del inventario
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total de materiales
        cursor.execute("SELECT COUNT(*) FROM Materiales")
        total_materials = cursor.fetchone()[0] or 0
        
        # Valor total del inventario
        cursor.execute("""
            SELECT SUM(cantidad * precio_unitario) 
            FROM Materiales 
            WHERE precio_unitario IS NOT NULL
        """)
        total_value = cursor.fetchone()[0] or 0
        
        # Materiales con stock bajo (menos de 10 unidades)
        cursor.execute("""
            SELECT COUNT(*) FROM Materiales WHERE cantidad < 10
        """)
        low_stock_count = cursor.fetchone()[0] or 0
        
        # Materiales sin stock
        cursor.execute("""
            SELECT COUNT(*) FROM Materiales WHERE cantidad = 0
        """)
        out_of_stock = cursor.fetchone()[0] or 0
        
        conn.close()
        
        summary = {
            "totalMaterials": total_materials,
            "totalValue": round(total_value, 2),
            "lowStockCount": low_stock_count,
            "outOfStock": out_of_stock
        }
        
        print(f"✅ Resumen de inventario calculado")
        return jsonify(success=True, data=summary), 200

    except Exception as e:
        print(f"❌ ERROR en get_inventory_summary: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# ALERTAS DE STOCK BAJO
# ---------------------------
@inventory_bp.route("/alerts", methods=["GET", "OPTIONS"])
@token_required
def get_stock_alerts(current_user):
    """
    Retorna materiales con stock bajo o agotado
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Materiales con stock bajo o agotado
        cursor.execute("""
            SELECT id, nombre, descripcion, cantidad, precio_unitario
            FROM Materiales
            WHERE cantidad <= 10
            ORDER BY cantidad ASC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        alerts = []
        for r in rows:
            alert_level = "critical" if r[3] == 0 else "warning" if r[3] <= 5 else "info"
            
            alerts.append({
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "currentStock": r[3],
                "unitPrice": float(r[4]) if r[4] else 0,
                "alertLevel": alert_level,
                "message": f"Stock {'agotado' if r[3] == 0 else 'bajo'}: {r[3]} unidades"
            })
        
        print(f"✅ {len(alerts)} alertas de stock")
        return jsonify(success=True, data=alerts), 200

    except Exception as e:
        print(f"❌ ERROR en get_stock_alerts: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# CONSUMO DE MATERIALES POR PROYECTO
# ---------------------------
@inventory_bp.route("/consumption/projects", methods=["GET", "OPTIONS"])
@token_required
def get_materials_consumption_by_project(current_user):
    """
    Retorna consumo ESTIMADO de materiales por proyecto
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Consumo estimado desde materiales_etapa
        cursor.execute("""
            SELECT 
                p.id_proyecto,
                p.nombre_proyecto,
                m.id,
                m.nombre AS material_nombre,
                SUM(me.cantidad) as cantidad_estimada,
                me.costo_unitario,
                SUM(me.costo_unitario * me.cantidad) as costo_total
            FROM proyectos p
            INNER JOIN etapas_proyecto e ON p.id_proyecto = e.id_proyecto
            INNER JOIN materiales_etapa me ON e.id_etapa = me.id_etapa
            INNER JOIN Materiales m ON me.id_material = m.id
            GROUP BY p.id_proyecto, p.nombre_proyecto, m.id, m.nombre, me.costo_unitario
            ORDER BY p.nombre_proyecto, cantidad_estimada DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        # Agrupar por proyecto
        projects_dict = {}
        for r in rows:
            project_id = r[0]
            project_name = r[1]
            
            if project_id not in projects_dict:
                projects_dict[project_id] = {
                    "projectId": project_id,
                    "projectName": project_name,
                    "materials": [],
                    "totalCost": 0
                }
            
            material = {
                "materialId": r[2],
                "name": r[3],
                "estimatedQuantity": r[4] or 0,
                "unitCost": float(r[5]) if r[5] else 0,
                "totalCost": float(r[6]) if r[6] else 0
            }
            
            projects_dict[project_id]["materials"].append(material)
            projects_dict[project_id]["totalCost"] += material["totalCost"]
        
        projects = list(projects_dict.values())
        
        print(f"✅ Consumo de {len(projects)} proyectos calculado")
        return jsonify(success=True, data=projects), 200

    except Exception as e:
        print(f"❌ ERROR en get_materials_consumption_by_project: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# TOP MATERIALES MÁS USADOS
# ---------------------------
@inventory_bp.route("/top-used", methods=["GET", "OPTIONS"])
@token_required
def get_top_used_materials(current_user):
    """
    Retorna los materiales más utilizados en proyectos
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                m.id,
                m.nombre,
                m.cantidad as stock_actual,
                COALESCE(SUM(me.cantidad), 0) as cantidad_usada,
                COUNT(DISTINCT e.id_proyecto) as proyectos_usado,
                m.precio_unitario
            FROM Materiales m
            LEFT JOIN materiales_etapa me ON m.id = me.id_material
            LEFT JOIN etapas_proyecto e ON me.id_etapa = e.id_etapa
            GROUP BY m.id, m.nombre, m.cantidad, m.precio_unitario
            HAVING cantidad_usada > 0
            ORDER BY cantidad_usada DESC
            LIMIT 10
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        top_materials = []
        for r in rows:
            total_value = (r[3] or 0) * (float(r[5]) if r[5] else 0)
            top_materials.append({
                "id": r[0],
                "name": r[1],
                "currentStock": r[2],
                "totalUsed": r[3] or 0,
                "projectsUsed": r[4] or 0,
                "unitPrice": float(r[5]) if r[5] else 0,
                "totalValue": round(total_value, 2)
            })
        
        print(f"✅ Top {len(top_materials)} materiales más usados")
        return jsonify(success=True, data=top_materials), 200

    except Exception as e:
        print(f"❌ ERROR en get_top_used_materials: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# VALORIZACIÓN DE INVENTARIO
# ---------------------------
@inventory_bp.route("/valuation", methods=["GET", "OPTIONS"])
@token_required
def get_inventory_valuation(current_user):
    """
    Retorna valorización del inventario por material
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                id,
                nombre,
                cantidad,
                precio_unitario,
                cantidad * precio_unitario as valor_total
            FROM Materiales
            WHERE precio_unitario IS NOT NULL AND cantidad > 0
            ORDER BY valor_total DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        valuation = []
        total_value = 0
        
        for r in rows:
            item_value = float(r[4])
            total_value += item_value
            
            valuation.append({
                "id": r[0],
                "name": r[1],
                "quantity": r[2],
                "unitPrice": float(r[3]),
                "totalValue": item_value,
                "percentage": 0  # Calcular después
            })
        
        # Calcular porcentajes
        for item in valuation:
            item["percentage"] = round((item["totalValue"] / total_value * 100), 2) if total_value > 0 else 0
        
        print(f"✅ Valorización de {len(valuation)} materiales")
        return jsonify(success=True, data={
            "items": valuation,
            "totalValue": round(total_value, 2)
        }), 200

    except Exception as e:
        print(f"❌ ERROR en get_inventory_valuation: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# DETALLE DE MATERIAL ESPECÍFICO
# ---------------------------
@inventory_bp.route("/materials/<int:material_id>/detail", methods=["GET", "OPTIONS"])
@token_required
def get_material_detail(current_user, material_id):
    """
    Retorna detalle completo de un material (stock, uso, proyectos)
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Info básica del material
        cursor.execute("""
            SELECT id, nombre, descripcion, cantidad, precio_unitario
            FROM Materiales
            WHERE id = ?
        """, (material_id,))
        
        material_row = cursor.fetchone()
        
        if not material_row:
            conn.close()
            return jsonify(success=False, message="Material no encontrado"), 404
        
        # Proyectos donde se usa
        cursor.execute("""
            SELECT DISTINCT
                p.id_proyecto,
                p.nombre_proyecto,
                e.nombre_etapa,
                SUM(me.cantidad) as cantidad_usada,
                SUM(me.costo_unitario * me.cantidad) as costo_total
            FROM materiales_etapa me
            INNER JOIN etapas_proyecto e ON me.id_etapa = e.id_etapa
            INNER JOIN proyectos p ON e.id_proyecto = p.id_proyecto
            WHERE me.id_material = ?
            GROUP BY p.id_proyecto, p.nombre_proyecto, e.nombre_etapa
            ORDER BY p.nombre_proyecto, cantidad_usada DESC
        """, (material_id,))
        
        projects = []
        for r in cursor.fetchall():
            projects.append({
                "projectId": r[0],
                "projectName": r[1],
                "stageName": r[2],
                "quantityUsed": r[3],
                "totalCost": float(r[4]) if r[4] else 0
            })
        
        conn.close()
        
        total_used = sum(p["quantityUsed"] for p in projects)
        total_cost = sum(p["totalCost"] for p in projects)
        
        detail = {
            "material": {
                "id": material_row[0],
                "name": material_row[1],
                "description": material_row[2],
                "currentStock": material_row[3],
                "unitPrice": float(material_row[4]) if material_row[4] else 0,
                "totalValue": material_row[3] * (float(material_row[4]) if material_row[4] else 0)
            },
            "usage": {
                "totalUsed": total_used,
                "totalProjects": len(set(p["projectId"] for p in projects)),
                "totalCost": round(total_cost, 2),
                "projects": projects
            }
        }
        
        print(f"✅ Detalle de material {material_id}")
        return jsonify(success=True, data=detail), 200

    except Exception as e:
        print(f"❌ ERROR en get_material_detail: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500


# ---------------------------
# COMPARACIÓN STOCK ACTUAL VS ESTIMADO
# ---------------------------
@inventory_bp.route("/stock-comparison", methods=["GET", "OPTIONS"])
@token_required
def get_stock_comparison(current_user):
    """
    Compara stock actual vs cantidad estimada en proyectos activos
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'preflight ok'}), 200
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                m.id,
                m.nombre,
                m.cantidad as stock_actual,
                COALESCE(SUM(me.cantidad), 0) as cantidad_estimada,
                m.cantidad - COALESCE(SUM(me.cantidad), 0) as diferencia
            FROM Materiales m
            LEFT JOIN materiales_etapa me ON m.id = me.id_material
            LEFT JOIN etapas_proyecto e ON me.id_etapa = e.id_etapa
            LEFT JOIN proyectos p ON e.id_proyecto = p.id_proyecto
            WHERE p.estado = 'Activo' OR p.estado IS NULL
            GROUP BY m.id, m.nombre, m.cantidad
            HAVING cantidad_estimada > 0
            ORDER BY diferencia ASC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        comparison = []
        for r in rows:
            status = "sufficient" if r[4] >= 0 else "insufficient"
            
            comparison.append({
                "id": r[0],
                "name": r[1],
                "currentStock": r[2],
                "estimatedNeed": r[3],
                "difference": r[4],
                "status": status,
                "needsRestock": r[4] < 0
            })
        
        print(f"✅ Comparación de {len(comparison)} materiales")
        return jsonify(success=True, data=comparison), 200

    except Exception as e:
        print(f"❌ ERROR en get_stock_comparison: {str(e)}")
        print(traceback.format_exc())
        return jsonify(success=False, message="Error interno del servidor"), 500