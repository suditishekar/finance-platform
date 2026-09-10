# Finance Backend

A TypeScript backend API for Finance with role-based access control, PostgreSQL-backed transaction management, analytics, and reconciliation.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** MongoDB (Atlas) via Mongoose for users/auth; PostgreSQL for transactions
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **Frontend:** React + TypeScript + Vite in `frontend/`

## Project Structure

```
src/
├── config/db.ts              # MongoDB connection for users/auth
├── config/postgres.ts        # PostgreSQL pool and transaction table setup
├── controllers/              # Route handler logic
├── middleware/               # Auth + error handling
├── models/                   # Mongoose user model and PostgreSQL transaction model
├── routes/                   # Route definitions
├── utils/                    # JWT, response helpers, catchAsync
└── validators/               # Zod input schemas
```

## Setup

**1. Clone the repo and install dependencies**
```bash
git clone <repo-url>
cd zorvyn-finance-backend
npm install
```

**2. Create a `.env` file using `.env.example` as a reference.** Keep the MongoDB and PostgreSQL credentials out of source control.

The backend requires `MONGODB_URI` for existing authentication/user data and `POSTGRES_URL` (or `DATABASE_URL`) for transaction data.

**3. Start the development server**
```bash
npm run dev
```

The server runs on `http://localhost:5000`.

## Roles

| Role     | Dashboard | View Records | Create Records | Update/Delete Records | Manage Users |
|----------|-----------|--------------|----------------|-----------------------|--------------|
| viewer   | ✓         | ✗            | ✗             | ✗                     | ✗           |
| analyst  | ✓         | ✓            | ✗             | ✗                     | ✗           |
| admin    | ✓         | ✓            | ✓             | ✓                     | ✓           |

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint    | Access | Description              |
|--------|-------------|--------|--------------------------|
| POST   | `/register` | Public | Register a new user      |
| POST   | `/login`    | Public | Login and receive a JWT  |
| GET    | `/me`       | Any    | Get current user details |

### Users — `/api/users`

| Method | Endpoint | Access | Description                        |
|--------|----------|--------|------------------------------------|
| GET    | `/`      | Admin  | List all users                     |
| GET    | `/:id`   | Admin  | Get a single user                  |
| PATCH  | `/:id`   | Admin  | Update name, role, or status       |
| DELETE | `/:id`   | Admin  | Deactivate user (soft deactivation)|

### Financial Records — `/api/records`

| Method | Endpoint | Access          | Description                                |
|--------|----------|-----------------|--------------------------------------------|
| GET    | `/`      | Admin, Analyst  | List records with filtering + pagination   |
| GET    | `/:id`   | Admin, Analyst  | Get a single record                        |
| POST   | `/`      | Admin           | Create a new record                        |
| PATCH  | `/:id`   | Admin           | Update a record                            |
| DELETE | `/:id`   | Admin           | Soft delete a record                       |

**Filtering query params:** `type`, `category`, `from`, `to`, `page`, `limit`

### Dashboard — `/api/dashboard`

| Method | Endpoint        | Access | Description                              |
|--------|-----------------|--------|------------------------------------------|
| GET    | `/summary`      | Any    | Total income, expenses, net balance      |
| GET    | `/by-category`  | Any    | Totals grouped by category               |
| GET    | `/trends`       | Any    | Monthly income/expense for last N months |
| GET    | `/recent`       | Any    | Most recent N transactions               |

Analytics endpoints also include `/daily-summary`, `/monthly-summary`, `/category-analysis`, and `/trend-analysis`; all require authentication and accept validated `from` and `to` date query parameters.

### Reconciliation — `/api/reconciliation`

| Method | Endpoint  | Access          | Description                                      |
|--------|-----------|-----------------|--------------------------------------------------|
| POST   | `/compare`| Admin, Analyst   | Compare active PostgreSQL records with references|

The reconciliation request supplies `referenceTransactions` with `id`, `amount`, `type`, and `category`. It reports matched records, missing internal/external records, and field-level mismatches without modifying transactions.

## Request / Response Format

All responses follow a consistent shape:

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Error description" }
```

Authentication is passed as a Bearer token:
```
Authorization: Bearer <token>
```

## Assumptions and Design Notes

- **Soft deletes:** Financial records are never permanently deleted. A `deletedAt` timestamp is set and the record is excluded from all queries. This preserves data for audit purposes.
- **Role default:** Newly registered users always default to `viewer`. Role changes are restricted to the admin user-management flow.
- **Category is free text:** There is no fixed category list. The `type` field is restricted to `income` or `expense`; category can be anything (Salary, Rent, Freelance, etc.).
- **Password security:** Passwords are hashed with bcrypt (10 salt rounds) and the field is excluded from all database queries by default at the schema level.
- **No hard deletes on users:** Deleting a user deactivates them (`status: inactive`). Deactivated users cannot log in and their existing tokens are rejected.

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API base URL, normally `http://localhost:5000/api`. The frontend stores its JWT in the browser session and stores workspace currency preferences locally; selecting a currency changes display formatting only and does not perform foreign-exchange conversion.

## Testing

Backend deterministic unit tests run with `npm test`. They cover reconciliation comparison behavior and validation boundaries. Full database-backed API and browser acceptance flows require configured local MongoDB/PostgreSQL services and should be verified in the local environment.
