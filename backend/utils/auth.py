from flask import request, g
import jwt as pyjwt

def get_current_user() -> str | None:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    try:
        payload = pyjwt.decode(token, options={"verify_signature": False})
        user_id = payload.get('sub')
        if user_id:
            g.jwt_token = token
        return user_id
    except Exception:
        return None