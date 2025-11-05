import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

# Carpeta de evidencia al mismo nivel que load
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

# Función para obtener token JWT vía login
def get_token():
    login_url = f"{BASE_URL}/login"
    data = {"username": TEST_USER, "password": TEST_PASS}
    response = requests.post(login_url, json=data)
    if response.status_code != 200:
        raise Exception(f"No se pudo obtener token. Status: {response.status_code}, Response: {response.text}")
    token = response.json().get("token")
    if not token:
        raise Exception("Token no recibido en la respuesta de login.")
    return token

TOKEN = get_token()
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Función que hace la solicitud a un endpoint
def request_endpoint(endpoint):
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        return {
            "url": url,
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "response_time": response.elapsed.total_seconds()
        }
    except Exception as e:
        return {"url": url, "status_code": None, "success": False, "error": str(e)}

# Función de carga progresiva
def progressive_load(endpoint, steps=[5, 8, 10, 15, 20]):
    results_all = []
    for threads in steps:
        print(f"\nEnviando {threads} solicitudes concurrentes a {endpoint}")
        results = []
        with ThreadPoolExecutor(max_workers=threads) as executor:
            futures = [executor.submit(request_endpoint, endpoint) for _ in range(threads)]
            for future in as_completed(futures):
                results.append(future.result())

        total = len(results)
        success = sum(1 for r in results if r["success"])
        failures = total - success
        avg_response = sum(r.get("response_time", 0) for r in results) / total

        print(f"Éxitos: {success}, Fallos: {failures}, Tiempo promedio: {avg_response:.2f}s")

        # Guardar evidencia
        filename = f"{endpoint.strip('/').replace('/', '_')}_load_{threads}_threads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        path = os.path.join(EVIDENCE_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        results_all.append({
            "threads": threads,
            "total": total,
            "success": success,
            "failures": failures,
            "avg_response": avg_response
        })

        if failures / total > 0.3:
            print("Se alcanzó límite de resistencia del aplicativo, deteniendo prueba.")
            break

    # Guardar resumen final
    summary_file = os.path.join(EVIDENCE_DIR, f"{endpoint.strip('/').replace('/', '_')}_load_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results_all, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Prueba de carga completa para {endpoint}, resumen guardado en evidence.")

if __name__ == "__main__":
    # Endpoints correctos según app.py y Selenium
    endpoints = [
        "/projects",
        "/materials",
        "/schedule",
        "/inventory",
        "/stages",       # reemplaza /etapas por /stages
        "/usuarios",
        "/config",
        "/reports",
        "/my-tasks",
        "/progress",
        "/auth",
        "/api/notifications",
    ]

    steps = [5, 8, 10, 15, 20]  # carga progresiva inicial suave

    for ep in endpoints:
        progressive_load(ep, steps)
