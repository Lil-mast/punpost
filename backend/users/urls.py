from django.urls import path
from .views import MeView, UserDetailView, UserListView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("", UserListView.as_view(), name="user-list"),        
    path("<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]