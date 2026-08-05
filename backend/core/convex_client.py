from functools import lru_cache
from django.conf import settings
from convex import ConvexClient


@lru_cache(maxsize=1)
def get_convex_client() -> ConvexClient:
    if not settings.CONVEX_URL:
        raise RuntimeError(
            "CONVEX_URL is not set. Add it to your .env file"
        )
    return ConvexClient(settings.CONVEX_URL)


def query(path: str, args: dict | None = None):
    client = get_convex_client()
    return client.query(path, args or {})


def mutation(path: str, args: dict | None = None):
    client = get_convex_client()
    return client.mutation(path, args or {})