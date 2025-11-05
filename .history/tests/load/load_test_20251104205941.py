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
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

# Cache para token
_token_cache = None
_token_time = None

def get_token(force_refresh=False):
    """Obtiene token JWT del endpoint /login"""
    global _token_cache, _token_time
    
    if not force_refresh and _token_cache and _token_time:
        # Verificar si el token tiene menos de 50 minutos
        if (datetime.now() - _token_time).total_seconds() < 3000:
            return _token_cache
    
    login_url = f"{BASE_URL}/login"
    data = {
        "username": TEST_USER, 
        "password": TEST_PASS
    }
    
    try:
        print(f"🔐 Obteniendo token para usuario: {TEST_USER}")
        response = requests.post(login_url, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("token"):
                token = result["token"]
                _token_cache = token
                _token_time = datetime.now()
                print("✅ Token obtenido exitosamente")
                print(f"📋 Información usuario: {result.get('usuario', {}).get('rol', 'N/A')}")
                return token
            else:
                error_msg = result.get("message", "Error desconocido en login")
                raise Exception(f"Login fallido: {error_msg}")
        else:
            raise Exception(f"HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error de conexión: {str(e)}")

def get_headers():
    """Obtiene headers con token actualizado"""
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def verify_endpoint_access():
    """Verifica acceso a cada endpoint individualmente"""
    print("\n🔍 VERIFICANDO ACCESO A ENDPOINTS")
    print("=" * 50)
    
    endpoints_to_test = [
        # Endpoints que deberían existir según tu app.py
        ("/", "GET", False),  # Health check - no requiere auth
        ("/projects", "GET", True),
        ("/materials", "GET", True),
        ("/usuarios", "GET", True),
        ("/schedule", "GET", True),
        ("/config", "GET", True),
        ("/reports", "GET", True),
        ("/my-tasks", "GET", True),
        ("/progress", "GET", True),
        ("/inventory", "GET", True),
        ("/etapas", "GET", True),
        ("/auth/forgot-password", "POST", False),  # Probablemente no requiere auth
        ("/api/notifications", "GET", True),
    ]
    
    for endpoint, method, requires_auth in endpoints_to_test:
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                if requires_auth:
                    response = requests.get(url, headers=get_headers(), timeout=10)
                else:
                    response = requests.get(url, timeout=10)
            elif method == "POST":
                if requires_auth:
                    response = requests.post(url, headers=get_headers(), json={}, timeout=10)
                else:
                    response = requests.post(url, json={}, timeout=10)
            
            status_emoji = "✅" if 200 <= response.status_code < 300 else "❌"
            print(f"{status_emoji} {endpoint:20} -> Status: {response.status_code}")
            
            if response.status_code == 401:
                print(f"   🔐 401 - Problema de autenticación en {endpoint}")
            elif response.status_code == 404:
                print(f"   📍 404 - Endpoint no encontrado: {endpoint}")
            elif response.status_code == 200:
                # Mostrar pequeña muestra de la respuesta
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"   📊 Respuesta: Array con {len(data)} elementos")
                    elif isinstance(data, dict):
                        print(f"   📊 Respuesta: Dict con keys: {list(data.keys())[:3]}")
                    else:
                        print(f"   📊 Respuesta: {type(data)}")
                except:
                    print(f"   📊 Respuesta: Texto ({len(response.text)} chars)")
                    
        except Exception as e:
            print(f"❌ {endpoint:20} -> ERROR: {str(e)}")

def request_endpoint(endpoint, request_id=None):
    """Hace una solicitud a un endpoint específico"""
    url = f"{BASE_URL}{endpoint}"
    start_time = time.time()
    
    try:
        # Endpoints que no requieren autenticación
        no_auth_endpoints = ['/', '/auth/forgot-password']
        
        if endpoint in no_auth_endpoints:
            response = requests.get(url, timeout=15)
        else:
            response = requests.get(url, headers=get_headers(), timeout=15)
        
        response_time = time.time() - start_time
        
        result = {
            "url": url,
            "status_code": response.status_code,
            "success": 200 <= response.status_code < 300,
            "response_time": response_time,
            "response_size": len(response.content) if response.content else 0,
            "timestamp": datetime.now().isoformat(),
            "headers_sent": {
                "authorization": bool(endpoint not in no_auth_endpoints)
            }
        }
        
        # Log detallado
        status_emoji = "✅" if result["success"] else "❌"
        print(f"{status_emoji} Request {request_id}: {endpoint} - Status: {response.status_code} - Time: {response_time:.2f}s")
        
        # Debug para 401
        if response.status_code == 401:
            print(f"   🔐 401 Detectado - Token podría ser inválido")
            # Forzar refresh del token para el próximo request
            global _token_cache
            _token_cache = None
            
        return result
        
    except requests.exceptions.Timeout:
        print(f"⏰ Request {request_id}: {endpoint} - TIMEOUT")
        return {
            "url": url,
            "status_code": None,
            "success": False,
            "error": "Timeout after 15 seconds",
            "response_time": 15.0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"🔴 Request {request_id}: {endpoint} - ERROR: {str(e)}")
        return {
            "url": url,
            "status_code": None,
            "success": False,
            "error": str(e),
            "response_time": time.time() - start_time,
            "timestamp": datetime.now().isoformat()
        }

