from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlencode


@login_required
def oauth_complete(request):
    """
    After allauth social login, issue JWTs and send the user back to the SPA.
    """
    user = request.user
    if not user.is_authenticated:
        return HttpResponseBadRequest("Not authenticated")

    refresh = RefreshToken.for_user(user)
    params = urlencode(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
    )
    frontend = settings.FRONTEND_URL.rstrip("/")
    return redirect(f"{frontend}/auth/callback?{params}")
