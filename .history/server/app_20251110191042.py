from flask import Flask
from flask_cors import CORS
from extensions import Mail, redis_client
from dotenv import load_dotenv
import os
from apscheduler.schedulers.background import BackgroundScheduler
import requests


# Importar blueprints
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

import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "server", "templates"))

# Cargar variables de entorno
load_dotenv()

# Configuración de correo desde .env
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS", "True") == "True"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_DEFAULT_SENDER")

mail = Mail(app)
redis_client.init_app(app)

# -------------------------
# Scheduler para revisar notificaciones críticas
# -------------------------
def check_critical_notifications():
    try:
        print("Revisando notificaciones críticas...")
        
        # En producción, llamar directamente a la función sin HTTP
        if os.environ.get('RENDER'):
            from modules.notifications.routes import check_critical_notifications_logic
            check_critical_notifications_logic()
        else:
            # En desarrollo, usar localhost como antes
            requests.get("http://127.0.0.1:5000/api/notifications/check/critical")
            
    except Exception as e:
        print(f"Error en scheduler: {e}")

# Configurar el scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(check_critical_notifications, "interval", minutes=5)
scheduler.start()

@app.route('/')
def health_check():
    return {'status': 'healthy', 'message': 'Backend funcionando'}, 200

# Configurar CORS para permitir solicitudes desde Next.js
CORS(
    app,
    origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://co-ingeniopro.up.railway.app",
        "https://co-ingenioproaplication-frontend.onrender.com",
        "https://serveremail-production.up.railway.app"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)

# Registrar Blueprints
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

if __name__ == '__main__':
    port = 10000
    if os.environ.get('RENDER'):
        from waitress import serve
        serve(app, host='0.0.0.0', port=port)
    else:
        app.run(debug=False, host='0.0.0.0', port=port)