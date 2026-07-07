"""
OpenAI-compatible client management. One place resolves a provider key into a
(client, model) pair, resolving local models against whatever LM Studio has
loaded, and cheaply checks reachability for the UI.
"""
from config import PROVIDER, PROVIDERS

_clients = {}  # provider_key -> client


def is_local_provider(key):
    cfg = PROVIDERS[key]
    base_url = cfg["base_url"]
    return "localhost" in base_url or "127.0.0.1" in base_url


def _client_for(key):
    if key in _clients:
        return _clients[key]
    from openai import OpenAI
    cfg = PROVIDERS[key]
    client = OpenAI(base_url=cfg["base_url"], api_key=cfg["api_key"], timeout=120)
    _clients[key] = client
    return client


def list_provider_models(key):
    if not is_local_provider(key):
        return []
    try:
        client = _client_for(key)
        data = client.models.list().data
        return [m.id for m in data if getattr(m, "id", None)]
    except Exception:
        return []


def get_client(provider=None, model=None):
    key = provider if provider in PROVIDERS else PROVIDER
    client = _client_for(key)
    resolved_model = model or PROVIDERS[key]["model"]
    if is_local_provider(key):
        ids = list_provider_models(key)
        if resolved_model not in ids:
            resolved_model = ids[0] if ids else resolved_model
    return client, resolved_model


def provider_available(key):
    """Cheap reachability check used to grey out options in the UI."""
    if is_local_provider(key):
        return bool(list_provider_models(key))
    cfg = PROVIDERS[key]
    # cloud: available only if a real key was filled in
    return not cfg["api_key"].upper().startswith(("SK-REPLACE", "REPLACE"))
