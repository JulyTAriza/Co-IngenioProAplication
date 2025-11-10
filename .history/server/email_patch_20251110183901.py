import os
import requests
from flask_mail import Mail as OriginalMail
from flask_mail import Message

# Tu proxy de Railway
PROXY_URL = "https://serveremail-production.up.railway.app/send-email"

def send_via_proxy(message):
    """Envía email via proxy de Railway"""
    try:
        data = {
            "to": message.recipients,
            "subject": message.subject,
            "html": message.html if message.html else message.body,
            "from": message.sender
        }
        
        response = requests.post(
            PROXY_URL,
            headers={"Content-Type": "application/json"},
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Email enviado via Railway Proxy")
            return True
        else:
            print(f"❌ Error Railway: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error con proxy: {e}")
        return False

# Crear una subclase que herede correctamente del Mail original
class PatchedMail(OriginalMail):
    def send(self, message):
        # Primero intentar con el proxy
        if send_via_proxy(message):
            return True
        else:
            # Fallback al método original
            print("🔄 Fallback a Mail original...")
            return super().send(message)

# Reemplazar globalmente
import flask_mail
flask_mail.Mail = PatchedMail

print("🚀 email_patch ACTIVADO - Monkey Patch aplicado!")