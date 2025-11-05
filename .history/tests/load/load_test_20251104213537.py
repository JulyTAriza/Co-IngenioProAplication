import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time

load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

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
            # NO usar Session - usar requests directo
            response = requests.post(
                login_url, 
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    token = result.get("token")
                    if token:
                        # Validar que el token no esté vacío y tenga formato JWT
                        if len(token) > 50 and token.count('.') == 2:
                            return token
                        else:
                            print(f"❌ Token inválido recibido: {token[:50]}")
                            return None
                    else:
                        print(f"❌ No hay token en la respuesta")
                        return None
                else:
                    print(f"❌ Login falló: {result.get('message')}")
                    return None
            else:
                print(f"❌ Error HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Excepción en login: {str(e)}")
            return None
    
    def test_endpoint_with_new_token(self, endpoint, request_id=None):
        """Testea un endpoint con un NUEVO token"""
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
            # CRÍTICO: NO usar Session, usar requests directo
            # El problema puede ser que Session no envía bien los headers
            
            # Construir el header Authorization manualmente
            auth_value = f"Bearer {token}"
            
            if request_id in ["VERIFY", "TEST"]:
                print(f"\n🔍 DEBUG DETALLADO Request {request_id}:")
                print(f"   URL: {url}")
                print(f"   Token length: {len(token)}")
                print(f"   Token partes (split por '.'): {len(token.split('.'))}")
                print(f"   Authorization value length: {len(auth_value)}")
                print(f"   Authorization value: {auth_value[:50]}...{auth_value[-20:]}")
            
            # Hacer el request SIN Session
            response = requests.get(
                url,
                headers={
                    "Authorization": auth_value,
                    "User-Agent": "LoadTest/1.0",
                    "Accept": "application/json"
                },
                timeout=15
            )
            
            response_time = time.time() - start_time
            
            # Si es debug, mostrar qué headers recibió el servidor
            if request_id in ["VERIFY", "TEST"] and response.status_code == 401:
                print(f"\n   🔴 RESPUESTA 401:")
                print(f"   Response headers: {dict(response.headers)}")
                try:
                    error_json = response.json()
                    print(f"   Error JSON: {json.dumps(error_json, indent=6)}")
                except:
                    print(f"   Response text: {response.text[:200]}")
            
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
                try:
                    error_data = response.json()
                    result["error_message"] = error_data.get("message", "Sin mensaje")
                except:
                    result["error_message"] = response.text[:200]
            
            status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
            if result["success"]:
                print(f"Request {request_id}: {endpoint} - {response.status_code} - {response_time:.2f}s - {status}")
            else:
                print(f"Request {request_id}: {endpoint} - {response.status_code} - {status}")
                if request_id not in ["VERIFY", "TEST"]:  # No repetir el mensaje
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
    
    def manual_curl_test(self, endpoint):
        """Genera comando curl para probar manualmente"""
        token = self.get_token()
        if not token:
            print("❌ No se pudo obtener token para curl")
            return
        
        url = f"{self.base_url}{endpoint}"
        curl_cmd = f'curl -X GET "{url}" -H "Authorization: Bearer {token}" -H "Accept: application/json"'
        
        print("\n" + "="*60)
        print("🧪 COMANDO CURL PARA PRUEBA MANUAL:")
        print("="*60)
        print(curl_cmd)
        print("="*60)
        print("\nCopia y ejecuta este comando en tu terminal para verificar")
        print("si el problema está en el código Python o en el servidor.\n")
    
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
                
                # Si falla, ofrecer comando curl para debug
                if result.get('status_code') == 401:
                    self.manual_curl_test(endpoint)
            
            time.sleep(0.5)
        
        return working_endpoints
    
    def run_load_test_individual_tokens(self, endpoint, concurrent_users=[5, 10, 15, 20]):
        """Ejecuta prueba de carga"""
        print("\n" + "="*60)
        print(f"🚀 PRUEBA DE CARGA: {endpoint}")
        print("="*60)
        
        test_result = self.test_endpoint_with_new_token(endpoint, "TEST")
        if not test_result["success"]:
            print(f"❌ Endpoint {endpoint} no funciona. Abortando.")
            return None
        
        print(f"✅ Endpoint verificado, iniciando carga...\n")
        
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
            
            total_requests = len(results)
            successful_requests = sum(1 for r in results if r["success"])
            failed_requests = total_requests - successful_requests
            avg_response_time = sum(r.get("response_time", 0) for r in results) / total_requests if results else 0
            failure_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0
            
            response_times = [r.get("response_time", 0) for r in results if r.get("response_time")]
            response_times.sort()
            if response_times:
                p50 = response_times[int(len(response_times) * 0.50)]
                p90 = response_times[int(len(response_times) * 0.90)]
                p95 = response_times[int(len(response_times) * 0.95)]
            else:
                p50 = p90 = p95 = 0
            
            print(f"\n📊 RESULTADOS:")
            print(f"   ✅ Exitosos:  {successful_requests}/{total_requests} ({100-failure_rate:.1f}%)")
            print(f"   ❌ Fallidos:  {failed_requests}/{total_requests} ({failure_rate:.1f}%)")
            print(f"   ⏱️  Promedio: {avg_response_time:.2f}s")
            print(f"   📈 P50: {p50:.2f}s | P90: {p90:.2f}s | P95: {p95:.2f}s")
            print(f"   ⏲️  Duración: {total_time:.2f}s")
            
            endpoint_name = endpoint.strip('/').replace('/', '_') or 'root'
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"load_{endpoint_name}_{users}users_{timestamp}.json"
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
                        "success_rate": 100 - failure_rate,
                        "avg_response_time": avg_response_time,
                        "p50": p50,
                        "p90": p90,
                        "p95": p95,
                        "total_time": total_time
                    },
                    "detailed_results": results
                }, f, indent=2, ensure_ascii=False)
            
            all_results.append({
                "users": users,
                "success_rate": 100 - failure_rate,
                "avg_time": avg_response_time
            })
            
            if failure_rate > 50:
                print(f"\n⚠️  Tasa de fallos {failure_rate:.1f}% > 50%. Deteniendo.")
                break
            
            if users != concurrent_users[-1]:
                time.sleep(3)
        
        return all_results


