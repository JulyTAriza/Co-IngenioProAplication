import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time

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
        self.session = None
    
    def get_token(self):
        """Obtiene un NUEVO token JWT para cada usuario"""
        login_url = f"{self.base_url}/login"
        payload = {"username": TEST_USER, "password": TEST_PASS}

        try:
            response = requests.post(
                login_url, 
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    token = result.get("token")
                    if token:
                        return token
                    else:
                        print(f"❌ Login exitoso pero sin token en respuesta")
                        return None
                else:
                    print(f"❌ Login falló: {result.get('message')}")
                    return None
            else:
                print(f"❌ Error HTTP {response.status_code} en login")
                print(f"   Respuesta: {response.text[:200]}")
                return None
                
        except Exception as e:
            print(f"❌ Excepción en login: {str(e)}")
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
            # Headers correctos con Bearer y el espacio
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # DEBUG: Verificar que el header se está enviando correctamente
            if request_id == "VERIFY" or request_id == "TEST":
                print(f"🔍 DEBUG Request {request_id}:")
                print(f"   URL: {url}")
                print(f"   Authorization header: Bearer {token[:20]}...{token[-10:]}")
                print(f"   Header completo tiene {len(f'Bearer {token}')} caracteres")
            
            response = requests.get(
                url, 
                headers=headers, 
                timeout=15
            )
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
            
            # Verificar respuesta JSON válida
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
            else:
                # Si falla, guardar el mensaje de error
                try:
                    error_data = response.json()
                    result["error_message"] = error_data.get("message", "Sin mensaje")
                except:
                    result["error_message"] = response.text[:200]
            
            # Log del resultado
            status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
            if result["success"]:
                print(f"Request {request_id}: {endpoint} - {response.status_code} - {response_time:.2f}s - {status}")
            else:
                print(f"Request {request_id}: {endpoint} - {response.status_code} - {status}")
                print(f"   Error: {result.get('error_message', 'Sin error')}")
            
            return result
            
        except requests.exceptions.Timeout:
            print(f"⏰ Request {request_id}: {endpoint} - TIMEOUT")
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
            print(f"💥 Request {request_id}: {endpoint} - ERROR: {str(e)}")
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
        print("🔍 VERIFICANDO ENDPOINTS")
        print("="*60)
        
        endpoints_to_test = [
            "/projects",
            "/materials", 
            "/usuarios",
            "/my-tasks"
        ]
        
        working_endpoints = []
        
        for endpoint in endpoints_to_test:
            print(f"\n📍 Probando: {endpoint}")
            result = self.test_endpoint_with_new_token(endpoint, "VERIFY")
            
            if result["success"]:
                working_endpoints.append(endpoint)
                print(f"   ✅ FUNCIONA")
            else:
                print(f"   ❌ FALLA - Status: {result.get('status_code', 'N/A')}")
                if 'error_message' in result:
                    print(f"   Mensaje: {result['error_message']}")
            
            time.sleep(0.5)
        
        return working_endpoints
    
    def run_load_test_individual_tokens(self, endpoint, concurrent_users=[5, 10, 15, 20]):
        """Ejecuta prueba de carga con token individual por usuario"""
        print("\n" + "="*60)
        print(f"🚀 PRUEBA DE CARGA: {endpoint}")
        print("="*60)
        print(f"Estrategia: Token único por request (simula usuarios reales)")
        
        # Verificar que el endpoint funciona
        print(f"\n🧪 Test previo del endpoint...")
        test_result = self.test_endpoint_with_new_token(endpoint, "TEST")
        if not test_result["success"]:
            print(f"❌ Endpoint {endpoint} no funciona. Abortando prueba.")
            return None
        
        print(f"✅ Endpoint verificado, iniciando prueba de carga...\n")
        
        all_results = []
        
        for users in concurrent_users:
            print(f"\n{'─'*60}")
            print(f"👥 NIVEL: {users} usuarios concurrentes")
            print(f"{'─'*60}")
            
            results = []
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=users) as executor:
                future_to_id = {
                    executor.submit(self.test_endpoint_with_new_token, endpoint, i): i 
                    for i in range(users)
                }
                
                for future in as_completed(future_to_id):
                    results.append(future.result())
            
            total_time = time.time() - start_time
            
            # Calcular métricas
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
            else:
                p50 = p90 = p95 = p99 = 0
            
            print(f"\n📊 RESULTADOS:")
            print(f"   ✅ Exitosos:  {successful_requests}/{total_requests} ({100-failure_rate:.1f}%)")
            print(f"   ❌ Fallidos:  {failed_requests}/{total_requests} ({failure_rate:.1f}%)")
            print(f"   ⏱️  Tiempo promedio: {avg_response_time:.2f}s")
            print(f"   📈 Percentiles:")
            print(f"      • P50 (mediana): {p50:.2f}s")
            print(f"      • P90: {p90:.2f}s")
            print(f"      • P95: {p95:.2f}s")
            print(f"      • P99: {p99:.2f}s")
            print(f"   ⏲️  Duración total: {total_time:.2f}s")
            
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
                        "p50_response_time": p50,
                        "p90_response_time": p90,
                        "p95_response_time": p95,
                        "p99_response_time": p99,
                        "total_test_time": total_time,
                        "requests_per_second": total_requests / total_time if total_time > 0 else 0
                    },
                    "detailed_results": results
                }, f, indent=2, ensure_ascii=False)
            
            print(f"   💾 Evidencia guardada: {filename}")
            
            all_results.append({
                "concurrent_users": users,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": 100 - failure_rate,
                "failure_rate": failure_rate,
                "avg_response_time": avg_response_time,
                "p50_response_time": p50,
                "p90_response_time": p90,
                "p95_response_time": p95,
                "p99_response_time": p99,
                "total_test_time": total_time
            })
            
            # Detener si tasa de fallos es muy alta
            if failure_rate > 50:
                print(f"\n⚠️  ALERTA: Tasa de fallos {failure_rate:.1f}% > 50%")
                print(f"   Deteniendo prueba para no saturar el servidor.")
                break
            
            # Pausa entre niveles
            if users != concurrent_users[-1]:
                wait_time = 3
                print(f"\n⏳ Esperando {wait_time}s antes del siguiente nivel...")
                time.sleep(wait_time)
        
        # Guardar resumen
        summary_file = os.path.join(EVIDENCE_DIR, f"summary_{endpoint_name}_{timestamp}.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump({
                "endpoint": endpoint,
                "test_timestamp": datetime.now().isoformat(),
                "token_strategy": "individual_per_request",
                "base_url": self.base_url,
                "results_by_load": all_results
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Prueba completada para {endpoint}")
        print(f"📄 Resumen guardado: {summary_file}")
        
        return all_results


def main():
    tester = BackendLoadTest()
    
    print("\n" + "="*60)
    print("🔬 PRUEBAS DE CARGA - BACKEND")
    print("="*60)
    print(f"🌐 URL Base: {BASE_URL}")
    print(f"👤 Usuario: {TEST_USER}")
    print(f"📁 Evidencia: {EVIDENCE_DIR}")
    print(f"🔑 Estrategia: Token único por request")
    print("="*60)
    
    # 1. Verificar endpoints
    working_endpoints = tester.verify_endpoints_with_individual_tokens()
    
    if not working_endpoints:
        print("\n❌ ERROR: Ningún endpoint está funcionando. Abortando.")
        return
    
    print(f"\n✅ Endpoints funcionando: {len(working_endpoints)}")
    for ep in working_endpoints:
        print(f"   • {ep}")
    
    # 2. Ejecutar pruebas de carga
    print("\n" + "="*60)
    print("🚀 INICIANDO PRUEBAS DE CARGA")
    print("="*60)
    
    # Configuración de carga (ajustable según necesidad)
    load_levels = [3, 5, 8, 10]
    
    # Probar primeros 2 endpoints
    for i, endpoint in enumerate(working_endpoints[:2], 1):
        print(f"\n[{i}/{min(2, len(working_endpoints))}] Probando {endpoint}...")
        try:
            tester.run_load_test_individual_tokens(endpoint, load_levels)
            
            # Pausa entre endpoints
            if i < min(2, len(working_endpoints)):
                print(f"\n⏳ Pausa de 5s antes del siguiente endpoint...")
                time.sleep(5)
                
        except KeyboardInterrupt:
            print("\n\n⚠️  Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f"\n❌ Error en prueba para {endpoint}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print("\n" + "="*60)
    print("🏁 PRUEBAS COMPLETADAS")
    print("="*60)
    print(f"📁 Resultados en: {EVIDENCE_DIR}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()