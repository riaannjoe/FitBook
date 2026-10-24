# FitBook — Smart Gym Management System (Backend API)

REST API for running a gym: members, subscriptions and payments, trainers, attendance, workout plans, and equipment maintenance. Built with **Node.js + Express + MySQL 8**, secured with **JWT** and **role-based access** (admin / trainer / member).

> **Status:** backend complete and tested; frontend not started. 66 endpoints, 15 tables, interactive Swagger docs.

---

## Table of contents

1. [Features](#1-features)
2. [Who can do what (roles)](#2-who-can-do-what-roles)
3. [API overview](#3-api-overview)
4. [Business rules built into the API](#4-business-rules-built-into-the-api)
5. [Database design](#5-database-design)
6. [Security and quality](#6-security-and-quality)
7. [Response and error format](#7-response-and-error-format)
8. [Setup](#8-setup)
9. [Test logins](#9-test-logins)
10. [Project structure](#10-project-structure)
11. [Documentation for the frontend team](#11-documentation-for-the-frontend-team)
12. [Known limitations and next steps](#12-known-limitations-and-next-steps)

---

## 1. Features

| Module | What it does |
|---|---|
| **Authentication** | Login with username and password, JWT token (8 hours), "who am I" endpoint, change password. Login attempts are rate limited. |
| **User accounts** | Admin creates logins and links them to a member or trainer record. Registration is not public. |
| **Dashboard** | One call returns active memberships, this month's revenue, today's attendance, open equipment issues, total/active members, total trainers and plans expiring in 7 days. |
| **Member management** | Register, search (name, phone, email), filter by status, edit, delete. The profile call also returns the member's current plan and trainer. |
| **Membership plans** | Create and manage plans (name, duration, price). |
| **Subscriptions and renewals** | Buy or renew a plan in a single transaction that creates the subscription and the payment and activates the member. Cancel a plan, list expiring plans, and run an expiry check. |
| **Payments and revenue reports** | Filterable payment history; revenue by month, by plan and by payment method. Only paid payments count as revenue. |
| **Trainer management** | Trainer profiles, weekly schedules, and client lists. Salary is visible only to admins and to the trainer themselves. |
| **Trainer assignments** | Assign a member to a trainer and end the assignment later. Duplicate active assignments are blocked. |
| **Attendance** | Check-in and check-out at the desk, a live "who is in the gym now" view, and analytics: visits by hour, by weekday, and members inactive for N days. |
| **Workout plans** | Exercise library, trainer-built plans (days, exercises, sets, reps), and assigning plans to members. Members see their plans grouped by day. |
| **Equipment** | Equipment inventory with status (working, under repair, retired). |
| **Maintenance** | Anyone logged in can report a broken machine; admin tracks it to resolution with repair cost. Equipment status updates automatically. |
| **Member / trainer portal (`/me`)** | Members see their own profile, subscription, workout, attendance and payments. Trainers see their profile and clients. |

---

## 2. Who can do what (roles)

| Area | Admin | Trainer | Member |
|---|:-:|:-:|:-:|
| Dashboard, reports, payments, users | ✅ | — | — |
| Members: list, create, edit, delete | ✅ | read only | — |
| Plans: view | ✅ | ✅ | ✅ |
| Plans: create, edit, delete | ✅ | — | — |
| Subscriptions: buy, renew, cancel, list | ✅ | — | — |
| Trainers: view | ✅ | ✅ | ✅ |
| Trainers: create, edit, delete, schedules | ✅ | — | — |
| Trainer assignments | ✅ | — | — |
| Trainer's own clients | ✅ | own only | — |
| Attendance (check-in/out, analytics) | ✅ | — | — |
| Exercises: create, edit | ✅ | ✅ | — |
| Exercises: delete | ✅ | — | — |
| Workout plans: create and assign | ✅ | ✅ | — |
| Equipment: view | ✅ | ✅ | ✅ |
| Equipment: create, edit, delete | ✅ | — | — |
| Report a maintenance issue | ✅ | ✅ | ✅ |
| Update maintenance requests | ✅ | — | — |
| Own data (`/me/*`) | — | profile, clients | profile, subscription, workout, attendance, payments |

A member can also read their own `/members/:id/subscriptions` and `/members/:id/workout`, and nobody else's.

---

## 3. API overview

Base URL: `http://localhost:5000/api/v1`

| Group | Endpoints |
|---|---|
| **Health** | `GET /health` |
| **Auth** | `POST /auth/login` · `GET /auth/me` · `POST /auth/change-password` |
| **Users** | `GET /users` · `POST /users` · `DELETE /users/:id` |
| **Dashboard** | `GET /dashboard` |
| **Members** | `GET /members` · `POST /members` · `GET /members/:id` · `PUT /members/:id` · `DELETE /members/:id` · `GET /members/:id/subscriptions` · `GET /members/:id/workout` |
| **Plans** | `GET /plans` · `GET /plans/:id` · `POST /plans` · `PUT /plans/:id` · `DELETE /plans/:id` |
| **Subscriptions** | `GET /subscriptions` · `POST /subscriptions` · `GET /subscriptions/expiring` · `POST /subscriptions/expire-check` · `PATCH /subscriptions/:id/cancel` |
| **Payments and reports** | `GET /payments` · `GET /reports/revenue` |
| **Trainers** | `GET /trainers` · `POST /trainers` · `GET /trainers/:id` · `PUT /trainers/:id` · `DELETE /trainers/:id` · `GET/POST /trainers/:id/schedule` · `DELETE /trainers/:id/schedule/:scheduleId` · `GET /trainers/:id/clients` |
| **Assignments** | `GET /assignments` · `POST /assignments` · `PATCH /assignments/:id/end` |
| **Attendance** | `GET /attendance` · `GET /attendance/live` · `GET /attendance/analytics` · `POST /attendance/check-in` · `POST /attendance/check-out` |
| **Exercises** | `GET /exercises` · `POST /exercises` · `PUT /exercises/:id` · `DELETE /exercises/:id` |
| **Workout plans** | `GET /workout-plans` · `POST /workout-plans` · `GET /workout-plans/:id` · `POST /workout-plans/assign` |
| **Equipment** | `GET /equipment` · `GET /equipment/:id` · `POST /equipment` · `PUT /equipment/:id` · `DELETE /equipment/:id` |
| **Maintenance** | `GET /maintenance` · `POST /maintenance` · `PUT /maintenance/:id` |
| **Me (portal)** | `GET /me/profile` · `GET /me/subscription` · `GET /me/workout` · `GET /me/attendance` · `GET /me/payments` · `GET /me/clients` |

Full request and response details for every endpoint are in Swagger: `http://localhost:5000/api/docs`.

**List endpoints** support `?page=1&limit=20` (limit max 100) and, where it makes sense, `search` and `status` filters.

---

## 4. Business rules built into the API

- **Subscribe / renew is atomic.** It calls the `sp_subscribe` stored procedure, which creates the subscription, records the payment and sets the member to active in one transaction. If anything fails, everything is rolled back.
- **Renewals stack.** Renewing while a plan is still active starts the new plan when the current one ends.
- **Suspended members cannot buy a plan.**
- **Check-in needs an active membership.** Members without one are refused. A member who is already checked in cannot check in twice.
- **Check-out is always after check-in**, even if both happen in the same second.
- **Expiry check.** `POST /subscriptions/expire-check` marks overdue subscriptions as expired and flips members with no active plan to expired.
- **Cancelling** a subscription also expires the member if they have no other active plan.
- **Equipment status is automatic.** Reporting an issue sets the equipment to *under repair*; marking the request *resolved* sets it back to *working* and stamps the resolved date.
- **Revenue counts only `paid` payments.** Failed and pending payments are excluded.
- **One active assignment** per trainer–member pair.
- **Creating a login** can link it to an existing member or trainer; a record that already has a login cannot be linked again. Admins cannot delete their own account.
- **Trainer salary** is hidden from everyone except admins and the trainer themselves.

---

## 5. Database design

**15 tables** in 3NF, MySQL 8, with primary keys, foreign keys (cascade or set-null where appropriate), `UNIQUE`, `CHECK`, `ENUM`, `NOT NULL` and `DEFAULT` constraints.

| Table | Purpose |
|---|---|
| `users` | Logins (username, bcrypt hash, role) |
| `membership_plans` | Plan name, duration, price |
| `members` | Member profile and status |
| `subscriptions` | Which member bought which plan, and the dates |
| `payments` | Payment per subscription (amount, method, status) |
| `trainers` | Trainer profile, specialization, salary |
| `trainer_schedules` | Weekly working hours |
| `trainer_assignments` | Trainer ↔ member (many-to-many) |
| `attendance` | Check-in and check-out times |
| `exercises` | Exercise library |
| `workout_plans` | Plan title, goal, level, owner trainer |
| `workout_plan_exercises` | Plan ↔ exercise with day, sets and reps (many-to-many) |
| `member_workout_plans` | Member ↔ plan (many-to-many) |
| `equipment` | Gym equipment and its status |
| `maintenance_requests` | Issues reported against equipment |

**Other database objects**
- **View** `v_dashboard`: the four headline numbers for the admin dashboard.
- **Stored procedure** `sp_subscribe`: the subscribe/renew transaction.
- **Triggers** `trg_maint_ins` and `trg_maint_upd`: keep equipment status in sync with maintenance requests.
- **Indexes** on attendance (member, date), subscriptions (end date) and payments (date).

Files: `database/schema.sql` (tables, view, procedure, triggers, indexes), `database/seed.sql` (sample data, 10+ rows per table), `database/queries.sql` (joins, aggregates, subqueries for your report).

---

## 6. Security and quality

- Passwords stored as **bcrypt** hashes; **JWT** tokens with expiry.
- **Role checks** on every route, plus ownership checks so members and trainers can only read their own data.
- **Helmet** security headers and **CORS** limited to the origins in `.env`.
- **Login rate limit:** 20 attempts per 15 minutes.
- **Input validation** with Zod on bodies, queries and params.
- **Parameterized SQL** everywhere (no string-built queries from user input).
- **Central error handler:** database errors become clean codes (`DUPLICATE`, `IN_USE`, `INVALID_REFERENCE`, ...) without leaking table or column names in production.
- **Layered code:** each feature has routes → controller → service → schema.

---

## 7. Response and error format

Success:
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }
```
`meta` appears only on paginated lists.

Error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "phone: Phone must be 10-15 digits",
  "details": [ { "field": "phone", "message": "Phone must be 10-15 digits" } ] } }
```

| Status | Typical codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `NO_ACTIVE_MEMBERSHIP`, `INVALID_REFERENCE`, `WRONG_PASSWORD` |
| 401 | `UNAUTHORIZED`, `INVALID_TOKEN`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND`, `NOT_CHECKED_IN`, `PROFILE_NOT_LINKED` |
| 409 | `DUPLICATE`, `IN_USE`, `ALREADY_CHECKED_IN`, `ALREADY_ASSIGNED`, `MEMBER_SUSPENDED`, `NOT_ACTIVE`, `CANNOT_LINK` |
| 429 | `TOO_MANY_REQUESTS` |
| 500 | `INTERNAL_ERROR` |

Conventions: dates `YYYY-MM-DD`, date-times `YYYY-MM-DD HH:MM:SS`, money and ids as JSON numbers, `PUT` is a partial update, optional fields are omitted or `null` (not empty strings).

---

## 8. Setup

**Requirements:** Node.js 18+ and MySQL 8.

```bash
# 1. install packages
npm install

# 2. create your .env  (Windows: copy .env.example .env)
cp .env.example .env
#    then set DB_PASS, JWT_SECRET and CORS_ORIGIN inside it

# 3. create the database (drop an old fitbook database first if you have one)
mysql -u root -p -e "DROP DATABASE IF EXISTS fitbook;"
mysql -u root -p -e "source database/schema.sql"
mysql -u root -p -e "source database/seed.sql"

# 4. give the sample users a working password (development only)
npm run seed:users

# 5. start the server
npm run dev        # auto-restart on changes
# or
npm start
```

Expected output:
```
FitBook API running  ->  http://localhost:5000/api/v1
Swagger docs         ->  http://localhost:5000/api/docs
```

**Quick check:** open `http://localhost:5000/api/v1/health` — you should get `{"success":true,"data":{"status":"ok",...}}`.

**Fresh start without sample data?** Skip `seed.sql` and create the first admin with:
```bash
npm run create-admin -- myadmin MyStrongPass@123
```

### Environment variables (`.env`)

| Variable | Meaning |
|---|---|
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Comma-separated frontend URLs allowed to call the API |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | MySQL connection |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |

---

## 9. Test logins

After `npm run seed:users`, every sample user has the password **`Fitbook@123`**.

| Role | Username | Linked to |
|---|---|---|
| admin | `admin` | — |
| trainer | `trainer_rahul`, `trainer_priya`, `trainer_amit`, `trainer_neha`, `trainer_karan` | trainers 1–5 |
| member | `member_aarav`, `member_diya`, `member_rohan`, `member_isha`, `member_vivek`, `member_anjali`, `member_kunal`, `member_sneha`, `member_harsh`, `member_pooja` | members 1–10 |

Try it: open Swagger at `/api/docs`, run `POST /auth/login` with `admin` / `Fitbook@123`, click **Authorize**, paste the token, then call any endpoint.

> Development passwords only. Change them, and use a strong `JWT_SECRET`, before any real deployment.

---

## 10. Project structure

```
src/
  server.js              starts the server (checks the DB connection first)
  app.js                 express setup: helmet, cors, rate limit, docs, routes, error handler
  config/                env.js (validates .env), db.js (mysql pool + transaction helper)
  middleware/            auth.js (JWT + roles), validate.js (zod), errorHandler.js, notFound.js
  utils/                 ApiError, asyncHandler, response helpers, pagination, sql helpers
  routes/index.js        mounts every module under /api/v1
  modules/<feature>/     <feature>.routes.js      URL + middleware only
                         <feature>.controller.js  reads the request, sends the response
                         <feature>.service.js     business rules + SQL
                         <feature>.schema.js      input validation (zod)
database/                schema.sql, seed.sql, queries.sql, seed-users.js, create-admin.js
docs/                    openapi.json, FitBook.postman_collection.json, FRONTEND_GUIDE.md, build_docs.py
```

Request flow: `route → auth → validate → controller → service → MySQL`.

Modules: `auth`, `users`, `dashboard`, `members`, `plans`, `subscriptions`, `payments`, `trainers`, `assignments`, `attendance`, `workouts`, `equipment`, `maintenance`, `me`.

**Adding an endpoint:** add the route, service logic and validation schema in the feature folder, add one line to the `ENDPOINTS` table in `docs/build_docs.py`, then run `npm run docs:build` so Swagger and Postman stay up to date.

---

## 11. Documentation for the frontend team

- **`docs/FRONTEND_GUIDE.md`**: login flow, response format, error codes, enum values, a ready-made `fetch` wrapper, screens per role and common flows (new member, renewal, reception desk, trainer creating a plan).
- **Swagger UI**: `/api/docs` (raw spec at `/api/docs.json`).
- **Postman**: import `docs/FitBook.postman_collection.json`; the login request saves the token automatically.

Member screens should use `/me/*`, not `/members/:id`, so the logged-in user is picked up automatically.

---

## 12. Known limitations and next steps

- **No frontend yet.** The planned stack is React: login, admin dashboard, members, subscriptions and payments, attendance desk, trainers and workouts, equipment and maintenance.
- **Expiry is not automatic.** Call `POST /subscriptions/expire-check` once a day (cron job or an admin button).
- **Payments are recorded, not processed.** There is no payment gateway; the method and status are stored as entered.
- **No automated tests yet.** Endpoints were tested by hand with Postman and PowerShell; adding Jest and Supertest tests is a good next step.
- **Sample dates are around October 2026**, so some "expiring soon" demo data will go stale over time.
- **Ideas for later:** email or SMS renewal reminders, member photo upload, class booking, Docker setup, CI.

---

## License

MIT. See `LICENSE`.
