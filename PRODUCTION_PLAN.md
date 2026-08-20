# IGNITION - Production Build Plan

## Overview

Converting IGNITION from a static UI prototype into a fully functional Django web application with real backend logic, database models, authentication, and dynamic data rendering.

**Current state:** 8 HTML templates with ~65 hardcoded dummy data points, no models, no auth, no database.

**Target state:** Production-ready Django app with user accounts, ride management, rider discovery, and real-time ride tracking.

---

## Phase 1: Foundation - Models & Authentication

> **Goal:** Users can sign up, log in, and have persistent profiles. Database is ready for all app data.

### 1.1 User Profile Model

Create `pages/models.py`:

```
Profile (extends User via OneToOneField)
├── display_name        (str)
├── avatar              (ImageField, upload_to='avatars/')
├── bio                 (text, optional)
├── bike_make           (str)  -- e.g. "Royal Enfield"
├── bike_model          (str)  -- e.g. "Himalayan 450"
├── riding_style        ( choices: ADVENTURE / SPORT / TOURING / CRUISE / COMMUTE )
├── experience_level    ( choices: BEGINNER / INTERMEDIATE / VETERAN / EXPERT )
├── location_city       (str)
├── location_lat        (float, optional)
├── location_lng        (float, optional)
└── phone               (str, optional)
```

### 1.2 Ride Model

```
Ride
├── creator             (FK → User)
├── name                (str)  -- "Sunday Morning Ride"
├── origin_name         (str)  -- "Gurgaon"
├── origin_lat          (float)
├── origin_lng          (float)
├── destination_name    (str)  -- "Manali"
├── destination_lat     (float)
├── destination_lng     (float)
├── date                (date)
├── time                (time)
├── is_public           (bool) -- visibility toggle
├── status              (choices: DRAFT / SCHEDULED / ACTIVE / COMPLETED / CANCELLED)
├── created_at          (datetime)
└── updated_at          (datetime)
```

### 1.3 RideParticipant Model

```
RideParticipant
├── ride                (FK → Ride)
├── user                (FK → User)
├── role                (choices: CREATOR / LEAD / WINGMAN / SWEEP)
├── status              (choices: INVITED / ACCEPTED / DECLINED / COMPLETED)
├── joined_at           (datetime)
└── completed_at        (datetime, nullable)
```

### 1.4 FlagStop Model

```
FlagStop
├── ride                (FK → Ride)
├── flagged_by          (FK → User)
├── stop_type           (choices: FUEL / FOOD / BREAK / GENERAL / ISSUE)
├── lat                 (float)
├── lng                 (float)
├── location_name       (str, optional)
├── created_at          (datetime)
└── resolved_at         (datetime, nullable)
```

### 1.5 Authentication

- Replace `login_view` stub with Django `auth.login` / `auth.logout`
- Create signup view + template
- Add `@login_required` decorator to all protected views
- Add `{% if user.is_authenticated %}` checks in templates

### Files changed in Phase 1:
| File | Action |
|------|--------|
| `pages/models.py` | Create all 4 models |
| `pages/views.py` | Rewrite login, add signup, add auth decorators |
| `pages/urls.py` | Add signup/logout routes |
| `pages/templates/pages/login.html` | Wire to Django auth |
| `pages/templates/pages/signup.html` | **New** - signup form |
| `pages/templates/pages/onboarding-welcome.html` | Update LOG IN / SIGN UP links |
| `backend/settings.py` | Add `LOGIN_URL`, `LOGIN_REDIRECT_URL` |

### Verification:
- `python manage.py makemigrations && python manage.py migrate`
- Can sign up → redirected to dashboard
- Can log in → sees dashboard
- Can log out → redirected to onboarding
- Protected pages redirect to login when unauthenticated

---

## Phase 2: Profile-Driven Dashboard

> **Goal:** Dashboard shows real user name, real avatar, real upcoming rides from DB.

### 2.1 Replace hardcoded data in `home-dashboard.html`

