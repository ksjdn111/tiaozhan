import os
import time
import certifi

os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

from supabase import create_client, Client
import jwt as pyjwt
from config import SUPABASE_URL, SUPABASE_KEY
from flask import g
from typing import Optional

_supabase: Optional[Client] = None

def _make_client() -> Client:
    c = create_client(SUPABASE_URL, SUPABASE_KEY)
    try:
        c.from_('challenges').select('id').limit(1).execute()
    except Exception:
        pass
    return c

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = _make_client()
    return _supabase

def is_token_expired(token: str) -> bool:
    try:
        payload = pyjwt.decode(token, options={"verify_signature": False})
        exp = payload.get('exp', 0)
        return bool(exp and exp < time.time())
    except Exception:
        return True

def get_auth_supabase() -> Client:
    token = getattr(g, 'jwt_token', None)
    if token and not is_token_expired(token):
        cached = getattr(g, '_auth_supabase', None)
        if cached:
            return cached
        client = _make_client()
        client.postgrest.auth(token)
        g._auth_supabase = client
        return client
    return get_supabase()