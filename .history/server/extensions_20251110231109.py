# server/extensions.py
from flask_mail import Mail
from flask_redis import FlaskRedis

mail = Mail()
# Configurar Redis directamente con REDIS_URL
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    redis_client = redis.from_url(redis_url, decode_responses=True)
else:
    # Fallback para desarrollo local
    from flask_redis import FlaskRedis
    redis_client = FlaskRedis()

print(f"🔍 Redis URL: {redis_url}")