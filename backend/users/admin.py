from django.contrib import admin

# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "role", "convex_id", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("email", "username", "convex_id")
    ordering = ("email",)

    fieldsets = BaseUserAdmin.fieldsets + (
        ("PunPost", {"fields": ("convex_id", "role")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("PunPost", {"fields": ("convex_id", "role")}),
    )