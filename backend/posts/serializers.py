from rest_framework import serializers


class PostCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    excerpt = serializers.CharField(required=False, allow_blank=True, max_length=500)
    cover_image = serializers.URLField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=["draft", "published", "archived"],
        default="draft"
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list
    )


class PostSerializer(serializers.Serializer):
    """Read serializer – maps Convex document (dict) to clean API response."""
    id = serializers.CharField()
    title = serializers.CharField()
    slug = serializers.CharField()
    content = serializers.CharField()
    excerpt = serializers.CharField(required=False, allow_null=True)
    cover_image = serializers.CharField(required=False, allow_null=True)
    author_id = serializers.CharField()
    status = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField())
    published_at = serializers.IntegerField(required=False, allow_null=True)
    created_at = serializers.IntegerField()
    updated_at = serializers.IntegerField()
    view_count = serializers.IntegerField()

    def to_representation(self, instance):
        data = instance if isinstance(instance, dict) else {}
        return {
            "id": data.get("_id") or data.get("id"),
            "title": data.get("title"),
            "slug": data.get("slug"),
            "content": data.get("content"),
            "excerpt": data.get("excerpt"),
            "cover_image": data.get("coverImage") or data.get("cover_image"),
            "author_id": data.get("authorId") or data.get("author_id"),
            "status": data.get("status"),
            "tags": data.get("tags") or [],
            "published_at": data.get("publishedAt") or data.get("published_at"),
            "created_at": data.get("createdAt") or data.get("created_at"),
            "updated_at": data.get("updatedAt") or data.get("updated_at"),
            "view_count": data.get("viewCount") or data.get("view_count") or 0,
        }

class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=2000)
    parent_id = serializers.CharField(required=False, allow_null=True)


class CommentUpdateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=2000)


class CommentSerializer(serializers.Serializer):
    id = serializers.CharField(source="_id")
    post_id = serializers.CharField(source="postId")
    author_id = serializers.CharField(source="authorId")
    content = serializers.CharField()
    parent_id = serializers.CharField(source="parentId", required=False, allow_null=True)
    created_at = serializers.IntegerField(source="createdAt")
    updated_at = serializers.IntegerField(source="updatedAt")