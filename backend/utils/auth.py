from flask import request, g
import jwt as pyjwt
from typing import Optional

def get_current_user() -> Optional[str]:
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