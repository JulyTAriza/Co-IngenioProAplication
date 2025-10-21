# server/extensions.py
from flask_mail import Mail
from flask_redis import FlaskRedis

mail = Mail()
redis_client = FlaskRedis()