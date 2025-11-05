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
    try:
        inputs = d.find_elements(By.TAG_NAME, "input")
        for i in inputs:
            if i.is_displayed():
                return i
    except:
        pass
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
    time.sleep(1.5)
    possible_headings = [
        f"//h1[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), '{name.lower()}')]",
        f"//h2[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), '{name.lower()}')]",
        f"//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), '{name.lower()}')]"
    ]
    found = False
    for xp in possible_headings:
        try:
            els = d.find_elements(By.XPATH, xp)
            if els and len(els) > 0:
                found = True
                break
        except:
            continue
    url_ok = (path.strip("/").lower() in d.current_url.lower())
    screenshot_path = os.path.join(EVIDENCE_DIR, f"{name.lower()}_screenshot.png")
    d.save_screenshot(screenshot_path)
    return {"name": name, "url": d.current_url, "found_text": found, "url_ok": url_ok, "screenshot": screenshot_path}


def main():
    d = get_driver()
    out = []
    try:
        login_url = BASE.rstrip("/") + "/login"
        d.get(login_url)
        time.sleep(1.2)

        user_input = try_find_input(d)
        pwd_input = try_find_password(d)

        if user_input is None or pwd_input is None:
            print("ERROR: no se localizaron inputs de login automáticamente. Revisar selectores.")
            d.save_screenshot(os.path.join(EVIDENCE_DIR, "login_error.png"))
            sys.exit(2)

        user_input.clear()
        user_input.send_keys(USERNAME)
        pwd_input.clear()
        pwd_input.send_keys(PASSWORD)

        submitted = try_submit(d)
        if not submitted:
            try:
                pwd_input.send_keys(Keys.ENTER)
            except:
                pass

        time.sleep(3)
        d.save_screenshot(os.path.join(EVIDENCE_DIR, "after_login.png"))

        # Capturar token JWT del localStorage o sessionStorage
        try:
            token = d.execute_script("return localStorage.getItem('token') || sessionStorage.getItem('token');")
            if token:
                print("✅ JWT token capturado correctamente")
            else:
                print("⚠️ No se encontró token en localStorage, revisa nombre exacto en tu front")
        except Exception as e:
            print("❌ Error al capturar token:", e)
            token = None

        # Función para abrir una página con token JWT
        def open_with_token(driver, path, token):
            full_url = BASE.rstrip("/") + path
            driver.get("about:blank")
            driver.execute_script(f"localStorage.setItem('token', '{token}');")
            driver.get(full_url)
            time.sleep(2)

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
                open_with_token(d, path, token)
            else:
                d.get(BASE.rstrip("/") + path)
            time.sleep(2)
            res = check_page(d, path, name)
            out.append(res)
            print(f"Checked {name}: url={res['url']}, found_text={res['found_text']}, url_ok={res['url_ok']}, screenshot={res['screenshot']}")

    finally:
        d.quit()

    with open(os.path.join(EVIDENCE_DIR, "selenium-summary.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print("✅ Done. Evidence in tests/evidence/")


if __name__ == "__main__":
    main()
