import requests
import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import time
import sys

load_dotenv()

# Configuración de rutas
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EVIDENCE_DIR = os.path.join(BASE_DIR, "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

# Configuración de la API
BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

# Cache para el token
_token_cache = None
_token_time = None

def get_token(force_refresh=False):
    """Obtiene token JWT con cache de 50 minutos"""
    global _token_cache, _token_time
    
    if not force_refresh and _token_cache and _token_time:
        # Verificar si el token tiene menos de 50 minutos
        if (datetime.now() - _token_time).total_seconds() < 3000:  # 50 minutos
            return _token_cache
    
    login_url = f"{BASE_URL}/login"
    data = {"username": TEST_USER, "password": TEST_PASS}
    
    try:
        response = requests.post(login_url, json=data, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                _token_cache = token
                _token_time = datetime.now()
                print("✅ Token obtenido exitosamente")
                return token
            else:
                raise Exception("Token no recibido en la respuesta de login.")
        else:
            raise Exception(f"Login fallido. Status: {response.status_code}, Response: {response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error de conexión en login: {str(e)}")

def get_headers():
    """Obtiene headers con token actualizado"""
    token = get_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def request_endpoint(endpoint, request_id=None):
    """Hace una solicitud a un endpoint específico"""
    url = f"{BASE_URL}{endpoint}"
    start_time = time.time()
    
    try:
        response = requests.get(url, headers=get_headers(), timeout=15)
        response_time = time.time() - start_time
        
        result = {
            "url": url,
            "status_code": response.status_code,
            "success": 200 <= response.status_code < 300,
            "response_time": response_time,
            "response_size": len(response.content) if response.content else 0,
            "timestamp": datetime.now().isoformat()
        }
        
        # Log detallado para debugging
        if not result["success"]:
            print(f"❌ Request {request_id}: {endpoint} - Status: {response.status_code}")
        else:
            print(f"✅ Request {request_id}: {endpoint} - Time: {response_time:.2f}s")
            
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
    except requests.exceptions.RequestException as e:
        print(f"🔴 Request {request_id}: {endpoint} - ERROR: {str(e)}")
        return {
            "url": url,
            "status_code": None,
            "success": False,
            "error": str(e),
            "response_time": time.time() - start_time,
            "timestamp": datetime.now().isoformat()
        }

def progressive_load(endpoint, steps=[5, 8, 10, 15, 20]):
    """Ejecuta prueba de carga progresiva para un endpoint"""
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO PRUEBA DE CARGA PARA: {endpoint}")
    print(f"{'='*60}")
    
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
        avg_response_time = sum(r.get("response_time", 0) for r in results) / total_requests
        max_response_time = max(r.get("response_time", 0) for r in results)
        min_response_time = min(r.get("response_time", 0) for r in results)
        
        failure_rate = (failed_requests / total_requests) * 100
        
        print(f"📈 Resultados:")
        print(f"   • Éxitos: {successful_requests}/{total_requests}")
        print(f"   • Fallos: {failed_requests}")
        print(f"   • Tasa de fallos: {failure_rate:.1f}%")
        print(f"   • Tiempo promedio: {avg_response_time:.2f}s")
        print(f"   • Tiempo máximo: {max_response_time:.2f}s")
        print(f"   • Tiempo mínimo: {min_response_time:.2f}s")
        print(f"   • Tiempo total prueba: {total_time:.2f}s")
        
        # Guardar evidencia detallada
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
                    "max_response_time": max_response_time,
                    "min_response_time": min_response_time,
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
            "max_response_time": max_response_time,
            "min_response_time": min_response_time,
            "total_test_time": total_time
        })
        
        # Condición de parada por límite de resistencia
        if failure_rate > 30:
            print(f"🛑 ALERTA: Tasa de fallos del {failure_rate:.1f}% > 30%")
            print("   Deteniendo pruebas para este endpoint...")
            break
    
    # Guardar resumen final del endpoint
    summary_file = os.path.join(EVIDENCE_DIR, f"{safe_endpoint_name}_load_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump({
            "endpoint": endpoint,
            "test_timestamp": datetime.now().isoformat(),
            "results": results_all
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Prueba de carga completada para {endpoint}")
    print(f"   Resumen guardado en: {summary_file}")

def main():
    """Función principal de ejecución"""
    print("🧪 INICIANDO PRUEBAS DE CARGA DEL SISTEMA")
    print(f"📊 URL Base: {BASE_URL}")
    print(f"📁 Evidencia en: {EVIDENCE_DIR}")
    
    # Verificar que podemos obtener token primero
    try:
        print("\n🔐 Verificando autenticación...")
        token = get_token(force_refresh=True)
        if token:
            print("✅ Autenticación verificada correctamente")
    except Exception as e:
        print(f"❌ Error en autenticación: {e}")
        sys.exit(1)
    
    # Endpoints a probar - CORREGIDOS según tu app.py
    endpoints = [
        "/projects",
        "/materials", 
        "/schedule",
        "/inventory",
        "/etapas",  # Según tu blueprint: etapas_proyecto_bp
        "/usuarios",
        "/config", 
        "/reports",
        "/my-tasks",
        "/progress",
        "/auth/forgot-password",  # Endpoint específico de auth
        "/api/notifications",
        "/",  # Health check
    ]
    
    # Configuración de carga progresiva
    steps = [5, 8, 10, 15, 20]
    
    # Ejecutar pruebas para cada endpoint
    for endpoint in endpoints:
        try:
            progressive_load(endpoint, steps)
            # Pequeña pausa entre endpoints
            time.sleep(2)
        except KeyboardInterrupt:
            print("\n Pruebas interrumpidas por el usuario")
            break
        except Exception as e:
            print(f" Error en prueba para {endpoint}: {e}")
            continue
    
    print(f"\n🎉 TODAS LAS PRUEBAS COMPLETADAS")
    print(f" Resultados guardados en: {EVIDENCE_DIR}")

if __name__ == "__main__":
    main()