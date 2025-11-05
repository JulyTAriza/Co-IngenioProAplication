import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "https://co-ingenioproaplication-backend.onrender.com")
TEST_USER = os.getenv("TEST_USER", "admin")
TEST_PASS = os.getenv("TEST_PASS", "Tatiana123.")

def debug_login():
    """Diagnóstico completo del login"""
    
    print("=" * 60)
    print("🔍 DIAGNÓSTICO DE LOGIN")
    print("=" * 60)
    
    # 1. Verificar variables de entorno
    print("\n1️⃣ VARIABLES DE ENTORNO:")
    print(f"   BASE_URL: {BASE_URL}")
    print(f"   TEST_USER: {TEST_USER}")
    print(f"   TEST_PASS: {'*' * len(TEST_PASS)} (oculta)")
    
    # 2. Verificar conectividad
    print("\n2️⃣ VERIFICANDO CONECTIVIDAD:")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"   ✅ Health check: {response.status_code}")
        print(f"   Respuesta: {response.json()}")
    except Exception as e:
        print(f"   ❌ Error conectando al servidor: {e}")
        return
    
    # 3. Intentar login con detalles completos
    print("\n3️⃣ INTENTANDO LOGIN:")
    login_url = f"{BASE_URL}/login"
    print(f"   URL: {login_url}")
    
    payload = {"username": TEST_USER, "password": TEST_PASS}
    print(f"   Payload: {json.dumps(payload, indent=6)}")
    
    try:
        response = requests.post(
            login_url, 
            json=payload, 
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n   📊 RESPUESTA DEL SERVIDOR:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"   Body: {json.dumps(response_data, indent=6, ensure_ascii=False)}")
            
            # Analizar la respuesta
            if response.status_code == 200:
                if response_data.get("success"):
                    token = response_data.get("token")
                    print(f"\n   ✅ LOGIN EXITOSO")
                    print(f"   Token (primeros 50 chars): {token[:50]}...")
                    
                    # 4. Probar el token
                    print("\n4️⃣ PROBANDO TOKEN EN /projects:")
                    test_url = f"{BASE_URL}/projects"
                    test_response = requests.get(
                        test_url,
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=10
                    )
                    print(f"   Status: {test_response.status_code}")
                    if test_response.status_code == 200:
                        print(f"   ✅ Token funciona correctamente")
                    else:
                        print(f"   ❌ Token rechazado")
                        print(f"   Respuesta: {test_response.text[:200]}")
                else:
                    print(f"\n   ❌ LOGIN FALLÓ")
                    print(f"   Mensaje: {response_data.get('message')}")
            elif response.status_code == 404:
                print(f"\n   ❌ Usuario no encontrado en la base de datos")
            elif response.status_code == 401:
                print(f"\n   ❌ Contraseña incorrecta")
            elif response.status_code == 500:
                print(f"\n   ❌ Error del servidor")
                
        except json.JSONDecodeError:
            print(f"   ⚠️  Respuesta no es JSON: {response.text[:200]}")
            
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout después de 10 segundos")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("🏁 DIAGNÓSTICO COMPLETADO")
    print("=" * 60)

if __name__ == "__main__":
    debug_login()