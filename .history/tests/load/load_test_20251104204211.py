import requests
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")
EVIDENCE_DIR = os.path.join("tests", "evidence")  # Carpeta común con las pruebas de integración
os.makedirs(EVIDENCE_DIR, exist_ok=True)

# Obtener token JWT
def get_token():
    login_url = f"{BASE_URL}/login"
    data = {"username": TEST_USER, "password": TEST_PASS}
    response = requests.post(login_url, json=data)
    response.raise_for_status()
    token = response.json().get("token")
    if not token:
        raise Exception("No se obtuvo token del login")
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
def progressive_load(endpoint="/projects", max_threads=500, step=50):
    """
    Incrementa la cantidad de solicitudes concurrentes hasta que el aplicativo falle.
    Guarda evidencia de cada bloque de carga en tests/evidence.
    """
    current_threads = step
    results_all = []

    while current_threads <= max_threads:
        print(f"\nEnviando {current_threads} solicitudes concurrentes a {endpoint}")
        results = []
        with ThreadPoolExecutor(max_workers=current_threads) as executor:
            futures = [executor.submit(request_endpoint, endpoint) for _ in range(current_threads)]
            for future in as_completed(futures):
                results.append(future.result())

        total = len(results)
        success = sum(1 for r in results if r.get("success"))
        failures = total - success
        avg_response = sum(r.get("response_time", 0) for r in results) / total

        print(f"Éxitos: {success}, Fallos: {failures}, Tiempo promedio: {avg_response:.2f}s")

        # Guardar evidencia de este bloque
        filename = f"{endpoint.strip('/').replace('/', '_')}_load_{current_threads}_threads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        path = os.path.join(EVIDENCE_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        results_all.append({
            "threads": current_threads,
            "total": total,
            "success": success,
            "failures": failures,
            "avg_response": avg_response
        })

        # Si los fallos superan el 30%, detenemos la prueba
        if failures / total > 0.3:
            print("Se alcanzó límite de resistencia del aplicativo, deteniendo prueba.")
            break

        current_threads += step

    # Guardar resumen final en tests/evidence
    summary_file = os.path.join(EVIDENCE_DIR, f"{endpoint.strip('/').replace('/', '_')}_load_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results_all, f, indent=2, ensure_ascii=False)
    print("\nPrueba de carga completa. Resumen guardado en tests/evidence.")

if __name__ == "__main__":
    progressive_load(endpoint="/projects", max_threads=500, step=50)
