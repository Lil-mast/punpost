# PunPost Educational Guide

## Learning Objectives

This project teaches **production-ready backend engineering** through a real-world blogging platform. Each concept builds toward a cohesive understanding of modern web architecture.

---

## Concept 1: HTTP Methods & Status Codes (RESTful Design)

### The Resource Model

```
Resource: POST
├── Collection: /api/posts/
│   ├── GET    → List posts (200 OK)
│   ├── POST   → Create post (201 Created)
│   └── HEAD   → Metadata only (200 OK)
└── Item: /api/posts/{slug}/
    ├── GET    → Retrieve post (200 OK)
    ├── PUT    → Full replace (200 OK)
    ├── PATCH  → Partial update (200 OK)
    ├── DELETE → Remove post (204 No Content)
    └── OPTIONS → Allowed methods (200 OK)
```

### Status Code Semantics

| Code | Meaning | When to Use |
|------|---------|-------------|
| **200** | OK | Successful GET, PUT, PATCH |
| **201** | Created | Successful POST (return Location header) |
| **204** | No Content | Successful DELETE, no response body |
| **400** | Bad Request | Validation failed |
| **401** | Unauthorized | Missing/invalid authentication |
| **403** | Forbidden | Authenticated but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate, version mismatch |
| **422** | Unprocessable Entity | Semantic validation failure (WebDAV) |
| **429** | Too Many Requests | Rate limited |
| **500** | Internal Server Error | Unexpected exception |
| **503** | Service Unavailable | Dependency down (Convex, Redis) |

### Implementation in DRF

```python
# views.py
from rest_framework import status
from rest_framework.response import Response

class PostViewSet(viewsets.ModelViewSet):
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers  # Includes Location header
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
```

### Best Practices

1. **Use plural nouns**: `/posts/` not `/post/`
2. **Nest logically**: `/posts/{slug}/comments/`
3. **Filter via query params**: `/posts/?status=published&author=john`
4. **Version in URL or header**: `/api/v1/posts/` or `Accept: application/vnd.punpost.v1+json`
5. **Return created resource** on 201 with `Location` header

---

## Concept 2: Authentication vs Authorization

### The Distinction

```
┌─────────────────────────────────────────────────────────────────┐
│  AUTHENTICATION (AuthN)  —  "WHO ARE YOU?"                     │
│  • Verifies identity                                            │
│  • Credentials: email/password, JWT, OAuth token, API key      │
│  • Result: User principal (User object)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AUTHORIZATION (AuthZ)  —  "WHAT CAN YOU DO?"                  │
│  • Checks permissions                                           │
│  • Based on: roles, ownership, scopes, policies                │
│  • Result: Allow / Deny                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Strategies in PunPost

#### JWT (Stateless, for API)

```python
# settings.py
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# Flow:
# 1. POST /api/auth/login/ → { access, refresh }
# 2. Client stores access in memory, refresh in httpOnly cookie
# 3. Requests: Authorization: Bearer <access>
# 4. On 401: POST /api/auth/token/refresh/ with refresh token
# 5. New access + new refresh (rotation), old refresh blacklisted
```

#### Session (Stateful, for Admin Dashboard)

```python
# settings.py
if REDIS_AVAILABLE:
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
# Session ID in cookie → Redis → User data
# CSRF protection via middleware
```

#### OAuth 2.0 (Delegated, for Social Login)

```
User → Clicks "Login with Google"
     → Redirects to Google OAuth consent
     → Google redirects to /callback/ with auth code
     → Backend exchanges code for access_token
     → Fetches user profile (email, name)
     → Creates/links Django User
     → Issues JWT pair to frontend
