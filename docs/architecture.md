# PunPost Architecture Documentation

## Overview

PunPost is a **monolithic, layered (N-tier) blogging platform** built with Django REST Framework and Next.js. It demonstrates production-ready patterns for authentication, authorization, rate limiting, idempotency, and real-time data synchronization using Convex as the primary data store.

> All diagrams below are [Mermaid](https://mermaid.js.org/) and render natively on GitHub/GitLab.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        FE["Next.js 15 Frontend<br/>(React 19 + TanStack Query + TypeScript)"]
        Admin["Django Admin<br/>(Server-rendered dashboard)"]
    end

    subgraph API["API Layer (Django + DRF)"]
        Routes["URL Routing<br/>config/urls.py"]
        Auth["dj-rest-auth + SimpleJWT<br/>auth endpoints"]
        Views["DRF Views<br/>(MeView, HealthCheckView, ...)"]
        Serializers["Serializers<br/>(validation / output shape)"]
        Middleware["Middleware<br/>CORS, CSRF, Security, Sessions"]
    end

    subgraph Services["Service Layer"]
        UserSvc["Users Service<br/>users/services.py"]
        BillingSvc["Billing Service<br/>billing/"]
        PostsSvc["Posts Service<br/>posts/"]
    end

    subgraph Data["Repository / Data Access Layer"]
        ORM["Django ORM<br/>SQLite / PostgreSQL"]
        Convex["Convex Client<br/>core/convex_client.py"]
        Redis["Redis<br/>(sessions, throttling, idempotency)"]
    end

    FE -->|"HTTPS / REST (JSON) +<br/>JWT Bearer token"| Routes
    FE -->|"WebSocket / real-time"| Convex
    Admin -->|"Session cookie"| Routes

    Routes --> Auth
    Routes --> Views
    Views --> Serializers
    Serializers --> UserSvc

    UserSvc --> Convex
    PostsSvc --> Convex
    BillingSvc --> Redis

    Views --> ORM
    Views --> Redis
    ORM --> DB[(SQLite / PostgreSQL)]
```

---

## Layered Architecture (Django Monolith)

PunPost follows a strict **Presentation → Service → Repository** layering. Each Django app owns its own `urls.py`, `views.py`, `serializers.py`, and `services.py`, which keeps module boundaries clean and enables future service extraction.

```mermaid
flowchart LR
    subgraph Presentation["PRESENTATION LAYER"]
        direction TB
        URL["URL Routing"]
        V["DRF Views"]
        S["Serializers"]
    end

    subgraph Service["SERVICE LAYER"]
        direction TB
        US["Users Service"]
        PS["Posts Service"]
        BS["Billing Service"]
    end

    subgraph Repository["REPOSITORY / DATA ACCESS LAYER"]
        direction TB
        ORM["Django ORM"]
        CX["Convex Client"]
        RD["Redis"]
    end

    URL --> V --> S --> US
    S --> PS
    S --> BS
    US --> CX
    US --> ORM
    PS --> CX
    BS --> RD
    ORM --> DB[(Relational DB)]
    CX --> CXDB[("Convex<br/>primary store")]
    RD --> RDS[("Redis cache")]
```

---

## Layer Responsibilities

### 1. Presentation Layer (`config/`, `core/views.py`, `users/views.py`)
- **URL Routing**: Maps HTTP endpoints to views (`config/urls.py`)
- **DRF Views**: Handle HTTP request/response, authentication, permissions
- **Serializers**: Validate input, serialize output, handle nested relationships

### 2. Service Layer (`users/services.py`, future `posts/services.py`, `billing/services.py`)
- **Business Logic**: Encapsulates domain rules, workflows, cross-cutting concerns
- **Convex Sync**: Synchronizes Django auth users with Convex documents (`sync_user_to_convex`)
- **Idempotency**: Handles payment/billing deduplication

### 3. Repository / Data Access Layer
- **Django ORM**: Sessions, admin, authentication, migrations
- **Convex Client**: Primary data store for posts, users, comments (real-time)
- **Redis**: Session storage, rate limiting counters, idempotency keys

---

## Data Flows

### 1. User Registration

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Frontend)
    participant A as Django (DRF)
    participant U as Django User model
    participant CX as Convex

    C->>A: POST /api/auth/registration/<br/>{email, password1, password2, role?}
    A->>A: CustomRegisterSerializer.validate()
    A->>U: Create User (role = reader | author)
    U-->>A: User saved
    Note over U,CX: users/signals.py triggers post_save
    U->>CX: users:getByEmail {email}
    CX-->>U: existing doc or null
    alt User not in Convex
        U->>CX: users:create {email, name, role}
        CX-->>U: convex_id
    end
    U->>U: user.convex_id = convex_id<br/>user.save()
    U-->>A: saved with convex_id
    A-->>C: 201 Created {user, access, refresh}
```

### 2. Login & JWT Issuance

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Frontend)
    participant A as Django (DRF / dj-rest-auth)
    participant U as Django User model

    C->>A: POST /api/auth/login/<br/>{email, password}
    A->>A: LoginSerializer.validate()<br/>allauth authentication (email)
    A->>U: authenticate & fetch user
    U-->>A: user (role, convex_id, ...)
    A->>A: Mint access + refresh JWT<br/>(SimpleJWT)
    A-->>C: 200 OK {access, refresh, user}
    Note over C: Frontend stores tokens<br/>(localStorage + refresh)
