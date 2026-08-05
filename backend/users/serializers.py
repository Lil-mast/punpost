from rest_framework import serializers
from django.contrib.auth import get_user_model
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer

User = get_user_model()


class CustomRegisterSerializer(RegisterSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=["reader", "author"],
        default="reader",
        required=False
    )

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["role"] = self.validated_data.get("role", "reader")
        return data

    def save(self, request):
        user = super().save(request)
        user.role = self.cleaned_data.get("role", "reader")
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "role", "convex_id", "date_joined"]
        read_only_fields = ["id", "convex_id", "date_joined"]