| Current hardcoded | Replaced with |
|-------------------|---------------|
| `"Good evening, Rameez"` | `{{ profile.display_name }}` with time-based greeting |
| Profile image URL | `{{ profile.avatar.url }}` with fallback initials |
| `"Sunday Gurgaon Ride"` ride card | `{% for ride in upcoming_rides %}` loop |
| `"10:00 AM * 12 Oct"` | `{{ ride.date }}` `{{ ride.time }}` |
| `"3 riders"` | `{{ ride.participants.count }}` |
| `"42 km"` | Calculated or stored distance |
| `"Gurgaon to Manali"` | `{{ ride.origin_name }}` to `{{ ride.destination_name }}` |
| `"SCHEDULED"` | `{{ ride.get_status_display }}` |

### 2.2 Dashboard view context

```python
@login_required
def dashboard(request):
    profile = request.user.profile
    upcoming_rides = Ride.objects.filter(
        participants__user=request.user,
        status__in=['DRAFT', 'SCHEDULED'],
        date__gte=date.today()
    ).order_by('date', 'time')[:5]
    return render(request, 'pages/home-dashboard.html', {
        'profile': profile,
        'upcoming_rides': upcoming_rides,
    })
```

### Verification:
- Dashboard greets logged-in user by name
- Shows their actual upcoming rides (or empty state)
- Profile avatar displays correctly

---

## Phase 3: Ride Creation with Real Data

> **Goal:** Creating a ride saves to database and appears on dashboard.

### 3.1 Replace hardcoded data in `create-a-ride.html`

| Current hardcoded | Replaced with |
|-------------------|---------------|
| `value="Sunday Morning Ride"` | Remove default value (empty input) |
| Form posts to nothing | Form POSTs to `create_ride` view |
| All fields are cosmetic | Fields validated and saved to `Ride` model |

### 3.2 Create ride view

```python
@login_required
def create_ride(request):
    if request.method == 'POST':
        ride = Ride.objects.create(
            creator=request.user,
            name=request.POST['ride_name'],
            origin_name=request.POST['start_point'],
            destination_name=request.POST['end_point'],
            date=request.POST['ride_date'],
            time=request.POST['ride_time'],
            is_public=request.POST.get('visibility') == 'on',
            status='SCHEDULED',
        )
        RideParticipant.objects.create(
            ride=ride, user=request.user, role='CREATOR', status='ACCEPTED'
        )
        return redirect('pages:active-ride', ride_id=ride.id)
    return render(request, 'pages/create-a-ride.html')
```

### Verification:
- Filling form and clicking "Create Ride" saves to DB
- Redirects to active ride page
- Ride appears on dashboard upcoming rides list

---

## Phase 4: Rider Discovery from Database

> **Goal:** Discovery page shows real users from database, not hardcoded cards.

### 4.1 Replace hardcoded data in `ride_discovery.html`

| Current hardcoded | Replaced with |
|-------------------|---------------|
| 3 hardcoded rider cards | `{% for rider in discovered_riders %}` loop |
| Ayaan Khan, Sarah Jenkins, Marcus V. | `{{ rider.display_name }}` |
| Royal Enfield Himalayan, BMW R 1250 GS, etc. | `{{ rider.profile.bike_make }} {{ rider.profile.bike_model }}` |
| "Gurgaon (12km)", "New Delhi (24km)" | Calculated distance from user |
| "98% Match", "85% Match" | Match algorithm (shared style + proximity) |
| Profile image URLs | `{{ rider.profile.avatar.url }}` |
| Search bar does nothing | Search filters by name/bike/location |
| Filter chips do nothing | Filters query by style/experience/location |

### 4.2 Discovery view

```python
@login_required
def discovery(request):
    users = User.objects.exclude(id=request.user.id).select_related('profile')
    query = request.GET.get('q', '')
    if query:
        users = users.filter(
            Q(profile__display_name__icontains=query) |
            Q(profile__bike_make__icontains=query) |
            Q(profile__location_city__icontains=query)
        )
    return render(request, 'pages/ride_discovery.html', {
        'discovered_riders': users[:20],
        'query': query,
    })
```

### Verification:
- Shows real registered users
- Search filters work
- "Invite" button sends ride invitation (creates RideParticipant with status=INVITED)

---

## Phase 5: Active Ride with Real Participants

> **Goal:** Active ride page shows real ride data and real participant positions.

### 5.1 Replace hardcoded data in `active_ride_map.html`

