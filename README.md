# Finance

A full-stack personal finance management application built with React, TypeScript, Express, MongoDB, and PostgreSQL.

## Features

- JWT authentication with bcrypt password hashing
- Role-based access control: viewer, analyst, admin
- MongoDB-backed authentication and user management
- PostgreSQL-backed financial transactions
- Transaction CRUD, filtering, pagination, and soft deletion
- Daily, monthly, category, and trend analytics
- Custom date-range analysis
- Transaction reconciliation against external reference data
- Admin user management
- Responsive React frontend
- Reusable forms and modal components
- INR-first currency display with selectable display currency
- Zod request validation
- Automated backend tests

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, Express, TypeScript
- Authentication: JWT, bcrypt
- Validation: Zod
- User/Auth Database: MongoDB + Mongoose
- Financial Database: PostgreSQL + pg
- Testing: Vitest

## Architecture

The application uses a hybrid database architecture:

React Frontend
       │
       │ REST API
       ▼
Express + TypeScript
    │          │
    ▼          ▼
 MongoDB   PostgreSQL
 Users     Transactions
 Auth      Analytics

MongoDB handles users and authentication, while PostgreSQL handles financial transactions and analytical queries. This separates authentication concerns from financial data and allows PostgreSQL to efficiently handle relational queries and aggregations.

## Project Structure

finance/
├── frontend/       # React + TypeScript frontend
├── src/
│   ├── config/     # Database configuration
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
├── tests/          # Backend tests
├── package.json
└── README.md

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB or MongoDB Atlas
- PostgreSQL 14+

### Backend

Clone the repository and install dependencies:

    git clone <repository-url>
    cd <repository-directory>
    npm install

Create a `.env` file in the project root:

    PORT=5000
    MONGODB_URI=<your-mongodb-uri>
    POSTGRES_URL=<your-postgresql-connection-string>
    JWT_SECRET=<your-secret>

Start the backend:

    npm run dev

The backend runs on `http://localhost:5000`.

### Frontend

In a separate terminal:

    cd frontend
    npm install

Create `frontend/.env`:

    VITE_API_BASE_URL=http://localhost:5000/api

Start the frontend:

    npm run dev

Vite will display the local frontend URL in the terminal.

## Roles & Permissions

| Role | Dashboard | View Transactions | Create/Edit/Delete | Manage Users |
|------|-----------|--------------------|--------------------|--------------|
| viewer | Yes | No | No | No |
| analyst | Yes | Yes | No | No |
| admin | Yes | Yes | Yes | Yes |

Public registration always creates a `viewer`. Elevated roles can only be assigned by administrators.

Authorization is enforced by the backend, independent of frontend visibility.

## API

All API routes are prefixed with `/api`.

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register a viewer |
| POST | `/auth/login` | Public | Login and receive JWT |
| GET | `/auth/me` | Authenticated | Get current user |

### User Management

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users` | Admin | List users |
| GET | `/users/:id` | Admin | Get user |
| PATCH | `/users/:id` | Admin | Update user, role, or status |
| DELETE | `/users/:id` | Admin | Deactivate user |

### Transactions

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/records` | Admin, Analyst | List transactions |
| GET | `/records/:id` | Admin, Analyst | Get transaction |
| POST | `/records` | Admin | Create transaction |
| PATCH | `/records/:id` | Admin | Update transaction |
| DELETE | `/records/:id` | Admin | Soft-delete transaction |

Supported filters: `type`, `category`, `from`, `to`, `page`, `limit`.

### Dashboard

| Endpoint | Description |
|----------|-------------|
| `/dashboard/summary` | Overall financial summary |
| `/dashboard/by-category` | Category totals |
| `/dashboard/trends` | Monthly income/expense trends |
| `/dashboard/recent` | Recent transactions |

### Analytics

| Endpoint | Description |
|----------|-------------|
| `/dashboard/daily-summary` | Daily summary |
| `/dashboard/monthly-summary` | Monthly summary |
| `/dashboard/category-analysis` | Category analysis |
| `/dashboard/trend-analysis` | Trend analysis |

Analytics endpoints require authentication and support validated date ranges where applicable.

### Reconciliation

    POST /api/reconciliation/compare

Available to admins and analysts.

Compares active PostgreSQL transactions against externally supplied reference transactions and identifies:

- Matched transactions
- Missing internal records
- Missing external records
- Amount mismatches
- Type mismatches
- Category mismatches
- Reconciliation summary counts

The operation is read-only and does not modify transactions.

## Authentication

Protected endpoints require a JWT bearer token:

    Authorization: Bearer <token>

Authentication and role authorization are enforced by the backend.

## Validation & Data Integrity

Zod validation is used for API inputs, including:

- Required fields
- Transaction amounts and types
- Categories and dates
- UUID parameters
- Pagination
- Query filters
- Reconciliation payloads

PostgreSQL queries use parameterized statements.

Protected database fields such as identifiers, timestamps, and deletion fields cannot be arbitrarily supplied by clients.

## Data & Soft Deletion

Transactions contain amount, type, category, description, transaction date, and timestamps.

Financial transactions use soft deletion. Deleted records are excluded from normal queries and analytics while remaining available for audit and data integrity.

User deletion results in account deactivation. Deactivated users cannot log in, and their existing tokens are rejected.

## Currency

The application defaults to INR.

Users can select a different display currency. This changes display formatting only; no foreign-exchange conversion is performed and stored transaction amounts are not modified.

## API Response Format

Successful response:

    {
      "success": true,
      "data": {}
    }

Error response:

    {
      "success": false,
      "message": "Error description"
    }

## Security

The application includes:

- JWT authentication
- bcrypt password hashing
- Backend role-based authorization
- Server-side input validation
- Parameterized SQL queries
- Soft deletion
- Safe public registration defaults
- Deactivated account protection
- Protected administrative endpoints

Never commit `.env` files, database credentials, JWT secrets, or other sensitive configuration.

## Testing

Run backend tests:

    npm test

The test suite covers reconciliation behavior and validation boundaries.

For full end-to-end testing, configure MongoDB and PostgreSQL and run both the backend and frontend locally.

## Build

Backend:

    npm run build

Frontend:

    cd frontend
    npm run build

## Development Notes

The frontend and backend are maintained in the same repository.

The frontend communicates with the backend through the REST API. The backend owns authentication, authorization, validation, database access, and business logic.

## License

This project is intended for educational and portfolio purposes.
