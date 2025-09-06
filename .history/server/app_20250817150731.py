
from flask import Flask
from flask_cors import CORS

# Importar blueprints
from modules.login.routes import login_bp
from modules.materials.routes import materials_bp
from modules.users.routes import users_bp
from modules.projects.routes import projects_bp
from modules.notifications.routes import notifications_bp

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
