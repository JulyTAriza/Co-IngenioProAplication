import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time
import sys

load_dotenv()

# Configuración
BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

# Directorio de evidencia
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


class BackendLoadTest:
    def __init__(self):
        self.base_url = BASE_URL.rstrip("/")
    
    def get_token(self):
        """Obtiene un NUEVO token JWT para cada usuario"""
        login_url = f"{self.base_url}/login"
        data = {"username": TEST_USER, "password": TEST_PASS}

        try:
            # Usar sesión nueva para cada token
            session = requests.Session()
            response = session.post(login_url, json=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                if token:
                    return token
                else:
                    print(f"Login fallo: {result.get('message')}")
                    return None
            else:
                print(f"Error HTTP {response.status_code} en login")
                return None
        except Exception as e:
            print(f"Error en login: {str(e)}")
            return None
    
    def test_endpoint_with_new_token(self, endpoint, request_id=None):
        """Testea un endpoint con un NUEVO token para cada request"""
        token = self.get_token()
        if not token:
            return {
                "endpoint": endpoint,
                "success": False,
                "error": "No se pudo obtener token",
                "timestamp": datetime.now().isoformat()
            }
        
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            # Usar sesión nueva para cada request
            session = requests.Session()
            headers = {"Authorization": f"Bearer {token}"}
            response = session.get(url, headers=headers, timeout=15)
            response_time = time.time() - start_time
            
            result = {
                "endpoint": endpoint,
                "url": url,
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response_time,
                "response_size": len(response.content),
                "has_valid_json": False,
                "token_used": f"{token[:10]}...",  # Solo para debug
                "timestamp": datetime.now().isoformat()
            }
            
            # Verificar respuesta JSON valida
            if response.status_code == 200:
                try:
                    data = response.json()
                    result["has_valid_json"] = True
                    if isinstance(data, list):
                        result["data_count"] = len(data)
                    elif isinstance(data, dict):
                        result["data_keys"] = list(data.keys())
                except:
                    result["has_valid_json"] = False
            
            # Log del resultado
            status = "SUCCESS" if result["success"] else "FAILED"
            print(f"Request {request_id}: {endpoint} - Status: {response.status_code} - Time: {response_time:.2f}s - {status}")
            
            return result
            
        except requests.exceptions.Timeout:
            print(f"Request {request_id}: {endpoint} - TIMEOUT")
            return {
                "endpoint": endpoint,
                "url": url,
                "status_code": None,
                "success": False,
                "error": "Timeout after 15 seconds",
                "response_time": 15.0,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Request {request_id}: {endpoint} - ERROR: {str(e)}")
            return {
                "endpoint": endpoint,
                "url": url,
                "status_code": None,
                "success": False,
                "error": str(e),
                "response_time": time.time() - start_time,
                "timestamp": datetime.now().isoformat()
            }
    
    def verify_endpoints_with_individual_tokens(self):
        """Verifica endpoints con tokens individuales"""
        print("Verificando endpoints con tokens individuales...")
        
        endpoints_to_test = [
            "/projects",
            "/materials", 
            "/usuarios",
            "/my-tasks"
        ]
        
        working_endpoints = []
        
        for endpoint in endpoints_to_test:
            # Usar token nuevo para cada verificación
            result = self.test_endpoint_with_new_token(endpoint, "VERIFY")
            if result["success"]:
                working_endpoints.append(endpoint)
                print(f"ENDPOINT OK: {endpoint}")
            else:
                print(f"ENDPOINT FAIL: {endpoint} - Status: {result['status_code']}")
            
            time.sleep(0.5)
        
        return working_endpoints
    
    def run_load_test_individual_tokens(self, endpoint, concurrent_users=[5, 10, 15, 20]):
        """Ejecuta prueba de carga con token individual por usuario"""
        print(f"Iniciando prueba de carga para: {endpoint}")
        print(f"NOTA: Cada request usará un token diferente")
        
        # Verificar que el endpoint funciona con token individual
        test_result = self.test_endpoint_with_new_token(endpoint, "TEST")
        if not test_result["success"]:
            print(f"Endpoint {endpoint} no funciona. Saltando prueba.")
            return None
        
        all_results = []
        
        for users in concurrent_users:
            print(f"Ejecutando {users} usuarios concurrentes (cada uno con token único)...")
            
            results = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=users) as executor:
                # Cada request obtiene su propio token
                future_to_id = {
                    executor.submit(self.test_endpoint_with_new_token, endpoint, i): i 
                    for i in range(users)
                }
                
                for future in as_completed(future_to_id):
                    results.append(future.result())
            
            total_time = time.time() - start_time
            
            # Calcular metricas
            total_requests = len(results)
            successful_requests = sum(1 for r in results if r["success"])
            failed_requests = total_requests - successful_requests
            avg_response_time = sum(r.get("response_time", 0) for r in results) / total_requests
            
            failure_rate = (failed_requests / total_requests) * 100
            
            # Calcular percentiles
            response_times = [r.get("response_time", 0) for r in results if r.get("response_time")]
            response_times.sort()
            if response_times:
                p90 = response_times[int(len(response_times) * 0.90)]
                p95 = response_times[int(len(response_times) * 0.95)]
            else:
                p90 = p95 = 0
            
            print(f"Resultados para {users} usuarios:")
            print(f"  Requests exitosos: {successful_requests}/{total_requests}")
            print(f"  Requests fallidos: {failed_requests}")
            print(f"  Tasa de fallos: {failure_rate:.1f}%")
            print(f"  Tiempo respuesta promedio: {avg_response_time:.2f}s")
            print(f"  P90: {p90:.2f}s, P95: {p95:.2f}s")
            print(f"  Tiempo total prueba: {total_time:.2f}s")
            
            # Guardar evidencia
            endpoint_name = endpoint.strip('/').replace('/', '_') or 'root'
            filename = f"load_individual_tokens_{endpoint_name}_{users}users_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            path = os.path.join(EVIDENCE_DIR, filename)
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "test_config": {
                        "endpoint": endpoint,
                        "concurrent_users": users,
                        "token_strategy": "individual_per_request",
                        "timestamp": datetime.now().isoformat()
                    },
                    "metrics": {
                        "total_requests": total_requests,
                        "successful_requests": successful_requests,
                        "failed_requests": failed_requests,
                        "failure_rate": failure_rate,
                        "avg_response_time": avg_response_time,
                        "p90_response_time": p90,
                        "p95_response_time": p95,
                        "total_test_time": total_time
                    },
                    "detailed_results": results
                }, f, indent=2, ensure_ascii=False)
            
            all_results.append({
                "concurrent_users": users,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "failure_rate": failure_rate,
                "avg_response_time": avg_response_time,
                "p90_response_time": p90,
                "p95_response_time": p95,
                "total_test_time": total_time
            })
            
            # Detener si tasa de fallos es muy alta
            if failure_rate > 50:
                print(f"ALERTA: Tasa de fallos {failure_rate:.1f}% > 50%. Deteniendo prueba.")
                break
            
            time.sleep(3)  # Pausa más larga entre niveles (para no saturar login)
        
        # Guardar resumen
        summary_file = os.path.join(EVIDENCE_DIR, f"load_summary_individual_tokens_{endpoint_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump({
                "endpoint": endpoint,
                "test_timestamp": datetime.now().isoformat(),
                "token_strategy": "individual_per_request",
                "results": all_results
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Prueba de carga completada para {endpoint}")
        return all_results


def main():
    tester = BackendLoadTest()
    
    print("INICIANDO PRUEBAS DE CARGA - TOKENS INDIVIDUALES")
    print(f"URL Base: {BASE_URL}")
    print(f"Usuario: {TEST_USER}")
    print(f"Directorio evidencia: {EVIDENCE_DIR}")
    print("NOTA: Cada request usará un token único (simula usuarios reales)")
    
    # 1. Verificar endpoints con tokens individuales
    print("\n1. VERIFICACION DE ENDPOINTS CON TOKENS INDIVIDUALES")
    working_endpoints = tester.verify_endpoints_with_individual_tokens()
    
    if not working_endpoints:
        print("Error: No hay endpoints funcionando. Abortando.")
        return
    
    print(f"\nEndpoints funcionando: {len(working_endpoints)}")
    for ep in working_endpoints:
        print(f"  - {ep}")
    
    # 2. Ejecutar pruebas de carga
    print("\n2. PRUEBAS DE CARGA CON TOKENS INDIVIDUALES")
    print("=" * 50)
    
    # Configuracion de carga más conservadora (por el costo de login)
    load_levels = [3, 5, 8, 10]  # Menos usuarios porque cada uno hace login
    
    # Probar endpoints principales
    for endpoint in working_endpoints[:2]:  # Máximo 2 endpoints para no saturar
        try:
            tester.run_load_test_individual_tokens(endpoint, load_levels)
            time.sleep(5)  # Pausa larga entre endpoints
        except KeyboardInterrupt:
            print("Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f"Error en prueba para {endpoint}: {e}")
            continue
    
    print("\nPRUEBAS DE CARGA COMPLETADAS")
    print(f"Resultados guardados en: {EVIDENCE_DIR}")


if __name__ == "__main__":
    main()