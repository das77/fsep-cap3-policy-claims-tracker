# Policy Claims Tracker

An insurance Policy Claims Tracker — a line-of-business application for adjusters and administrators to manage insurance policies and the claims filed against them.

## Project layout

```text
.
├── backend-api/   # Express + MongoDB API (this is where you run npm commands)
├── docs/          # Architecture and design documentation
└── README.md
```

All application code, `package.json`, and environment files live under [`backend-api/`](backend-api/). Every command below is run from that directory.

## Tech stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing (`bcryptjs`)
- **Validation:** `express-validator`
- **Testing:** Vitest

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit together and [`docs/DESIGN.md`](docs/DESIGN.md) for data model and API design decisions.

## Prerequisites

- Node.js 20+
- A running MongoDB instance (e.g. via Docker: `docker run -d -p 27017:27017 mongo:7`)

## Setup

1. Move into the app directory and install dependencies:

   ```bash
   cd backend-api
   npm install
   ```

2. Copy the environment template and fill in the values:

   ```bash
   cp .env_example .env
   ```

   | Variable       | Description                                                                |
   | -------------- | --------------------------------------------------------------------------- |
   | `PORT`         | Port the API server listens on (defaults to 5000 if unset)                |
   | `MONGODB_URI`  | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/policy-claims` |
   | `JWT_SECRET`   | Secret used to sign and verify JWTs                                        |

3. (Optional) Seed the database with sample users, policies, and claims:

   ```bash
   npm run seed
   ```

   This clears existing `User`/`Policy`/`Claim` data and inserts:
   - 3 users — 1 admin (`admin@policyclaims.com`), 2 adjusters (`alice@policyclaims.com`, `bob@policyclaims.com`), password `Admin123!` / `Password123!` respectively
   - 5 policies across auto/home/life types and active/expired/cancelled statuses
   - 6 claims spread across every status, several with notes

   ```mermaid
   pie showData title Seeded claims by status
       "submitted" : 2
       "under-review" : 1
       "approved" : 1
       "denied" : 1
       "closed" : 1
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the server with hot reload (`tsx watch`) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled server from `dist/server.js` |
| `npm run typecheck` | Type-check without emitting output |
| `npm test` | Run the Vitest suite |
| `npm run seed` | Reset and repopulate the database with sample data |

## API overview

All routes are mounted under `/api`. Every route except `/api/health` and `/api/auth/register`/`/login` requires a `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server + database connectivity check |
| POST | `/api/auth/register` | Create a user account (does not return a token — log in separately) |
| POST | `/api/auth/login` | Authenticate, returns a JWT and its expiry timestamp |
| GET | `/api/auth/me` | Return the authenticated user's profile |
| GET | `/api/policies` | List policies (filter by `type`, `status`, `search`; paginated) |
| GET | `/api/policies/:id` | Get a single policy (owner populated) |
| POST | `/api/policies` | Create a policy |
| PUT | `/api/policies/:id` | Update a policy |
| DELETE | `/api/policies/:id` | Delete a policy |
| GET | `/api/claims` | List claims (filter by `status`, `policy`, `assignedTo`, `search`; paginated) |
| GET | `/api/claims/stats` | Aggregated claim statistics |
| GET | `/api/claims/:id` | Get a single claim (policy + assignee populated) |
| POST | `/api/claims` | Create a claim (auto-assigned to the requesting user) |
| PUT | `/api/claims/:id` | Update a claim |
| POST | `/api/claims/:id/notes` | Add a note to a claim |
| DELETE | `/api/claims/:id` | Delete a claim |
| GET | `/api/dashboard` | Aggregated totals across claims, policies, and users |

## Testing

```bash
npm test
```

The suite includes pure unit tests (models validation, middleware, utilities) and DB-backed tests that run against a dedicated `policy-claims-test` MongoDB database — a local MongoDB instance must be reachable to run the full suite. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#testing) for details.
