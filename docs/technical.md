# PunPost Technical Documentation

## Table of Contents
1. [Environment Configuration](#environment-configuration)
2. [Django Settings Deep Dive](#django-settings-deep-dive)
3. [Authentication System](#authentication-system)
4. [Authorization & Permissions](#authorization--permissions)
5. [Rate Limiting](#rate-limiting)
6. [Idempotency](#idempotency)
7. [Convex Integration](#convex-integration)
8. [Redis Usage](#redis-usage)
9. [API Endpoints](#api-endpoints)
10. [Error Handling](#error-handling)
11. [Testing Strategy](#testing-strategy)
12. [Development Workflow](#development-workflow)

---

## Environment Configuration

### Required Variables (`.env`)

```bash
# Django Core
SECRET_KEY=your-50-char-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Convex (Primary Database)
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=  # Optional: for admin mutations

# Redis (Sessions, Rate Limiting, Idempotency)
REDIS_URL=redis://127.0.0.1:6379/0

# JWT Configuration
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Frontend Origin (CORS)
FRONTEND_URL=http://localhost:3000
```

### Loading Mechanism (`config/settings.py:14-20`)
```python
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)
environ.Env.read_env(os.path.join(ROOT_DIR, ".env"))
```
- Uses `django-environ` for type-safe env parsing
- Loads `.env` from project root (`punpost/.env`)
- Provides defaults for development

---

## Django Settings Deep Dive

### Installed Apps (`config/settings.py:29-58`)

**Core Django:**
- `django.contrib.admin` — Admin interface
- `django.contrib.auth` — Authentication framework
- `django.contrib.sessions` — Session framework
- `django.contrib.sites` — Required for allauth

**Third-Party Auth:**
- `rest_framework` — DRF core
- `rest_framework_simplejwt` — JWT tokens
- `rest_framework_simplejwt.token_blacklist` — Refresh token revocation
- `dj_rest_auth` — REST auth endpoints (login, register, password reset)
- `dj_rest_auth.registration` — Registration endpoints
- `allauth` + `allauth.socialaccount` — OAuth 2.0 flows
- `allauth.socialaccount.providers.google` / `github` — Social providers

**Utilities:**
- `corsheaders` — CORS handling
- `django_redis` — Redis cache backend

**Local Apps:**
- `core` — Platform infrastructure
- `users` — Custom user model, profiles
- `posts` — Content domain
- `billing` — Payments, subscriptions

### Middleware Stack (`config/settings.py:62-73`)
```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",      # HTTPS, HSTS, CSP
    "whitenoise.middleware.WhiteNoiseMiddleware",         # Static files
    "corsheaders.middleware.CorsMiddleware",              # CORS (must be early)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",       # Allauth session sync
]
```

### Database (`config/settings.py:98-103`)
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
```
- **SQLite for development only** — Django needs a relational DB for sessions, admin, migrations
- **Production**: Switch to PostgreSQL (`psycopg2-binary` in requirements)
- Convex handles all *application data* (posts, users, comments)

### Authentication Backends (`config/settings.py:110-113`)
```python
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",          # Username/password
    "allauth.account.auth_backends.AuthenticationBackend", # Email/social
]
```

### Allauth Configuration (`config/settings.py:115-140`)
```python
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"      # Login with email
ACCOUNT_EMAIL_VERIFICATION = "optional"      # Can enforce in production
SOCIALACCOUNT_PROVIDERS = {
    "google": { "SCOPE": ["profile", "email"], ... },
    "github": { "SCOPE": ["user:email"], ... },
}
```

### REST Framework (`config/settings.py:145-166`)
```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "5/minute",
        "post_create": "10/hour",
    },
}
```

### JWT Configuration (`config/settings.py:168-179`)
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,           # New refresh token on each use
    "BLACKLIST_AFTER_ROTATION": True,        # Old refresh tokens revoked
    "UPDATE_LAST_LOGIN": True,               # Track last login
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### dj-rest-auth (`config/settings.py:263-269`)
```python
REST_AUTH = {
    "REGISTER_SERIALIZER": "users.serializers.CustomRegisterSerializer",
    "USER_DETAILS_SERIALIZER": "users.serializers.UserSerializer",
    "USE_JWT": True,
    "JWT_AUTH_HTTPONLY": False,              # Frontend reads tokens from localStorage
    "SESSION_LOGIN": False,                  # Prefer JWT for API
}
```

### Redis & Caching (`config/settings.py:187-217`)
```python
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")

try:
    import redis
    r = redis.from_url(REDIS_URL)
    r.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False

if REDIS_AVAILABLE:
    CACHES = { "default": { "BACKEND": "django_redis.cache.RedisCache", ... } }
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
else:
    CACHES = { "default": { "BACKEND": "django.core.cache.backends.locmem.LocMemCache", ... } }
    SESSION_ENGINE = "django.contrib.sessions.backends.db"
```
- **Graceful degradation**: Falls back to local memory cache / DB sessions if Redis unavailable
- **Production**: Redis required for distributed rate limiting, sessions, idempotency

---

## Authentication System

### Dual Strategy: JWT + Session

| Client Type | Auth Method | Token Storage | Use Case |
|-------------|-------------|---------------|----------|
| **Next.js Frontend (API)** | JWT (Bearer) | `localStorage` (access), `httpOnly` cookie (refresh) | SPA, mobile apps |
| **Django Admin / Dashboard** | Session + Cookie | `sessionid` cookie (Redis-backed) | Server-rendered admin |

### JWT Flow

```
┌──────────┐     POST /api/auth/login/     ┌──────────┐
│ Client   │ ─────────────────────────────► │ Django   │
│          │ ◄───────────────────────────── │          │
│          │  { access, refresh, user }    │          │
└──────────┘                                 └──────────┘
      │                                           │
      │ Authorization: Bearer <access>            │
      ▼                                           ▼
┌──────────┐                                 ┌──────────┐
│ API Call │ ─────────────────────────────► │ Validate │
│          │ ◄───────────────────────────── │ JWT +    │
└──────────┘  Protected Resource           │ Get User │
                                           └──────────┘
```

### Token Refresh

```
POST /api/auth/token/refresh/  (with refresh token in body or cookie)
    │
    ▼
New access token + NEW refresh token (rotation)
    │
    ▼
Old refresh token → Blacklisted (token_blacklist app)
```

### Social OAuth Flow (Google/GitHub)

```
1. Frontend: GET /api/auth/social/google/  →  Redirects to Google
2. User consents → Google redirects to /api/auth/social/google/callback/
3. Allauth exchanges code for tokens, creates/links User
4. dj-rest-auth returns JWT pair
5. Frontend stores tokens, redirects to app
```

### Custom User Model (`users/models.py`)

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    convex_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    role = models.CharField(
        max_length=20,
        choices=[("reader", "Reader"), ("author", "Author"), ("admin", "Admin")],
        default="reader",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
```
- **Email as username** — Modern auth pattern
- **convex_id** — Links Django user to Convex document
- **role** — RBAC foundation (reader/author/admin)

### Registration Serializer (`users/serializers.py:9-26`)

```python
class CustomRegisterSerializer(RegisterSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["reader", "author"], default="reader")

    def save(self, request):
        user = super().save(request)
        user.role = self.cleaned_data.get("role", "reader")
        user.save()
        return user
```
- Allows role selection at registration (default: reader)
- Username optional — email is primary identifier

---

## Authorization & Permissions

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **reader** | Read posts, comments; create account; like/react |
| **author** | All reader + create/edit/delete own posts |
| **admin** | All author + manage users, moderate content, access Django admin |

### Permission Classes (Future Implementation)

```python
# posts/permissions.py
class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user or request.user.role == "admin"

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"
```

### Usage in Views

```python
# posts/views.py
class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    # GET: any authenticated user
    # POST: author/admin only
    # PUT/PATCH/DELETE: author of post or admin only
```

### Django Admin Access

```python
# users/admin.py
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["email", "username", "role", "convex_id", "is_staff", "date_joined"]
    list_filter = ["role", "is_staff", "is_superuser"]
    search_fields = ["email", "username"]

    def has_module_permission(self, request):
        return request.user.role == "admin"
```

---

## Rate Limiting

### Configuration (`config/settings.py:153-162`)

```python
DEFAULT_THROTTLE_RATES = {
    "anon": "100/hour",        # Unauthenticated users
    "user": "1000/hour",       # Authenticated users
    "login": "5/minute",       # Login attempts
    "post_create": "10/hour",  # Post creation (authors)
}
```

### Throttle Classes

```python
# core/throttles.py (to be created)
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    scope = "login"

class PostCreateRateThrottle(UserRateThrottle):
    scope = "post_create"
```

### Applying to Views

```python
# users/views.py (login)
class LoginView(LoginView):
    throttle_classes = [LoginRateThrottle]

# posts/views.py (create)
class PostViewSet(viewsets.ModelViewSet):
    def get_throttles(self):
        if self.action == "create":
            return [PostCreateRateThrottle()]
        return super().get_throttles()
```

### Redis-Backed Throttling (Production)

```python
# settings.py (when Redis available)
REST_FRAMEWORK = {
    ...
    "DEFAULT_THROTTLE_CLASSES": [
        "core.throttles.RedisAnonRateThrottle",
        "core.throttles.RedisUserRateThrottle",
    ],
}
```

### Burst vs Sustained Limits

| Limit Type | Configuration | Use Case |
|------------|---------------|----------|
| **Burst** | `10/second` | Prevent spike abuse |
| **Sustained** | `100/hour` | Fair usage over time |
| **Sliding Window** | Redis sorted sets | Accurate, distributed |

---

## Idempotency

### Purpose
Prevent duplicate charges when clients retry payment requests due to network timeouts.

### Implementation Pattern

```
Client                           Server
  │                                │
  ├─ POST /api/billing/charge/    │
  │  Idempotency-Key: abc-123     │
  │  { amount: 1000 }             │
  │                                ├─ Check Redis: GET idempotency:abc-123
  │                                │  ├─ Exists → Return cached response
  │                                │  └─ Not exists → Process payment
  │                                │     ├─ Charge payment provider
  │                                │     ├─ Store result in Redis (TTL 24h)
  │                                │     └─ Return response
  │◄──────────────────────────────┤
  │  { success: true, charge_id } │
  │                                │
  ├─ POST /api/billing/charge/    │  (Retry with same key)
  │  Idempotency-Key: abc-123     │
  │                                ├─ Check Redis → Found!
  │                                └─ Return cached response immediately
  │◄──────────────────────────────┤
```

### Implementation (`billing/services.py`)

```python
import hashlib
import json
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response

IDEMPOTENCY_TTL = 86400  # 24 hours
IDEMPOTENCY_PREFIX = "idempotency:"

class IdempotencyService:
    @staticmethod
    def get_key(request) -> str | None:
        return request.headers.get("Idempotency-Key")

    @staticmethod
    def make_cache_key(key: str) -> str:
        return f"{IDEMPOTENCY_PREFIX}{key}"

    @classmethod
    def check_and_store(cls, request, response_data, response_status):
        key = cls.get_key(request)
        if not key:
            return None  # No idempotency key provided

        cache_key = cls.make_cache_key(key)
        cached = cache.get(cache_key)

        if cached:
            return Response(cached["data"], status=cached["status"])

        # Store response for future retries
        cache.set(cache_key, {
            "data": response_data,
            "status": response_status,
        }, timeout=IDEMPOTENCY_TTL)
        return None

    @classmethod
    def process_with_idempotency(cls, request, view_func):
        key = cls.get_key(request)
        if not key:
            return view_func(request)

        cache_key = cls.make_cache_key(key)
        cached = cache.get(cache_key)
        if cached:
            return Response(cached["data"], status=cached["status"])

        response = view_func(request)

        # Only cache successful responses
        if response.status_code < 400:
            cache.set(cache_key, {
                "data": response.data,
                "status": response.status_code,
            }, timeout=IDEMPOTENCY_TTL)

        return response
```

### Usage in Views

```python
# billing/views.py
class ChargeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return IdempotencyService.process_with_idempotency(
            request,
            lambda req: self._process_charge(req)
        )

    def _process_charge(self, request):
        # Actual payment processing logic
        ...
```

### Client-Side Usage

```typescript
// frontend/src/lib/api.ts
const charge = async (amount: number) => {
  const idempotencyKey = crypto.randomUUID();
  return api.post("/billing/charge/", { amount }, {
    headers: { "Idempotency-Key": idempotencyKey }
  });
};
```

---

## Convex Integration

### Why Convex?
- **Real-time subscriptions** — UI updates instantly
- **Offline-first** — Local writes, sync when online
- **Type-safe** — TypeScript + Python schema sharing
- **Serverless** — Auto-scales, no infrastructure

### Client Setup (`core/convex_client.py`)

```python
from functools import lru_cache
from django.conf import settings
from convex import ConvexClient

@lru_cache(maxsize=1)
def get_convex_client() -> ConvexClient:
    if not settings.CONVEX_URL:
        raise RuntimeError("CONVEX_URL is not set")
    return ConvexClient(settings.CONVEX_URL)

def query(path: str, args: dict | None = None):
    return get_convex_client().query(path, args or {})

def mutation(path: str, args: dict | None = None):
    return get_convex_client().mutation(path, args or {})
```
- **Singleton client** — Cached via `lru_cache`
- **Lazy initialization** — Only creates on first use
- **Simple wrappers** — `query()` and `mutation()` for clean service code

### User Sync (`users/services.py`)

```python
def sync_user_to_convex(user: User) -> str | None:
    try:
        existing = query("users:getByEmail", {"email": user.email})

        if existing:
            convex_id = existing["_id"]
        else:
            convex_id = mutation("users:create", {
                "email": user.email,
                "name": user.get_full_name() or user.username,
                "username": user.username or None,
                "role": user.role,
            })

        if user.convex_id != convex_id:
            user.convex_id = convex_id
            user.save(update_fields=["convex_id"])

        return convex_id
    except Exception as e:
        print(f"[Convex Sync Error] {e}")
        return None
```

### Signal Integration (`users/signals.py`)

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import sync_user_to_convex

User = get_user_model()

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    if created or not instance.convex_id:
        sync_user_to_convex(instance)
```

### Convex Schema (Reference)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    username: v.optional(v.string()),
    role: v.union(v.literal("reader"), v.literal("author"), v.literal("admin")),
    django_id: v.optional(v.number()),  // Link back to Django
  }).index("by_email", ["email"]),

  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.string(),
    author_id: v.id("users"),
    status: v.union(v.literal("draft"), v.literal("published")),
    published_at: v.optional(v.number()),
  })
    .index("by_author", ["author_id"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  comments: defineTable({
    post_id: v.id("posts"),
    author_id: v.id("users"),
    content: v.string(),
    parent_id: v.optional(v.id("comments")),
  }).index("by_post", ["post_id"]),
});
```

---

## Redis Usage

### Session Storage

```python
# settings.py
if REDIS_AVAILABLE:
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
```
- **Admin dashboard sessions** — Stored in Redis, shared across workers
- **TTL**: Default 2 weeks (configurable via `SESSION_COOKIE_AGE`)

### Caching

```python
from django.core.cache import cache

# Cache user permissions for 5 minutes
cache.set(f"user_perms:{user.id}", perms, 300)

# Rate limiting counters (automatic via DRF throttling)
# cache.get("throttle:anon:127.0.0.1") → count
```

### Idempotency Keys

```python
# billing/services.py
cache.set(f"idempotency:{key}", {"data": ..., "status": 200}, timeout=86400)
```

### Health Check

```python
# core/views.py
def get(self, request):
    convex_status = "unknown"
    try:
        if settings.CONVEX_URL:
            get_convex_client()
            convex_status = "configured"
    except Exception as e:
        convex_status = f"error: {str(e)}"
    return Response({ "convex": convex_status, ... })
```

---

## API Endpoints

### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login/` | Email/password login | None |
| POST | `/api/auth/logout/` | Blacklist refresh token | JWT |
| POST | `/api/auth/registration/` | Register new user | None |
| POST | `/api/auth/token/refresh/` | Refresh access token | Refresh |
| POST | `/api/auth/token/verify/` | Verify access token | None |
| GET | `/api/auth/user/` | Get current user | JWT |
| PUT | `/api/auth/user/` | Update profile | JWT |
| POST | `/api/auth/password/reset/` | Request password reset | None |
| POST | `/api/auth/password/reset/confirm/` | Confirm password reset | None |
| GET | `/api/auth/social/google/` | Initiate Google OAuth | None |
| GET | `/api/auth/social/github/` | Initiate GitHub OAuth | None |

### Users (`/api/users/`)

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/api/users/me/` | Current user profile | JWT | Authenticated |
| GET | `/api/users/{id}/` | Public user profile | JWT | Authenticated |

### Posts (`/api/posts/`) — *To Be Implemented*

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/api/posts/` | List published posts | Optional | Public |
| POST | `/api/posts/` | Create post | JWT | Author/Admin |
| GET | `/api/posts/{slug}/` | Get post by slug | Optional | Public |
| PUT/PATCH | `/api/posts/{slug}/` | Update post | JWT | Author/Admin |
| DELETE | `/api/posts/{slug}/` | Delete post | JWT | Author/Admin |
| POST | `/api/posts/{slug}/comments/` | Add comment | JWT | Authenticated |
| GET | `/api/posts/{slug}/comments/` | List comments | Optional | Public |

### Billing (`/api/billing/`) — *To Be Implemented*

| Method | Endpoint | Description | Auth | Idempotency |
|--------|----------|-------------|------|-------------|
| POST | `/api/billing/charge/` | One-time charge | JWT | Required |
| POST | `/api/billing/subscribe/` | Create subscription | JWT | Required |
| GET | `/api/billing/subscription/` | Current subscription | JWT | - |
| POST | `/api/billing/cancel/` | Cancel subscription | JWT | - |

### Core (`/api/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Health check (Convex, DB, Redis) |

---

## Error Handling

### Standard Error Format

```json
{
  "error": "validation_error",
  "message": "Invalid input data",
  "details": {
    "email": ["This field is required."],
    "password": ["This field is required."]
  },
  "status_code": 400
}
```

### Exception Handlers (Future)

```python
# core/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "error": response.data.get("detail", "error"),
            "message": str(exc),
            "details": response.data,
            "status_code": response.status_code,
        }

    return response
```

```python
# settings.py
REST_FRAMEWORK = {
    ...
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
}
```

### HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Validation Error |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, idempotency) |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |
| 503 | Service Unavailable (Convex/Redis down) |

---

## Testing Strategy

### Test Structure

```
backend/
├── core/tests.py           # Health check, infrastructure
├── users/tests.py          # Auth, registration, permissions
├── posts/tests.py          # Posts, comments, reactions
└── billing/tests.py        # Payments, idempotency, webhooks
```

### Test Configuration (`requirements.txt`)
```
pytest>=8.0.0
pytest-django>=4.8.0
factory-boy>=3.3.0
```

### Example Tests

```python
# users/tests.py
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestUserRegistration:
    def test_register_reader(self):
        client = APIClient()
        response = client.post("/api/auth/registration/", {
            "email": "reader@example.com",
            "password": "securepass123",
            "role": "reader",
        })
        assert response.status_code == 201
        assert response.data["user"]["role"] == "reader"

    def test_register_author(self):
        client = APIClient()
        response = client.post("/api/auth/registration/", {
            "email": "author@example.com",
            "password": "securepass123",
            "role": "author",
        })
        assert response.status_code == 201
        assert response.data["user"]["role"] == "author"

@pytest.mark.django_db
class TestJWTAuth:
    def test_login_returns_tokens(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )
        client = APIClient()
        response = client.post("/api/auth/login/", {
            "email": "test@example.com",
            "password": "testpass123",
        })
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_access_protected_endpoint(self):
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )
        client = APIClient()
        # Login
        login = client.post("/api/auth/login/", {
            "email": "test@example.com",
            "password": "testpass123",
        })
        access = login.data["access"]
        # Access protected endpoint
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get("/api/users/me/")
        assert response.status_code == 200
        assert response.data["email"] == "test@example.com"
```

```python
# billing/tests.py
@pytest.mark.django_db
class TestIdempotency:
    def test_duplicate_charge_prevented(self):
        client = APIClient()
        user = User.objects.create_user(email="test@example.com", password="pass")
        login = client.post("/api/auth/login/", {"email": "test@example.com", "password": "pass"})
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        idempotency_key = "test-key-123"
        headers = {"HTTP_IDEMPOTENCY_KEY": idempotency_key}

        # First request
        response1 = client.post("/api/billing/charge/", {"amount": 1000}, **headers)
        assert response1.status_code == 200
        charge_id_1 = response1.data["charge_id"]

        # Retry with same key
        response2 = client.post("/api/billing/charge/", {"amount": 1000}, **headers)
        assert response2.status_code == 200
        charge_id_2 = response2.data["charge_id"]

        # Should return same charge_id (cached response)
        assert charge_id_1 == charge_id_2
```

### Running Tests

```bash
cd backend
pytest                          # All tests
pytest users/tests.py           # Specific module
pytest -k "test_login"          # Pattern match
pytest --cov=users --cov=posts  # With coverage
```

---

## Development Workflow

### Initial Setup

```bash
# 1. Clone and navigate
cd punpost

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
# Edit .env with your values
python manage.py migrate
python manage.py createsuperuser  # Optional admin
python manage.py runserver

# 3. Frontend setup (separate terminal)
cd frontend
npm install
cp .env.local.example .env.local  # If exists
npm run dev

# 4. Convex setup (separate terminal)
cd convex
npm install
npx convex dev
```

### Environment Files

| File | Purpose |
|------|---------|
| `.env` | Backend (Django) — loaded from project root |
| `frontend/.env.local` | Frontend (Next.js) — `NEXT_PUBLIC_API_URL` |
| `convex/.env.local` | Convex deployment config |

### Common Commands

```bash
# Backend
python manage.py makemigrations    # Create migrations
python manage.py migrate           # Apply migrations
python manage.py shell             # Django shell
python manage.py collectstatic     # Collect static files
black .                            # Format code
isort .                            # Sort imports
flake8                             # Lint
pytest                             # Run tests

# Frontend
npm run dev                        # Dev server
npm run build                      # Production build
npm run lint                       # ESLint
npm run typecheck                  # TypeScript check
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/user-profiles
# ... make changes ...
git add .
git commit -m "feat(users): add profile avatar upload"
git push origin feature/user-profiles
# Create PR
```

### Pre-commit (Optional)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.0.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/isort
    rev: 5.13.0
    hooks:
      - id: isort
  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
```

```bash
pre-commit install
```

---

## Production Deployment Checklist

### Django
- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` from secure vault
- [ ] `ALLOWED_HOSTS` configured
- [ ] PostgreSQL database
- [ ] Redis cluster (sessions, cache, rate limiting)
- [ ] Gunicorn + Nginx
- [ ] WhiteNoise or CDN for static files
- [ ] HTTPS + HSTS + Secure cookies

### Convex
- [ ] Production deployment
- [ ] Schema migrations applied
- [ ] Auth config (JWT public key)

### Frontend
- [ ] `NEXT_PUBLIC_API_URL` set to production API
- [ ] Build optimized (`next build`)
- [ ] Deploy to Vercel/Netlify/Docker

### Monitoring
- [ ] Sentry (errors)
- [ ] Health check endpoint monitoring
- [ ] Rate limit metrics
- [ ] Convex dashboard