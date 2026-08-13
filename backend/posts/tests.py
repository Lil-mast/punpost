from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class CommentEndpointsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        
        self.author = User.objects.create_user(
            username="author",
            email="author@test.com",
            password="testpass123",
            role="author",
        )
        self.author.convex_id = "user_author_123"
        self.author.save()
        
        self.other_user = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="testpass123",
            role="reader",
        )
        self.other_user.convex_id = "user_other_123"
        self.other_user.save()
        
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123",
            role="admin",
        )
        self.admin.convex_id = "user_admin_123"
        self.admin.save()
        
        self.post_slug = "test-post"
        
        self.mock_post = {
            "_id": "post_123",
            "slug": self.post_slug,
            "title": "Test Post",
            "content": "Test content",
        }
        
        self.mock_comment = {
            "_id": "comment_123",
            "postId": "post_123",
            "authorId": "user_author_123",
            "content": "Original comment",
            "parentId": None,
            "createdAt": 1234567890,
            "updatedAt": 1234567890,
            "isDeleted": False,
        }

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_get_comments_anyone(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "posts:getBySlug": self.mock_post,
            "comments:listByPost": [self.mock_comment],
        }.get(name)
        
        response = self.client.get(f"/api/posts/{self.post_slug}/comments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_post_comment_authenticated(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "posts:getBySlug": self.mock_post,
            "comments:getById": {**self.mock_comment, "content": "Great post!", "authorId": "user_author_123"},
        }.get(name)
        mock_mutation.return_value = "comment_123"
        
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            f"/api/posts/{self.post_slug}/comments/",
            {"content": "Great post!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Great post!")

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_post_comment_unauthenticated(self, mock_mutation, mock_query):
        response = self.client.post(
            f"/api/posts/{self.post_slug}/comments/",
            {"content": "Great post!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_patch_comment_owner(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.author)
        response = self.client.patch(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
            {"content": "Updated comment"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_mutation.assert_called()

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_patch_comment_admin(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
            {"content": "Admin updated"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_mutation.assert_called()

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_patch_comment_not_owner(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.other_user)
        response = self.client.patch(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
            {"content": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_delete_comment_owner(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.author)
        response = self.client.delete(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_mutation.assert_called()

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_delete_comment_admin(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        mock_mutation.assert_called()

    @patch("posts.services.query")
    @patch("posts.services.mutation")
    def test_delete_comment_not_owner(self, mock_mutation, mock_query):
        mock_query.side_effect = lambda name, args: {
            "comments:getById": self.mock_comment,
        }.get(name)
        
        self.client.force_authenticate(user=self.other_user)
        response = self.client.delete(
            f"/api/posts/{self.post_slug}/comments/{self.mock_comment['_id']}/",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("posts.services.create_post")
    def test_post_creation_throttle(self, mock_create_post):
        def make_post(**kwargs):
            title = kwargs.get("title") or "Title"
            slug = title.lower().replace(" ", "-")
            return {
                "_id": f"post_{slug}",
                "title": title,
                "slug": slug,
                "content": kwargs.get("content", ""),
                "excerpt": None,
                "coverImage": None,
                "authorId": self.author.convex_id,
                "status": kwargs.get("status", "draft"),
                "tags": [],
                "publishedAt": None,
                "createdAt": 123,
                "updatedAt": 123,
                "viewCount": 0,
            }

        mock_create_post.side_effect = make_post
        self.client.force_authenticate(user=self.author)

        for i in range(1, 12):
            resp = self.client.post("/api/posts/", {"title": f"Post {i}", "content": "x"}, format="json")
            if i <= 10:
                self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            else:
                self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
                self.assertIn("Request was throttled", resp.data.get("detail", ""))
                self.assertIn("Expected available in", resp.data.get("detail", ""))

    @patch("posts.services.create_post")
    def test_post_creation_throttle_multiple_users_and_ips(self, mock_create_post):
        def make_post(**kwargs):
            title = kwargs.get("title") or "Title"
            slug = title.lower().replace(" ", "-")
            return {
                "_id": f"post_{slug}",
                "title": title,
                "slug": slug,
                "content": kwargs.get("content", ""),
                "excerpt": None,
                "coverImage": None,
                "authorId": self.author.convex_id,
                "status": kwargs.get("status", "draft"),
                "tags": [],
                "publishedAt": None,
                "createdAt": 123,
                "updatedAt": 123,
                "viewCount": 0,
            }

        mock_create_post.side_effect = make_post

        # Use two different authenticated creators (author and admin)
        # Verify each has an independent 10-per-hour limit (11th -> 429)
        # Author: create 10 posts from IP1, then attempt 11th from IP2
        self.client.force_authenticate(user=self.author)
        for i in range(1, 11):
            resp = self.client.post(
                "/api/posts/",
                {"title": f"A1 Post {i}", "content": "x"},
                format="json",
                HTTP_X_FORWARDED_FOR="1.1.1.1",
            )
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        # 11th request from a different IP should still be throttled (keyed by user)
        resp = self.client.post(
            "/api/posts/",
            {"title": "A1 Post 11", "content": "x"},
            format="json",
            HTTP_X_FORWARDED_FOR="2.2.2.2",
        )
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Admin: independent counter
        self.client.force_authenticate(user=self.admin)
        for i in range(1, 11):
            resp = self.client.post(
                "/api/posts/",
                {"title": f"Admin Post {i}", "content": "x"},
                format="json",
                HTTP_X_FORWARDED_FOR="1.1.1.1",
            )
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        resp = self.client.post(
            "/api/posts/",
            {"title": "Admin Post 11", "content": "x"},
            format="json",
            HTTP_X_FORWARDED_FOR="1.1.1.1",
        )
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)