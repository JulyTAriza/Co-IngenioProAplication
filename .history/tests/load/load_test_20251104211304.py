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
        self.session = requests.Session()
        self.token = None
        self.base_url = BASE_URL.rstrip("/")
    
    def get_token(self):
        """Obtiene token JWT del endpoint de login"""
        login_url = f"{self.base_url}/login"
        data = {"username": TEST_USER, "password": TEST_PASS}

        try:
            response = self.session.post(login_url, json=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                if token:
                    self.token = token
                    print(f"Token obtenido exitosamente")
                    return True
                else:
                    print(f"Login fallo: {result.get('message')}")
                    return False
            else:
                print(f"Error HTTP {response.status_code} en login: {response.text}")
                return False
        except Exception as e:
            print(f"Error en login: {str(e)}")
            return False
    
    def test_endpoint(self, endpoint, request_id=None):
        """Testea un endpoint con autenticacion"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.session.get(url, headers=headers, timeout=15)
            response_time = time.time() - start_time
            
            result = {
                "endpoint": endpoint,
                "url": url,
                "status_code": response.status_code,
                "success": response.status_code == 200,
                "response_time": response_time,
                "response_size": len(response.content),
                "has_valid_json": False,
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
    
    def verify_endpoints(self):
        """Verifica que endpoints estan funcionando"""
        print("Verificando endpoints...")
        
        endpoints_to_test = [
            "/projects",
            "/materials", 
            "/usuarios",
            "/schedule",
            "/config",
            "/reports",
            "/my-tasks",
            "/progress",
            "/inventory",
            "/etapas",
            "/auth/forgot-password",
            "/api/notifications",
        ]
        
        working_endpoints = []
        
        for endpoint in endpoints_to_test:
            result = self.test_endpoint(endpoint, "VERIFY")
            if result["success"]:
                working_endpoints.append(endpoint)
                print(f"ENDPOINT OK: {endpoint}")
            else:
                print(f"ENDPOINT FAIL: {endpoint} - Status: {result['status_code']}")
            
            time.sleep(0.5)
        
        return working_endpoints
    
    def run_load_test(self, endpoint, concurrent_users=[5, 10, 15, 20, 25]):
        """Ejecuta prueba de carga progresiva"""
        print(f"Iniciando prueba de carga para: {endpoint}")
        
        # Verificar que el endpoint funciona
        test_result = self.test_endpoint(endpoint, "TEST")
        if not test_result["success"]:
            print(f"Endpoint {endpoint} no funciona. Saltando prueba.")
            return None
        
        all_results = []
        
        for users in concurrent_users:
            print(f"Ejecutando {users} usuarios concurrentes...")
            
            results = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=users) as executor:
                future_to_id = {
                    executor.submit(self.test_endpoint, endpoint, i): i 
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
            filename = f"load_{endpoint_name}_{users}users_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            path = os.path.join(EVIDENCE_DIR, filename)
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "test_config": {
                        "endpoint": endpoint,
                        "concurrent_users": users,
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
            
            time.sleep(2)  # Pausa entre niveles
        
        # Guardar resumen
        summary_file = os.path.join(EVIDENCE_DIR, f"load_summary_{endpoint_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump({
                "endpoint": endpoint,
                "test_timestamp": datetime.now().isoformat(),
                "results": all_results
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Prueba de carga completada para {endpoint}")
        return all_results


def main():
    tester = BackendLoadTest()
    
    print("Iniciando pruebas de carga del backend")
    print(f"URL Base: {BASE_URL}")
    print(f"Usuario: {TEST_USER}")
    print(f"Directorio evidencia: {EVIDENCE_DIR}")
    
    # 1. Autenticacion
    print("\n1. Autenticacion")
    if not tester.get_token():
        print("Error: No se pudo autenticar. Abortando.")
        return
    
    # 2. Verificar endpoints
    print("\n2. Verificacion de endpoints")
    working_endpoints = tester.verify_endpoints()
    
    if not working_endpoints:
        print("Error: No hay endpoints funcionando. Abortando.")
        return
    
    print(f"\nEndpoints funcionando: {len(working_endpoints)}")
    for ep in working_endpoints:
        print(f"  - {ep}")
    
    # 3. Ejecutar pruebas de carga
    print("\n3. Pruebas de carga")
    print("=" * 50)
    
    # Configuracion de carga
    load_levels = [5, 10, 15, 20, 25]
    
    # Probar endpoints principales
    priority_endpoints = [ep for ep in working_endpoints if ep in ['/projects', '/materials', '/usuarios', '/']]
    
    for endpoint in priority_endpoints[:3]:  # Maximo 3 endpoints
        try:
            tester.run_load_test(endpoint, load_levels)
            time.sleep(3)
        except KeyboardInterrupt:
            print("Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f"Error en prueba para {endpoint}: {e}")
            continue
    
    print("\nPruebas de carga completadas")
    print(f"Resultados guardados en: {EVIDENCE_DIR}")


if __name__ == "__main__":
    main()