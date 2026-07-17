from flask import request, jsonify
from services.supabase_client import get_supabase
import traceback, sys

def get_current_user() -> str | None:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        print('[auth] no token', flush=True)
        return None
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
