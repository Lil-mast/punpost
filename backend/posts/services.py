from core.convex_client import query, mutation
from django.contrib.auth import get_user_model
from rest_framework.exceptions import NotFound, ValidationError
import re
import time

User = get_user_model()


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:80]


def _unwrap_posts(result):
    """Convex may return a bare list or a paginated {page, continueCursor, isDone}."""
    if result is None:
        return []
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        page = result.get("page")
        if isinstance(page, list):
            return page
    return []


def list_published_posts(limit: int = 20, cursor: str | None = None):
    args = {
        "paginationOpts": {
            "numItems": limit,
            "cursor": cursor,
        }
    }
    result = query("posts:listPublished", args)
    return _unwrap_posts(result)


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
    from users.services import sync_user_to_convex

    if not author.convex_id:
        sync_user_to_convex(author)
        author.refresh_from_db()

    if not author.convex_id:
        raise ValidationError(
            "Your account is not synced yet. Please try again in a moment, "
            "or check that Convex is configured."
        )

    # First publish/draft promotes reader → author
    if author.role == "reader":
        author.role = "author"
        author.save(update_fields=["role"])

    slug = slugify(title)

    existing = query("posts:getBySlug", {"slug": slug})
    if existing:
        slug = f"{slug}-{int(time.time())}"

    # Convex optional fields must be omitted — null fails v.optional(v.string())
    payload = {
        "title": title,
        "slug": slug,
        "content": content,
        "authorId": author.convex_id,
        "status": status,
        "tags": tags or [],
    }
    if excerpt:
        payload["excerpt"] = excerpt
    if cover_image:
        payload["coverImage"] = cover_image

    try:
        mutation("posts:create", payload)
    except Exception as exc:
        raise ValidationError(f"Failed to create post: {exc}") from exc

    return get_post_by_slug(slug)


# Comments

def list_comments(post_slug: str):
    post = get_post_by_slug(post_slug)
    comments = query("comments:listByPost", {"postId": post["_id"]})
    return comments or []


def create_comment(
    *,
    post_slug: str,
    author: User,
    content: str,
    parent_id: str = None,
):
    from users.services import sync_user_to_convex

    if not author.convex_id:
        sync_user_to_convex(author)
        author.refresh_from_db()

    if not author.convex_id:
        raise ValidationError("User is not synced with Convex")

    post = get_post_by_slug(post_slug)
    payload = {
        "postId": post["_id"],
        "authorId": author.convex_id,
        "content": content,
    }
    if parent_id:
        payload["parentId"] = parent_id

    comment_id = mutation("comments:create", payload)
    comments = list_comments(post_slug)
    for c in comments:
        if c.get("_id") == comment_id:
            return c
    return {"_id": comment_id, **payload, "createdAt": int(time.time() * 1000), "updatedAt": int(time.time() * 1000)}


def update_comment(*, comment_id: str, user: User, content: str):
    mutation("comments:update", {"id": comment_id, "content": content})
    comment = query("comments:getById", {"id": comment_id})
    if not comment:
        raise NotFound("Comment not found")
    return comment


def delete_comment(*, comment_id: str, user: User):
    mutation("comments:softDelete", {"id": comment_id})
