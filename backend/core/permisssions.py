from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Only users with role = admin."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsAuthor(BasePermission):
    """Only users with role = author or admin."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("author", "admin")
        )


class IsAuthorOrReadOnly(BasePermission):
    """
    Read: anyone (even anonymous)
    Write: any authenticated user (readers can draft/publish too)
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: only the owner of the object or an admin can modify it.
    Assumes the model has an `author` or `user` field.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True

        # Support both common field names
        owner = getattr(obj, "author", None) or getattr(obj, "user", None)
        if owner is None:
            return False

        # owner can be a Django User or a Convex ID string
        if hasattr(owner, "id"):
            return owner.id == request.user.id
        return str(owner) == str(request.user.convex_id)