import pytest
import requests
import os
from dotenv import load_dotenv
from datetime import datetime
import json

# Cargar variables desde .env si existen
load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

EVIDENCE_DIR = os.path.join("tests", "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


@pytest.fixture(scope="session")
def get_token():
    """Obtiene el token JWT del endpoint de login."""
    login_url = f"{BASE_URL}/login"
    data = {"username": TEST_USER, "password": TEST_PASS}

    response = requests.post(login_url, json=data)
    assert response.status_code == 200, f" Error en login: {response.text}"

    try:
        token = response.json().get("token")
    except Exception:
        pytest.fail(" No se pudo leer JSON del login.")
    assert token, " No se recibió token en la respuesta."

    # Guardar token como evidencia
    with open(os.path.join(EVIDENCE_DIR, "integration_token.txt"), "w", encoding="utf-8") as f:
        f.write(token)

    return token


def save_evidence(endpoint, response):
    """Guarda JSON de respuesta como evidencia."""
    filename = endpoint.strip("/").replace("/", "_") or "root"
    path = os.path.join(EVIDENCE_DIR, f"{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

    try:
        data = response.json()
    except Exception:
        data = {"raw_text": response.text}

    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "url": response.url,
            "status_code": response.status_code,
            "data": data
        }, f, indent=2, ensure_ascii=False)


def test_health_check():
    """Verifica que el backend responda correctamente en /"""
    response = requests.get(BASE_URL)
    save_evidence("/", response)
    assert response.status_code == 200, "Health check no respondió 200"
    assert "healthy" in response.text.lower()


@pytest.mark.parametrize("endpoint", [
    "/projects",
    "/materials",
    "/schedule",
    "/inventory",
    "/etapas"
])
def test_protected_endpoints(get_token, endpoint):
    """Prueba endpoints protegidos con token válido."""
    headers = {"Authorization": f"Bearer {get_token}"}
    response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
    save_evidence(endpoint, response)

    assert response.status_code == 200, f"{endpoint} devolvió {response.status_code}"
    try:
        data = response.json()
        assert isinstance(data, (list, dict)), f" {endpoint} no devolvió JSON válido"
    except Exception:
        pytest.fail(f" {endpoint} devolvió algo no parseable.")


def test_invalid_token():
    """Verifica que un token inválido sea rechazado."""
    headers = {"Authorization": "Bearer invalidtoken123"}
    response = requests.get(f"{BASE_URL}/projects", headers=headers)
    save_evidence("invalid_token", response)
    assert response.status_code in [401, 403], "API no rechazó token inválido."


def test_no_token():
    """Verifica acceso sin token."""
    response = requests.get(f"{BASE_URL}/projects")
    save_evidence("no_token", response)
    assert response.status_code in [401, 403], "API permitió acceso sin token."