def progressive_load(endpoint, steps=[3, 5, 8]):
    """Ejecuta prueba de carga progresiva para un endpoint"""
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO PRUEBA DE CARGA PARA: {endpoint}")
    print(f"{'='*60}")
    
    # Verificar primero que el endpoint funciona
    test_result = request_endpoint(endpoint, "TEST")
    if not test_result["success"]:
        print(f"❌ Endpoint {endpoint} no funciona. Saltando pruebas.")
        return
    
    results_all = []
    
    for thread_count in steps:
        print(f"\n📊 Enviando {thread_count} solicitudes concurrentes...")
        
        results = []
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            # Enviar solicitudes concurrentes
            future_to_id = {
                executor.submit(request_endpoint, endpoint, i): i 
                for i in range(thread_count)
            }
            
            for future in as_completed(future_to_id):
                results.append(future.result())
        
        total_time = time.time() - start_time
        
        # Calcular métricas
        total_requests = len(results)
        successful_requests = sum(1 for r in results if r["success"])
        failed_requests = total_requests - successful_requests
        avg_response_time = sum(r.get("response_time", 0) for r in results) / total_requests if total_requests > 0 else 0
        
        failure_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 100
        
        print(f"📈 Resultados:")
        print(f"   • Éxitos: {successful_requests}/{total_requests}")
        print(f"   • Fallos: {failed_requests}")
        print(f"   • Tasa de fallos: {failure_rate:.1f}%")
        print(f"   • Tiempo promedio: {avg_response_time:.2f}s")
        print(f"   • Tiempo total prueba: {total_time:.2f}s")
        
        # Guardar evidencia
        safe_endpoint_name = endpoint.strip('/').replace('/', '_') or 'root'
        filename = f"{safe_endpoint_name}_load_{thread_count}threads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        path = os.path.join(EVIDENCE_DIR, filename)
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "test_config": {
                    "endpoint": endpoint,
                    "threads": thread_count,
                    "timestamp": datetime.now().isoformat()
                },
                "metrics": {
                    "total_requests": total_requests,
                    "successful_requests": successful_requests,
                    "failed_requests": failed_requests,
                    "failure_rate": failure_rate,
                    "avg_response_time": avg_response_time,
                    "total_test_time": total_time
                },
                "detailed_results": results
            }, f, indent=2, ensure_ascii=False)
        
        results_all.append({
            "threads": thread_count,
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "failure_rate": failure_rate,
            "avg_response_time": avg_response_time,
            "total_test_time": total_time
        })
        
        # Condición de parada por límite de resistencia
        if failure_rate > 50:
            print(f"🛑 ALERTA: Tasa de fallos del {failure_rate:.1f}% > 50%")
            print("   Deteniendo pruebas para este endpoint...")
            break
        
        # Pequeña pausa entre niveles de carga
        time.sleep(1)
    
    # Guardar resumen
    summary_file = os.path.join(EVIDENCE_DIR, f"{safe_endpoint_name}_load_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump({
            "endpoint": endpoint,
            "test_timestamp": datetime.now().isoformat(),
            "results": results_all
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Prueba de carga completada para {endpoint}")

def main():
    """Función principal"""
    print("🧪 INICIANDO PRUEBAS DE CARGA DEL SISTEMA")
    print(f"📊 URL Base: {BASE_URL}")
    print(f"👤 Usuario: {TEST_USER}")
    print(f"📁 Evidencia: {EVIDENCE_DIR}")
    
    # 1. Verificar autenticación
    try:
        print("\n1. 🔐 Verificando autenticación...")
        token = get_token(force_refresh=True)
        if not token:
            print("❌ No se pudo obtener token")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error en autenticación: {e}")
        sys.exit(1)
    
    # 2. Verificar acceso a endpoints
    verify_endpoint_access()
    
    # 3. Ejecutar pruebas de carga solo en endpoints que funcionen
    print(f"\n2. 🚀 INICIANDO PRUEBAS DE CARGA")
    print("=" * 50)
    
    # Endpoints a probar - en orden de importancia
    endpoints_to_load_test = [
        "/",              # Health check (debería funcionar siempre)
        "/projects",      # Endpoint principal
        "/materials",     # Endpoint principal  
        "/usuarios",      # Endpoint principal
    ]
    
    # Configuración de carga progresiva (más conservadora)
    steps = [3, 5, 8]  # Empezar con carga ligera
    
    for endpoint in endpoints_to_load_test:
        try:
            progressive_load(endpoint, steps)
            time.sleep(2)  # Pausa entre endpoints
        except KeyboardInterrupt:
            print("\n⏹️ Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f"❌ Error en prueba para {endpoint}: {e}")
            continue
    
    print(f"\n🎉 PRUEBAS COMPLETADAS")
    print(f"📊 Resultados guardados en: {EVIDENCE_DIR}")

if __name__ == "__main__":
    main()