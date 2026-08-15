from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return True


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        return True

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if not user.username and user.email:
            user.username = user.email.split("@")[0][:140]
        # Writing platform: OAuth users can publish immediately
        if not getattr(user, "role", None) or user.role == "reader":
            user.role = "author"
        return user

    def get_connect_redirect_url(self, request, socialaccount):
        return settings.LOGIN_REDIRECT_URL
