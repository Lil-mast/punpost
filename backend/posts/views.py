from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from core.permissions import IsAuthorOrReadOnly, IsAuthor
from .serializers import PostCreateSerializer, PostSerializer
from . import services


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


class PostDetailView(APIView):
    """
    GET /api/posts/<slug>/    → get single post by slug (public)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        post = services.get_post_by_slug(slug)
        return Response(PostSerializer(post).data)