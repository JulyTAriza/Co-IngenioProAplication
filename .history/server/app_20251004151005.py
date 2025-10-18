
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
    resources={r"/*": {"origins": "http://localhost:3000"}},  # Cambia al dominio de tu frontend en producción
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"]
)

# Registrar Blueprints
app.register_blueprint(login_bp)  # /login
app.register_blueprint(materials_bp, url_prefix="/materials")
app.register_blueprint(users_bp, url_prefix="/usuarios")
app.register_blueprint(projects_bp, url_prefix="/projects")
app.register_blueprint(notifications_bp)  # /api/notifications
app.register_blueprint(register_bp)
app.register_blueprint(schedule_bp)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
