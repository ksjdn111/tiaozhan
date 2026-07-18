from flask import request, jsonify
from services.supabase_client import get_supabase
import jwt as pyjwt
import traceback, sys

def get_current_user() -> str | None:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        print('[auth] no token', flush=True)
        return None

    # Try to decode JWT locally first (fast path)
    try:
        # Just decode header and payload without verification
        payload = pyjwt.decode(token, options={"verify_signature": False})
        user_id = payload.get('sub')
        if user_id:
            return user_id
    except Exception as e:
        print(f'[auth] JWT decode failed: {e}', flush=True)

    # Fallback: verify via Supabase API
    supabase = get_supabase()
    try:
        auth_res = supabase.auth.get_user(token)
        if auth_res.user is None:
            print('[auth] get_user returned None', flush=True)
            return None
        return auth_res.user.id
    except Exception as e:
        print(f'[auth] get_user exception: {e}', flush=True)
        traceback.print_exc(file=sys.stdout)
        return None
