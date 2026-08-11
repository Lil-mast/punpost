from django.urls import path
from .views import PostListCreateView, PostDetailView, CommentListCreateView, CommentDetailView

urlpatterns = [
    path("", PostListCreateView.as_view(), name="post-list-create"),
    path("<slug:slug>/", PostDetailView.as_view(), name="post-detail"),

    # Comments
    path("<slug:slug>/comments/", CommentListCreateView.as_view(), name="comment-list-create"),
    path("<slug:slug>/comments/<str:comment_id>/", CommentDetailView.as_view(), name="comment-detail"),
]