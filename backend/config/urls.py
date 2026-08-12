from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from users.views_auth import ThrottledLoginView


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://127.0.0.1:8000/accounts/google/login/callback/"
    client_class = OAuth2Client


class GitHubLogin(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = "http://127.0.0.1:8000/accounts/github/login/callback/"
    client_class = OAuth2Client


urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),

    # Social login (JWT)
    path("api/auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("api/auth/github/", GitHubLogin.as_view(), name="github_login"),

    # allauth URLs (needed for the callback)
    path("accounts/", include("allauth.urls")),

    # Apps
    path("api/", include("core.urls")),
    path("api/users/", include("users.urls")),
    path("api/posts/", include("posts.urls")),
    path("api/billing/", include("billing.urls")),

    # Throttled login view
    path("api/auth/login/", ThrottledLoginView.as_view(), name="rest_login"),
    path("api/auth/logout/", include("dj_rest_auth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)