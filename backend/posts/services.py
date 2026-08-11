from core.convex_client import query, mutation
from django.contrib.auth import get_user_model
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
import re
from typing import Optional

User = get_user_model()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80]


def list_published_posts(limit: int = 20, cursor: Optional[str] = None):
    args = {}
    if cursor is not None:
        args["paginationOpts"] = {"numItems": limit, "cursor": cursor}
    else:
        # simple take for now
        result = query("posts:listPublished", {})
        return result

    return query("posts:listPublished", args)


def get_post_by_slug(slug: str):
    post = query("posts:getBySlug", {"slug": slug})
    if not post:
        raise NotFound("Post not found")
    return post


def create_post(
    *,
    title: str,
    content: str,
    author: User,
    excerpt: str = None,
    cover_image: str = None,
    status: str = "draft",
    tags: list[str] = None,
):
    if not author.convex_id:
        raise ValidationError("User is not synced with Convex")

    if author.role not in ("author", "admin"):
        raise PermissionDenied("Only authors and admins can create posts")

    slug = slugify(title)

    # Ensure unique slug (simple version)
    existing = query("posts:getBySlug", {"slug": slug})
    if existing:
        slug = f"{slug}-{int(__import__('time').time())}"

    post_id = mutation("posts:create", {
        "title": title,
        "slug": slug,
        "content": content,
        "excerpt": excerpt,
        "coverImage": cover_image,
        "authorId": author.convex_id,
        "status": status,
        "tags": tags or [],
    })

    return get_post_by_slug(slug)