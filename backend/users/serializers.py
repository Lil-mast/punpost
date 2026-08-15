from rest_framework import serializers
from django.contrib.auth import get_user_model
from dj_rest_auth.registration.serializers import RegisterSerializer

User = get_user_model()


class CustomRegisterSerializer(RegisterSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=["reader", "author"],
        default="reader",
        required=False,
    )

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["role"] = self.validated_data.get("role", "reader")
        email = data.get("email") or ""
        username = (data.get("username") or "").strip()
        if not username and email:
            base = email.split("@")[0][:120]
            candidate = base
            n = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base}{n}"
                n += 1
            data["username"] = candidate
        return data

    def save(self, request):
        user = super().save(request)
        user.role = self.cleaned_data.get("role", "reader")
        if not user.username and user.email:
            user.username = user.email.split("@")[0][:140]
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "role", "convex_id", "date_joined"]
        read_only_fields = ["id", "convex_id", "date_joined"]
