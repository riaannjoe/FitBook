# FitBook Backend

Node.js + Express + MySQL 8 API for the FitBook gym management system.

## Setup
```bash
npm install
cp .env.example .env            # then edit DB_USER / DB_PASS / JWT_SECRET
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed_data.sql
npm run seed:users              # gives sample users a real password (dev only)
npm run dev                     # http://localhost:5000/api/v1/health
```

## Structure (request flow: route → middleware → controller → service → model → MySQL)
```
backend/
├── bin/www                 starts the server
├── app.js                  express setup (helmet, cors, json, routes, error handler)
├── config/                 env.js (checks .env), db.js (mysql pool)
├── routes/                 URL + who can call it (authorize) + input rules (validate)
├── controllers/            read request, call service/model, send response
├── services/               business logic that spans several queries (login, subscribe, check-in, workout plans)
├── models/                 all SQL queries, nothing else
├── middleware/             auth, validate, notFound, errorHandler
├── utils/                  ApiError, asyncHandler, response, pagination, constants
├── database/               schema.sql, seed_data.sql, queries.sql, seedUsers.js
└── docs/API.md             API contract for the frontend team
```

## Rules for adding a feature
1. SQL goes in `models/`. Never write SQL in controllers.
2. Throw `new ApiError(status, 'CODE', 'message')` for expected errors; never send raw SQL errors.
3. Every route gets `authorize(...)` and, for POST/PUT, `validate(...)`.
4. Always respond with `ok()` / `created()` from `utils/response`.
5. Update `docs/API.md` when an endpoint changes.
