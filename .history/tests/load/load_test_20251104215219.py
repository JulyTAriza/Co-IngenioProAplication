import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time

load_dotenv()

# Configuracion
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
        """Obtiene un token JWT"""
        login_url = f"{self.base_url}/login"
        payload = {"username": TEST_USER, "password": TEST_PASS}

        try:
            response = requests.post(login_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    token = result.get("token")
                    if token and len(token) > 50 and token.count('.') == 2:
                        return token
                    else:
                        print(f"[ERROR] Token invalido: {token[:50] if token else 'None'}")
                        return None
                else:
                    print(f"[ERROR] Login fallo: {result.get('message')}")
                    return None
            else:
                print(f"[ERROR] HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"[ERROR] Excepcion en login: {str(e)}")
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
            # Construir headers
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            }
            
            # Debug para verificacion
            if request_id in ["VERIFY", "TEST"]:
                print(f"   [DEBUG] URL: {url}")
                print(f"   [DEBUG] Token: {token[:30]}...{token[-20:]}")
            
            # Hacer el request
            response = requests.get(url, headers=headers, timeout=15)
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
            
            # Procesar respuesta
            if response.status_code == 200:
                try:
                    data = response.json()
                    result["has_valid_json"] = True
                    if isinstance(data, list):
                        result["data_count"] = len(data)
                    elif isinstance(data, dict):
                        result["data_keys"] = list(data.keys())
                        if "data" in data and isinstance(data["data"], list):
                            result["data_count"] = len(data["data"])
                except:
                    result["has_valid_json"] = False
            else:
                try:
                    error_data = response.json()
                    result["error_message"] = error_data.get("message", "Sin mensaje")
                except:
                    result["error_message"] = response.text[:200]
            
            # Log del resultado
            if result["success"]:
                items = result.get("data_count", "?")
                print(f"   [OK] Request {request_id}: {response.status_code} - {response_time:.2f}s - {items} items")
            else:
                print(f"   [FAIL] Request {request_id}: {response.status_code} - {result.get('error_message', 'Error')}")
            
            return result
            
        except requests.exceptions.Timeout:
            print(f"   [TIMEOUT] Request {request_id}")
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
            print(f"   [ERROR] Request {request_id}: {str(e)}")
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
        print("\n" + "="*60)
        print("VERIFICANDO ENDPOINTS")
        print("="*60)
        
        # URLs con slash final para evitar redirects
        endpoints_to_test = [
            "/projects/",
            "/materials/", 
            "/usuarios/",
            "/my-tasks/"
        ]
        
        working_endpoints = []
        
        for endpoint in endpoints_to_test:
            print(f"\nProbando: {endpoint}")
            result = self.test_endpoint_with_new_token(endpoint, "VERIFY")
            
            if result["success"]:
                working_endpoints.append(endpoint)
                print(f"   [SUCCESS] Endpoint funciona correctamente")
            else:
                print(f"   [FAIL] Status: {result.get('status_code', 'N/A')}")
                if 'error_message' in result:
                    print(f"   [INFO] Mensaje: {result['error_message']}")
            
            time.sleep(0.5)
        
        return working_endpoints
    
    def run_load_test_individual_tokens(self, endpoint, concurrent_users=[3, 5, 8, 10, 50, 100, 500]):
        """Ejecuta prueba de carga con token individual por usuario"""
        print("\n" + "="*60)
        print(f"PRUEBA DE CARGA: {endpoint}")
        print("="*60)
        print(f"Estrategia: Token unico por request (simula usuarios reales)")
        
        # Verificar que el endpoint funciona
        print(f"\nTest previo del endpoint...")
        test_result = self.test_endpoint_with_new_token(endpoint, "TEST")
        if not test_result["success"]:
            print(f"[ERROR] Endpoint no responde. Abortando prueba.")
            return None
        
        print(f"[OK] Endpoint verificado. Iniciando prueba de carga...\n")
        
        all_results = []
        
        for users in concurrent_users:
            print(f"\n{'-'*60}")
            print(f"NIVEL: {users} usuarios concurrentes")
            print(f"{'-'*60}")
            
            results = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=min(users, 100)) as executor:
                future_to_id = {
                    executor.submit(self.test_endpoint_with_new_token, endpoint, i): i 
                    for i in range(users)
                }
                
                completed = 0
                for future in as_completed(future_to_id):
                    results.append(future.result())
                    completed += 1
                    if completed % 10 == 0:
                        print(f"   [PROGRESS] {completed}/{users} requests completados...")
            
            total_time = time.time() - start_time
            
            # Calcular metricas
            total_requests = len(results)
            successful_requests = sum(1 for r in results if r["success"])
            failed_requests = total_requests - successful_requests
            avg_response_time = sum(r.get("response_time", 0) for r in results) / total_requests if results else 0
            failure_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0
            
            # Calcular percentiles
            response_times = [r.get("response_time", 0) for r in results if r.get("response_time")]
            response_times.sort()
            if response_times:
                p50 = response_times[int(len(response_times) * 0.50)]
                p90 = response_times[int(len(response_times) * 0.90)]
                p95 = response_times[int(len(response_times) * 0.95)]
                p99 = response_times[int(len(response_times) * 0.99)] if len(response_times) > 1 else p95
                min_time = min(response_times)
                max_time = max(response_times)
            else:
                p50 = p90 = p95 = p99 = min_time = max_time = 0
            
            # Throughput
            requests_per_second = total_requests / total_time if total_time > 0 else 0
            
            print(f"\nRESULTADOS:")
            print(f"   Exitosos:       {successful_requests}/{total_requests} ({100-failure_rate:.1f}%)")
            print(f"   Fallidos:       {failed_requests}/{total_requests} ({failure_rate:.1f}%)")
            print(f"   Tiempos:")
            print(f"      Promedio:    {avg_response_time:.2f}s")
            print(f"      Minimo:      {min_time:.2f}s")
            print(f"      Maximo:      {max_time:.2f}s")
            print(f"   Percentiles:")
            print(f"      P50 (mediana): {p50:.2f}s")
            print(f"      P90:           {p90:.2f}s")
            print(f"      P95:           {p95:.2f}s")
            print(f"      P99:           {p99:.2f}s")
            print(f"   Throughput:     {requests_per_second:.2f} req/s")
            print(f"   Duracion total: {total_time:.2f}s")
            
            # Guardar evidencia detallada
            endpoint_name = endpoint.strip('/').replace('/', '_') or 'root'
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"load_{endpoint_name}_{users}users_{timestamp}.json"
            path = os.path.join(EVIDENCE_DIR, filename)
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "test_config": {
                        "endpoint": endpoint,
                        "concurrent_users": users,
                        "token_strategy": "individual_per_request",
                        "timestamp": datetime.now().isoformat(),
                        "base_url": self.base_url
                    },
                    "metrics": {
                        "total_requests": total_requests,
                        "successful_requests": successful_requests,
                        "failed_requests": failed_requests,
                        "success_rate": 100 - failure_rate,
                        "failure_rate": failure_rate,
                        "avg_response_time": avg_response_time,
                        "min_response_time": min_time,
                        "max_response_time": max_time,
                        "p50_response_time": p50,
                        "p90_response_time": p90,
                        "p95_response_time": p95,
                        "p99_response_time": p99,
                        "total_test_time": total_time,
                        "requests_per_second": requests_per_second
                    },
                    "detailed_results": results
                }, f, indent=2, ensure_ascii=False)
            
            print(f"   [SAVED] Evidencia guardada: {filename}")
            
            all_results.append({
                "concurrent_users": users,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": 100 - failure_rate,
                "failure_rate": failure_rate,
                "avg_response_time": avg_response_time,
                "min_response_time": min_time,
                "max_response_time": max_time,
                "p50_response_time": p50,
                "p90_response_time": p90,
                "p95_response_time": p95,
                "p99_response_time": p99,
                "requests_per_second": requests_per_second,
                "total_test_time": total_time
            })
            
            # Detener si tasa de fallos es muy alta
            if failure_rate > 50:
                print(f"\n[WARNING] Tasa de fallos {failure_rate:.1f}% > 50%")
                print(f"[WARNING] Deteniendo prueba para proteger el servidor.")
                break
            
            # Pausa entre niveles
            if users != concurrent_users[-1]:
                wait_time = 5
                print(f"\n[INFO] Esperando {wait_time}s antes del siguiente nivel...")
                time.sleep(wait_time)
        
        # Guardar resumen
        summary_file = os.path.join(EVIDENCE_DIR, f"summary_{endpoint_name}_{timestamp}.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump({
                "endpoint": endpoint,
                "test_timestamp": datetime.now().isoformat(),
                "token_strategy": "individual_per_request",
                "base_url": self.base_url,
                "results_by_load": all_results,
                "summary": {
                    "total_tests": len(all_results),
                    "load_levels": [r["concurrent_users"] for r in all_results],
                    "overall_success_rate": sum(r["success_rate"] for r in all_results) / len(all_results) if all_results else 0,
                    "avg_throughput": sum(r["requests_per_second"] for r in all_results) / len(all_results) if all_results else 0
                }
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n[OK] Prueba completada para {endpoint}")
        print(f"[OK] Resumen guardado: {summary_file}")
        
        return all_results


def main():
    tester = BackendLoadTest()
    
    print("\n" + "="*60)
    print("PRUEBAS DE CARGA - BACKEND CO-INGENIOPRO")
    print("="*60)
    print(f"URL Base:       {BASE_URL}")
    print(f"Usuario:        {TEST_USER}")
    print(f"Evidencia:      {EVIDENCE_DIR}")
    print(f"Estrategia:     Token unico por request")
    print(f"Fecha:          {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # 1. Verificar endpoints
    working_endpoints = tester.verify_endpoints_with_individual_tokens()
    
    if not working_endpoints:
        print("\n[ERROR] Ningun endpoint esta funcionando.")
        print("\n[INFO] POSIBLES CAUSAS:")
        print("   1. El servidor backend no esta disponible")
        print("   2. Las credenciales en .env son incorrectas")
        print("   3. Los endpoints cambiaron sus rutas")
        print("\n[INFO] SOLUCION:")
        print("   - Verifica que el servidor este activo")
        print("   - Revisa las credenciales TEST_USER y TEST_PASS")
        print("   - Confirma las rutas en app.py del backend")
        return
    
    print(f"\n[OK] Endpoints funcionando: {len(working_endpoints)}")
    for ep in working_endpoints:
        print(f"   - {ep}")
    
    # 2. Ejecutar pruebas de carga
    print("\n" + "="*60)
    print("INICIANDO PRUEBAS DE CARGA")
    print("="*60)
    
    # Configuracion de carga: progresion gradual de 3 a 500 usuarios
    load_levels = [3, 5, 8, 10, 50, 100, 500]
    
    # Probar TODOS los 4 endpoints
    for i, endpoint in enumerate(working_endpoints, 1):
        print(f"\n[{i}/{len(working_endpoints)}] Probando {endpoint}...")
        try:
            tester.run_load_test_individual_tokens(endpoint, load_levels)
            
            # Pausa entre endpoints
            if i < len(working_endpoints):
                print(f"\n[INFO] Pausa de 10s antes del siguiente endpoint...")
                time.sleep(10)
                
        except KeyboardInterrupt:
            print("\n\n[WARNING] Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f"\n[ERROR] Error en prueba para {endpoint}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Resumen final
    print("\n" + "="*60)
    print("PRUEBAS COMPLETADAS")
    print("="*60)
    print(f"Resultados guardados en: {EVIDENCE_DIR}")
    print(f"Endpoints probados: {len(working_endpoints)}")
    print(f"Niveles de carga: {load_levels}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()