# Rate Limiting & Throttling Documentation

## Overview

This document describes the rate limiting and throttling implementation in the PunPost backend system. The system uses Django REST Framework's built-in throttling classes with custom throttles for specific endpoints.

## Architecture

### Throttle Classes (`backend/core/throttling.py`)

| Class | Scope | Limit | Key Strategy |
|-------|-------|-------|--------------|
| `LoginRateThrottle` | `login` | 5 requests/minute | IP address (`get_ident`) |
| `PostCreateRateThrottle` | `post_create` | 10 requests/hour | Authenticated user ID (falls back to IP) |

### Default Throttle Configuration (`backend/config/settings.py`)

```python
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",      # Anonymous users
        "user": "1000/hour",     # Authenticated users
        "login": "5/minute",     # Login endpoint
        "post_create": "10/hour", # Post creation per user
    },
}
```

## Endpoint Implementation

### Login (`backend/users/views_auth.py`)

```python
from dj_rest_auth.views import LoginView
from core.throttling import LoginRateThrottle

class ThrottledLoginView(LoginView):
    throttle_classes = [LoginRateThrottle]
```

- **URL**: `/api/auth/login/`
- **Limit**: 5 attempts per minute per IP
- **Use case**: Prevents brute-force attacks

### Post Creation (`backend/posts/views.py`)

```python
class PostListCreateView(APIView):
    def get_throttles(self):
        if self.request.method == "POST":
            return [PostCreateRateThrottle()]
        return []
```

- **URL**: `POST /api/posts/`
- **Limit**: 10 posts per hour per authenticated user
- **Key**: User ID (not IP) - so switching IPs doesn't bypass limit
- **Use case**: Prevents spam post creation

### Default Throttling (All Other Endpoints)

- **Anonymous**: 100 requests/hour per IP
- **Authenticated**: 1000 requests/hour per user ID

## Technical Implementation Details

### Cache Key Generation

**LoginRateThrottle** - IP-based:
```python
def get_cache_key(self, request, view):
    return self.cache_format % {
        "scope": self.scope,
        "ident": self.get_ident(request)  # IP address
    }
```

**PostCreateRateThrottle** - User-based:
```python
def get_cache_key(self, request, view):
    if request.user and request.user.is_authenticated:
        ident = request.user.pk  # User ID
    else:
        ident = self.get_ident(request)  # Fallback to IP
    return self.cache_format % {
        "scope": self.scope,
        "ident": ident
    }
```

### Redis Backend

The system uses Redis for distributed rate limiting (configured in `requirements.txt`):
```
# Redis (sessions + rate limiting + idempotency)
django-ratelimit>=4.1.0
```

Cache keys follow format: `throttle_{scope}_{ident}`

### Response on Throttle (HTTP 429)

```json
{
  "detail": "Request was throttled. Expected available in 3600 seconds."
}
```

Headers included:
- `Retry-After`: Seconds until next request allowed
- `X-RateLimit-Limit`: Maximum requests in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Tests (`backend/posts/tests.py`)

### Test Coverage

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `test_post_creation_throttle` | Single user creates 11 posts | First 10: 201, 11th: 429 |
| `test_post_creation_throttle_multiple_users_and_ips` | Two users, different IPs | Each user has independent 10/hour limit |

### Running Tests

```bash
# Run all throttling tests
cd backend
python manage.py test posts.tests.CommentEndpointsTest.test_post_creation_throttle -v 2
python manage.py test posts.tests.CommentEndpointsTest.test_post_creation_throttle_multiple_users_and_ips -v 2

# Run all post tests
python manage.py test posts.tests -v 2

# Run with coverage
coverage run --source='.' manage.py test posts.tests
coverage report
```

### Test Implementation Details

The tests mock `posts.services.create_post` to avoid database writes and test pure throttling logic:

