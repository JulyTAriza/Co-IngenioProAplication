# tests/selenium/test_e2e.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
import time, os, sys, json

BASE = os.getenv("APP_BASE_URL", "https://co-ingeniopro.up.railway.app")
USERNAME = os.getenv("TEST_USER", "admin")
PASSWORD = os.getenv("TEST_PASS", "Tatiana123.")
HEADLESS = os.getenv("HEADLESS", "False").lower() in ("1", "true", "yes")

EVIDENCE_DIR = os.path.join("tests", "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

def safe_print(msg):
    """Evita errores Unicode en Windows."""
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
    service = ChromeService(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)

def try_find_input(d):
    candidates = [
        (By.NAME, "username"), (By.NAME, "user"), (By.NAME, "email"),
        (By.ID, "username"), (By.ID, "user"), (By.ID, "email"),
        (By.CSS_SELECTOR, "input[type='text']"), (By.CSS_SELECTOR, "input[type='email']")
    ]
    for by, sel in candidates:
        try:
            el = d.find_element(by, sel)
            return el
        except:
            continue
    return None

def try_find_password(d):
    candidates = [
        (By.NAME, "password"), (By.NAME, "pass"),
        (By.ID, "password"), (By.ID, "passwd"),
        (By.CSS_SELECTOR, "input[type='password']")
    ]
    for by, sel in candidates:
        try:
            el = d.find_element(by, sel)
            return el
        except:
            continue
    return None

def try_submit(d):
    try:
        d.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        return True
    except:
        pass
    try:
        btns = d.find_elements(By.TAG_NAME, "button")
        for b in btns:
            if b.is_displayed():
                b.click()
                return True
    except:
        pass
    return False

def check_page(d, path, name):
    url = BASE.rstrip("/") + path
    d.get(url)
    time.sleep(2)
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
        d.get(login_url)
        time.sleep(2)

        user_input = try_find_input(d)
        pwd_input = try_find_password(d)

        if user_input is None or pwd_input is None:
            safe_print("ERROR: no se localizaron inputs de login automáticamente.")
            d.save_screenshot(os.path.join(EVIDENCE_DIR, "login_error.png"))
            sys.exit(2)

        user_input.send_keys(USERNAME)
        pwd_input.send_keys(PASSWORD)
        try_submit(d)
        time.sleep(4)  # tiempo suficiente para redirigir al dashboard

        d.save_screenshot(os.path.join(EVIDENCE_DIR, "after_login.png"))

        # CAPTURAR TOKEN DESPUÉS DE LOGIN
        try:
            token = d.execute_script("return localStorage.getItem('token');")
            if token:
                safe_print(" Token capturado correctamente.")
                with open(os.path.join(EVIDENCE_DIR, "token_dump.txt"), "w", encoding="utf-8") as f:
                    f.write(token)
            else:
                safe_print("No se encontró token en localStorage. Verifica si el nombre difiere.")
        except Exception as e:
            safe_print(f"Error al capturar token: {e}")

        # VISITAR OTRAS PÁGINAS CON EL TOKEN
        pages = [
            ("/dashboard", "Dashboard"),
            ("/projects", "Projects"),
            ("/schedule", "Schedule"),
            ("/materials", "Materials"),
            ("/inventory", "Inventory"),
            ("/stages", "Stages"),
        ]

        for path, name in pages:
            if token:
                d.get("about:blank")
                d.execute_script(f"localStorage.setItem('token', '{token}');")
            res = check_page(d, path, name)
            out.append(res)
            safe_print(f"✔ {name}: {res['url']}")

    finally:
        d.quit()

    # Guardar resumen
    with open(os.path.join(EVIDENCE_DIR, "selenium-summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    safe_print("Pruebas E2E completadas. Evidencias en tests/evidence/")

if __name__ == "__main__":
    main()
