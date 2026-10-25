# FitBook — Smart Gym Management System

FitBook is a full-stack gym management application designed to simplify everyday gym operations, including member management, subscriptions, payments, trainer assignments, attendance tracking, workout plans, and equipment maintenance.

The project combines a React frontend with a Node.js/Express REST API and a MySQL database.

> **Project status:** The backend API and admin frontend have been implemented. Trainer and member dashboards are currently placeholders, and some features remain under development.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Authentication and Authorization](#authentication-and-authorization)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Security Considerations](#security-considerations)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Features

### Admin Dashboard

- **Dashboard:** Overview of gym operations and key metrics.
- **Member Management:** View and manage member records.
- **Membership Plans:** Manage available membership plans.
- **Subscriptions:** Track member subscriptions and renewals.
- **Payments:** Access payment records and related information.
- **Trainer Management:** Manage trainer records.
- **Attendance:** Track gym attendance.
- **Workout Management:** Manage workout plans and exercise information.
- **Equipment Management:** Maintain equipment records.
- **Maintenance Management:** Track equipment maintenance requests.

### Backend

- RESTful API built with Express.js.
- MySQL database integration.
- JWT-based authentication.
- Role-based access control.
- Password hashing using bcrypt.
- Request validation and centralized error handling where implemented.
- Database constraints and business rules.
- SQL triggers and stored procedures.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MySQL 8 |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| API communication | HTTP/REST, JSON |
| Development tools | Git, GitHub, npm |

## Architecture

FitBook follows a client-server architecture.

```text
                User
                  |
                  v
          React + Vite Frontend
             localhost:3000
                  |
                  | HTTP requests
                  | /api/*
                  v
          Node.js + Express API
             localhost:5000
                  |
                  | SQL queries
                  v
              MySQL 8
```

During local development, Vite proxies API requests to the Express server. In production, the frontend and backend can be deployed separately and configured to communicate through the deployed API URL.

## Project Structure

```text
FitBook/
├── backend/
│   ├── config/              # Backend configuration
│   ├── controllers/         # Request handlers
│   ├── database/            # Database scripts and seed utilities
│   ├── docs/                # API documentation
│   ├── middleware/          # Authentication and other middleware
│   ├── models/              # Data access and models
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic, where implemented
│   ├── .env.example         # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── assets/          # Images and other assets
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context
│   │   └── pages/           # Application pages
│   ├── .env.example         # Frontend environment template
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

*The directory structure may evolve as development continues.*

## Prerequisites

Install the following before running FitBook locally:

- [Node.js](https://nodejs.org/) and npm.
- [MySQL 8](https://dev.mysql.com/downloads/).
- [Git](https://git-scm.com/).
- A code editor such as [Visual Studio Code](https://code.visualstudio.com/).

Ensure MySQL is running and that you have permission to create and manage a database.

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd FitBook
```

Replace the repository URL with the actual URL of your GitHub repository.

### 2. Configure the database

Start MySQL and create a database for FitBook.

```sql
CREATE DATABASE fitbook;
```

Review the SQL files in `backend/database/` and import the schema, seed data, triggers, and stored procedures as applicable. Follow the order and instructions provided by the database scripts.

Make sure the database name and credentials match your backend environment configuration.

### 3. Configure the backend

Open a terminal in the project root:

```bash
cd backend
npm install
```

Create a local environment file by copying the template.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Open `backend/.env` and configure the database connection, JWT secret, and other required settings. See [Environment Configuration](#environment-configuration).

Never commit your actual `.env` file.

### 4. Configure the frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
```

Create the local environment file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

For local development, configure:

```env
VITE_API_BASE=/api/v1
```

The Vite development server proxies `/api` requests to the backend running on port `5000`.

### 5. Prepare development accounts

If you need seeded development accounts, inspect the available seed scripts and their instructions.

Configure an explicit `SEED_PASSWORD` in `backend/.env` before running the user-seeding script. Use a strong, unique password and do not reuse development credentials in production.

Run the seed command from the `backend` directory if your `package.json` defines it:

```bash
npm run seed:users
```

Only run the seed command after configuring the database and required environment variables.

## Environment Configuration

### Backend

Configure the variables supported by `backend/.env.example`. Typical settings include:

| Variable | Purpose |
|---|---|
| `DB_HOST` | MySQL server hostname |
| `DB_PORT` | MySQL server port, if supported by the configuration |
| `DB_USER` | MySQL username |
| `DB_PASS` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `CORS_ORIGIN` | Allowed frontend origin or origins |
| `SEED_PASSWORD` | Explicit password for seeded development accounts |

The exact required variables depend on the backend configuration. Consult `backend/.env.example` and `backend/config/env.js`.

Use a long, randomly generated JWT secret. Keep all real credentials in local environment files or your deployment provider's secret manager.

### Frontend

Configure `frontend/.env.example` as needed.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | Base path or URL used by the frontend API client |

For local development:

```env
VITE_API_BASE=/api/v1
```

For a separately deployed API, configure the appropriate HTTPS API base URL and ensure the backend CORS policy allows the deployed frontend origin.

**Important:** Vite exposes variables prefixed with `VITE_` to browser-side code. Never put database credentials, private API keys, or JWT signing secrets in frontend environment variables.

## Running the Application

Start the backend and frontend in separate terminals.

### Backend

From the `backend` directory:

```bash
npm run dev
```

This assumes the backend package defines a `dev` script. Check `backend/package.json` if the command differs.

The backend is configured for local development on port `5000`.

### Frontend

From the `frontend` directory:

```bash
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:3000
```

The frontend should communicate with the backend through the configured Vite proxy.

### Production builds

To build the frontend:

```bash
cd frontend
npm run build
```

Vite generates the production build in `frontend/dist/`. This generated directory should not be committed to Git.

Backend deployment requires configuring production environment variables, a reachable MySQL database, appropriate CORS settings, and a production start command.

## Authentication and Authorization

FitBook uses JWT-based authentication and role-based access control.

The intended application roles are:

- **Admin:** Access to administrative gym management functionality.
- **Trainer:** Intended access to trainer-related functionality.
- **Member:** Intended access to member-related functionality.

The frontend API client attaches the authentication token to protected requests. The backend is responsible for validating tokens and enforcing permissions.

Authentication and authorization must be enforced by the backend; hiding a page or button in the frontend is not a security boundary.

## API Documentation

Backend API documentation is maintained in:

```text
backend/docs/API.md
```

Use this document to review available endpoints, request formats, responses, and authentication requirements.

The API uses JSON for request and response payloads where applicable. Protected endpoints require valid authentication credentials.

For example, a health-check endpoint may be available at:

```text
GET /api/v1/health
```

The exact endpoint availability and response should be verified against the running backend.

## Database

MySQL stores the application's operational data, including information related to:

- Users and roles.
- Members and trainers.
- Membership plans and subscriptions.
- Payments.
- Attendance.
- Workout plans and exercises.
- Equipment and maintenance.

The database layer also includes SQL-level business rules through constraints, triggers, and stored procedures where implemented.

Use the supplied database scripts to create and initialize the schema. Back up the database before running destructive migrations or modifying existing data.

## Security Considerations

Before deploying FitBook publicly:

- Keep `.env` files, credentials, database passwords, and signing secrets out of Git.
- Use strong, unique passwords for all accounts.
- Never rely on default development credentials in production.
- Generate a secure JWT secret and configure it through the deployment environment.
- Restrict database access and avoid exposing the database publicly.
- Configure CORS to allow only trusted frontend origins.
- Use HTTPS for deployed frontend and backend traffic.
- Verify backend authorization checks for every protected operation.
- Avoid returning stack traces or internal error details to clients in production.
- Review dependencies and keep them updated.
- Do not store sensitive information in frontend environment variables.

Development seed accounts and sample data must not be treated as production-ready user accounts.

## Known Limitations

- Trainer and member dashboards are currently placeholders.
- Some frontend routes are not yet implemented beyond placeholder screens.
- Production deployment and configuration may require additional work.
- Security, authorization, validation, and end-to-end behavior should be tested before real-world use.

## Future Improvements

Potential next steps include:

- Complete trainer and member dashboards.
- Add automated backend and frontend tests.
- Improve input validation and error handling.
- Add reporting and analytics for gym operations.
- Improve deployment automation and environment management.
- Add production-ready logging, monitoring, and backup procedures.
- Conduct a security review of authentication, authorization, and data access.

## Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Commit your changes with a descriptive message.
5. Open a pull request describing the changes.

## License

Add the project's chosen license here before distributing or accepting contributions under an open-source license.
