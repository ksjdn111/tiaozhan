from flask import request
import jwt as pyjwt

def get_current_user() -> str | None:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    try:
        payload = pyjwt.decode(token, options={"verify_signature": False})
        return payload.get('sub')
    except Exception:
        return None