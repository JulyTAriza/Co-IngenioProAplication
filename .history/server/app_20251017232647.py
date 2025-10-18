
from flask import Flask
from flask_cors import CORS
from extensions import Mail
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
from modules.progress_monitoring import progress_bp


import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "server", "templates"))


# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)


# Configuración de correo desde .env
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS", "True") == "True"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("MAIL_DEFAULT_SENDER")

mail = Mail(app)

# -------------------------
# Scheduler para revisar notificaciones críticas
# -------------------------
def check_critical_notifications():
    try:
        print("Revisando notificaciones críticas...")
        # Llamamos al propio endpoint del backend
        requests.get("http://127.0.0.1:5000/api/notifications/check/critical")
    except Exception as e:
        print(f"Error en scheduler: {e}")

# Configurar el scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(check_critical_notifications, "interval", minutes=5)  # cada 5 min
scheduler.start()


# Configurar CORS para permitir solicitudes desde Next.js
CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
    supports_credentials=True
)


# Registrar Blueprints
app.register_blueprint(login_bp)  # /login
app.register_blueprint(materials_bp, url_prefix="/materials")
app.register_blueprint(users_bp, url_prefix="/usuarios")
app.register_blueprint(projects_bp, url_prefix="/projects")
app.register_blueprint(notifications_bp)  # /api/notifications
app.register_blueprint(register_bp)
app.register_blueprint(schedule_bp, url_prefix="/schedule") 
app.register_blueprint(settings_bp, url_prefix="/config")
app.register_blueprint(reports_bp, url_prefix="/reports")
app.register_blueprint(my_tasks_bp, url_prefix="/api/my-tasks")
app.register_blueprint(progress_bp, url_prefix="/api/progress")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
