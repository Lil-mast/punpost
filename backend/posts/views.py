from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from core.permissions import IsAuthorOrReadOnly, IsAuthor
from .serializers import PostCreateSerializer, PostSerializer, CommentCreateSerializer, CommentUpdateSerializer, CommentSerializer
from . import services
from core.throttling import PostCreateRateThrottle


class PostListCreateView(APIView):
    """
    GET  /api/posts/          → list published posts (public)
    POST /api/posts/          → create post (authors + admins only)
    """
    permission_classes = [IsAuthorOrReadOnly]


    def get(self, request):
        posts = services.list_published_posts()
        serializer = PostSerializer(posts, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.create_post(
            title=serializer.validated_data["title"],
            content=serializer.validated_data["content"],
            author=request.user,
            excerpt=serializer.validated_data.get("excerpt"),
            cover_image=serializer.validated_data.get("cover_image"),
            status=serializer.validated_data.get("status", "draft"),
            tags=serializer.validated_data.get("tags", []),
        )

        return Response(
            PostSerializer(post).data,
            status=status.HTTP_201_CREATED
        )
    def get_throttles(self):
        if self.request.method == "POST":
            return [PostCreateRateThrottle()]
        return []


class PostDetailView(APIView):
    """
    GET /api/posts/<slug>/    → get single post by slug (public)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        post = services.get_post_by_slug(slug)
        return Response(PostSerializer(post).data)

class CommentListCreateView(APIView):
    """
    GET  /api/posts/<slug>/comments/     → list comments (public)
    POST /api/posts/<slug>/comments/     → create comment (authenticated)
    """
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get(self, request, slug):
        comments = services.list_comments(slug)
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, slug):
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = services.create_comment(
            post_slug=slug,
            author=request.user,
            content=serializer.validated_data["content"],
            parent_id=serializer.validated_data.get("parent_id"),
        )
        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED
        )


class CommentDetailView(APIView):
    """
    PATCH  /api/posts/<slug>/comments/<comment_id>/   → edit (owner/admin)
    DELETE /api/posts/<slug>/comments/<comment_id>/   → soft delete (owner/admin)
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, slug, comment_id):
        serializer = CommentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = services.update_comment(
            comment_id=comment_id,
            user=request.user,
            content=serializer.validated_data.get("content", ""),
        )
        return Response(CommentSerializer(comment).data)

    def delete(self, request, slug, comment_id):
        services.delete_comment(comment_id=comment_id, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)