# CRUVO — Architecture Reference Document

**CRUVO** is a group motorcycle touring app: riders create rides, invite a squad, mark themselves ready, then ride together with live GPS tracking on a shared map, flagging stops (fuel/food/break/issues) along the way. The app auto-completes a ride when every rider arrives at the destination.

This document is the complete reference for the entire system — backend, mobile app, data models, API surface, navigation, data flows, debugging, and design decisions. It is written so you can understand and debug the whole codebase without opening a single source file.

---

## Table of Contents

1. [Tech Stack & Why](#1-tech-stack--why)
2. [Project Structure](#2-project-structure)
3. [Backend Architecture](#3-backend-architecture)
4. [Data Models](#4-data-models-all-5-with-every-field)
5. [API Endpoints](#5-api-endpoints-complete-reference)
6. [Mobile App Architecture](#6-mobile-app-architecture)
7. [Navigation Flow](#7-navigation-flow)
8. [File-by-File Reference](#8-file-by-file-reference)
9. [How Files Connect](#9-how-files-connect-data-flow-diagrams)
10. [Debugging Guide](#10-debugging-guide)
11. [Alternatives Considered](#11-alternatives-considered)

---

## 1. Tech Stack & Why

### 1.1 Backend

| Technology | Version | Role |
|---|---|---|
| Django | 6.1 | Web framework, ORM, admin |
| Django REST Framework | 3.18 | JSON API layer |
| PostgreSQL (via Supabase) | — | Production database |
| `dj-database-url` | 3.1.2 | Parses `DATABASE_URL` env var into Django DB config |
| `psycopg2-binary` | 2.9.12 | Postgres driver |
| DRF Token Authentication | built-in | `rest_framework.authtoken` — opaque per-user tokens |
| django-cors-headers | 4.9.0 | Allows the React Native / web clients to call the API |
| WhiteNoise | 6.12.0 | Serves static files without Nginx/S3 |
| Gunicorn | 26.1.0 | Production WSGI server on Render |
| Pillow | 12.3.0 | Image handling for profile avatars (`ImageField`) |

**Why Django?**
- Batteries-included ORM — the app is heavily relational (rides ↔ participants ↔ positions ↔ flags), and Django's ORM makes those joins trivial (`participants__user=request.user` filters span tables in one line).
- Built-in `User` model + `auth` app means login/passwords/sessions work out of the box.
- Single language for API + admin + future website.
- **Alternatives:** FastAPI (would need SQLAlchemy/Alembic bolted on, no admin), Flask (too little included), Laravel (different language ecosystem).

**Why PostgreSQL via Supabase?**
- PostGIS-grade relational integrity for ride/participant/position data with unique constraints (`unique_together`) enforced at the DB level.
- Supabase gives a free managed Postgres with a connection URL that drops straight into `DATABASE_URL` — zero ops.
- Render's free web service has no persistent disk; an external DB survives deploys and restarts.
- **Alternatives:** SQLite (dev-only; used automatically when `DATABASE_URL` is absent — see `backend/settings.py:104-120`), self-hosted Postgres (ops burden), MongoDB (wrong fit, see §11).

**Why DRF Token Auth instead of JWT?**
- One table (`authtoken_token`), one header format (`Authorization: Token <key>`), no refresh-token dance, no clock skew bugs.
- Tokens don't expire — perfect for a small trusted user base where "log out everywhere" isn't a hard requirement.
- **Alternatives:** JWT (`djangorestframework-simplejwt`) adds refresh tokens, secret rotation, and expiry edge cases for no benefit here (full comparison in §11).

**Why Render.com hosting?**
- Free/cheap tier, native Python runtime, `render.yaml` blueprint committed to the repo (`build.sh` → `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`).
- Env vars (`SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOW_ALL_ORIGINS`) configured declaratively in `render.yaml`.
- **Trade-off:** free instances sleep after ~15 min idle → 30–60 s cold starts (see §10.1).
- **Alternatives:** Heroku (paid), Railway/Fly.io (fine, but Render was already set up), AWS EC2/ECS (massive overkill).

### 1.2 Mobile

| Technology | Version | Role |
|---|---|---|
| React Native + Expo | SDK 57 (`expo ~57.0.15`, RN 0.86.2) | App framework & toolchain |
| MapLibre GL JS 4.7.1 | inside `react-native-webview` 13.16.1 | Interactive maps (see below) |
| TomTom Search & Routing API | — | Geocoding (place search / reverse geocode) + route calculation |
| expo-location | ~57.0.12 | Foreground GPS permissions + position streaming |
| expo-secure-store | ~57.0.1 | Encrypted on-device storage of the auth token |
| axios | ^1.19.0 | HTTP client with interceptors |
| @react-navigation/native + native-stack + bottom-tabs | v7 | Navigation |
| expo-image-picker | ~57.0.12 | Avatar upload |
| react-native-maps | 1.27.2 | Present in deps; legacy component (`RideMap.js`), superseded by FreeMap |

**Why React Native + Expo?**
- One JavaScript codebase ships to iOS + Android. Hot reload, OTA-ish dev loop via Expo Go, and SDK-managed native modules (`expo-location`, `expo-secure-store`) avoid Xcode/Gradle hell.
- **Alternatives:** Flutter (Dart — new language for the team, see §11), fully native iOS + Android (two codebases, double maintenance).

**Why MapLibre GL JS inside a WebView (the `FreeMap` component)?**
- Completely **free and open source**: MapLibre renders OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) — no API key, no per-load billing, no usage cap.
- Vector-smooth pan/zoom/pitch/bearing animation out of the box (`jumpTo`, `easeTo`, `flyTo`).
- Running it as a string of HTML in a `WebView` keeps everything in the JS layer — **no native module linking**, which matters for Expo Go compatibility.
- The RN side talks to the map by re-rendering generated HTML and by `postMessage` for live location updates.
- **Alternatives:** Google Maps SDK (billed per load), react-native-maps (needs a provider API key on Android and native builds outside Expo Go), Mapbox RN SDK (usage-priced after free tier).

**Why TomTom API?**
- Generous **free tier (~2,500 requests/day)** covering both geocoding (`/search/2/search`) and routing (`/routing/1/calculateRoute`).
- Returns turn-by-turn-ready polylines, distance in meters, and duration in seconds — exactly the three fields stored on `Ride`.
- Key lives in `mobile/src/config.js` (and mirrored server-side as fallback in `pages/api.py:392`).
- **Alternative:** Google Places/Directions (better data but requires billing account and costs money past $200/mo credit).

**Why expo-location?**
- Managed permissions flow (`requestForegroundPermissionsAsync`) plus a high-accuracy watcher (`watchPositionAsync`) with distance/time intervals — exactly what live ride tracking needs, no native code.

**Why expo-secure-store?**
- The DRF token is a bearer credential. SecureStore stores it in the device Keychain (iOS) / Keystore (Android), encrypted at rest — safer than AsyncStorage, which is plaintext.

**Why axios (not fetch)?**
- Request **interceptors** (`mobile/src/api/index.js:12-21`) attach the `Authorization: Token …` header to *every* request transparently — screens never touch tokens.
- Automatic JSON serialization, timeouts (`timeout: 30000`), and consistent error objects (`err.response.data`) that screens map to field-level validation messages.

### 1.3 Why function-based views (not ViewSets / class-based views)?

All 19 endpoints in `pages/api.py` are decorated functions (`@api_view(['GET', 'POST'])`). Deliberate reasons:

1. **Explicitness over abstraction.** Every endpoint's permission logic differs slightly (creator-only delete, participant-only ready-toggle, public/private detail masking). With ViewSets you'd fight generic mixins and override `get_queryset`/`get_permissions` per action. With FBVs, the entire authorization story for an endpoint is readable top-to-bottom in ~20 lines.
2. **Non-CRUD actions dominate.** Most endpoints aren't CRUD at all: `toggle-ready`, `start-ride`, `update-position`, `fetch-route`, `respond-invitation`. These are *commands*, not resources — ViewSets' verb-based router (`list/create/retrieve/update/destroy`) fits them poorly.
3. **Custom status-code semantics are common.** e.g. `ride_detail_view` returns **404 (not 403)** for private rides viewed by strangers — intentional information-hiding. That kind of nuance is trivial in an FBV and awkward in a ViewSet.
4. **Easier debugging.** A stack trace lands directly in the function you wrote; no mixin resolution order to mentally simulate.
5. **One view, multiple methods** (`rides_view` handles GET list + POST create; `profile_view` handles GET + PATCH) keeps related logic colocated without a router.

Cost: more boilerplate than ViewSets for pure-CRUD endpoints. Accepted trade-off — this app has few truly plain CRUD surfaces.

---

## 2. Project Structure

```
GRIDE Project/
├── manage.py                    # Django management entry point (runserver, makemigrations…)
├── requirements.txt             # Pinned Python deps (see §1.1 table)
├── runtime.txt                  # Python version pin for Render
├── build.sh                     # Render build script (pip install, collectstatic, migrate)
├── Procfile                     # Legacy process definition
├── render.yaml                  # Render blueprint: gunicorn start, env vars (SECRET_KEY,
│                                #   DEBUG=False, DATABASE_URL ref, ALLOWED_HOSTS, CORS flag)
├── .env                         # Local secrets (gitignored) — SECRET_KEY, DEBUG, DATABASE_URL
├── .env.example                 # Template showing required env vars
├── db.sqlite3                   # Dev database — ONLY used when DATABASE_URL unset/not postgres
├── media/                       # Uploaded avatars (MEDIA_ROOT), served at /media/
│   └── avatars/
│
├── backend/                     # Django PROJECT (configuration package)
│   ├── __init__.py
│   ├── settings.py              # All config: INSTALLED_APPS, middleware, DRF settings,
│   │                            #   CORS, DB switch (postgres↔sqlite), static/media,
│   │                            #   WhiteNoise storage, email backend
│   ├── urls.py                  # Root urlconf: admin/ + api/ (→ pages.api_urls) +
│   │                            #   '' (→ pages.urls) + media static serving
│   ├── wsgi.py                  # WSGI entry (used by gunicorn on Render)
│   └── asgi.py                  # ASGI entry (unused today; available for channels later)
│
├── pages/                       # The single Django APP — models, serializers, API, legacy web UI
│   ├── __init__.py
│   ├── apps.py                  # AppConfig ('pages')
│   ├── models.py                # ALL 5 models: Profile, Ride, RideParticipant,
│   │                            #   FlagStop, RidePosition (§4)
│   ├── serializers.py           # 11 DRF serializers — validation + JSON shaping (§5)
│   ├── api.py                   # ALL 19 API endpoint functions (§5) — the heart of the backend
│   ├── api_urls.py              # URL routing for api.py under /api/ (app_name='api')
│   ├── urls.py                  # Server-rendered WEB routes under '/' (app_name='pages'):
│   │                            #   onboarding, signup, login, logout, dashboard, discovery,
│   │                            #   create-ride, active-ride, flag-stop, ride-summary
│   ├── views.py                 # Template views backing pages/urls.py (session-auth web UI;
│   │                            #   prototype/marketing companion — mobile app does NOT use these)
│   ├── forms.py                 # SignupForm / LoginForm for the web flow (email==username)
│   ├── tests.py                 # Empty test scaffold
│   ├── admin.py                 # Empty admin registration scaffold
│   ├── migrations/              # Schema history
│   │   ├── 0001_initial.py      # Profile, Ride, RideParticipant, FlagStop, RidePosition
│   │   ├── 0002_…               # Adds RideParticipant.is_ready
│   │   └── 0003_…               # Adds Ride.route_distance_m / route_duration_s (+more)
│   ├── templates/pages/*.html   # 9 web templates (onboarding-welcome, signup, login,
│   │                            #   home-dashboard, ride_discovery, create-a-ride,
│   │                            #   active_ride_map, flag-stop-confirmation, ride_summary)
│   └── static/                  # Static assets referenced by web templates (collected by WhiteNoise)
│
└── mobile/                      # React Native Expo app
    ├── App.js                   # Root component: loads fonts → AuthProvider → AppNavigator
    ├── index.js                 # Expo registration entry ("main" in package.json)
    ├── package.json             # Deps pinned to Expo SDK 57 compatible versions
    ├── app.json / eas.json      # Expo config (if present)
    │
    └── src/
        ├── config.js            # TOMTOM_API_KEY + TOMTOM_BASE_URL constants
        ├── theme/
        │   └── index.js         # Design system: colors (dark #121317 + yellow #ffd600),
        │                        #   spacing scale, radii, typography presets
        ├── api/
        │   └── index.js         # Axios instance + interceptor + 5 API namespaces
        │                        #   (authAPI, profileAPI, ridesAPI, discoveryAPI, invitationsAPI)
        ├── context/
        │   └── AuthContext.js   # Global auth state: user/profile/loading + login/register/logout/
        │                        #   refreshProfile; persists token in SecureStore
        ├── hooks/
        │   └── useLocation.js   # GPS hook: permission request, one-shot fix, watch/stop-watch
        ├── components/
        │   ├── FreeMap.js       # ★ Primary map: WebView + MapLibre GL + OSM tiles;
        │   │                    #   markers, route polyline, rider dots, postMessage follow-mode
        │   ├── RideMap.js       # Legacy react-native-maps version of the same idea (unused by
        │   │                    #   current screens; kept for reference/fallback)
        │   ├── LocationPicker.js# Text input → TomTom autocomplete → {name,lat,lng};
        │   │                    #   "current location" button with reverse geocoding
        │   └── UserAvatar.js    # Avatar image or deterministic-color initials fallback
        ├── navigation/
        │   ├── AppNavigator.js  # Root stack; swaps auth screens ⇄ main app based on useAuth()
        │   └── MainTabs.js      # Bottom tab bar: Home / Explore / Rides / Map
        └── screens/
            ├── OnboardingScreen.js  # Landing hero → Signup / Login links (unauthenticated)
            ├── LoginScreen.jso      # (LoginScreen.js) Username+password form → authContext.login
            ├── SignupScreen.js      # Registration form incl. bike/style/experience → register
            ├── DashboardScreen.js   # HOME tab: greeting, avatar, upcoming ride cards
            ├── DiscoveryScreen.js   # EXPLORE tab: rider search + style/experience/bike/city filters
            ├── RidesListScreen.js   # RIDES tab: invitation cards (accept/decline) + my rides list
            ├── MapScreen.js         # MAP tab: finds any ACTIVE ride → redirects to ActiveRide,
            │                        #   else empty-state with CTA
            ├── CreateRideScreen.js  # Modal-style form: name, origin/dest pickers, date/time,
            │                        #   public switch → creates ride → Invite or Start
            ├── InviteRidersScreen.js# Rider discovery + toggle INVITED; DONE can start the ride
            ├── RideSummaryScreen.js # Pre-ride hub: map preview, stats, squad ready-states;
            │                        #   creators start the ride, others toggle ready; delete ride
            ├── ActiveRideScreen.js  # LIVE ride screen: full-screen follow-map, roster panel,
            │                        #   5s GPS push / 3s poll, flag-stop FAB+modal, auto-end
            ├── RideSummaryScreen.js # (post-ride summary also served by this screen when COMPLETED)
            ├── FlagStopScreen.js    # Standalone flag-type picker sheet (UI prototype; the live
            │                        #   flag modal actually lives in ActiveRideScreen)
            ├── ProfileEditScreen.js # Edit profile fields, upload avatar, change username/email
            └── SettingsScreen.js    # Read-only profile info + logout confirmation
```

> Note: `mobile/src/screens/LoginScreen.jso` above is a typo in prose — the real file is `LoginScreen.js`. There are 14 screen files total.

---

## 3. Backend Architecture

### 3.1 Request Flow

```
┌─────────────────────── MOBILE APP ────────────────────────┐
│ Screen (e.g. RidesListScreen)                             │
│   ↓ calls                                                 │
│ ridesAPI.list()  ── mobile/src/api/index.js               │
│   ↓ axios interceptor injects "Authorization: Token xxx"  │
└───────────────────────────┬───────────────────────────────┘
                            │ HTTPS POST/GET https://cruvo.onrender.com/api/...
                            ▼
┌──────────────────────── RENDER.COM ───────────────────────┐
│ Gunicorn (WSGI) worker receives the request               │
└───────────────────────────┬───────────────────────────────┘
                            ▼
┌──────────────────────── DJANGO ───────────────────────────┐
│ backend/urls.py: path('api/', include('pages.api_urls'))  │
│   ↓                                                       │
│ pages/api_urls.py resolves e.g. 'rides/<int:ride_id>/'    │
│   ↓                                                       │
│ Middleware chain (settings.py:53): Security → WhiteNoise  │
│ → CORS → Session → Common → CSRF → Auth → Messages → XFO  │
│   ↓                                                       │
│ DRF TokenAuthentication reads Authorization header →      │
│   attaches request.user (default IsAuthenticated,         │
│   settings.py:65-77)                                      │
│   ↓                                                       │
│ @api_view function in pages/api.py                        │
│   ↓ validates input                                       │
│ Serializer (pages/serializers.py)                         │
│   ↓ save() / querysets                                    │
│ Models (pages/models.py)                                  │
│   ↓ ORM                                                   │
│ PostgreSQL (Supabase, SSL required)                       │
│   ↓                                                       │
│ Response(JSON) ← Response(serializer.data, status=…)      │
└───────────────────────────────────────────────────────────┘
```

Concrete example — creating a ride:

```
CreateRideScreen.handleCreate()                     (mobile/src/screens/CreateRideScreen.js:33)
  → ridesAPI.create(payload)                        (mobile/src/api/index.js:41)
  → POST https://cruvo.onrender.com/api/rides/
  → api_urls.py:13  path('rides/', api.rides_view)
  → api.rides_view(request)  method=='POST'         (pages/api.py:104-120)
  → RideCreateSerializer.is_valid()                 (serializers.py:160-174, rejects past dates)
  → serializer.save(creator=request.user)           → INSERT INTO pages_ride
  → RideParticipant.objects.create(role='CREATOR',
        status='ACCEPTED')                          → creator auto-joins own ride
  → 201 { ride JSON via RideSerializer }
```

### 3.2 Authentication Flow

DRF token auth with `rest_framework.authtoken`:

```
LOGIN
 1. LoginScreen collects username + password
 2. AuthContext.login(username, password)           (AuthContext.js:31)
 3. authAPI.login() → POST /api/auth/login/         (api/index.js:25)
 4. login_view (api.py:33-50):
      - LoginSerializer checks fields present
      - django.contrib.auth.authenticate() verifies password hash
      - Token.objects.get_or_create(user=user)      ← token NEVER expires
      - returns { token, user: { id, username, email, profile } }
 5. AuthContext stores it:
      - SecureStore.setItemAsync('auth_token', …)   (encrypted device storage)
      - setUser({token,id,username,email}), setProfile(…)
 6. Navigator sees user≠null → shows main app

EVERY SUBSEQUENT REQUEST
 7. axios request interceptor (api/index.js:12-21):
      token = await SecureStore.getItemAsync('auth_token')
      if token: config.headers.Authorization = `Token ${token}`
 8. DRF TokenAuthentication middleware matches header → request.user

APP RESTART (session restore)
 9. AuthProvider mounts → checkAuth() (AuthContext.js:16-29)
      - reads token from SecureStore
      - if present: GET /api/profile/ as a liveness probe
          ✓ valid   → restore user+profile from response
          ✗ invalid → delete stale token → unauthenticated state
 10. loading=false → AppNavigator renders correct branch

LOGOUT
11. SettingsScreen → AuthContext.logout() (AuthContext.js:47-54)
      - POST /api/auth/logout/ (server DELETES the token row)
      - SecureStore.deleteItemAsync('auth_token')
      - setUser(null)/setProfile(null) → navigator flips to auth screens
```

Default DRF config (`settings.py:65-77`): `DEFAULT_AUTHENTICATION_CLASSES = [TokenAuthentication]`, `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`. Public endpoints must opt out explicitly with `@permission_classes([permissions.AllowAny])` — only `register_view`, `login_view` do.

Parsers include `JSONParser`, `FormParser`, and `MultiPartParser` (the last enables multipart avatar uploads through the same PATCH `/profile/` endpoint).

### 3.3 CORS Configuration

```python
# settings.py:79
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'True') == 'True'
```

- `corsheaders.middleware.CorsMiddleware` sits near the top of the middleware stack (`settings.py:56`), *before* `CommonMiddleware`, as its docs require — so it can answer preflight `OPTIONS` requests before anything else touches them.
- With `CORS_ALLOW_ALL_ORIGINS=True`, every response gets `Access-Control-Allow-Origin: *`. This is set True in `render.yaml` because:
  - the mobile app is not a "browser origin" at all (native HTTP calls are not subject to CORS),
  - but any WebView/web preview hitting the API needs the header.
- Consequence: the API currently trusts any web origin. Locking down would mean setting `CORS_ALLOW_ALL_ORIGINS=False` and adding `CORS_ALLOWED_ORIGINS` with explicit domains. See §10.8 for diagnosing CORS errors.

---

## 4. Data Models (all 5, every field)

Source: `pages/models.py`.

### 4.1 Profile — `pages/models.py:5-41`

Extends each Django `User` with rider identity. **1:1 with User** (`related_name='profile'`, cascade delete).

| Field | Type | Notes |
|---|---|---|
| `user` | OneToOneField(User) | CASCADE, `related_name='profile'` |
| `display_name` | CharField(100) | Shown everywhere; drives initials |
| `avatar` | ImageField | `upload_to='avatars/'`, blank/null allowed (Pillow-backed) |
| `bio` | TextField | blank, default `''` |
| `bike_make` | CharField(100) | blank, default `''` (e.g. "Royal Enfield") |
| `bike_model` | CharField(100) | blank, default `''` (e.g. "Himalayan 450") |
| `riding_style` | CharField(20) | choices: ADVENTURE / SPORT / TOURING / CRUISE / COMMUTE; blank ok |
| `experience_level` | CharField(20) | choices: BEGINNER / INTERMEDIATE / VETERAN / EXPERT; blank ok |
| `location_city` | CharField(100) | blank; searchable in discovery |
| `location_lat` | FloatField | null/blank |
| `location_lng` | FloatField | null/blank |
| `phone` | CharField(20) | blank |
| `created_at` | DateTimeField | `auto_now_add=True` |

**Method `initials()`** (models.py:37-41): first letters of first two words of display_name, uppercased; falls back to first two chars, then `'??'` for empty names. Serialized via `ProfileSerializer.get_initials` and reused by `UserAvatar` on mobile.

### 4.2 Ride — `pages/models.py:44-76`

A planned or executed group ride.

| Field | Type | Notes |
|---|---|---|
| `creator` | ForeignKey(User) | CASCADE, `related_name='created_rides'` |
| `name` | CharField(200) | Ride title |
| `origin_name` | CharField(200) | Human label of start point |
| `origin_lat` / `origin_lng` | FloatField | null/blank |
| `destination_name` | CharField(200) | Human label of end point |
| `destination_lat` / `destination_lng` | FloatField | null/blank |
| `date` | DateField | validated ≥ today on create (serializers.py:170-174) |
| `time` | TimeField | |
| `is_public` | BooleanField | default False — gates detail visibility |
| `status` | CharField(20) | DRAFT / SCHEDULED / ACTIVE / COMPLETED / CANCELLED; default SCHEDULED |
| `distance_km` | FloatField | null/blank; filled by route fetch (rounded to 0.1) |
| `route_polyline` | TextField | blank; JSON array of `{latitude, longitude}` points from TomTom |
| `route_distance_m` | IntegerField | null/blank; meters from TomTom summary |
| `route_duration_s` | IntegerField | null/blank; seconds from TomTom summary |
| `created_at` | DateTimeField | auto_now_add |
| `updated_at` | DateTimeField | auto_now |

**Method `participant_count()`** (models.py:75-76): count of participants whose status == ACCEPTED. Exposed as computed `participant_count` in `RideSerializer`.

Status lifecycle:

```
DRAFT ──► SCHEDULED ──► ACTIVE ──► COMPLETED
                └─────► CANCELLED (manual, via PATCH status)
(create defaults to SCHEDULED; start_ride_view flips to ACTIVE;
 ActiveRideScreen auto-end or creator END button flips to COMPLETED)
```

### 4.3 RideParticipant — `pages/models.py:79-105`

Join table: a user's membership in a ride. **Unique together: `(ride, user)`** (models.py:101-102) — a user can appear at most once per ride.

| Field | Type | Notes |
|---|---|---|
| `ride` | ForeignKey(Ride) | CASCADE, `related_name='participants'` |
| `user` | ForeignKey(User) | CASCADE, `related_name='ride_participations'` |
| `role` | CharField(20) | CREATOR / LEAD / WINGMAN / SWEEP; default WINGMAN (creator row is created with CREATOR) |
| `status` | CharField(20) | INVITED / ACCEPTED / DECLINED / COMPLETED; default INVITED |
| `is_ready` | BooleanField | default False — the pre-departure readiness flag (added in migration 0002) |
| `joined_at` | DateTimeField | auto_now_add |
| `completed_at` | DateTimeField | null/blank (reserved for per-rider completion stamping) |

Roles form riding formation semantics: LEAD navigates up front, WINGMANs fill the middle, SWEEP rides sweep at the back. CREATOR is implicitly the lead.

### 4.4 FlagStop — `pages/models.py:108-127`

A rider's "pulling over" beacon during an active ride.

| Field | Type | Notes |
|---|---|---|
| `ride` | ForeignKey(Ride) | CASCADE, `related_name='flag_stops'` |
| `flagged_by` | ForeignKey(User) | CASCADE |
| `stop_type` | CharField(20) | FUEL / FOOD / BREAK / GENERAL / ISSUE |
| `lat` | FloatField | default 0 |
| `lng` | FloatField | default 0 |
| `location_name` | CharField(200) | blank; mobile sends `"{TYPE} stop"` |
| `created_at` | DateTimeField | auto_now_add |
| `resolved_at` | DateTimeField | null/blank — non-null means cleared; client treats `flagged_by == me && resolved_at == null` as "my active flag" |

### 4.5 RidePosition — `pages/models.py:130-143`

Latest known GPS ping per rider per ride. **Unique together `(ride, user)`** — this powers the **upsert pattern**: `update_or_create` (api.py:361-364) means each rider has exactly ONE mutable position row per ride, not an ever-growing trail.

| Field | Type | Notes |
|---|---|---|
| `ride` | ForeignKey(Ride) | CASCADE, `related_name='positions'` |
| `user` | ForeignKey(User) | CASCADE |
| `lat` | FloatField | |
| `lng` | FloatField | |
| `heading` | FloatField | degrees; rotates the user arrow in FreeMap |
| `speed` | FloatField | m/s from GPS |
| `updated_at` | DateTimeField | auto_now — refreshed on every upsert |

### Relationship diagram

```
User 1──1 Profile
User 1──* Ride            (as creator, related_name='created_rides')
User 1──* RideParticipant (related_name='ride_participations')

Ride 1──* RideParticipant *──1 User      unique (ride,user)
Ride 1──* FlagStop          *──1 User    (flagged_by)
Ride 1──* RidePosition      *──1 User    unique (ride,user)
```

---

## 5. API Endpoints (complete reference)

Base URL: `https://cruvo.onrender.com/api` · Routing: `pages/api_urls.py` · Handlers: `pages/api.py`.
Unless stated otherwise, **all endpoints require the `Authorization: Token <key>` header** (global `IsAuthenticated` default). Unauthenticated calls return **401** with DRF's `{"detail": "Invalid token."}` / `"Authentication credentials were not provided."`.

### 5.1 Auth

#### `POST /api/auth/register/` — api.py:19-30 · AllowAny
- **Body:** `{ username (3–30 chars), email, password (≥8), password2, display_name, bike_make?, bike_model?, riding_style?, experience_level? }`
- **Response 201:** `{ token, user: { id, username, email, profile } }`
- **Errors:**
  - `400` — serializer errors object: taken username (`validate_username`, case-insensitive), taken email, `password2: "Passwords do not match."`, short username/password.
- **Side effects:** creates `User` **and** `Profile` atomically in `RegisterSerializer.create`; token issued immediately (auto-login).

#### `POST /api/auth/login/` — api.py:33-50 · AllowAny
- **Body:** `{ username, password }`
- **Response 200:** `{ token, user: { id, username, email, profile } }`
- **Errors:**
  - `401 {"error": "Invalid credentials"}` — authenticate() failed.
  - `400` — missing/blank fields.
- Tokens are `get_or_create`d, so repeat logins reuse the same key unless it was deleted via logout.

#### `POST /api/auth/logout/` — api.py:53-59 · auth required
- Deletes `request.user.auth_token` (DB row). Subsequent calls with the old token → 401.
- **Response:** `204 No Content`. Never errors client-side (exceptions swallowed) so logout always succeeds locally too.

### 5.2 Profile

#### `GET /api/profile/` — api.py:62-71 · auth
- **Response 200:** full ProfileSerializer payload: `{ id, user_id, username, email, display_name, avatar, avatar_url, bio, bike_make, bike_model, riding_style, experience_level, location_city, location_lat, location_lng, phone, created_at, initials }`
- Used as the session-liveness probe on app restart (AuthContext.checkAuth). A 401 here ⇒ stale token ⇒ forced re-login.

#### `PATCH /api/profile/` — api.py:65-70 · auth
- **Body:** any subset of writable profile fields (`partial=True`). Also accepts `multipart/form-data` with an `avatar` file part (avatar upload path).
- **Response 200:** updated profile.
- **Errors:** `400` field errors (e.g. bad choice value for riding_style/experience_level, oversized avatar).

#### `POST /api/profile/change-username/` — api.py:74-86 · auth
- **Body:** `{ username, password }` (password = current password, re-auth gate)
- **Response 200:** `{ "username": "<new>" }`
- **Errors 400:** `"Username must be at least 3 characters"` · `"Incorrect password"` · `"Username already taken"` (case-insensitive check excluding self).

#### `POST /api/profile/change-email/` — api.py:89-101 · auth
- **Body:** `{ email, password }`
- **Response 200:** `{ "email": "<new>" }`
- **Errors 400:** `"Email is required"` · `"Incorrect password"` · `"Email already in use"`.

### 5.3 Rides

#### `GET /api/rides/` — api.py:106-111 · auth
- Returns rides where the caller has a participant row with **status=ACCEPTED** (invited-but-not-accepted rides are NOT listed; they arrive via `/invitations/`). Ordered `-date,-time`, capped at 50.
- **Response 200:** `[RideSerializer, …]` — each includes nested `participants[]`, `participant_count`, `creator_name`.
- **Errors:** none beyond 401.

#### `POST /api/rides/` — api.py:113-120 · auth
- **Body:** `{ name, date, time, origin_name?, origin_lat?, origin_lng?, destination_name?, destination_lat?, destination_lng?, is_public?, route_polyline?, route_distance_m?, route_duration_s? }`
- **Behavior:** creates Ride with creator=request.user AND immediately creates the creator's RideParticipant row with `role='CREATOR', status='ACCEPTED'` — the creator is always a confirmed participant of their own ride.
- **Response 201:** RideSerializer JSON.
- **Errors:** `400` — missing name/date/time, or `date: "Ride date cannot be in the past."` (serializers.py:170-174).

#### `GET /api/rides/<id>/` — api.py:123-136 · auth
- **Private-ride masking:** if `is_public == false` and the requester has NO participant row on the ride, responds **404 (empty body)** rather than 403 — deliberately indistinguishable from "doesn't exist" so private ride IDs can't be probed (api.py:130-133). Same trick in the summary view (api.py:257-260).
- **Response 200:** RideSerializer JSON (with nested participants).
- **Errors:** `404` nonexistent ride OR unauthorized peek at private ride.

#### `PATCH /api/rides/<id>/` — api.py:138-143 · auth
- Partial update via `RideCreateSerializer(partial=True)` — commonly `{ status: 'COMPLETED' }` from the mobile auto-end flow, or CANCELLED.
- ⚠️ No ownership check on PATCH: any authenticated user who knows the ID can patch a **public** ride. Private rides remain shielded by the 404 mask only on GET; PATCH does not apply the mask. (Known sharp edge; see §10.7.)
- **Response 200:** updated ride. **Errors:** `400` validation; `404` unknown id.

#### `DELETE /api/rides/<id>/` — api.py:145-149 · auth
- **Creator only.** Anyone else gets `403 {"error": "Only the ride creator can delete this ride"}`.
- Cascade deletes participants/flags/positions (FK CASCADE).
- **Response:** `204`. **Errors:** `404` unknown; `403` non-creator.

#### `GET /api/rides/<id>/participants/` — api.py:159-161 · auth
- All participant rows (any status), `select_related('user__profile')` to avoid N+1.
- **Response 200:** `[{ id, user, role, status, is_ready, joined_at, completed_at, display_name, initials, avatar_url, bike_info }, …]`

#### `POST /api/rides/<id>/participants/` — api.py:163-178 · auth (invite/remove toggle)
- **Body:** `{ user_id, role? (default WINGMAN) }`
- **Idempotent toggle behavior** (drives the invite checkbox UX):
  - Existing row with status **INVITED** → row is DELETED → `200 {"action": "removed"}` (un-invite).
  - Existing row ACCEPTED/DECLINED → returns the existing row unchanged (`200`) — accepted members can't be silently removed/re-added this way.
  - No row → create with `status='INVITED'` → **201** with participant JSON.
- **Errors:** `404` ride or target user doesn't exist.

### 5.4 Ride Actions

#### `POST /api/rides/<id>/toggle-ready/` — api.py:181-208 · auth
- Flips the calling user's `is_ready`. **The creator is excluded** from readiness: `400 {"error": "Creator cannot mark ready — just start the ride"}` (api.py:188-189).
- Must be an ACCEPTED participant else `400 {"error": "Not an accepted participant"}`.
- **Response 200:** `{ is_ready, all_ready, ready_count, total_riders }` where readiness math counts only ACCEPTED non-creators (`all_ready` requires count > 0 AND zero not-ready).

#### `POST /api/rides/<id>/start-ride/` — api.py:211-229 · auth
- **Creator only** → otherwise `403 {"error": "Only the creator can start the ride"}`.
- Gate: if there is ≥1 ACCEPTED non-creator and ANY of them isn't ready → `400 {"error": "Not all riders are ready"}`. Solo rides (no other accepted riders) start freely.
- **Success:** sets `status='ACTIVE'`, saves, returns RideSerializer JSON. Mobile then navigates to ActiveRide.

#### `GET|POST /api/rides/<id>/flag-stops/` — api.py:232-247 · auth
- **GET:** all flag stops for the ride, newest context via `select_related('flagged_by__profile')`. Each item carries `flagged_by_name`.
- **POST:** body `{ stop_type (FUEL/FOOD/BREAK/GENERAL/ISSUE), lat, lng, location_name? }`; `flagged_by` stamped from the token user; ride injected server-side (`{...request.data, ride: ride_id}`).
- **Response:** 201 with FlagStopSerializer JSON. **Errors:** `400` invalid stop_type/missing coords; `404` unknown ride.

### 5.5 Ride Summary

#### `GET /api/rides/<id>/summary/` — api.py:250-274 · auth
- Aggregated post/pre-ride payload:
```json
{
  "ride": { ...RideSerializer },
  "participants": [ ...RideParticipantSerializer ],
  "flag_stops":  [ ...FlagStopSerializer ],
  "stats": {
    "duration": null,          // reserved; client computes elapsed locally
    "distance_km": <ride.distance_km>,
    "rider_count": <accepted participant_count()>,
    "stop_count": <number of flag stops>
  }
}
```
- Private rides: non-participants get **404** (same masking rule as detail).

### 5.6 Discovery

#### `GET /api/discovery/riders/?q=&style=&experience=&bike=&location=` — api.py:277-308 · auth
- Searches OTHER users (self excluded). Filters combine with AND:
  - `q` — icontains across username, display_name, bike_make, bike_model, location_city (OR-ed within the group).
  - `style` — `profile__riding_style__iexact`
  - `experience` — `profile__experience_level__iexact`
  - `bike` — icontains on make OR model
  - `location` — icontains on city
- Result capped at 20. Each entry: `{ id, username, profile, distance_km: null }` (distance placeholder reserved for future geo features).
- **Errors:** none special; empty filters return the first 20 other users (this is how InviteRiders populates its initial list).

### 5.7 Invitations

#### `GET /api/invitations/` — api.py:311-317 · auth
- All RideParticipant rows for the caller with status **INVITED**.
- Each: `{ id, ride, ride_name, ride_date, ride_time, ride_origin, ride_destination, status, role, creator_name, display_name, joined_at }`.

#### `POST /api/invitations/<participant_id>/respond/` — api.py:320-336 · auth
- **Body:** `{ action: "accept" | "decline" }`
- Sets participant.status accordingly. Ownership enforced in the query itself (`get(id=…, user=request.user)`).
- **Response 200:** InvitationSerializer JSON (now reflecting new status).
- **Errors:** `404 {"error": "Invitation not found"}` — wrong id or someone else's invitation; `400 {"error": "Action must be \"accept\" or \"decline\""}`.

### 5.8 Live Tracking

#### `POST /api/rides/<id>/update-position/` — api.py:339-365 · auth
- **Upsert pattern:** `RidePosition.objects.update_or_create(ride=ride, user=request.user, defaults={lat, lng, heading, speed})` — one row per rider per ride, always overwritten (no trail accumulation).
- **Guards:** ride must be `ACTIVE` (`400 {"error": "Ride is not active"}`); caller must be an ACCEPTED participant (`403 {"error": "Not a participant"}`); lat & lng mandatory (`400 {"error": "lat and lng required"}`).
- **Response 200:** `{"ok": true}`.

#### `GET /api/rides/<id>/positions/` — api.py:368-376 · auth
- Latest position of EVERY rider on the ride (any participant polls this).
- Each: `{ id, user, lat, lng, heading, speed, updated_at, display_name, initials, avatar_url }`.
- **Errors:** `404` unknown ride. (No ACTIVE-status requirement — lets riders reload the map after completion.)

### 5.9 Route

#### `POST /api/rides/<id>/fetch-route/` — api.py:379-421 · auth
- Server-side proxy call to **TomTom Routing**: `calculateRoute/{oLat},{oLng}:{dLat},{dLng}/json?…&routeType=fastest` using `settings.TOMTOM_API_KEY` (falls back to the hardcoded dev key at api.py:392).
- Persists onto the ride: `route_polyline` (JSON of point array), `route_distance_m`, `route_duration_s`, and derived `distance_km` (meters→km, 1 decimal).
- **Response 200:** `{ route_polyline: [...], distance_km, duration_s }`
- **Errors:**
  - `400 {"error": "Origin and destination coordinates required"}` — either endpoint missing.
  - `502 {"error": "Route fetch failed: <reason>"}` — TomTom timeout (>10 s), quota exhausted (HTTP 403 from TomTom), network failure, or malformed response.
- Called automatically by RideSummaryScreen and ActiveRideScreen whenever a ride has coordinates but no polyline yet (see §9).

### Endpoint quick table

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/auth/register/` | – | api.py:19 |
| POST | `/api/auth/login/` | – | api.py:33 |
| POST | `/api/auth/logout/` | ✔ | api.py:53 |
| GET/PATCH | `/api/profile/` | ✔ | api.py:62 |
| POST | `/api/profile/change-username/` | ✔ | api.py:74 |
| POST | `/api/profile/change-email/` | ✔ | api.py:89 |
| GET/POST | `/api/rides/` | ✔ | api.py:104 |
| GET/PATCH/DELETE | `/api/rides/<id>/` | ✔ | api.py:123 |
| GET/POST | `/api/rides/<id>/participants/` | ✔ | api.py:152 |
| POST | `/api/rides/<id>/toggle-ready/` | ✔ | api.py:181 |
| POST | `/api/rides/<id>/start-ride/` | ✔ | api.py:211 |
| GET/POST | `/api/rides/<id>/flag-stops/` | ✔ | api.py:232 |
| GET | `/api/rides/<id>/summary/` | ✔ | api.py:250 |
| GET | `/api/discovery/riders/` | ✔ | api.py:277 |
| GET | `/api/invitations/` | ✔ | api.py:311 |
| POST | `/api/invitations/<pid>/respond/` | ✔ | api.py:320 |
| POST | `/api/rides/<id>/update-position/` | ✔ | api.py:339 |
| GET | `/api/rides/<id>/positions/` | ✔ | api.py:368 |
| POST | `/api/rides/<id>/fetch-route/` | ✔ | api.py:379 |

---

## 6. Mobile App Architecture

### 6.1 Boot chain: App.js → AuthContext → AppNavigator

```
App.js
 ├─ useFonts(...) loads Hanken Grotesk / Inter / JetBrains Mono; renders null until loaded
 ├─ <AuthProvider> wraps everything (context above navigator)
 │    └─ on mount runs checkAuth(): SecureStore token? → GET /profile/ probe
 │         valid → setUser+setProfile ; invalid → wipe token
 │         finally setLoading(false)
 └─ <AppNavigator>
      ├─ const { user, loading } = useAuth()
      ├─ loading===true → full-screen spinner (blocks flash of wrong branch)
      └─ user===null → [Onboarding, Login, Signup] stack
         user!==null → [Main(tabs), CreateRide, Discovery, ActiveRide,
                        FlagStop(modal), RideSummary, Settings, ProfileEdit, InviteRiders]
```

Because the branch condition lives in the navigator (`AppNavigator.js:38-56`), login/logout need no manual navigation — flipping context state swaps the entire tree, and React Navigation resets naturally.

State shape in context (`AuthContext.js:62-66`): `{ user: {token,id,username,email} | null, profile: <ProfileSerializer> | null, loading, login, register, logout, refreshProfile }`.

### 6.2 API client: axios + interceptors (`mobile/src/api/index.js`)

```js
const api = axios.create({ baseURL: 'https://cruvo.onrender.com/api', timeout: 30000 }); // :6-10

api.interceptors.request.use(async (config) => {          // :12-21
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Token ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type']; // let RN set multipart boundary
  return config;
});
```

Key properties:
- **Auto-attaches the token to every call** — screens import `ridesAPI`, etc., and never handle credentials.
- Because the interceptor awaits SecureStore, even the very first request after a cold launch carries the persisted token.
- FormData detection supports avatar upload through the same instance.
- Five namespaces exported: `authAPI`, `profileAPI`, `ridesAPI` (18 methods mirroring §5), `discoveryAPI.searchRiders(q, filters)`, `invitationsAPI.{list, respond}`.
- Errors surface as `err.response.data` (Django's error dict) which screens translate into inline field errors (e.g. LoginScreen.js:43-59).

### 6.3 `useLocation` hook (`mobile/src/hooks/useLocation.js`)

Single reusable GPS manager:

- `requestPermission()` (:10-17) — `Location.requestForegroundPermissionsAsync()`; sets `errorMsg='Location permission denied'` when refused.
- `getCurrentLocation()` (:19-27) — one-shot `getCurrentPositionAsync({accuracy: High})`; returns coords or null (never throws).
- `startWatching(callback)` (:29-41) — permission check → `watchPositionAsync({ accuracy: High, distanceInterval: 10, timeInterval: 5000 })` → updates `location` state AND invokes callback per fix. The 5000 ms interval is what produces the "~every 5 s" push cadence in ActiveRide.
- `stopWatching()` (:43-49) — `watchRef.current.remove()`.
- Auto-cleans on unmount/disable (:51-55).
- Returns `{ location, errorMsg, watching, getCurrentLocation, startWatching, stopWatching, requestPermission }`.

ActiveRideScreen wires the callback straight into the network: each fix fires `ridesAPI.updatePosition(...)` fire-and-forget (ActiveRideScreen.js:85-97).

### 6.4 `FreeMap` component (`mobile/src/components/FreeMap.js`)

WebView-hosted MapLibre GL map — the app's primary renderer.

**Structure:**
1. `buildHtml({...})` (:7-163) — template-string HTML document:
   - Loads `maplibre-gl@4.7.1` CSS+JS from unpkg; OSM raster tile style (`version 8`, source `osm`, dark background `#121317`, attribution hidden).
   - Creates `maplibregl.Map` centered on props (zoom 17/pitch 45 when `followUser`, else computed zoom/pitch 0).
   - DOM overlay elements `#user-dot`, `#user-ring`, `#user-heading` (CSS-positioned blue dot + halo + heading needle).
   - **`window.addEventListener('message', …)`** (:78-106) is the RN→WebView channel:
     - `{type:'userLocation', lat, lng, heading}` → first message `map.jumpTo(center, zoom 17, pitch 45)`; subsequent ones `easeTo(...duration:1000)` (smooth follow); rotates `#user-heading` by `-heading` deg.
     - `{type:'flyTo', lat, lng, heading}` → animated `flyTo`.
   - On `map.load`: draws `route-line` (yellow #ffd600 width 4) over `route-outline` (#705d00 width 8) from the GeoJSON LineString; fits bounds to the polyline when NOT following user; paints origin marker (green ▶) and destination marker (red ⚑) as custom DOM elements; paints each rider as a 38 px colored circle with their **initials** (palette of 8 colors indexed by position).

2. Component (:165-260):
   - Props: `{ ride, positions=[], myUserId, userLocation, heading, followMyLocation=false, style }`.
   - `center` memo (:169-178): follow-mode → user loc; else midpoint of origin/dest; else origin; else Mumbai default `[19.076, 72.8777]`.
   - `zoom` heuristic (:180-192): origin↔dest spread mapped to zoom 8…13.
   - `polyline` memo (:201-212): parses `ride.route_polyline` (string or array, tolerant of `lat/lng` vs `latitude/longitude` keys); **if absent but both endpoints exist, falls back to a 2-point straight line** — the visual symptom behind §10.6.
   - `html` memo (:218-221) regenerates the whole document when inputs change → WebView `source={{html}}` reloads.
   - `sendMessage` (:223-227) wraps `webViewRef.current.postMessage`.
   - Live-follow effect (:229-242): when following and the user moves ≥ ~1 m (5-decimal key change), posts `userLocation` messages. Throttled by comparing rounded keys to avoid flooding the bridge.
   - **Sizing (critical):** container and WebView get explicit pixel sizes from `Dimensions.get('window')` (:5, :262-265) — NOT flex. Flex-sized WebViews on Android measure as 0-height and render blank (see §10.4).

**RN→WebView communication summary:** data-heavy layers (route/markers/riders) go through HTML regeneration; high-frequency user dot goes through postMessage. WebView→RN messages are ignored (`onMessage={() => {}}` :256).

### 6.5 `UserAvatar` fallback (`mobile/src/components/UserAvatar.js`)

- If `avatarUrl` exists → `<Image>` in a circular clipped View (:19-28).
- Else → colored circle with initials (:30-34):
  - Color picked deterministically from the numeric user id: `AVATAR_COLORS[Math.abs(id) % 10]` (:10-13) — the same user is always the same color everywhere (also matches the rider-dot palette conceptually).
  - Initials: prop override, else derived from name — two words take first letter of each, one word takes its first two chars, empty → `'??'` (:37-42).
- Server-side parity: `Profile.initials()` and the serializers expose `initials`/`avatar_url` so lists never guess.

---

## 7. Navigation Flow

```
App.js (AuthProvider)
└── AppNavigator (native stack, headerShown:false, slide_from_right)
    ├── loading ? <Spinner/>
    ├── !user  (UNAUTHENTICATED BRANCH)
    │   ├── Onboarding  ──"Get Started"──► Signup
    │   │                 └─"LOG IN"/"Skip"──► Login
    │   ├── Login       ──success──► (context flip) Main
    │   └── Signup      ──success──► (context flip) Main
    │
    └── user   (AUTHENTICATED BRANCH)
        ├── Main  =  MainTabs (bottom tab bar, height 80)
        │   ├── Home     → DashboardScreen   (greeting, upcoming rides)
        │   ├── Explore  → DiscoveryScreen   (rider search + filters)
        │   ├── Rides    → RidesListScreen   (invitations + my rides)
        │   └── Map      → MapScreen         (active-ride detector; may replace→ActiveRide)
        │
        ├── CreateRide        (form) ──create──► InviteRiders | RideSummary | ActiveRide
        ├── Discovery         (standalone copy of Explore for deep-links)
        ├── ActiveRide        (live tracking; params: {rideId})
        ├── FlagStop          (presentation:'modal'; standalone type-picker sheet)
        ├── RideSummary       (pre-ride hub & post-ride stats; params: {rideId})
        ├── Settings          (profile info, logout)
        ├── ProfileEdit       (fields, avatar, change username/email)
        └── InviteRiders      (params: {rideId, rideName, startOnDone})
```

Typical journeys through the tree:

- **First launch:** Onboarding → Signup (auto-login) → Main/Home.
- **Schedule a ride:** Home → CreateRide → Alert options → InviteRiders (invite squad) → DONE → RideSummary.
- **Immediate ride:** CreateRide → "Start Ride" → startRide API → replace stack → ActiveRide.
- **Respond to invite:** Tab Rides → InvitationCard accept/decline → ride appears in list → tap → RideSummary (or ActiveRide if already ACTIVE) (RidesListScreen.js:204-210).
- **Rejoin a live ride:** Tab Map → detects ACTIVE ride in list → `navigation.replace('ActiveRide', {rideId})` (MapScreen.js:43-45).
- **During ride:** ActiveRide flag FAB → in-screen modal (FlagStopScreen is a separate modal route kept for design parity) → completion modal → RideSummary.

---

## 8. File-by-File Reference

### 8.1 Backend — `pages/`

| File | Purpose / key logic |
|---|---|
| `models.py` (143 lines) | All 5 models. `Profile.initials()` :37-41 · `Ride.participant_count()` :75-76 · uniqueness constraints :101-102, :139-140. |
| `serializers.py` (248 lines) | 11 serializers. `ProfileSerializer` adds computed `initials`/`avatar_url` + read-only username/email/user_id (:7-32; absolute avatar URLs via `request.build_absolute_uri` :26-32). `RegisterSerializer` cross-field password match :73-76, atomic user+profile creation :78-99. `RideParticipantSerializer` denormalizes display_name/initials/avatar_url/bike_info :107-134. `RideSerializer` nests participants + counts :137-157. `RideCreateSerializer` rejects past dates :170-174. `InvitationSerializer` flattens ride fields for invite cards :204-223. `RidePositionSerializer` adds identity fields :226-248. |
| `api.py` (421 lines) | All 19 endpoints — see §5 line refs. Notable internals: creator auto-participant :116-118; private-ride 404 mask :130-133, :257-260; invite toggle-delete :170-175; readiness math :198-201; start gate :221-225; position upsert :361-364; TomTom proxy + persistence :392-413. |
| `api_urls.py` (26 lines) | `app_name='api'`; 19 paths mapping to handlers (quick table §5). |
| `urls.py` | Web (session) routes: onboarding `/`, signup, login, logout, dashboard, discovery, create-ride, active-ride, flag-stop, ride-summary. |
| `views.py` (91 lines) | Template-rendering views for the web UI. Email-as-username login :31-45; dashboard aggregates next 5 upcoming rides :53-66; remaining views just render prototypes. Not used by the mobile app. |
| `forms.py` (103 lines) | `SignupForm` (UserCreation subclass; sets username=email :71-85; Tailwind-ish widget attrs) and `LoginForm`. Web-only. |
| `admin.py` / `tests.py` | Empty scaffolds — models are NOT yet registered in admin. |
| `apps.py` | Standard AppConfig. |
| `migrations/0001-0003` | Initial schema → `is_ready` column → route distance/duration fields. |

### 8.2 Backend — `backend/`

| File | Purpose / key logic |
|---|---|
| `settings.py` (191 lines) | dotenv load :23 · SECRET_KEY/DEBUG/ALLOWED_HOSTS from env :30-35 · INSTALLED_APPS incl. rest_framework.authtoken, corsheaders, pages :40-51 · middleware w/ WhiteNoise+CORS ordering :53-63 · **DRF config** :65-77 · `CORS_ALLOW_ALL_ORIGINS` env-gated :79 · DB switch postgres(sql_require)/sqlite :104-120 · password validators :126-139 · UTC :147 · WhiteNoise compressed manifest storage :162-169 · MEDIA_URL/MEDIA_ROOT :172-173 · console email backend :187-190. |
| `urls.py` (28 lines) | admin + `api/` + web root + media serving (`static(settings.MEDIA_URL…)` :28). |
| `wsgi.py` | Gunicorn target on Render (`gunicorn backend.wsgi:application`). |
| `asgi.py` | Unused ASGI twin. |

### 8.3 Mobile — `src/` core

| File | What it does · key pieces (line refs) |
|---|---|
| `App.js` (29) | Font loading (:11-19), null until loaded (:21), `<AuthProvider><StatusBar/><AppNavigator/></AuthProvider>` (:23-28). |
| `index.js` | Expo `registerRootComponent` entry. |
| `config.js` (2) | `TOMTOM_API_KEY`, `TOMTOM_BASE_URL = 'https://api.tomtom.com/search/2'`. |
| `theme/index.js` (102) | Dark palette (`background #121317`, `primaryContainer #ffd600` yellow, error tones), spacing scale (unit 4 → marginMobile 20, touchTargetMin 48), radius tokens, typography presets (display/headline/title/body/label incl. mono `labelTechnical`). |
| `api/index.js` (66) | Axios instance :6-10 · token interceptor :12-21 · `authAPI` :23-27 · `profileAPI` (incl. multipart `uploadAvatar`) :29-37 · `ridesAPI` 18 methods :39-55 · `discoveryAPI` :57-59 · `invitationsAPI` :61-64. |
| `context/AuthContext.js` (69) | State + persistence. `checkAuth` :16-29 (SecureStore → /profile/ probe → cleanup on fail) · `login` :31-37 · `register` :39-45 · `logout` :47-54 (server delete + local wipe) · `refreshProfile` :56-60. |
| `hooks/useLocation.js` (58) | Permission/one-shot/watch lifecycle — §6.3. |
| `components/FreeMap.js` (265) | WebView+MapLibre map — §6.4. Dimensions-based sizing :5, :262-265. |
| `components/RideMap.js` (126) | Legacy react-native-maps implementation (MapView/Marker/Polyline), region fitting :26-43. Currently unreferenced by screens; kept as fallback. |
| `components/LocationPicker.js` (189) | Debounced-less TomTok autocomplete ≥3 chars (:16-37, limit 5), selection emits `{name,lat,lng}` (:39-46), "use current location" → reverse geocode (:48-78), clear button (:80+). |
| `components/UserAvatar.js` (49) | Image-or-initials avatar — §6.5. |
| `navigation/AppNavigator.js` (60) | Auth gate + 12 registered routes (:35-58); spinner while loading (:27-33); FlagStop as modal (:50). |
| `navigation/MainTabs.js` (69) | 4 tabs with Ionicons (home/compass/bicycle/map), styled bar :15-29. |

### 8.4 Mobile — `src/screens/`

| Screen | What it does · key functions (line refs) |
|---|---|
| `OnboardingScreen.js` (144) | Static landing: hero, step dots, Get Started → Signup, Log in / Skip links. |
| `LoginScreen.js` (227) | Username+password. `handleLogin` :29-66 — client-side required checks, calls `login()`, maps `err.response.data` (non_field_errors/error/per-field) to inline errors; scroll-to-field helper :20-27. |
| `SignupScreen.js` | Registration incl. optional bike/style/experience pickers; `handleSignup` :46+ calls `register()`; same error-mapping pattern. |
| `DashboardScreen.js` (249) | HOME tab. `getGreeting(hour)` :8-12 · local `Avatar` :14-27 · `RideCard` :29-63 (status badge, riders/distance, origin→dest) · `loadRides` :70-75 pulls `ridesAPI.list()` on mount; pull-to-refresh :79-83; gear → Settings :91. |
| `DiscoveryScreen.js` (330) | EXPLORE tab. `FilterChip` :11 · `FilterModal` :24 (local draft state synced on open) · `searchRiders` :124-131 · 400 ms debounce on text :135-139 · filter chips w/ active count :151, applied/cleared :141-149 · RiderCard rows with invite affordance. |
| `RidesListScreen.js` (431) | RIDES tab. `loadAll` :140-153 parallel rides+invitations · reloads on tab **focus** listener :155-158 (fresh invites every visit) · `handleAccept` :166-177 · `handleDecline` w/ confirm :179-202 · `handleRidePress` routes ACTIVE→ActiveRide else RideSummary :204-210 · creator-only delete confirm :212-231 · `InvitationCard` :8 (accept/decline buttons, ride meta from InvitationSerializer) · `RideCard` :65 (status pill, ready-count, invite/delete actions for creators). |
| `MapScreen.js` (99) | MAP tab. `checkForActiveRide` :15-27 scans ride list for status ACTIVE; if found `replace('ActiveRide')` :43-45; else empty state + "Create a Ride" → Home tab :59-66. |
| `CreateRideScreen.js` (331) | Form: name, LocationPicker×2, optional schedule (DateTimePicker :25-29), public Switch. `formatDate/formatTime` :9-15. `handleCreate` :33-111 — validates, builds payload, `ridesAPI.create`; scheduled → alert routes to InviteRiders/RideSummary :60-74; immediate → Invite(startOnDone) or direct startRide→ActiveRide :75-100; first serializer error surfaced :103-109. |
| `InviteRidersScreen.js` (219) | `loadRiders` discovery fetch :46-55 · `loadParticipants` marks INVITED ids :57-63 · `handleSearch` live query :70-73 · `handleToggle` :91-108 toggles via addParticipant; interprets `{action:'removed'}` to uncheck · `handleDone` :75-89 — if `startOnDone` param, attempts startRide then resets stack to ActiveRide, falling back to RideSummary on failure (e.g. someone not ready). |
| `RideSummaryScreen.js` (431) | Pre/post-ride hub. `loadRide` :23-29 · auto route fetch when coords present & no polyline & still SCHEDULED :36-49 (spinner overlay :187-192) · `handleDelete` confirm :51-73 · `handleToggleReady` optimistic participant update :75-91 · `handleStartRide` :93-105 → navigate ActiveRide · readiness derivation :141-151 (readyCount/total among accepted non-creators; solo = allReady) · stats grid :160-165 · squad rows with Ready/Waiting indicators :218-250. |
| `ActiveRideScreen.js` (562) | The ride cockpit — detailed flow in §9.4/9.5. Constants :12-14 (`ARRIVAL_THRESHOLD_M = 200`). Haversine `getDistanceMeters` :25-31. Parallel bootstrap :53-66. Auto polyline fetch :72-83. GPS watch + 5s pushes + 3s poll + 1s elapsed timer :85-110. Arrival/auto-end effect :112-130. `completeRide` PATCH COMPLETED + teardown :132-140. Creator END button :142-147/:256-260. Flag FAB + in-screen modal :154-204, :329-380 (single active flag per user tracked via `myFlag`). Completion modal w/ stats :383-429. Roster bottom panel w/ expand handle :280-327, LIVE/Offline per rider :313-322. Manual refresh button :264-270. |
| `FlagStopScreen.js` (108) | Standalone modal sheet listing STOP_TYPES (:6-12) — select + cancel/flag both just `goBack()` (:55, :58-65): UI prototype; production flagging is the ActiveRide modal which actually POSTs. |
| `ProfileEditScreen.js` (438) | Loads profile into form :25-38 · `getInitials` :42-50 · `handlePickAvatar` :52-91 — ImagePicker perms, square crop q0.7, FormData(`avatar`), `uploadAvatar`, refresh · account modals (username/email + password confirm) `handleAccountSubmit` :106-138 · `handleSave` PATCH profile :140-162. |
| `SettingsScreen.js` (136) | Read-only InfoRows (name/phone/location/bike/style/exp) :7-17, :55-60; avatar/name/@user/email header :42-53; `handleLogout` confirm → `logout()` :22-29; Edit Profile → ProfileEdit; danger-zone logout card. |

---

## 9. How Files Connect (data-flow diagrams)

### 9.1 Login flow

```
LoginScreen.handleLogin(username,password)          LoginScreen.js:29
   │ validate non-empty → inline errors
   ▼
AuthContext.login(username,password)                AuthContext.js:31
   ▼
authAPI.login({username,password})                  api/index.js:25
   │ axios POST /api/auth/login/   (interceptor: no token yet)
   ▼
login_view                                          pages/api.py:33
   │ LoginSerializer → authenticate() → Token.get_or_create
   ▼ 200 {token, user{...,profile}}
AuthContext:
   SecureStore.setItemAsync('auth_token', token)    AuthContext.js:33
   setProfile(res.data.user.profile); setUser({...}) :34-35
   ▼ user flips null→value
AppNavigator re-renders → auth branch unmounts, Main tabs mount
```

Failure path: 401 `{error:"Invalid credentials"}` → LoginScreen maps `msg.error` to the banner (`errors.general`) — LoginScreen.js:48-49.

### 9.2 Create ride flow

```
CreateRideScreen
   ├─ LocationPicker(origin)  ──TomTom autocomplete──► {name,lat,lng}
   ├─ LocationPicker(destination) ──────────────────► {name,lat,lng}
   └─ handleCreate()                                 CreateRideScreen.js:33
        │ payload {name, origin_*, destination_*, date, time, is_public}
        ▼
      ridesAPI.create(payload)                       api/index.js:41
        ▼
      rides_view POST                                pages/api.py:113-119
        ├─ RideCreateSerializer.validate_date (≥ today)
        ├─ Ride.objects.create(creator=request.user)
        └─ RideParticipant.objects.create(role='CREATOR', status='ACCEPTED')
        ▼ 201 Ride JSON
      Alert options:
        scheduled → InviteRiders{rideId,rideName} | RideSummary{rideId}
        immediate → InviteRiders{startOnDone:true} | startRide→ActiveRide   :60-100
```

### 9.3 Start ride flow

```
RideSummaryScreen
   ├─ squad panel shows readyCount/totalRiders       :144-147 (client mirror of server math)
   ├─ riders tap READY → ridesAPI.toggleReady        :75-91 → api.py:181
   └─ creator taps START
        ▼
      ridesAPI.startRide(rideId)                     RideSummaryScreen.js:96
        ▼
      start_ride_view                                pages/api.py:211
        ├─ creator? else 403
        ├─ non_creator = ACCEPTED minus creator      :221
        ├─ any not ready & count>0 → 400 "Not all riders are ready"
        └─ ride.status='ACTIVE'; save
        ▼ 200 Ride(status=ACTIVE)
      setRide(res.data) → navigation.navigate('ActiveRide',{rideId})   :97-98
```

Alternate start: InviteRiders `DONE` with `startOnDone` → same API; on 400 falls back to `replace('RideSummary')` (InviteRidersScreen.js:75-89).

### 9.4 Live tracking loop

```
ActiveRideScreen mount                              :85-110
   ├─ useLocation(true).startWatching(callback)
   │    watchPositionAsync(HIGH, dist 10 m / time 5000 ms)
   │    └─ every fix → ridesAPI.updatePosition(rideId,{lat,lng,heading,speed})
   │         → api.py update_position_view → RidePosition UPSERT (unique ride+user)
   │
   ├─ setInterval 3000 ms → ridesAPI.getPositions(rideId)
   │    → GET positions of ALL riders → setPositions([])
   │    → FreeMap riderPositions memo → regenerated HTML → initials dots move
   │
   ├─ useLocation fix → ActiveRide.location state → FreeMap effect :229-242
   │    → postMessage {type:'userLocation'} → maplibre easeTo follow (1 s)
   │
   └─ setInterval 1000 ms → elapsed seconds → header timer
```

So: **outbound GPS every ~5 s (or 10 m), inbound squad positions every 3 s**, map follows self instantly while others snap on poll.

### 9.5 Auto-end flow

```
Every positions poll (3 s)                          ActiveRideScreen.js:112-130
   ├─ guard: ride?.destination_lat && !rideFinished && !autoEndTriggered.current
   ├─ arrived = positions.filter(dist ≤ 200 m of destination)   (haversine :25-31)
   ├─ setArrivalCount(arrived.length)
   └─ allArrived = arrived ≥ acceptedParticipants.count (>0)
        ▼ once
      completeRide()                                :132-140
        ├─ ridesAPI.update(rideId,{status:'COMPLETED'})   → api.py PATCH :138-143
        ├─ stopWatching(); clearInterval(pos/timer)
        └─ setRideFinished(true) → completion modal :383-429
             └─ VIEW SUMMARY → navigation.navigate('RideSummary')  :149-152
```

Manual variant: creator END button → confirm Alert → same `completeRide()` (:142-147, :256-260). Note the client-side PATCH means any participant could technically end it via API — acceptable trust level for squads.

### 9.6 Invite flow

```
InviteRidersScreen
   ├─ discoveryAPI.searchRiders('') → first 20 users :46-55
   ├─ loadParticipants → Set of INVITED userIds      :57-63 (checkbox state)
   └─ tap rider → handleToggle(rider)                :91-108
        ▼
      ridesAPI.addParticipant(rideId,{user_id,role:'WINGMAN'})
        ▼
      ride_participants_view POST                    pages/api.py:163-178
        ├─ none    → create status='INVITED' → 201  (checkbox ON)
        └─ INVITED → DELETE row → 200 {action:'removed'} (checkbox OFF)
        ▼
Invited user's device:
   RidesListScreen.focus → loadAll → invitationsAPI.list()
   → GET /invitations/ (status=INVITED)              api.py:311-317
   → InvitationCard [Accept]/[Decline]
        accept → respond(id,'accept') → status=ACCEPTED
               → ride now appears in GET /rides/ (filter participants__status='ACCEPTED')
               → shows in RidesList + Dashboard; ready-toggle unlocked
        decline → status=DECLINED (row kept; re-invite becomes a no-op returning the row)
```

---

## 10. Debugging Guide

### 10.1 First API call hangs ~30–60 s → Render sleeping
- **Symptom:** app stuck on spinners after idle period; then everything works.
- **Cause:** Render free services sleep after ~15 min inactivity; cold boot takes 30–60 s.
- **Fix/verify:** open `https://cruvo.onrender.com/api/profile/` in a browser (expect 401 JSON, proves wake-up); keep-alive pings (uptime monitor) prevent sleep; axios `timeout: 30000` (api/index.js:9) usually survives one cold start but a retry may be needed.

### 10.2 Everything returns 401 "Invalid token" → re-login
- **Symptom:** any authenticated call fails; app may bounce to Login.
- **Causes:** token deleted server-side (logout elsewhere), DB reset, or stale SecureStore value.
- **Flow:** AuthContext.checkAuth probes `/profile/`; on failure it wipes the token (AuthContext.js:24-26) → clean login again.
- **Manual nuke (dev):** Django admin/shell `Token.objects.filter(user__username='x').delete()` or Settings → logout.

### 10.3 GPS permission denied
- **Symptom:** `errorMsg 'Location permission denied'`; no position pushes; flag FAB alerts "Location Required".
- **Chain:** `requestForegroundPermissionsAsync` refused → startWatching aborts (useLocation.js:10-17, :30-31).
- **Fix:** OS Settings → app → Location → While Using; relaunch. In Expo Go ensure location permission prompt wasn't permanently denied. Code never re-prompts after hard denial — OS-level grant is required.

### 10.4 Map blank/not rendering → WebView sizing
- **Symptom:** black/empty rectangle where the map should be; tiles never load.
- **Primary cause:** WebView given `flex:1` measures 0-height on Android.
- **Rule in this codebase:** FreeMap sizes itself with **explicit `Dimensions.get('window')` pixels**, not flex (FreeMap.js:5, :262-265). When embedding, wrap with fixed dimensions (`styles.mapPreviewInner` in RideSummaryScreen, `styles.mapWrap` absolute full-size in ActiveRideScreen) and pass via `style` prop.
- **Secondary causes:** no internet (tiles are remote OSM), `javaScriptEnabled` removed, or unpkg CDN blocked.

### 10.5 TomTom API limit (≈2,500/day free tier)
- **Symptom:** geocoder returns nothing / route fetch returns 502 `Route fetch failed: HTTP Error 403`.
- **Consumers:** LocationPicker keystrokes (search, limit 5) + reverse geocode + backend fetch-route per ride.
- **Mitigations in place:** autocomplete only fires ≥3 chars (LocationPicker.js:18); route fetched once per ride then cached in `route_polyline` columns (both screens skip when polyline exists — RideSummaryScreen.js:37, ActiveRideScreen.js:73). For headroom: rotate key in `mobile/src/config.js` + `settings.TOMTOM_API_KEY`.

### 10.6 Straight line on map instead of road route
- **Cause:** `ride.route_polyline` empty → FreeMap draws a 2-point origin→destination line as fallback (FreeMap.js:201-206).
- **Auto-heal:** RideSummary/ActiveRide detect coords-without-polyline and call `fetch-route` (RideSummaryScreen.js:36-49, ActiveRideScreen.js:72-83).
- **If it stays straight:** check the 502 body (TomTom quota/key), verify both `origin_lat/lng` and `destination_lat/lng` exist on the ride (else 400), confirm the ride row gained `route_polyline` after retry.

### 10.7 Private rides showing to wrong users (or not hiding)
- **Design:** visibility = `is_public` OR has participant row; violators get bare **404** (api.py:130-133 detail, :257-260 summary). List endpoint only ever returns ACCEPTED memberships, so private rides can't leak there.
- **If leakage is observed**, audit these known gaps:
  - `GET participants`, `GET positions`, `GET flag-stops`, `POST fetch-route` do **not** apply the participant check — any logged-in user with the ride ID can read them for a private ride.
  - `PATCH /rides/<id>/` has no creator check (anyone can flip status on a public ride; the 404 mask only guards GET).
- **Fix pattern:** copy the mask block (`if not ride.is_public: participants.filter(user=request.user).exists() or return 404`) into each handler.

### 10.8 CORS errors
- **Symptom (web only):** browser console `No 'Access-Control-Allow-Origin'` or preflight OPTIONS failing. Native apps don't hit CORS.
- **Check:** `CORS_ALLOW_ALL_ORIGINS=True` in Render env (default True, settings.py:79, render.yaml:16).
- **Middleware order matters:** CorsMiddleware must stay above CommonMiddleware (settings.py:56-58) — if it drifts, OPTIONS dies as CSRF/admin 400s.
- **Hardening:** set False + `CORS_ALLOWED_ORIGINS = ["https://your-web-domain"]`.

### 10.9 Quick triage table

| Symptom | Likely cause | First place to look |
|---|---|---|
| Spinner forever on launch | Render cold start | curl the API; §10.1 |
| Bounced to Login randomly | Token invalidated | AuthContext.checkAuth; §10.2 |
| "Not all riders are ready" | Someone hasn't tapped READY | RideSummary squad panel; api.py:221-225 |
| "Creator cannot mark ready" | Creator tapped READY | By design — creator STARTs; api.py:188-189 |
| Invite checkbox won't uncheck | Participant already ACCEPTED/DECLINED | Toggle only deletes INVITED rows; api.py:170-175 |
| Positions show but rider says stationary | 3 s poll lag / phone asleep | ActiveRideScreen.js:99-101; battery optimizations |
| Avatar not updating | Media not persisted / cache | MEDIA_ROOT volume on Render; refreshProfile |
| Ride vanished from list | Status/date changed or participation changed | GET /rides/ filter = ACCEPTED only; api.py:107-110 |

---

## 11. Alternatives Considered

| Rejected option | Why it lost |
|---|---|
| **Google Maps SDK / Directions API** | Excellent data, but requires billing account and charges per map load / directions call. A group ride renders the map continuously and polls positions — cost scales with engagement. OSM tiles via MapLibre are free at any volume. |
| **react-native-maps** | Requires a maps provider API key (Google/AMap) on Android and — critically — **native compilation**, breaking Expo Go development. Also platform-styled inconsistencies. Kept in the tree (`RideMap.js`) as a dev fallback but the WebView approach won for zero-key portability. |
| **JWT (simplejwt)** | Refresh/access token rotation, expiry clocks, silent-refresh races on flaky mobile networks — significant complexity for an app with a small trusted user base where tokens never needing expiry is a feature. Opaque DRF tokens are one DB row and one header. Migration path exists later (keep interceptor, swap header value). |
| **DRF ViewSets + Router** | Abstraction pays off for uniform CRUD; CRUVO's endpoints are mostly custom commands (toggle-ready, start-ride, respond, upsert-position, proxy-route) with bespoke authorization and intentional 404-masking semantics. FBVs keep every rule visible in one place (§1.3). |
| **MongoDB** | Core domain is relational: rides↔participants↔positions with uniqueness constraints and multi-table filters ("rides where I'm an ACCEPTED participant"). Document DB would force manual join emulation and app-level constraint enforcement. Postgres enforces `unique_together` at the storage layer. |
| **Firebase (Firestore/Auth/RTDB)** | Realtime positions are Firebase's showcase feature, but it means vendor lock-in on auth+data+rules, weak ad-hoc querying (composite indexes, no real joins), and rewriting all access rules in Firebase's DSL. Polling Postgres every 3 s is entirely adequate for ≤20-rider squads and keeps one source of truth. |
| **Flutter** | Great toolkit, but Dart is a second language for a JS-centric team; React Native lets backend (Python) + frontend (JS) cover everything with no third ecosystem, and Expo handles the native toolchain. |
| **Native iOS + Android** | Best perf/platform fidelity, but two full codebases to build, debug, and keep feature-par. A touring club app gains nothing from native-level polish that RN + WebView maps can't deliver; iteration speed won. |
| *(Bonus)* **WebSockets/channels for tracking** | Considered for live positions; rejected for v1 — Daphne/channel layers add deploy complexity on Render and polling at 3 s/5 s cadence is indistinguishable at squad scale. Natural upgrade path if rider counts grow. |
| *(Bonus)* **SQLite in production** | Default fallback in settings (settings.py:114-120) but Render's ephemeral disk would wipe it per deploy; Supabase Postgres gives durability + SSL. |

---

*Generated from source inspection of the repository — all line numbers refer to files at time of writing. Keep this document alongside `CODEBASE_EXPLAINER.md` and update both when schemas or endpoints change.*