```

### 3. Authenticated Request (`GET /api/users/me/`)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Django (DRF)
    participant J as SimpleJWT
    participant U as Django User

    C->>A: GET /api/users/me/<br/>Authorization: Bearer <access>
    A->>J: JWTAuthentication.authenticate()
    J->>J: Validate signature + expiry
    J-->>A: request.user = User
    A->>A: MeView.get() → IsAuthenticated
    A->>U: UserSerializer(request.user)
    U-->>A: user data
    A-->>C: 200 OK {id, email, role, convex_id, ...}
```

### 4. Token Refresh & Logout

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Django (DRF / dj-rest-auth)

    rect rgb(240, 248, 255)
        Note over C,A: TOKEN REFRESH
        C->>A: POST /api/auth/token/refresh/<br/>{refresh}
        A->>A: Rotate refresh (new pair)
        A->>A: Blacklist old refresh token
        A-->>C: 200 OK {access, refresh}
    end

    rect rgb(255, 245, 238)
        Note over C,A: LOGOUT
        C->>A: POST /api/auth/logout/<br/>Authorization: Bearer <access><br/>{refresh}
        A->>A: Add refresh to blacklist<br/>(token_blacklist app)
        A-->>C: 200 OK {detail: "Successfully logged out."}
        Note over C: Access token expires on its own<br/>(60 min default)
    end
```

### 5. Post Creation (Convex-backed, future API)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Django (DRF)
    participant P as Posts Service
    participant CX as Convex

    C->>A: POST /api/posts/ {title, content, ...}<br/>Authorization: Bearer <access>
    A->>A: IsAuthenticated + IsAuthorOrReadOnly
    A->>P: create_post(user, data)
    P->>CX: posts:create {authorId, status, ...}
    CX-->>P: post document (_id)
    P-->>A: created post
    A-->>C: 201 Created {post}
    Note over C,CX: Real-time UI updates via<br/>Convex subscriptions
```

### 6. Health Check

```mermaid
sequenceDiagram
    autonumber
    participant M as Monitoring
    participant A as Django
    participant CX as Convex

    M->>A: GET /api/health/
    A->>A: Check CONVEX_URL configured
    A->>CX: get_convex_client() ping
    CX-->>A: ok
    A-->>M: 200 OK {status, convex, debug}
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

```mermaid
flowchart LR
    subgraph Monolith["PunPost (Django Monolith)"]
        CORE["core/<br/>Platform infrastructure<br/>(health, Convex client)"]
        USERS["users/<br/>Identity & access management"]
        POSTS["posts/<br/>Content domain"]
        BILLING["billing/<br/>Payments & idempotency"]
    end

    CORE --> USERS
    USERS --> POSTS
    BILLING -.->|"consumes"| USERS

    POSTS -.->|"future: extract"| PostSvc["Post Service"]
    BILLING -.->|"future: extract"| BillSvc["Billing Service"]
```

Each app has its own `models.py`, `views.py`, `urls.py`, `services.py`, `serializers.py` — ready for future service extraction.

---

## Security Architecture

```mermaid
flowchart TB
    subgraph Defense["DEFENSE IN DEPTH"]
        direction TB
        Network["Network<br/>CORS, CSRF_TRUSTED_ORIGINS, ALLOWED_HOSTS"]
        Transport["Transport<br/>HTTPS only (prod), Secure cookies"]
        App["Application<br/>JWT (short-lived) + Refresh rotation + Blacklist"]
        AuthZ["Authorization<br/>RBAC (reader/author/admin) + Object-level perms"]
        Rate["Rate Limit<br/>Anon 100/hr, User 1000/hr, Login 5/min"]
        Idem["Idempotency<br/>Redis keys for billing (24h TTL)"]
        Headers["Headers<br/>SecurityMiddleware, XFrameOptions, HSTS"]
    end

    Client["Client"] --> Network --> Transport --> App --> AuthZ --> Rate --> Idem --> Headers --> API["API Resources"]
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

```mermaid
flowchart TB
    root["punpost/"] --> backend["backend/ (Django)"]
    root --> frontend["frontend/ (Next.js)"]
    root --> convex["convex/ (Convex backend)"]
    root --> docs["docs/ (Mermaid docs)"]

    backend --> bcfg["config/<br/>settings, urls, WSGI/ASGI"]
    backend --> core["core/<br/>health, Convex client"]
    backend --> users["users/<br/>auth, RBAC, Convex sync"]
    backend --> posts["posts/<br/>posts, comments, reactions"]
    backend --> billing["billing/<br/>payments, idempotency"]
    backend --> bman["manage.py"]
    backend --> breq["requirements.txt"]

    frontend --> fsrc["src/"]
    fsrc --> app["app/ (App Router pages)"]
    fsrc --> comp["components/ (UI)"]
    fsrc --> lib["lib/ (API client)"]
    fsrc --> hooks["hooks/ (React hooks)"]
    frontend --> fpkg["package.json"]

    convex --> cfn["convex/<br/>schema.ts, users.ts, posts.ts"]
    convex --> cgen["_generated/ (type-safe client)"]
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
