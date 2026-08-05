from django.db import models

from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)
    convex_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    role = models.CharField(
        max_length=20,
        choices=[
            ("reader", "Reader"),
            ("author", "Author"),
            ("admin", "Admin"),
        ],
        default="reader",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email