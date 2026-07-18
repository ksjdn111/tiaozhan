import os
import certifi

os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions
from config import SUPABASE_URL, SUPABASE_KEY
import httpx
from flask import g

_supabase: Client | None = None

def _make_client() -> Client:
    try:
        options = SyncClientOptions(
            httpx_client=httpx.Client(
                verify=certifi.where(),
                http2=False,
                timeout=httpx.Timeout(30.0),
            )
        )
        c = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)
        c.from_('challenges').select('id').limit(1).execute()
        return c
    except Exception:
        options = SyncClientOptions(
            httpx_client=httpx.Client(
                verify=False,
                http2=False,
                timeout=httpx.Timeout(30.0),
            )
        )
        return create_client(SUPABASE_URL, SUPABASE_KEY, options=options)

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = _make_client()
    return _supabase

def get_auth_supabase() -> Client:
    """Get a supabase client authenticated with the current user's JWT (from g.jwt_token)."""
    client = get_supabase()
    token = getattr(g, 'jwt_token', None)
    if token:
        client.postgrest.auth(token)
    return client