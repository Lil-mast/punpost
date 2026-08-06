# PunPost Architecture Documentation

## Overview

PunPost is a **monolithic, layered (N-tier) blogging platform** built with Django REST Framework and Next.js. It demonstrates production-ready patterns for authentication, authorization, rate limiting, idempotency, and real-time data synchronization using Convex as the primary data store.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Next.js 15    │    │   React 19      │    │  TanStack Query │        │
│  │   (Frontend)    │◄───│   (Components)  │◄───│   (State Mgmt)  │        │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘        │
│           │                                                              │
│           │ HTTPS / REST API + WebSocket (Convex)                        │
│           ▼                                                              │
└───────────┼───────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER (Django)                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  URL Routing    │    │  DRF Views      │    │  Serializers    │        │
│  │  (config/urls)  │───►│  (APIViews)     │───►│  (Validation)   │        │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘        │
│                                  │                                       │
└──────────────────────────────────┼────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER (Business Logic)                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  Users Service  │    │  Posts Service  │    │  Billing Service│        │
│  │  (users/services│    │  (posts/services│    │  (idempotency)  │        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│           │                      │                      │                 │
└───────────┼──────────────────────┼──────────────────────┼─────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REPOSITORY / DATA ACCESS LAYER                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  Django ORM     │    │  Convex Client  │    │  Redis Cache    │        │
│  │  (Sessions,     │    │  (Primary Data: │    │  (Sessions,     │        │
│  │   Auth, Admin)  │    │   Posts, Users) │    │   Rate Limit,   │        │
│  └─────────────────┘    └─────────────────┘    │   Idempotency)  │        │
│                                                 └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Presentation Layer (`config/`, `core/views.py`, `users/views.py`)
- **URL Routing**: Maps HTTP endpoints to views
- **DRF Views**: Handle HTTP request/response, authentication, permissions
- **Serializers**: Validate input, serialize output, handle nested relationships

### 2. Service Layer (`users/services.py`, future `posts/services.py`, `billing/services.py`)
- **Business Logic**: Encapsulates domain rules, workflows, cross-cutting concerns
- **Convex Sync**: Synchronizes Django auth users with Convex documents
- **Idempotency**: Handles payment/billing deduplication

### 3. Repository / Data Access Layer
- **Django ORM**: Sessions, admin, authentication, migrations
- **Convex Client**: Primary data store for posts, users, comments (real-time)
- **Redis**: Session storage, rate limiting counters, idempotency keys

---

## Data Flow Examples

### User Registration Flow
```
POST /api/auth/registration/
    │
    ▼
CustomRegisterSerializer.validate()  ──►  Creates Django User (role=reader/author)
    │
    ▼
User.save()  ──►  users.signals.post_save  ──►  services.sync_user_to_convex()
    │
    ▼
Convex mutation("users:create")  ──►  Returns convex_id
    │
    ▼
User.convex_id = convex_id  ──►  User.save()
    │
    ▼
JWT tokens returned to client
```

### Post Creation Flow (Future)
```
POST /api/posts/  (with JWT)
    │
    ▼
PostCreateSerializer.validate()  ──►  Checks user.role == "author" or "admin"
    │
    ▼
services.create_post(user, data)  ──►  Convex mutation("posts:create")
    │
    ▼
Returns Convex document with real-time subscriptions
```

### Authenticated Request Flow
```
GET /api/users/me/  (Authorization: Bearer <jwt>)
    │
    ▼
JWTAuthentication.authenticate()  ──►  Validates token, gets User
    │
    ▼
MeView.get()  ──►  UserSerializer(request.user)  ──►  JSON Response
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend Framework** | Django 5.x + DRF 3.15 | REST API, admin, auth |
| **Auth** | JWT (djangorestframework-simplejwt) + Session (Redis) | API + Dashboard auth |
| **OAuth** | django-allauth (Google, GitHub) | Social login |
| **Primary DB** | Convex | Real-time posts, users, comments |
| **Relational DB** | SQLite (dev) / PostgreSQL (prod) | Sessions, Django admin, auth |
| **Cache/Queue** | Redis + django-redis | Sessions, rate limiting, idempotency |
| **Frontend** | Next.js 15 + React 19 + TypeScript | SSR/SSG, client-side app |
| **State Mgmt** | TanStack Query (React Query) | Server state, caching |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Animation** | Framer Motion | Page transitions, micro-interactions |

---

## Monolith vs Microservices

This is a **modular monolith** — not microservices. Benefits:

| Aspect | Monolith Approach |
|--------|-------------------|
| **Deployment** | Single container/process |
| **Transactions** | ACID across Django models |
| **Debugging** | Single trace, shared logs |
| **Refactoring** | Easy module extraction later |
| **Team Size** | Ideal for 1-10 developers |

### Module Boundaries (for future extraction)
```
core/       →  Platform infrastructure (health, convex client)
users/      →  Identity & access management
posts/      →  Content domain (posts, comments, reactions)
billing/    →  Payments, subscriptions, idempotency
```

Each app has its own `models.py`, `views.py`, `urls.py`, `services.py`, `serializers.py` — ready for future service extraction.

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEFENSE IN DEPTH                           │
├─────────────────────────────────────────────────────────────────┤
│  Network:     CORS, CSRF_TRUSTED_ORIGINS, ALLOWED_HOSTS         │
│  Transport:   HTTPS only (production), Secure cookies           │
│  Application: JWT (short-lived) + Refresh rotation + Blacklist  │
│  Authorization: Role-based (reader/author/admin) + Object-level │
│  Rate Limit:  Anon (100/hr), User (1000/hr), Login (5/min)      │
│  Idempotency: Redis keys for billing (24hr TTL)                 │
│  Headers:     SecurityMiddleware, XFrameOptions, HSTS           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

| Component | Current | Scale Strategy |
|-----------|---------|----------------|
| **Django** | Single process | Gunicorn workers + load balancer |
| **Convex** | Managed | Auto-scales horizontally |
| **Redis** | Single instance | Redis Cluster / Sentinel |
| **Database** | SQLite | PostgreSQL + read replicas |
| **Static Files** | WhiteNoise | CDN (Cloudflare, AWS CloudFront) |
| **Frontend** | Next.js dev | Vercel / Netlify / Docker + Nginx |

---

## Directory Structure

```
punpost/
├── backend/
│   ├── config/           # Django project settings, URLs, WSGI/ASGI
│   ├── core/             # Platform infrastructure (health, Convex client)
│   ├── users/            # Authentication, authorization, profiles
│   ├── posts/            # Posts, comments, reactions (Convex-backed)
│   ├── billing/          # Payments, subscriptions, idempotency
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # API client, utilities
│   │   └── hooks/        # Custom React hooks
│   ├── package.json
│   └── tsconfig.json
├── convex/               # Convex backend (functions, schema)
├── docs/                 # This documentation
├── .env.example
└── README.md
```

---

## Key Design Decisions

1. **Convex as Primary Data Store**: Real-time subscriptions, offline-first, automatic scaling
2. **Django for Auth/Admin**: Battle-tested auth, admin interface, session management
3. **JWT for API, Sessions for Admin**: Different token strategies per client type
4. **Role-Based Access Control**: Three roles (reader, author, admin) with extensible permissions
5. **Idempotency Keys**: Prevents duplicate charges on billing endpoints
6. **Rate Limiting with Redis**: Distributed, survives restarts, configurable tiers
7. **Modular Apps**: Clear boundaries enable future service extraction