```python
@patch("posts.services.create_post")
def test_post_creation_throttle(self, mock_create_post):
    # Mock returns fake post data
    mock_create_post.side_effect = make_post
    
    # Authenticate as author
    self.client.force_authenticate(user=self.author)
    
    # Send 11 requests - 11th should be 429
    for i in range(1, 12):
        resp = self.client.post("/api/posts/", {...})
        if i <= 10:
            assert resp.status_code == 201
        else:
            assert resp.status_code == 429
            assert "Request was throttled" in resp.data["detail"]
```

## Postman Testing

### Collection Structure

Create a Postman collection with these requests:

#### 1. Login Throttle Test
```
POST {{base_url}}/api/auth/login/
Headers: Content-Type: application/json
Body: {"email": "test@test.com", "password": "wrongpass"}
```
- Send 6 times rapidly
- Expect: First 5 return 400/401, 6th returns 429

#### 2. Post Creation Throttle Test
```
POST {{base_url}}/api/posts/
Headers: 
  Authorization: Bearer {{access_token}}
  Content-Type: application/json
Body: {"title": "Test Post {{$randomInt}}", "content": "Content", "status": "draft"}
```
- Send 11 times rapidly
- Expect: First 10 return 201, 11th returns 429

#### 3. Multi-User/IP Test
```
# As User A (IP 1.1.1.1) - 10 requests
Headers: X-Forwarded-For: 1.1.1.1

# As User A (IP 2.2.2.2) - 11th request
Headers: X-Forwarded-For: 2.2.2.2

# As User B (any IP) - 10 requests (independent counter)
```

### Postman Test Scripts

Add to "Tests" tab for automatic verification:

```javascript
// Check throttle headers
pm.test("Rate limit headers present", function () {
    pm.response.to.have.header("X-RateLimit-Limit");
    pm.response.to.have.header("X-RateLimit-Remaining");
    pm.response.to.have.header("X-RateLimit-Reset");
});

// Check 429 response
pm.test("Throttled at limit", function () {
    if (pm.response.code === 429) {
        pm.expect(pm.response.json().detail).to.include("throttled");
    }
});
```

## Configuration Tuning

### Environment Variables

Add to `.env` for production tuning:

```env
# Throttle rates (override defaults)
THROTTLE_ANON_RATE=100/hour
THROTTLE_USER_RATE=1000/hour
THROTTLE_LOGIN_RATE=5/minute
THROTTLE_POST_CREATE_RATE=10/hour

# Redis for distributed rate limiting
REDIS_URL=redis://localhost:6379/1
```

### Adjusting Limits

Edit `backend/config/settings.py`:

```python
"DEFAULT_THROTTLE_RATES": {
    "anon": "200/hour",        # Increase for public API
    "user": "5000/hour",       # Increase for power users
    "login": "10/minute",      # Relax for better UX
    "post_create": "20/hour",  # Allow more posts
}
```

## Monitoring & Debugging

### Check Current Cache Keys

```bash
# Redis CLI
redis-cli KEYS "throttle_*"

# View specific key
redis-cli GET "throttle_post_create_1"
```

### Log Throttle Events

Add to `settings.py`:

```python
LOGGING = {
    "loggers": {
        "rest_framework.throttling": {
            "level": "DEBUG",
        },
    },
}
```

## Best Practices

1. **User-based > IP-based**: Post creation uses user ID so VPN/proxy switching doesn't bypass limits
2. **Separate scopes**: Login, post creation, and general API have independent limits
3. **Graceful degradation**: Return 429 with `Retry-After` header for client-side handling
4. **Test thoroughly**: Automated tests verify both success and throttle cases
5. **Monitor in production**: Alert on high 429 rates (potential attacks or config issues)

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| All requests 429 immediately | Redis down/unreachable | Check Redis connection, fallback to local memory cache |
| Limits not enforced | Throttle classes not applied | Verify `get_throttles()` returns correct classes |
| Different users share limit | Cache key uses IP not user | Ensure `PostCreateRateThrottle` uses `request.user.pk` |
| Login not throttled | Wrong view class used | Ensure `ThrottledLoginView` is in URLs, not base `LoginView` |