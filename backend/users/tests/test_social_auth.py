from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from allauth.socialaccount.models import SocialAccount, SocialLogin
from types import SimpleNamespace
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from unittest.mock import patch
import json


def _fake_parse_token(self, tokens):
    # Return a lightweight token-like object to avoid accessing related fields
    return SimpleNamespace(token=tokens.get("access_token", "fake"), account=None)


def _fake_complete_login(self, request, app, token, response=None):
    User = get_user_model()
    # create unsaved user; SocialLogin.save will persist it
    user = User(username="oauthuser", email="oauth@example.com")
    account = SocialAccount(provider=getattr(self, "provider_id", "test"), uid="123", extra_data={})
    return SocialLogin(user=user, account=account, token=token)


class SocialAuthTests(TestCase):
    def setUp(self):
        self.client = Client()

    @patch("dj_rest_auth.registration.serializers.complete_social_login", lambda request, login: None)
    def test_google_social_login(self):
        with patch.object(GoogleOAuth2Adapter, "parse_token", _fake_parse_token), \
             patch.object(GoogleOAuth2Adapter, "complete_login", _fake_complete_login):
            resp = self.client.post(
                "/api/auth/google/",
                data=json.dumps({"access_token": "fake"}),
                content_type="application/json",
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("access", data)
            self.assertIn("refresh", data)

    @patch("dj_rest_auth.registration.serializers.complete_social_login", lambda request, login: None)
    def test_github_social_login(self):
        with patch.object(GitHubOAuth2Adapter, "parse_token", _fake_parse_token), \
             patch.object(GitHubOAuth2Adapter, "complete_login", _fake_complete_login):
            resp = self.client.post(
                "/api/auth/github/",
                data=json.dumps({"access_token": "fake"}),
                content_type="application/json",
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("access", data)
            self.assertIn("refresh", data)
