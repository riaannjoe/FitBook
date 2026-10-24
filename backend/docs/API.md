# FitBook API – guide for the frontend team

Base URL: `http://localhost:5000/api/v1`  (set `CORS_ORIGIN` in `.env` to your frontend URL)

## 1. Conventions

**Auth:** `POST /auth/login` returns a token. Send it on every other request: `Authorization: Bearer <token>` (valid 8h).

**Success**
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 134, "pages": 7 } }
```
`meta` only appears on paginated lists (`?page=1&limit=20`).

**Error**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request data",
  "details": [ { "field": "phone", "message": "is required" } ] } }
```
| HTTP | code | meaning |
|---|---|---|
| 400 | VALIDATION_ERROR, INVALID_REFERENCE, NO_ACTIVE_MEMBERSHIP | bad input |
| 401 | UNAUTHORIZED, INVALID_CREDENTIALS | not logged in / wrong login |
| 403 | FORBIDDEN, MEMBER_SUSPENDED, NO_MEMBER_PROFILE | role not allowed |
| 404 | NOT_FOUND | record does not exist |
| 409 | DUPLICATE, IN_USE, ALREADY_CHECKED_IN | conflict (same phone/email, or record still linked) |
| 429 | TOO_MANY_REQUESTS | login rate limit |
| 500 | INTERNAL_ERROR | server bug |

**Formats:** dates `YYYY-MM-DD`, date-times `YYYY-MM-DD HH:mm:ss`, time `HH:mm:ss`, money = number (INR).

**Enums (use for dropdowns):**
- gender: `M | F | O`
- member status: `active | expired | suspended`
- payment method: `cash | card | upi | netbanking`
- workout goal: `weight_loss | muscle_gain | endurance | general`
- workout level: `beginner | intermediate | advanced`
- weekday: `Mon … Sun`
- maintenance status: `open | in_progress | resolved`
- equipment status: `working | under_repair | retired`

## 2. Login response
```json
{ "success": true, "data": { "token": "...", "user": { "id": 1, "username": "admin", "role": "admin", "member_id": null, "trainer_id": null } } }
```
Use `user.role` to decide which screens to show (`admin`, `trainer`, `member`).

## 3. Endpoints  (A = admin, T = trainer, M = member, * = any logged-in user)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /auth/login | public | body: username, password |
| GET | /auth/me | * | current user |
| POST | /auth/register | A | body: username, password(6+), role, optional member_id / trainer_id to link |
| GET | /dashboard | A | active_memberships, monthly_revenue, todays_attendance, open_issues |
| GET | /members | A,T | `?search=&status=&page=&limit=` |
| POST | /members | A | full_name, gender, dob, phone (+ email, address, emergency_contact) |
| GET | /members/:id | A,T | |
| PUT | /members/:id | A | send only the fields to change |
| DELETE | /members/:id | A | |
| GET | /members/:id/subscriptions | A | history with plan name |
| GET | /members/:id/workout | A,T | assigned plans with exercises |
| GET | /plans | * | membership plans |
| POST / PUT / DELETE | /plans, /plans/:id | A | plan_name, duration_months, price, description |
| POST | /subscriptions | A | member_id, plan_id, method (subscribe or renew, creates payment) |
| GET | /subscriptions/expiring | A | `?days=7` |
| POST | /subscriptions/expire-check | A | marks overdue subscriptions/members expired |
| GET | /trainers | * | includes `clients` count (salary only for admin) |
| POST / PUT / DELETE | /trainers, /trainers/:id | A | full_name, phone, hire_date, specialization, salary |
| GET | /trainers/:id/schedule | * | weekly slots |
| POST | /trainers/:id/schedule | A | day_of_week, start_time, end_time |
| DELETE | /trainers/:id/schedule/:slotId | A | |
| GET | /trainers/:id/clients | A,T(own) | |
| POST | /assignments | A | trainer_id, member_id |
| PATCH | /assignments/:id/end | A | |
| POST | /attendance/check-in | A | member_id (needs active membership) |
| POST | /attendance/check-out | A | member_id |
| GET | /attendance | A | `?date=YYYY-MM-DD&member_id=&page=` |
| GET | /attendance/analytics | A | byHour, byWeekday, inactive |
| GET / POST | /exercises | * / A,T | name, muscle_group, description |
| GET | /workout-plans | A,T | `?goal=&level=` |
| GET | /workout-plans/:id | * | plan with exercises |
| POST | /workout-plans | A,T | title, goal, level, exercises: [{exercise_id, day_number, sets, reps}] (admin also sends trainer_id) |
| POST | /workout-plans/assign | A,T | member_id, workout_plan_id, end_date? |
| GET | /payments | A | `?member_id=&status=&page=` |
| GET | /reports/revenue | A | monthly + byPlan (paid only) |
| GET | /equipment | * | `?status=&category=` |
| POST / PUT / DELETE | /equipment, /equipment/:id | A | name, category, purchase_date, cost |
| GET | /maintenance | A | `?status=` |
| POST | /maintenance | * | equipment_id, issue (reporter taken from token) |
| PUT | /maintenance/:id | A | status, repair_cost |
| GET | /me/profile | M | own profile + current_subscription |
| GET | /me/subscriptions | M | |
| GET | /me/workout | M | |
| GET | /me/payments | M | |
| GET | /me/attendance | M | paginated |
| GET | /me/clients | T | own clients |

## 4. Workout response shape
```json
[ { "workout_plan_id": 1, "title": "Beginner Strength Starter", "goal": "muscle_gain", "level": "beginner",
    "assigned_date": "2026-08-02", "end_date": "2026-11-01",
    "exercises": [ { "exercise_id": 1, "name": "Bench Press", "muscle_group": "Chest", "day_number": 1, "sets": 3, "reps": 10 } ] } ]
```

## 5. Test logins (after `npm run seed:users`)
All sample users share the password `Fitbook@123`.
| role | username |
|---|---|
| admin | admin |
| trainer | trainer_rahul (linked to trainer 1) |
| member | member_aarav (linked to member 1) |
