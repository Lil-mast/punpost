from core.convex_client import mutation, query
from django.contrib.auth import get_user_model

User = get_user_model()


def sync_user_to_convex(user: User) -> str | None:
    """
    Create or update the user document in Convex.
    Returns the Convex document ID.
    """
    try:
        # Check if user already exists in Convex
        existing = query("users:getByEmail", {"email": user.email})

        if existing:
            # Already exists → just return the ID
            convex_id = existing["_id"]
        else:
            # Create new user in Convex
            convex_id = mutation("users:create", {
                "email": user.email,
                "name": user.get_full_name() or user.username,
                "username": user.username or None,
                "role": user.role,
            })

        # Save Convex ID on the Django user
        if user.convex_id != convex_id:
            user.convex_id = convex_id
            user.save(update_fields=["convex_id"])

        return convex_id
    except Exception as e:
        print(f"[Convex Sync Error] {e}")
        return None