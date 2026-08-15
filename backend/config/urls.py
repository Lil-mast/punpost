from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from users.views_auth import ThrottledLoginView
from users.views_oauth import oauth_complete


def _callback_url(provider: str) -> str:
    base = getattr(settings, "BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
    return f"{base}/accounts/{provider}/login/callback/"


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    @property
    def callback_url(self):
        return _callback_url("google")


class GitHubLogin(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    client_class = OAuth2Client

    @property
    def callback_url(self):
        return _callback_url("github")


urlpatterns = [
    path("admin/", admin.site.urls),

    # Throttled login must be registered BEFORE dj_rest_auth.urls
    path("api/auth/login/", ThrottledLoginView.as_view(), name="rest_login"),

    # Auth
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),

    # Social login (token exchange API — for access_token clients)
    path("api/auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("api/auth/github/", GitHubLogin.as_view(), name="github_login"),

    # Bridge: allauth session → JWT → frontend
    path("api/auth/oauth/complete/", oauth_complete, name="oauth_complete"),

    # allauth browser OAuth (Google/GitHub redirects)
    path("accounts/", include("allauth.urls")),

    # Apps
    path("api/", include("core.urls")),
    path("api/users/", include("users.urls")),
    path("api/posts/", include("posts.urls")),
    path("api/billing/", include("billing.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
