from datetime import datetime, timedelta
from typing import Any

cache_store: dict[str, tuple[Any, datetime]] = {}


def get_cache(key: str) -> Any | None:
    if key not in cache_store:
        return None
    value, expiry = cache_store[key]
    if datetime.now() > expiry:
        del cache_store[key]
        return None
    return value


def set_cache(key: str, value: Any, ttl_seconds: int = 5) -> None:
    expiry = datetime.now() + timedelta(seconds=ttl_seconds)
    cache_store[key] = (value, expiry)


def clear_cache(key: str | None = None) -> None:
    if key:
        cache_store.pop(key, None)
    else:
        cache_store.clear()
