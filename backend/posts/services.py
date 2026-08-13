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


def list_published_posts(limit: int = 10, cursor: str | None = None):
    args = {
        "paginationOpts": {
            "numItems": limit,
            "cursor": cursor,
        }
    }
    result = query("posts:listPublished", args)
    return result


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

# Comments

def list_comments(post_slug: str):
    post = get_post_by_slug(post_slug)
    comments = query("comments:listByPost", {"postId": post["_id"]})
    return comments


def create_comment(
    *,
    post_slug: str,
    author: User,
    content: str,
    parent_id: str = None,
):
    if not author.convex_id:
        raise ValidationError("User is not synced with Convex")

    post = get_post_by_slug(post_slug)

    comment_id = mutation("comments:create", {
        "postId": post["_id"],
        "authorId": author.convex_id,
        "content": content,
        "parentId": parent_id,
    })

    return query("comments:getById", {"id": comment_id})


def update_comment(*, comment_id: str, user: User, content: str):
    comment = query("comments:getById", {"id": comment_id})
    if not comment or comment.get("isDeleted"):
        raise NotFound("Comment not found")

    if user.role != "admin" and comment["authorId"] != user.convex_id:
        raise PermissionDenied("You can only edit your own comments")

    mutation("comments:update", {
        "id": comment_id,
        "content": content,
    })

    return query("comments:getById", {"id": comment_id})


def delete_comment(*, comment_id: str, user: User):
    comment = query("comments:getById", {"id": comment_id})
    if not comment or comment.get("isDeleted"):
        raise NotFound("Comment not found")

    if user.role != "admin" and comment["authorId"] != user.convex_id:
        raise PermissionDenied("You can only delete your own comments")

    mutation("comments:softDelete", {"id": comment_id})
    return True