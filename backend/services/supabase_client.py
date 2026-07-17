import os
import certifi

os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import httpx

_supabase: Client | None = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(
            SUPABASE_URL, SUPABASE_KEY,
            http_client=httpx.Client(
                verify=certifi.where(),
                http2=False,
                timeout=httpx.Timeout(30.0),
            )
        )
    return _supabase

def get_user_supabase(token: str) -> Client:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.postgrest.auth(token)
    return client