```

### Authorization: Role-Based Access Control (RBAC)

```python
# users/models.py
class User(AbstractUser):
    ROLE_CHOICES = [
        ("reader", "Reader"),
        ("author", "Author"),
        ("admin", "Admin"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="reader")
```

| Role | Posts | Comments | Users | Admin Panel |
|------|-------|----------|-------|-------------|
| Reader | Read | Create own | View own | ❌ |
| Author | CRUD own | CRUD own | View own | ❌ |
| Admin | CRUD all | CRUD all | CRUD all | ✅ |

#### Permission Implementation

```python
# permissions.py
from rest_framework import permissions

class IsAuthorOrReadOnly(permissions.BasePermission):
    """Object-level: only author or admin can modify"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user or request.user.role == "admin"

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"
```

```python
# views.py
class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    # GET list/detail: any authenticated user
    # POST: authenticated + author/admin role
    # PUT/PATCH/DELETE: IsAuthorOrReadOnly check
```

### Attribute-Based Access Control (ABAC) — Advanced

```python
# policies.py (using django-rules or custom)
def can_publish_post(user, post):
    return (
        user.role == "author" and
        post.status == "draft" and
        post.author == user
    )

def can_moderate_comment(user, comment):
    return user.role == "admin" or comment.post.author == user
```

---

## Concept 3: Session-Based Auth vs JWT

### Comparison

| Aspect | Session (Cookie) | JWT (Bearer Token) |
|--------|------------------|-------------------|
| **Storage** | Server (Redis/DB) | Client (localStorage/memory) |
| **Scalability** | Requires shared store | Stateless, horizontally scalable |
| **Revocability** | Instant (delete session) | Requires blacklist/short expiry |
| **CSRF Risk** | High (auto-sent) | None (manual header) |
| **XSS Risk** | Low (httpOnly cookie) | High (localStorage accessible) |
| **Size Limit** | 4KB cookie | ~8KB header (practical) |
| **Mobile/SPA** | Tricky (CORS, cookies) | Native fit |

### PunPost's Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐         ┌─────────────────┐                  │
│   │ Next.js SPA │         │ Django Admin    │                  │
│   │ (API Client)│         │ (Server-rendered)│                  │
│   └──────┬──────┘         └────────┬────────┘                  │
│          │                         │                           │
│          │ JWT (Bearer)            │ Session (Cookie)          │
│          ▼                         ▼                           │
│   ┌─────────────────────────────────────────┐                 │
│   │           DJANGO BACKEND                │                 │
│   │  ┌──────────────┐  ┌──────────────┐    │                 │
│   │  │JWTAuthentication│ │SessionAuthentication│  │
│   │  │(rest_framework_│ │(django.contrib.│    │
│   │  │ simplejwt)    │ │ sessions)    │    │
│   │  └──────────────┘  └──────────────┘    │                 │
│   └─────────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration (`settings.py`)

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # API
        "rest_framework.authentication.SessionAuthentication",        # Admin
    ),
}

REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_HTTPONLY": False,   # Frontend reads from localStorage
    "SESSION_LOGIN": False,       # Don't create session on API login
}
```

### Security: JWT in localStorage vs httpOnly Cookie

```
┌─────────────────────────────────────────────────────────────────┐
│  OPTION A: localStorage (Current)                               │
│  + Simple, works with SPA routing                               │
│  - Vulnerable to XSS (malicious JS steals token)               │
│  MITIGATION: Content Security Policy, short expiry, rotation   │
├─────────────────────────────────────────────────────────────────┤
│  OPTION B: httpOnly Cookie (More Secure)                        │
│  + Inaccessible to JavaScript (XSS-safe)                       │
│  - Requires CSRF protection, SameSite config                   │
│  - Tricky with cross-origin (Safari ITP, third-party cookies)  │
└─────────────────────────────────────────────────────────────────┘
```

**Recommendation for Production**: Use httpOnly cookie for refresh token, short-lived access token in memory.

```python
# settings.py (production)
SIMPLE_JWT = {
    ...
    "AUTH_COOKIE": "refresh_token",
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SECURE": True,      # HTTPS only
    "AUTH_COOKIE_SAMESITE": "Lax",   # CSRF protection
}
```

---

## Concept 4: OAuth 2.0

### The Flow (Authorization Code Grant)

```
┌─────────┐     1. Redirect          ┌──────────────┐
│  User   │ ───────────────────────► │  Browser     │
└─────────┘                          └──────┬───────┘
                                             │
                                             │ 2. User consents
                                             ▼
                                    ┌────────────────┐
                                    │ Google/GitHub  │
                                    │ Auth Server    │
                                    └───────┬────────┘
                                            │
                                            │ 3. Redirect with ?code=xxx
                                            ▼
┌─────────┐     6. JWT Pair           ┌──────────────┐
│  User   │ ◄──────────────────────── │  Backend     │
└─────────┘                          └──────┬───────┘
                                             │
                                             │ 4. Exchange code for tokens
                                             ▼
                                    ┌────────────────┐
                                    │ Token Endpoint │
                                    └───────┬────────┘
                                            │
                                            │ 5. Fetch user profile
                                            ▼
                                    ┌────────────────┐
                                    │ UserInfo Endpt │
                                    └────────────────┘
```

### Django Allauth Configuration

```python
# settings.py
INSTALLED_APPS = [
    ...
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID"),
            "secret": env("GOOGLE_CLIENT_SECRET"),
        },
    },
    "github": {
        "SCOPE": ["user:email"],
        "APP": {
            "client_id": env("GITHUB_CLIENT_ID"),
            "secret": env("GITHUB_CLIENT_SECRET"),
        },
    },
}
```

### Frontend Integration

```typescript
// frontend/src/components/SocialLogin.tsx
const googleLogin = () => {
  window.location.href = `${API_URL}/auth/social/google/`;
};

const githubLogin = () => {
  window.location.href = `${API_URL}/auth/social/github/`;
};
```

### URL Routes (`config/urls.py`)

```python
urlpatterns = [
    ...
    path("api/auth/social/", include("allauth.socialaccount.urls")),
    # GET  /api/auth/social/google/        → Initiate Google OAuth
    # GET  /api/auth/social/google/callback/ → Handle callback
    # GET  /api/auth/social/github/        → Initiate GitHub OAuth
    # GET  /api/auth/social/github/callback/ → Handle callback
]
```

### Security Considerations

1. **State Parameter** — Prevents CSRF on OAuth flow (allauth handles automatically)
2. **PKCE** — Proof Key for Code Exchange (for public clients like SPA)
3. **Scope Minimization** — Request only needed permissions
4. **Token Storage** — Never log OAuth tokens
5. **Account Linking** — Handle existing email conflicts

---

## Concept 5: Rate Limiting & Throttling

### Why Rate Limit?

| Attack Vector | Protection |
|---------------|------------|
| Brute force login | Limit login attempts |
| API abuse | Limit requests per user/IP |
| DoS | Burst protection |
| Scraping | Sustained rate limits |
| Credential stuffing | IP + user combined limits |

### DRF Throttling Architecture

```
Request → Middleware → View → Throttle Check → Allow / 429
                    │
                    ├── AnonRateThrottle (by IP)
                    ├── UserRateThrottle (by user ID)
                    ├── ScopedRateThrottle (by view scope)
                    └── Custom (Redis-backed)
```

### Configuration (`settings.py`)

```python
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",        # Unauthenticated
        "user": "1000/hour",       # Authenticated
        "login": "5/minute",       # Login endpoint
        "post_create": "10/hour",  # Post creation
    },
}
```

### Scoped Throttling (Per-View)

```python
# views.py
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    scope = "login"

class PostCreateRateThrottle(UserRateThrottle):
    scope = "post_create"

class LoginView(APIView):
    throttle_classes = [LoginRateThrottle]
    def post(self, request): ...

class PostViewSet(viewsets.ModelViewSet):
    def get_throttles(self):
        if self.action == "create":
            return [PostCreateRateThrottle()]
        return super().get_throttles()
```

### Redis-Backed Distributed Throttling

```python
# core/throttles.py
import time
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle

class RedisRateThrottle(BaseThrottle):
    def __init__(self):
        self.rate = None
        self.scope = None

    def allow_request(self, request, view):
        if not self.rate:
            return True

        key = self.get_cache_key(request, view)
        if not key:
            return True

        # Sliding window: store timestamps in sorted set
        now = time.time()
        window_start = now - self.duration

        # Add current request
        pipe = cache.client.get_client().pipeline()
        pipe.zadd(key, {str(now): now})
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.expire(key, int(self.duration) + 1)
        results = pipe.execute()

        request_count = results[2]
        return request_count <= self.num_requests

    def wait(self):
        return self.duration
```

### Burst vs Sustained Limits

```
┌─────────────────────────────────────────────────────────────────┐
│  BURST LIMIT (Token Bucket)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Capacity: 10 requests                                    │   │
│  │ Refill: 1 request/second                                 │   │
│  │                                                           │   │
│  │ Requests: ●●●●●●●●●● (10 instant) → WAIT → ● (1/sec)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Use case: API spikes, login attempts                          │
├─────────────────────────────────────────────────────────────────┤
│  SUSTAINED LIMIT (Leaky Bucket / Fixed Window)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Limit: 1000 requests/hour                                │   │
│  │                                                           │   │
│  │ ████████████████████████ (steady)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Use case: Fair usage, API quotas                              │
├─────────────────────────────────────────────────────────────────┤
│  COMBINED (Recommended)                                         │
│  • Burst: 10/second (prevent spikes)                           │
│  • Sustained: 1000/hour (fair usage)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Response Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699999999
Retry-After: 60  (on 429)
```

---

## Concept 6: Idempotency

### The Problem

```
Client                    Network                    Server
  │                        │                          │
  ├─ POST /charge $100 ───►│                          │
  │                        │ (timeout, no response)   │
  │                        │                          ├─ Processes charge
  │                        │                          │  Creates charge_123
  │                        │                          │
  │ (client retries)       │                          │
  ├─ POST /charge $100 ───►│                          │
  │                        │                          ├─ Processes AGAIN
  │                        │                          │  Creates charge_124 ❌
  │                        │                          │
  │                        ◄─── 200 OK (charge_124)   │
  │                        │                          │
  └────────────────────────┴──────────────────────────┘
  USER CHARGED TWICE!
```

### The Solution: Idempotency Keys

```
Client                    Server
  │                        │
  ├─ POST /charge        │
  │  Idempotency-Key: abc│
  │  { amount: 100 }     │
  │                        ├─ CHECK Redis: GET idempotency:abc
  │                        │  ├─ MISS → Process, STORE result, RETURN
  │                        │  └─ HIT  → RETURN cached result
  │◄─────────────────────┤
  │  { charge_id: 123 }  │
  │                        │
  ├─ POST /charge        │  (Retry - same key)
  │  Idempotency-Key: abc│
  │                        ├─ CHECK Redis: GET idempotency:abc → HIT!
  │                        │  └─ RETURN cached result immediately
  │◄─────────────────────┤
  │  { charge_id: 123 }  │  (Same response!)
  │                        │
  └────────────────────────┘
```

### Implementation Details

#### Key Generation (Client)

```typescript
// frontend/src/lib/api.ts
const generateIdempotencyKey = () => {
  // Use crypto.randomUUID() for uniqueness
  // Or hash of (user_id + action + timestamp) for deterministic keys
  return crypto.randomUUID();
};

const charge = async (amount: number) => {
  const key = generateIdempotencyKey();
  return api.post("/billing/charge/", { amount }, {
    headers: { "Idempotency-Key": key }
  });
};
```

#### Server-Side Storage (Redis)

```python
# billing/services.py
from django.core.cache import cache

IDEMPOTENCY_TTL = 86400  # 24 hours
PREFIX = "idempotency:"

def get_cached_response(key: str) -> dict | None:
    return cache.get(f"{PREFIX}{key}")

def store_response(key: str, data: dict, status: int):
    cache.set(f"{PREFIX}{key}", {"data": data, "status": status}, IDEMPOTENCY_TTL)
```

#### Middleware/Decorator Approach

```python
# billing/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .services import IdempotencyService

class ChargeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check idempotency
        cached = IdempotencyService.check(request)
        if cached:
            return cached

        # Process payment
        result = self.process_charge(request)

        # Store for future retries
        IdempotencyService.store(request, result.data, result.status_code)
        return result
```

### When to Use Idempotency

| Endpoint | Required? | Reason |
|----------|-----------|--------|
| `POST /billing/charge/` | ✅ Yes | Financial transaction |
| `POST /billing/subscribe/` | ✅ Yes | Subscription creation |
| `POST /posts/` | ⚠️ Optional | Duplicate posts annoying but not costly |
| `POST /comments/` | ⚠️ Optional | Duplicate comments |
| `PUT/PATCH /posts/{id}/` | ❌ No | Idempotent by HTTP spec |
| `DELETE /posts/{id}/` | ❌ No | Idempotent by HTTP spec |
| `GET` | ❌ No | Safe, idempotent by spec |

### Idempotency Key Design

```typescript
// Good: Unique per operation
const key = `${userId}:charge:${amount}:${currency}:${timestamp}`;

// Better: Deterministic for retries
const key = hash(`${userId}:${action}:${params}`);

// Best: Client-generated UUID (simplest)
const key = crypto.randomUUID();
```

---

## Concept 7: Monolithic Layered Architecture (N-Tier)

### Why Not Microservices?

```
┌─────────────────────────────────────────────────────────────────┐
│  MICROSERVICES OVERHEAD (Premature)                             │
├─────────────────────────────────────────────────────────────────┤
│  • Network latency between services                             │
│  • Distributed transactions (Saga pattern)                      │
│  • Service discovery, load balancing                            │
│  • Multiple deployments, monitoring                             │
│  • Team coordination overhead                                   │
│  • Debugging across service boundaries                          │
│                                                                 │
│  FOR 1-10 DEVELOPERS: MONOLITH IS BETTER                        │
└─────────────────────────────────────────────────────────────────┘
```

### Modular Monolith Benefits

| Benefit | Description |
|---------|-------------|
| **Simple Deployment** | One container, one process |
| **ACID Transactions** | Cross-model consistency |
| **Shared Libraries** | DRY utilities, types |
| **Easy Refactoring** | Extract service later if needed |
| **Single Debugging** | One trace, shared logs |
| **Team Autonomy** | Module ownership within repo |

### Layer Separation

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Interface Adapters)                        │
│  ├── urls.py         → HTTP routing                             │
│  ├── views.py        → Request/response handling                │
│  ├── serializers.py  → Validation, serialization                │
│  └── permissions.py  → AuthZ decisions                          │
├─────────────────────────────────────────────────────────────────┤
│  SERVICE LAYER (Application Business Rules)                     │
│  ├── services.py     → Use cases, workflows                     │
│  ├── policies.py     → Complex authorization logic              │
│  └── events.py       → Domain events, side effects              │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN LAYER (Enterprise Business Rules)                       │
│  ├── models.py       → Django ORM (sessions, auth)              │
│  └── convex/         → Convex schema, mutations, queries        │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER (Frameworks, Drivers)                     │
│  ├── convex_client.py → Convex SDK wrapper                      │
│  ├── cache.py         → Redis wrappers                          │
│  └── email.py         → Email service abstraction               │
└─────────────────────────────────────────────────────────────────┘
```

### Django App Structure (Module Boundaries)

```
backend/
├── core/           # Platform: health, Convex client, throttles
├── users/          # Identity: auth, registration, profiles, RBAC
├── posts/          # Content: posts, comments, reactions, search
├── billing/        # Commerce: payments, subscriptions, invoices
└── config/         # Django project settings, root URLs
```

Each app is **self-contained**:
```
users/
├── models.py       # User, Role
├── views.py        # MeView, UserDetailView
├── serializers.py  # Register, UserSerializer
├── services.py     # sync_user_to_convex
├── permissions.py  # IsAuthor, IsAdmin
├── urls.py         # /me/, /<pk>/
├── signals.py      # post_save → sync to Convex
├── admin.py        # Django admin config
├── apps.py         # AppConfig
└── tests.py        # Unit/integration tests
```

### Dependency Rules

```
✅ ALLOWED:
  Presentation → Service → Domain → Infrastructure
  Presentation → Infrastructure (Convex client)

❌ FORBIDDEN:
  Domain → Presentation
  Service → Presentation
  Infrastructure → Service/Domain
```

### Extracting a Service (Future)

```python
# When posts/ grows large:
# 1. Add gRPC/HTTP interface to posts/services.py
# 2. Deploy posts/ as separate service
# 3. Update core/convex_client.py to call posts service
# 4. Other apps import posts client, not posts services
```

---

## Concept 8: Convex as Primary Data Store

### Why Convex?

| Feature | Benefit |
|---------|---------|
| **Real-time** | Subscriptions push updates instantly |
| **Offline-first** | Local writes, background sync |
| **Type-safe** | Shared TypeScript/Python types |
| **Serverless** | No infrastructure management |
| **ACID** | Transactions across tables |
| **Time-travel** | Query any past version |

### Data Flow: Django ↔ Convex

```
┌─────────────┐     Sync      ┌─────────────┐
│   Django    │ ─────────────► │   Convex    │
│  (Auth,     │  User.created │  (Posts,    │
│   Sessions, │  User.updated │   Comments, │
│   Admin)    │  (signals)    │   Reactions)│
└─────────────┘               └─────────────┘
       │                            │
       │ JWT claims                 │ Real-time subscriptions
       ▼                            ▼
┌─────────────────────────────────────────────┐
│              NEXT.JS FRONTEND               │
│  • useQuery for data fetching               │
│  • useMutation for writes                   │
│  • Real-time UI via Convex subscriptions    │
└─────────────────────────────────────────────┘
```

### Schema Design (Convex)

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
    django_id: v.optional(v.number()),
    avatar_url: v.optional(v.string()),
    bio: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_django_id", ["django_id"]),

  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),        // Markdown/HTML
    excerpt: v.string(),
    cover_image: v.optional(v.id("_storage")),
    author_id: v.id("users"),
    status: v.union(v.literal("draft"), v.literal("published")),
    published_at: v.optional(v.number()),
    tags: v.array(v.string()),
    reading_time: v.number(),
  })
    .index("by_author", ["author_id"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_published", ["status", "published_at"])

    .searchIndex("search", {
      searchField: "content",
      filterFields: ["status", "author_id", "tags"],
    }),

  comments: defineTable({
    post_id: v.id("posts"),
    author_id: v.id("users"),
    content: v.string(),
    parent_id: v.optional(v.id("comments")),  // Threaded replies
  })
    .index("by_post", ["post_id"])
    .index("by_author", ["author_id"]),

  reactions: defineTable({
    post_id: v.id("posts"),
    user_id: v.id("users"),
    type: v.union(v.literal("like"), v.literal("laugh"), v.literal("wow")),
  })
    .index("by_post", ["post_id"])
    .index("by_user", ["user_id"])
    .index("by_post_user", ["post_id", "user_id"]),
});
```

### Python Service Layer

```python
# posts/services.py
from core.convex_client import mutation, query

def create_post(author_id: str, data: dict) -> dict:
    return mutation("posts:create", {
        "author_id": author_id,
        "title": data["title"],
        "content": data["content"],
        "excerpt": data.get("excerpt", ""),
        "tags": data.get("tags", []),
        "status": "draft",
    })

def publish_post(post_id: str, user_id: str) -> dict:
    # Authorization check in Convex function
    return mutation("posts:publish", {
        "post_id": post_id,
        "user_id": user_id,
    })

def get_post(slug: str) -> dict | None:
    return query("posts:getBySlug", {"slug": slug})

def list_posts(filters: dict) -> list:
    return query("posts:list", filters)
```

### Frontend Real-Time Usage

```typescript
// frontend/src/hooks/usePosts.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/react";

export function usePosts(filters?: { status?: string; author?: string }) {
  return useQuery({
    queryKey: ["posts", filters],
    queryFn: () => api.posts.list.query(filters),
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: ["post", slug],
    queryFn: () => api.posts.getBySlug.query({ slug }),
    enabled: !!slug,
  });
}

// Real-time subscription (auto-updates!)
export function useRealtimePosts() {
  return useQuery({
    queryKey: ["posts", "realtime"],
    queryFn: () => api.posts.list.query({ status: "published" }),
    // Convex handles real-time automatically with useQuery
  });
}
```

---

## Concept 9: Redis for Sessions, Caching, Rate Limiting

### Redis Roles in PunPost

```
┌─────────────────────────────────────────────────────────────────┐
│                        REDIS CLUSTER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Sessions   │  │   Cache      │  │ Rate Limit   │         │
│  │  (DB 0)      │  │  (DB 1)      │  │  (DB 2)      │         │
│  │              │  │              │  │              │         │
│  │ session:abc  │  │ user:123     │  │ throttle:    │         │
│  │ session:def  │  │ perms:456    │  │  anon:1.2.3  │         │
│  │ TTL: 2 weeks │  │ TTL: 5 min   │  │  user:789    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ Idempotency  │  │   Celery     │  (Future)                │
│  │  (DB 3)      │  │   Broker     │                          │
│  │              │  │              │                          │
│  │idem:key123   │  │ task:queue   │                          │
│  │ TTL: 24 hrs  │  │              │                          │
│  └──────────────┘  └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration (`settings.py`)

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
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_KWARGS": {"max_connections": 50},
            },
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
else:
    # Development fallback
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "punpost-cache",
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.db"
```

### Session Storage

```python
# Automatic via SESSION_ENGINE = "django.contrib.sessions.backends.cache"
# Key format: "session:<session_key>"
# Value: pickled session dict
# TTL: SESSION_COOKIE_AGE (default 2 weeks)
```

### Caching Patterns

```python
from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

# Cache user permissions
def get_user_permissions(user):
    key = f"user_perms:{user.id}"
    perms = cache.get(key)
    if perms is None:
        perms = compute_permissions(user)
        cache.set(key, perms, 300)  # 5 minutes
    return perms

# Invalidate on user update
@receiver(post_save, sender=User)
def invalidate_user_cache(sender, instance, **kwargs):
    cache.delete(f"user_perms:{instance.id}")
    cache.delete(f"user_profile:{instance.id}")

# Cache expensive queries
def get_popular_posts():
    key = "popular_posts:weekly"
    posts = cache.get(key)
    if posts is None:
        posts = Post.objects.popular_this_week()
        cache.set(key, posts, 3600)  # 1 hour
    return posts
```

### Rate Limiting with Redis (Advanced)

```python
# core/throttles.py
import time
from django.core.cache import cache
from rest_framework.throttling import BaseThrottle

class RedisSlidingWindowThrottle(BaseThrottle):
    """
    Sliding window rate limiting using Redis sorted sets.
    Accurate, distributed, survives restarts.
    """
    scope = None
    rate = None

    def get_rate(self):
        if not self.rate and self.scope:
            self.rate = self.get_rate_from_settings(self.scope)
        return self.rate

    def allow_request(self, request, view):
        rate = self.get_rate()
        if not rate:
            return True

        self.num_requests, self.duration = self.parse_rate(rate)
        key = self.get_cache_key(request, view)
        if not key:
            return True

        now = time.time()
        window_start = now - self.duration

        client = cache.client.get_client()
        pipe = client.pipeline()

        # Add current request timestamp
        pipe.zadd(key, {f"{now}": now})
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Count current window
        pipe.zcard(key)
        # Set expiry
        pipe.expire(key, int(self.duration) + 1)

        results = pipe.execute()
        current_count = results[2]

        if current_count > self.num_requests:
            # Calculate wait time
            oldest = client.zrange(key, 0, 0, withscores=True)
            if oldest:
                wait_time = oldest[0][1] + self.duration - now
                self.wait_time = max(0, wait_time)
            return False

        return True

    def wait(self):
        return getattr(self, "wait_time", self.duration)
```

---

## Concept 10: Testing Strategies

### Test Pyramid

```
        ┌─────────────┐
        │   E2E       │  ← Few (5-10) — Critical paths
        │  (Playwright)│
        ├─────────────┤
        │ Integration │  ← Some (20-50) — API contracts
        │  (API)      │
        ├─────────────┤
        │   Unit      │  ← Many (100+) — Pure functions
        │  (pytest)   │
        └─────────────┘
```

### Test Organization

```
backend/
├── core/tests.py           # Health, infrastructure
├── users/tests.py          # Auth, registration, RBAC
├── posts/tests.py          # Posts CRUD, permissions
├── billing/tests.py        # Payments, idempotency
└── conftest.py             # Shared fixtures
```

### Fixtures (`conftest.py`)

```python
# backend/conftest.py
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(
        email="test@example.com",
        password="testpass123",
    )

@pytest.fixture
def author():
    return User.objects.create_user(
        email="author@example.com",
        password="testpass123",
        role="author",
    )

@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email="admin@example.com",
        password="adminpass123",
    )

@pytest.fixture
def auth_client(api_client, user):
    response = api_client.post("/api/auth/login/", {
        "email": "test@example.com",
        "password": "testpass123",
    })
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return api_client
```

### Unit Tests (Services)

```python
# users/tests.py
import pytest
from users.services import sync_user_to_convex

class TestUserSync:
    @pytest.mark.django_db
    def test_sync_new_user(self, user, mocker):
        mock_query = mocker.patch("users.services.query", return_value=None)
        mock_mutation = mocker.patch("users.services.mutation", return_value="convex_123")

        result = sync_user_to_convex(user)

        assert result == "convex_123"
        mock_mutation.assert_called_once_with("users:create", {
            "email": user.email,
            "name": user.get_full_name() or user.username,
            "username": user.username or None,
            "role": user.role,
        })
        user.refresh_from_db()
        assert user.convex_id == "convex_123"
```

### Integration Tests (API)

```python
# posts/tests.py
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestPostAPI:
    def test_create_post_as_author(self, auth_client, author):
        response = auth_client.post("/api/posts/", {
            "title": "Test Post",
            "content": "Content here",
            "excerpt": "Excerpt",
            "tags": ["test"],
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Test Post"
        assert response.data["author"]["id"] == author.id

    def test_create_post_as_reader_forbidden(self, auth_client, user):
        # user has role="reader"
        response = auth_client.post("/api/posts/", {
            "title": "Test Post",
            "content": "Content",
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_own_post(self, auth_client, author, post):
        response = auth_client.patch(f"/api/posts/{post.slug}/", {
            "title": "Updated Title",
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"

    def test_update_other_author_post_forbidden(self, auth_client, author2, post):
        response = auth_client.patch(f"/api/posts/{post.slug}/", {
            "title": "Hacked",
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN
```

### Idempotency Tests

```python
# billing/tests.py
@pytest.mark.django_db
class TestIdempotency:
    def test_charge_idempotent(self, auth_client):
        key = "test-idempotency-key"
        headers = {"HTTP_IDEMPOTENCY_KEY": key}

        # First request
        r1 = auth_client.post("/api/billing/charge/", {"amount": 1000}, **headers)
        assert r1.status_code == 200
        charge_id_1 = r1.data["charge_id"]

        # Retry
        r2 = auth_client.post("/api/billing/charge/", {"amount": 1000}, **headers)
        assert r2.status_code == 200
        charge_id_2 = r2.data["charge_id"]

        # Same result
        assert charge_id_1 == charge_id_2

    def test_different_keys_create_separate_charges(self, auth_client):
        r1 = auth_client.post("/api/billing/charge/", {"amount": 1000}, HTTP_IDEMPOTENCY_KEY="key1")
        r2 = auth_client.post("/api/billing/charge/", {"amount": 1000}, HTTP_IDEMPOTENCY_KEY="key2")

        assert r1.data["charge_id"] != r2.data["charge_id"]
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=users --cov=posts --cov=billing --cov=core

# Specific module
pytest users/tests.py -v

# Pattern
pytest -k "test_create" -v

# Parallel (faster)
pytest -n auto

# Watch mode
pytest-watch
```

---

## Summary: Concepts Mastery Checklist

| Concept | Implementation Status | Key Files |
|---------|----------------------|-----------|
| ✅ HTTP/REST | Complete | `config/urls.py`, `users/views.py` |
| ✅ AuthN vs AuthZ | Complete | `users/models.py`, `users/permissions.py` |
| ✅ JWT + Session | Complete | `settings.py`, `REST_AUTH` config |
| ✅ OAuth 2.0 | Configured | `settings.py` (allauth), `urls.py` |
| ✅ Rate Limiting | Configured | `settings.py` (throttle rates) |
| ✅ Idempotency | Designed | `billing/services.py` (template) |
| ✅ Layered Monolith | Complete | App structure, dependency rules |
| ✅ Convex Integration | Complete | `core/convex_client.py`, `users/services.py` |
| ✅ Redis Usage | Configured | `settings.py` (cache, sessions) |
| ✅ Testing | Structured | `conftest.py`, `*/tests.py` |

---

## Next Steps for Learning

1. **Implement Posts API** — Apply RBAC, Convex mutations, real-time
2. **Add Billing** — Stripe integration, idempotency, webhooks
3. **Write Tests** — Cover all concepts with unit + integration tests
4. **Deploy** — Docker, PostgreSQL, Redis Cluster, Convex prod
5. **Monitor** — Sentry, health checks, rate limit dashboards
6. **Scale** — Extract services when team/module grows

Each concept builds on the previous — master the fundamentals before adding complexity.