def main():
    tester = BackendLoadTest()
    
    print("\n" + "="*60)
    print("🔬 PRUEBAS DE CARGA - BACKEND")
    print("="*60)
    print(f"🌐 URL: {BASE_URL}")
    print(f"👤 Usuario: {TEST_USER}")
    print(f"📁 Evidencia: {EVIDENCE_DIR}")
    print("="*60)
    
    working_endpoints = tester.verify_endpoints_with_individual_tokens()
    
    if not working_endpoints:
        print("\n❌ ERROR: Ningún endpoint funciona.")
        print("\n💡 POSIBLES CAUSAS:")
        print("   1. El servidor requiere headers adicionales (CORS)")
        print("   2. El middleware está rechazando el formato del header")
        print("   3. Problema con la SECRET_KEY entre login y validación")
        print("\n🔧 PRÓXIMOS PASOS:")
        print("   1. Ejecuta el comando curl que se generó arriba")
        print("   2. Revisa los logs del servidor backend")
        print("   3. Verifica que config.SECRET_KEY sea igual en login y middleware")
        return
    
    print(f"\n✅ Endpoints OK: {len(working_endpoints)}")
    for ep in working_endpoints:
        print(f"   • {ep}")
    
    print("\n" + "="*60)
    print("🚀 INICIANDO PRUEBAS DE CARGA")
    print("="*60)
    
    load_levels = [3, 5, 8, 10]
    
    for i, endpoint in enumerate(working_endpoints[:2], 1):
        try:
            tester.run_load_test_individual_tokens(endpoint, load_levels)
            if i < min(2, len(working_endpoints)):
                time.sleep(5)
        except KeyboardInterrupt:
            print("\n⚠️  Interrumpido por usuario")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            continue
    
    print("\n" + "="*60)
    print("🏁 COMPLETADO")
    print("="*60)
    print(f"📁 {EVIDENCE_DIR}\n")


if __name__ == "__main__":
    main()