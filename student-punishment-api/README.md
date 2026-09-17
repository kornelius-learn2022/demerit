# Student Punishment Scoring System — REST API

A complete Laravel 11 REST API for managing student behavioral scoring in a school environment.

## Tech Stack
- **Framework**: Laravel 11
- **Auth**: Laravel Sanctum (token-based, stateless)
- **Database**: MySQL
- **Cache / Session / Queue**: Redis (via `predis/predis`)

---

## Setup

```bash
# 1. Install dependencies
composer install

# 2. Copy and configure environment
cp .env.example .env
php artisan key:generate

# 3. Configure your .env (DB credentials, Redis connection)

# 4. Run migrations
php artisan migrate

# 5. Seed the database
php artisan db:seed

# 6. Start the server
php artisan serve
```

---

## Business Logic

- Students start with **150 points**
- Teachers record violations that **deduct points** based on the violation rule
- `current_score = 150 − SUM(point_deducted)` — cached in Redis for 1 hour

---

## Roles

| Role | Key | Description |
|------|-----|-------------|
| Admin | `admin` | Full system access |
| Homeroom Teacher | `pc1` | Scoped to ONE assigned classroom |
| Subject Teacher | `subject` | Can punish any student, sees only own records |

---

## Default Credentials (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `admin@school.com` | `password` | admin |
| `pc1.4a@school.com` | `password` | pc1 (Kelas 4A) |
| `pc1.4b@school.com` | `password` | pc1 (Kelas 4B) |
| `subject.math@school.com` | `password` | subject |
| `subject.indo@school.com` | `password` | subject |

---

## API Endpoints

### Auth
```
POST   /api/auth/login          — Get token
POST   /api/auth/logout         — Revoke token
GET    /api/auth/me             — Current user
```

### Dashboard
```
GET    /api/dashboard           — Role-appropriate stats
```

### Users (admin only)
```
GET    /api/users               — List users (filter: role, classroom_id, search)
POST   /api/users               — Create user
GET    /api/users/{id}          — Show user
PUT    /api/users/{id}          — Update user / reset password
DELETE /api/users/{id}          — Delete user (blocked if has punishments)
```

### Classrooms
```
GET    /api/classrooms          — List (all roles)
POST   /api/classrooms          — Create (admin)
GET    /api/classrooms/{id}     — Show (all roles)
PUT    /api/classrooms/{id}     — Update (admin)
DELETE /api/classrooms/{id}     — Delete (admin, blocked if has students)
```

### Students
```
GET    /api/students            — List (scoped by role, includes current_score)
POST   /api/students            — Create (admin)
GET    /api/students/{id}       — Show with current_score
PUT    /api/students/{id}       — Update (admin)
DELETE /api/students/{id}       — Delete (admin)
```

### Categories
```
GET    /api/categories          — List (all roles)
POST   /api/categories          — Create (admin)
GET    /api/categories/{id}     — Show with rules
PUT    /api/categories/{id}     — Update (admin)
DELETE /api/categories/{id}     — Delete (admin, blocked if has rules)
```

### Violation Rules
```
GET    /api/violation-rules     — List (filter: category_id, is_active)
POST   /api/violation-rules     — Create (admin)
GET    /api/violation-rules/{id}— Show
PUT    /api/violation-rules/{id}— Update (admin)
DELETE /api/violation-rules/{id}— Delete (admin, blocked if has punishments)
```

### Punishments
```
GET    /api/punishments         — List (scoped by role; filters: student_id, date_from, date_to, teacher_role, classroom_id, teacher_id)
POST   /api/punishments         — Record (pc1, subject)
GET    /api/punishments/{id}    — Show (policy-guarded)
DELETE /api/punishments/{id}    — Delete (policy-guarded, cache invalidated)
```

---

## Role Scoping Summary

| Endpoint | admin | pc1 | subject |
|----------|-------|-----|---------|
| `GET /students` | All | Own classroom only | All |
| `GET /punishments` | All with filters | Own classroom (all roles) | Own records only |
| `POST /punishments` | ✗ | Own classroom only | Any student |
| `DELETE /punishments/{id}` | Any | Own records in own class | Own records only |

---

## JSON Response Format

All responses follow this consistent wrapper:

```json
{
    "success": true,
    "message": "Human-readable message",
    "data": { ... }
}
```

### Error Codes
| Code | Meaning |
|------|---------|
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role or policy) |
| 404 | Resource not found |
| 409 | Conflict (e.g., delete blocked by relations) |
| 422 | Validation failed |
| 429 | Too many login attempts |

---

## Redis Key Structure

```
student:score:{student_id}    — Cached score (TTL: 1 hour)
login:{ip}                    — Rate-limiter hits (TTL: 60s, max: 5)
```

---

## File Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── CategoryController.php
│   │   ├── ClassroomController.php
│   │   ├── DashboardController.php
│   │   ├── PunishmentController.php
│   │   ├── StudentController.php
│   │   ├── UserController.php
│   │   └── ViolationRuleController.php
│   └── Middleware/
│       └── RoleMiddleware.php
├── Models/
│   ├── Category.php
│   ├── Classroom.php
│   ├── Punishment.php
│   ├── Student.php
│   ├── User.php
│   └── ViolationRule.php
├── Policies/
│   ├── PunishmentPolicy.php
│   ├── StudentPolicy.php
│   └── UserPolicy.php
├── Providers/
│   └── AppServiceProvider.php
└── Services/
    └── StudentScoreService.php
database/
├── migrations/
│   ├── 2024_01_01_000000_create_personal_access_tokens_table.php
│   ├── 2024_01_01_000001_create_classrooms_table.php
│   ├── 2024_01_01_000002_create_users_table.php
│   ├── 2024_01_01_000003_create_students_table.php
│   ├── 2024_01_01_000004_create_categories_table.php
│   ├── 2024_01_01_000005_create_violation_rules_table.php
│   └── 2024_01_01_000006_create_punishments_table.php
└── seeders/
    ├── DatabaseSeeder.php
    ├── ClassroomSeeder.php
    ├── UserSeeder.php
    ├── CategorySeeder.php
    ├── ViolationRuleSeeder.php
    └── StudentSeeder.php
routes/
├── api.php
├── web.php
└── console.php
config/
├── app.php
├── auth.php
├── cache.php
├── cors.php
├── database.php
├── logging.php
├── queue.php
├── sanctum.php
└── session.php
bootstrap/
└── app.php
```