| Current hardcoded | Replaced with |
|-------------------|---------------|
| `"Sunday Morning Ride"` | `{{ ride.name }}` |
| `"3 RIDERS ACTIVE"` | `{{ ride.participants.count }} ACTIVE` |
| RZ, AY, DN markers | `{% for p in ride.participants.all %}` with initials |
| `"120m"`, `"-80m"` distances | Dynamic or last-known position delta |
| `"SPEED: 85 KM/H"` | Average speed from ride data or placeholder |
| Rameez (Lead), Ayaan, Danish roster | Participant list from DB |

### 5.2 Ride summary view (completed ride)

| Current hardcoded | Replaced with |
|-------------------|---------------|
| `"2h 15m"` duration | Calculated from ride start/end |
| `"42.3 km"` distance | Stored in Ride model |
| Rider list with roles | `{{ ride.participants.all }}` |

### Verification:
- Active ride shows correct ride name and real participants
- Ride summary shows actual stats
- Ending ride sets status to COMPLETED

---

## Phase 6: Flag Stop System

> **Goal:** Flagging a stop saves to DB and notifies other riders.

### 6.1 Replace hardcoded data in `flag-stop-confirmation.html`

| Current hardcoded | Replaced with |
|-------------------|---------------|
| Static stop type selection | Form POST with selected type |
| No backend action | Creates `FlagStop` record |
| Map background | Dynamic or placeholder |

### 6.2 Flag stop view

```python
@login_required
def flag_stop(request, ride_id):
    ride = get_object_or_404(Ride, id=ride_id)
    if request.method == 'POST':
        FlagStop.objects.create(
            ride=ride,
            flagged_by=request.user,
            stop_type=request.POST['stop_type'],
            lat=request.POST.get('lat', 0),
            lng=request.POST.get('lng', 0),
        )
        return redirect('pages:active-ride', ride_id=ride.id)
    return render(request, 'pages/flag-stop-confirmation.html', {'ride': ride})
```

### Verification:
- Flagging a stop creates a record in the database
- Stop appears in ride's stop history

---

## Phase 7: Production Hardening

> **Goal:** Security, performance, and deployment readiness.

### 7.1 Security
- [ ] Replace `SECRET_KEY` with env variable (`python-decouple` or `django-environ`)
- [ ] Set `DEBUG = False` via env
- [ ] Configure `ALLOWED_HOSTS` via env
- [ ] Add CSRF protection verification on all forms
- [ ] Add `@login_required` to all protected views
- [ ] Validate all form inputs server-side

### 7.2 Static Files
- [ ] Run `python manage.py collectstatic`
- [ ] Configure WhiteNoise or cloud storage (S3/CloudFront)
- [ ] Replace Google CDN images with local assets

### 7.3 Templates
- [ ] Add `{% extends %}` base template to remove duplication
- [ ] Extract shared `<head>`, nav, and bottom bar into base template
- [ ] Add `{% block %}` tags for page-specific content

### 7.4 Database
- [ ] Switch from SQLite to PostgreSQL for production
- [ ] Add database indexes on frequently queried fields
- [ ] Set up backup strategy

### 7.5 Deployment
- [ ] Create `requirements.txt` (freeze current venv)
- [ ] Create `Procfile` for Heroku / `Dockerfile` for container deploy
- [ ] Configure `gunicorn` as WSGI server
- [ ] Set environment variables in production
- [ ] Configure domain + SSL

---

## Phase Dependency Graph

```
Phase 1: Models & Auth
    │
    ├──▶ Phase 2: Profile Dashboard
    │        │
    │        └──▶ Phase 3: Ride Creation
    │                 │
    │                 └──▶ Phase 5: Active Ride
    │                          │
    │                          └──▶ Phase 6: Flag Stop
    │
    └──▶ Phase 4: Rider Discovery
             │
             └──▶ (feeds into Phase 5)
```

**Phase 7** (Production Hardening) runs in parallel with all phases.

---

## Current Template → Final Template Mapping

| Template | Hardcoded items | After Phase |
|----------|:-:|:-:|
| `home-dashboard.html` | 10 | Phase 2 |
| `create-a-ride.html` | 3 | Phase 3 |
| `ride_discovery.html` | 21 | Phase 4 |
| `active_ride_map.html` | 22 | Phase 5 |
| `ride_summary.html` | 17 | Phase 5 |
| `flag-stop-confirmation.html` | 3 | Phase 6 |
| `login.html` | 1 | Phase 1 |
| `onboarding-welcome.html` | 1 | Phase 1 |

**Total hardcoded items to replace: ~78**
**After all phases: 0**
