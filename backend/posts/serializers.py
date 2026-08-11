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
    """Read serializer – maps Convex document to clean API response."""
    id = serializers.CharField(source="_id")
    title = serializers.CharField()
    slug = serializers.CharField()
    content = serializers.CharField()
    excerpt = serializers.CharField(required=False, allow_null=True)
    cover_image = serializers.CharField(source="coverImage", required=False, allow_null=True)
    author_id = serializers.CharField(source="authorId")
    status = serializers.CharField()
    tags = serializers.ListField(child=serializers.CharField())
    published_at = serializers.IntegerField(source="publishedAt", required=False, allow_null=True)
    created_at = serializers.IntegerField(source="createdAt")
    updated_at = serializers.IntegerField(source="updatedAt")
    view_count = serializers.IntegerField(source="viewCount")

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