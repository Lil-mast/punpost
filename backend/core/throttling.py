from rest_framework.throttling import SimpleRateThrottle


def get_client_ip(request):
    """Get client IP respecting X-Forwarded-For when behind a trusted proxy."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


class LoginRateThrottle(SimpleRateThrottle):
    """
    Strict limit on login attempts.
    Burst: 5 requests per minute per IP.
    """
    scope = "login"

    def get_cache_key(self, request, view):
        # Throttle by IP for login (respects X-Forwarded-For via get_client_ip)
        ident = get_client_ip(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PostCreateRateThrottle(SimpleRateThrottle):
    """
    Limit how many posts a user can create.
    Sustained: 10 posts per hour per user.
    """
    scope = "post_create"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = str(request.user.pk)
        else:
            ident = get_client_ip(request)

        return self.cache_format % {"scope": self.scope, "ident": ident}