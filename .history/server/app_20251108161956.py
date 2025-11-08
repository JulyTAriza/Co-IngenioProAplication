from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import Mail, redis_client
from dotenv import load_dotenv
import os
from apscheduler.schedulers.background import BackgroundScheduler
import requests
import logging
import traceback

# -------------------------
# 🔧 Configuración de logging global
# -------------------------
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] in %(module)s: %(message)s",
)
logger = logging.getLogger(__name__)

# -------------------------
# Importar blueprints
# -------------------------
from modules.login.routes import login_bp
from modules.materials.routes import materials_bp
from modules.users.routes import users_bp
from modules.projects.routes import projects_bp
from modules.notifications.routes import notifications_bp
from modules.register.routes import register_bp
from modules.schedule.routes import schedule_bp
from modules.settings.routes import settings_bp
from modules.reports.routes import reports_bp
from modules.my_task.routes import my_tasks_bp
from modules.progress_monitoring.routes import progress_bp
from modules.inventory.routes import inventory_bp
from modules.forgot.routes import auth_bp
from modules.stages.routes import etapas_proyecto_bp

# -------------------------
# Inicialización base
# -------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "server", "templates"))

# -------------------------
# Cargar variables de entorno
# -------------------------
load_dotenv()
logger.info("🌱 Variables de entorno cargadas correctamente.")

# -------------------------
# Configuración de correo
# -------------------------
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS", "True") == "True"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_DEFAULT_SENDER")

logger.debug(f"📧 Configuración de correo: {app.config['MAIL_SERVER']}:{app.config['MAIL_PORT']}")
mail = Mail(app)

# -------------------------
# Configuración Redis
# -------------------------
try:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    app.config["REDIS_URL"] = redis_url
    logger.info(f"🔗 URL de conexión Redis configurada: {redis_url}")

    redis_client.init_app(app)

    # Probar conexión
    redis_client.set("test_connection", "ok", ex=5)
    result = redis_client.get("test_connection")
    logger.info(f"✅ Redis conectado correctamente. Prueba: {result}")
except Exception as e:
    logger.error(f"❌ Error conectando a Redis: {e}")
    traceback.print_exc()

# -------------------------
# Scheduler para revisar notificaciones críticas
# -------------------------
def check_critical_notifications():
    try:
        logger.info("🔔 Revisando notificaciones críticas...")
        if os.environ.get('RENDER'):
            from modules.notifications.routes import check_critical_notifications_logic
            check_critical_notifications_logic()
        else:
            requests.get("http://127.0.0.1:5000/api/notifications/check/critical")
    except Exception as e:
        logger.error(f"⚠️ Error en scheduler: {e}")
        traceback.print_exc()

scheduler = BackgroundScheduler()
scheduler.add_job(check_critical_notifications, "interval", minutes=5)
scheduler.start()
logger.info("🕒 Scheduler iniciado correctamente.")

# -------------------------
# Health Check
# -------------------------
@app.route('/')
def health_check():
    logger.debug("Health check solicitado.")
    return {'status': 'healthy', 'message': 'Backend funcionando'}, 200

# -------------------------
# CONFIGURACIÓN CORS MEJORADA
# -------------------------

# Configuración principal de CORS
CORS(
    app,
    resources={r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://co-ingeniopro.up.railway.app",
            "https://co-ingenioproaplication-frontend.onrender.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "X-Requested-With",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Methods"
        ],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600  # Cache preflight por 10 minutos
    }}
)

# Manejo explícito de preflight OPTIONS
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({"status": "preflight"})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

# Headers CORS para todas las respuestas
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "https://co-ingeniopro.up.railway.app",
        "https://co-ingenioproaplication-frontend.onrender.com"
    ]
    
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    else:
        # Para requests sin Origin header (como curl)
        response.headers.add('Access-Control-Allow-Origin', '*')
    
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Max-Age', '600')
    return response

logger.info("🌐 CORS configurado correctamente con manejo explícito de preflight.")

# -------------------------
# Registrar Blueprints
# -------------------------
try:
    app.register_blueprint(login_bp)
    app.register_blueprint(materials_bp, url_prefix="/materials")
    app.register_blueprint(users_bp, url_prefix="/usuarios")
    app.register_blueprint(projects_bp, url_prefix="/projects")
    app.register_blueprint(notifications_bp)
    app.register_blueprint(register_bp)
    app.register_blueprint(schedule_bp, url_prefix="/schedule")
    app.register_blueprint(settings_bp, url_prefix="/config")
    app.register_blueprint(reports_bp, url_prefix="/reports")
    app.register_blueprint(my_tasks_bp, url_prefix="/my-tasks")
    app.register_blueprint(progress_bp, url_prefix="/progress")
    app.register_blueprint(inventory_bp, url_prefix="/inventory")
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(etapas_proyecto_bp, url_prefix="/etapas")
    logger.info("✅ Blueprints registrados correctamente.")
except Exception as e:
    logger.error(f"❌ Error registrando blueprints: {e}")
    traceback.print_exc()

# -------------------------
# Ruta específica para manejar preflight del login
# -------------------------
@app.route('/login', methods=['OPTIONS'])
@app.route('/api/login', methods=['OPTIONS'])
def login_preflight():
    response = jsonify({"status": "preflight_login"})
    response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response, 200

# -------------------------
# Manejo Global de Errores
# -------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    error_trace = traceback.format_exc()
    logger.error(f"❌ Error general atrapado: {e}\n{error_trace}")
    return jsonify({"success": False, "message": f"Error interno del servidor: {str(e)}"}), 500

# -------------------------
# Lanzamiento del servidor
# -------------------------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    if os.environ.get('RENDER'):
        from waitress import serve
        logger.info(f"🚀 Iniciando servidor en modo Render (Waitress) en puerto {port}")
        serve(app, host='0.0.0.0', port=port)
    else:
        logger.info(f"🚀 Iniciando servidor en modo local (Flask) en puerto {port}")
        app.run(debug=True, host='0.0.0.0', port=port)