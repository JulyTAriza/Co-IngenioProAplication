# tests/selenium/test_e2e.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time, os, sys, json

BASE = os.getenv("APP_BASE_URL", "https://co-ingeniopro.up.railway.app")
USERNAME = os.getenv("TEST_USER", "admin")
PASSWORD = os.getenv("TEST_PASS", "Tatiana123.")
HEADLESS = os.getenv("HEADLESS", "False").lower() in ("1", "true", "yes")

EVIDENCE_DIR = os.path.join("tests", "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("utf-8", errors="ignore").decode("utf-8"))

def get_driver(headless=HEADLESS):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
        opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    # Aumentar tiempo de espera por defecto para cargas lentas
    opts.page_load_strategy = "normal"
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    driver.set_page_load_timeout(60)
    return driver

def try_find_input(d, timeout=10):
    wait = WebDriverWait(d, timeout)
    # probamos selectores comunes con espera
    selectors = [
        (By.NAME, "username"), (By.NAME, "user"), (By.NAME, "email"),
        (By.ID, "username"), (By.ID, "user"), (By.ID, "email"),
        (By.CSS_SELECTOR, "input[type='text']"), (By.CSS_SELECTOR, "input[type='email']")
    ]
    for by, sel in selectors:
        try:
            el = wait.until(EC.presence_of_element_located((by, sel)))
            if el.is_displayed():
                return el
        except:
            continue
    # fallback sin wait
    try:
        inputs = d.find_elements(By.TAG_NAME, "input")
        for i in inputs:
            if i.is_displayed():
                return i
    except:
        pass
    return None

def try_find_password(d, timeout=10):
    wait = WebDriverWait(d, timeout)
    selectors = [
        (By.NAME, "password"), (By.NAME, "pass"),
        (By.ID, "password"), (By.ID, "passwd"),
        (By.CSS_SELECTOR, "input[type='password']")
    ]
    for by, sel in selectors:
        try:
            el = wait.until(EC.presence_of_element_located((by, sel)))
            if el.is_displayed():
                return el
        except:
            continue
    return None

def try_submit(d):
    try:
        btn = d.find_element(By.CSS_SELECTOR, "button[type='submit']")
        btn.click()
        return True
    except:
        pass
    try:
        btns = d.find_elements(By.TAG_NAME, "button")
        for b in btns:
            try:
                if b.is_displayed():
                    b.click()
                    return True
            except:
                continue
    except:
        pass
    return False

def wait_for_token_in_localstorage(d, timeout=20, poll=0.5):
    """Espera hasta timeout segundos a que localStorage tenga token / access_token"""
    end = time.time() + timeout
    while time.time() < end:
        try:
            token = d.execute_script(
                "return localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');"
            )
            if token:
                return token
        except Exception:
            pass
        time.sleep(poll)
    return None

def check_page(d, path, name, wait_for_selector=(By.TAG_NAME, "body"), timeout=15):
    url = BASE.rstrip("/") + path
    d.get(url)
    try:
        WebDriverWait(d, timeout).until(EC.presence_of_element_located(wait_for_selector))
    except:
        # si no aparece selector, aún sacamos screenshot para evidencia
        pass
    time.sleep(0.8)  # pequeña pausa final
    screenshot_path = os.path.join(EVIDENCE_DIR, f"{name.lower()}_screenshot.png")
    d.save_screenshot(screenshot_path)
    return {
        "name": name,
        "url": d.current_url,
        "title": d.title,
        "screenshot": screenshot_path
    }

def main():
    d = get_driver()
    out = []
    token = None

    try:
        login_url = BASE.rstrip("/") + "/login"
        safe_print(f"Abriendo login: {login_url}")
        d.get(login_url)

        # esperar que el formulario esté presente
        user_input = try_find_input(d, timeout=15)
        pwd_input = try_find_password(d, timeout=15)

        if user_input is None or pwd_input is None:
            safe_print("ERROR: no se localizaron inputs de login automáticamente.")
            d.save_screenshot(os.path.join(EVIDENCE_DIR, "login_error.png"))
            sys.exit(2)

        # escribir credenciales lentamente (mejor para UIs con autocompletes)
        user_input.clear()
        for ch in USERNAME:
            user_input.send_keys(ch)
            time.sleep(0.03)
        pwd_input.clear()
        for ch in PASSWORD:
            pwd_input.send_keys(ch)
            time.sleep(0.03)

        # submit y esperar redirect/render
        try_submit(d)
        safe_print("Enviado formulario, esperando que el frontend procese el login...")
        # esperar token en localStorage (hasta 20s)
        token = wait_for_token_in_localstorage(d, timeout=20, poll=0.5)
        if token:
            safe_print("Token capturado correctamente.")
            with open(os.path.join(EVIDENCE_DIR, "token_dump.txt"), "w", encoding="utf-8") as f:
                f.write(token)
        else:
            safe_print("No se encontró token en localStorage/sessionStorage tras esperar 20s. Intentando capturar de todos modos...")
            # intenta una última lectura directa
            try:
                token = d.execute_script("return localStorage.getItem('token') || sessionStorage.getItem('token');")
            except:
                token = None

        # guardar screenshot después del login
        time.sleep(1)
        d.save_screenshot(os.path.join(EVIDENCE_DIR, "after_login.png"))

        # páginas a chequear con pequeños waits (más lentos)
        pages = [
            ("/dashboard", "Dashboard"),
            ("/projects", "Projects"),
            ("/schedule", "Schedule"),
            ("/materials", "Materials"),
            ("/inventory", "Inventory"),
            ("/stages", "Stages"),
        ]

        for path, name in pages:
            safe_print(f"Navegando a {name} ({path})")
            if token:
                # abrir dominio para contexto de localStorage y luego inyectar token
                d.get(BASE.rstrip("/"))
                time.sleep(1.2)
                try:
                    d.execute_script("localStorage.setItem('token', arguments[0]);", token)
                except Exception as e:
                    safe_print(f"No se pudo inyectar token en localStorage: {e}")
                # darle tiempo al front para leer token y renderizar
                time.sleep(1.2)
            res = check_page(d, path, name, wait_for_selector=(By.TAG_NAME, "body"), timeout=20)
            out.append(res)
            safe_print(f"✔ {name}: {res['url']}")
            # pausa más larga entre páginas para que cargue todo
            time.sleep(1.5)

    finally:
        try:
            d.quit()
        except Exception:
            pass

    with open(os.path.join(EVIDENCE_DIR, "selenium-summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    safe_print("Pruebas E2E completadas. Evidencias en tests/evidence/")

if __name__ == "__main__":
    main()
