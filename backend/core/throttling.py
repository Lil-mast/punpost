from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Strict limit on login attempts.
    Burst: 5 requests per minute per IP.
    """
    scope = "login"

    def get_cache_key(self, request, view):
        # Throttle by IP for login
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request)
        }


class PostCreateRateThrottle(SimpleRateThrottle):
    """
    Limit how many posts a user can create.
    Sustained: 10 posts per hour per user.
    """
    scope = "post_create"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": ident
        }