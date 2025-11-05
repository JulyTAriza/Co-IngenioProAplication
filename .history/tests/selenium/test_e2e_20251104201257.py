# tests/selenium/test_e2e.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os, sys, json, time

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
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    service = ChromeService(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=opts)

def wait_for(driver, by, selector, timeout=10):
    """Espera hasta que el elemento esté visible."""
    return WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((by, selector)))

def wait_for_token(driver, timeout=10):
    """Espera hasta que el token aparezca en localStorage/sessionStorage."""
    end = time.time() + timeout
    while time.time() < end:
        try:
            token = driver.execute_script("""
                return localStorage.getItem('token') ||
                       sessionStorage.getItem('token') ||
                       localStorage.getItem('access_token') ||
                       sessionStorage.getItem('access_token');
            """)
            if token:
                return token
        except Exception:
            pass
        time.sleep(0.3)
    return None

def check_page(driver, path, name):
    url = BASE.rstrip("/") + path
    driver.get(url)
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    except:
        pass
    time.sleep(0.5)
    screenshot = os.path.join(EVIDENCE_DIR, f"{name.lower()}_screenshot.png")
    driver.save_screenshot(screenshot)
    return {"name": name, "url": driver.current_url, "title": driver.title, "screenshot": screenshot}

def main():
    driver = get_driver()
    results = []

    try:
        login_url = BASE.rstrip("/") + "/login"
        safe_print(f"Abriendo: {login_url}")
        driver.get(login_url)

        # Esperar inputs
        user_input = wait_for(driver, By.CSS_SELECTOR, "input[type='text'],input[type='email']")
        pass_input = wait_for(driver, By.CSS_SELECTOR, "input[type='password']")

        # Escribir rápido
        user_input.clear(); user_input.send_keys(USERNAME)
        pass_input.clear(); pass_input.send_keys(PASSWORD)

        # Click en submit
        try:
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
        except:
            driver.find_element(By.TAG_NAME, "button").click()

        # Esperar que cargue token
        token = wait_for_token(driver, timeout=10)
        if token:
            safe_print(" Token capturado correctamente.")
            with open(os.path.join(EVIDENCE_DIR, "token_dump.txt"), "w", encoding="utf-8") as f:
                f.write(token)
        else:
            safe_print(" No se encontró token en localStorage/sessionStorage.")

        driver.save_screenshot(os.path.join(EVIDENCE_DIR, "after_login.png"))

        # Páginas a visitar
        pages = [
            ("/dashboard", "Dashboard"),
            ("/projects", "Projects"),
            ("/schedule", "Schedule"),
            ("/materials", "Materials"),
            ("/inventory", "Inventory"),
            ("/stages", "Stages"),
        ]

        for path, name in pages:
            safe_print(f"Visitando {name}...")
            if token:
                driver.get(BASE.rstrip("/"))
                try:
                    driver.execute_script("localStorage.setItem('token', arguments[0]);", token)
                except:
                    driver.execute_script("localStorage.setItem('access_token', arguments[0]);", token)
            result = check_page(driver, path, name)
            results.append(result)
            safe_print(f"✔ {name}: {result['url']}")
            time.sleep(0.5)

    finally:
        driver.quit()

    with open(os.path.join(EVIDENCE_DIR, "selenium-summary.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    safe_print(" Pruebas E2E completadas. Evidencias guardadas en tests/evidence/")

if __name__ == "__main__":
    main()
