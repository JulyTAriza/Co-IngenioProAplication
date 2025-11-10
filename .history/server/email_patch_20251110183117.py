import os
import requests
from flask_mail import Mail, Message

# Tu proxy de Railway que YA FUNCIONA
PROXY_URL = "https://serveremail-production.up.railway.app/send-email"

class RailwayMail:
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        # Guardar el Mail ORIGINAL para fallback
        self.original_mail = Mail(app)
        
    def send(self, message):
        # Enviar email via tu proxy de Railway
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
                # Fallback: usar el Mail ORIGINAL (no self.mail)
                print("🔄 Intentando fallback con Mail original...")
                return self.original_mail.send(message)
                
        except Exception as e:
            print(f"❌ Error con proxy: {e}")
            # Fallback al método ORIGINAL
            print("🔄 Intentando fallback con Mail original...")
            return self.original_mail.send(message)

# Parche global
import flask_mail
flask_mail._Mail = flask_mail.Mail  # Guardar original
flask_mail.Mail = RailwayMail

print("🚀 email_patch ACTIVADO - Monkey Patch aplicado!")