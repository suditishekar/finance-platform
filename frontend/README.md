# Finance frontend

React + TypeScript + Vite frontend for the Finance API.

## Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API base URL. The default is `http://localhost:5000/api`.

The frontend includes authentication and registration, role-aware navigation, dashboard date ranges, workspace currency preferences, transaction CRUD with filtering and pagination, analytics, and reconciliation access through the backend.
