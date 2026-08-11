from core.convex_client import mutation, query
from django.contrib.auth import get_user_model

User = get_user_model()


def sync_user_to_convex(user: User, extra_data: dict | None = None) -> str | None:
    """
    Create or update the user document in Convex.
    Returns the Convex document ID.
    """
    extra_data = extra_data or {}

    try:
        # Check if user already exists in Convex
        existing = query("users:getByEmail", {"email": user.email})

        if existing:
            # Already exists → just return the ID
            convex_id = existing["_id"]
        else:
            # Doesn't exist → create a new user in Convex
            payload = {
                "email": user.email,
                "name": user.get_full_name() or user.username or extra_data.get("name"),
                "username": user.username or None,
                "role": user.role or "reader",
            }

            # Add provider IDs if present
            if extra_data.get("google_id"):
                payload["googleId"] = extra_data["google_id"]
            if extra_data.get("github_id"):
                payload["githubId"] = extra_data["github_id"]

            convex_id = mutation("users:create", payload)

        # Save Convex ID on the Django user
        if user.convex_id != convex_id:
            user.convex_id = convex_id
            user.save(update_fields=["convex_id"])

        return convex_id
    except Exception as e:
        print(f"[Convex Sync Error] {e}")
        return None