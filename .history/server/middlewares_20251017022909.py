from functools import wraps
from flask import request, jsonify
import jwt
import config

def token_required(f):
    """Verifica que exista un token válido"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'message': 'Token faltante'}), 401
        
        try:
            # Quitar 'Bearer ' del token
            token = token.split(" ")[1] if " " in token else token
            data = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            request.usuario = data  # Guardar info del usuario en la request
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Token inválido'}), 401
        
        return f(*args, **kwargs)
    return decorated

def role_required(roles_permitidos):
    """Verifica que el usuario tenga uno de los roles permitidos"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Primero verificar que existe el usuario en la request (debe pasar por token_required)
            if not hasattr(request, 'usuario'):
                return jsonify({'success': False, 'message': 'Autenticación requerida'}), 401
            
            rol_usuario = request.usuario.get('rol')
            
            if rol_usuario not in roles_permitidos:
                return jsonify({
                    'success': False, 
                    'message': f'Acceso denegado. Se requiere rol: {", ".join(roles_permitidos)}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator