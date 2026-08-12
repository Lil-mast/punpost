from dj_rest_auth.views import LoginView
from core.throttling import LoginRateThrottle


class ThrottledLoginView(LoginView):
    throttle_classes = [LoginRateThrottle]