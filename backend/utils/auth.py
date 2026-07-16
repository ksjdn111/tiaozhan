from flask import request, jsonify
from services.supabase_client import get_supabase

def get_current_user() -> str | None:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    supabase = get_supabase()
    try:
        auth_res = supabase.auth.get_user(token)
        if auth_res.user is None:
            return None
        return auth_res.user.id
    except Exception:
        return None
