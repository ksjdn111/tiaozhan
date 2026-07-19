import os
import certifi

os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

from supabase import create_client, Client
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

def get_auth_supabase() -> Client:
    """Get a per-request supabase client with the current user's JWT (from g.jwt_token).
    Creates a fresh client per request to avoid global state pollution across threads.
    """
    token = getattr(g, 'jwt_token', None)
    if token:
        cached = getattr(g, '_auth_supabase', None)
        if cached:
            return cached
        client = _make_client()
        client.postgrest.auth(token)
        g._auth_supabase = client
        return client
    return get_supabase()