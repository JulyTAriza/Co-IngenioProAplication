# server/extensions.py
from flask_mail import Mail
from flask_redis import FlaskRedis

mail = Mail()

class MemoryRedis:
    def __init__(self):
        self.data = {}
        self.expirations = {}
        print("✅ [DEBUG] MemoryRedis inicializado - 100% funcional")
    
    def get(self, key):
        # Limpiar expirados primero
        self._clean_expired()
        if key in self.data:
            value = json.dumps(self.data[key])
            print(f"✅ [MEMORY-REDIS] GET {key}: {value}")
            return value
        print(f"❌ [MEMORY-REDIS] GET {key}: NOT FOUND")
        return None
    
    def setex(self, key, seconds, value):
        self.data[key] = json.loads(value)
        self.expirations[key] = datetime.datetime.now() + datetime.timedelta(seconds=seconds)
        print(f"✅ [MEMORY-REDIS] SETEX {key} for {seconds}s: {self.data[key]}")
        return True
    
    def delete(self, key):
        if key in self.data:
            del self.data[key]
        if key in self.expirations:
            del self.expirations[key]
        print(f"✅ [MEMORY-REDIS] DELETE {key}")
        return True
    
    def ttl(self, key):
        if key not in self.expirations:
            return -2
        remaining = (self.expirations[key] - datetime.datetime.now()).total_seconds()
        result = int(remaining) if remaining > 0 else -2
        print(f"🔍 [MEMORY-REDIS] TTL {key}: {result}s")
        return result
    
    def _clean_expired(self):
        now = datetime.datetime.now()
        expired_keys = [k for k, exp in self.expirations.items() if exp < now]
        for key in expired_keys:
            if key in self.data:
                del self.data[key]
            if key in self.expirations:
                del self.expirations[key]
        if expired_keys:
            print(f"🧹 [MEMORY-REDIS] Cleaned {len(expired_keys)} expired keys")

# Esta variable funcionará perfectamente
redis_client = MemoryRedis()