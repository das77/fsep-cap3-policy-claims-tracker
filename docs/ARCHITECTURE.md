# Architecture

> All file paths below (`src/...`, `package.json`, etc.) are relative to [`backend-api/`](../backend-api/), where the application lives.

## Overview

A single Express application (`src/server.ts`) exposes a JSON REST API backed by MongoDB. A React client (`frontend-client/react-ts/`, documented separately in [its own README](../frontend-client/react-ts/README.md)) consumes this API; the two are developed and deployed independently, with the frontend's dev server proxying `/api` requests to this backend.

```mermaid
flowchart TD
    Client["Client"] -->|"HTTP (JSON)"| App["Express app (src/server.ts)"]
    App -->|"cors → express.json() → routes → 404 handler → errorHandler"| Routers["Routers (src/routes/*.ts)"]
    Routers -->|"authenticate → validate → handler"| Models["Mongoose models (src/models/*.ts)"]
    Models --> DB[("MongoDB")]
```

## Entry point

`src/server.ts` is the single entry point (there is no separate `app.ts`/`index.ts` split). In order, it:

1. Loads environment variables (`dotenv.config()`) — must happen before any other import touches `process.env`.
2. Configures the Express app: `cors()`, `express.json()`, the `/api/health` check, then mounts every router under `/api`.
3. Registers a 404 handler and the centralized `errorHandler` last.
4. Connects to MongoDB (`connectDB()`) and only then starts listening.

The server intentionally does **not** pass a callback to `app.listen()`. Express binds a passed callback to both the `listening` and `error` events, so on a port conflict it would still fire the "success" callback. Instead, `listening`/`error` are attached directly to the returned `http.Server`, so a real bind failure (e.g. `EADDRINUSE`) logs the actual error and exits non-zero instead of falsely reporting success.

## Request pipeline

Every protected route follows the same shape:

```mermaid
flowchart LR
    Req(["Incoming request"]) --> Auth["authenticate"]
    Auth --> Val["validate([...chains])"]
    Val --> Handler["route handler"]
    Handler --> Res(["Response"])
```

- **`authenticate`** (`src/middleware/auth.ts`) reads `Authorization: Bearer <token>`, verifies it with `JWT_SECRET`, loads the user, and attaches it as `req.user`. Returns 401 for any missing/invalid/expired token or a user that no longer exists.
- **`validate`** (`src/middleware/validate.ts`) takes an array of `express-validator` chains, runs them, and returns 400 with error details if any fail — otherwise calls `next()`.
- Route handlers are `async` and assume Express 5's automatic forwarding of rejected promises to error-handling middleware — there's no manual `try/catch` per route.

Errors that reach the end of the chain are handled centrally by `src/middleware/errorHandler.ts`:

```mermaid
flowchart TD
    Err(["Error reaches errorHandler"]) --> Q1{"instanceof<br/>ValidationError?"}
    Q1 -->|yes| R1["400 + field-level messages"]
    Q1 -->|no| Q2{"instanceof<br/>CastError?"}
    Q2 -->|yes| R2["400"]
    Q2 -->|no| Q3{"code === 11000<br/>(duplicate key)?"}
    Q3 -->|yes| R3["409 + conflicting field"]
    Q3 -->|no| R4["500, generic message<br/>(logged server-side only)"]
```

## Auth flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as /api/auth routes
    participant U as User model
    participant R as Protected route (e.g. /api/policies)

    C->>A: POST /register { name, email, password }
    A->>U: create() (password hashed in pre("save"))
    U-->>A: user document
    A-->>C: 201 { user } (no token — client must log in separately)

    C->>A: POST /login { email, password }
    A->>U: findOne + comparePassword()
    U-->>A: match / no match
    A-->>C: 200 { token, expiresAt, user } or 401

    C->>R: GET /policies (Authorization: Bearer token)
    R->>R: authenticate middleware verifies token
    R->>U: findById(payload.id)
    U-->>R: user
    R-->>C: 200 (req.user attached) or 401
```

## Data layer

Models live in `src/models/` and are plain Mongoose schemas:

- **`User`** — hashes its password in a `pre("save")` hook (bcrypt, 12 rounds) and strips `password` from `toJSON()` output.
- **`Policy`** — owned by a `User` (`owner` ref); `policyNumber` is uppercased/trimmed and unique.
- **`Claim`** — references a `Policy` and an `assignedTo` `User`; auto-generates a sequential `claimNumber` (`CLM-1000`, `CLM-1001`, …) in a `pre("save")` hook based on `countDocuments()`, and embeds `notes` as sub-documents (`{ author, text, createdAt }`).

See [`DESIGN.md`](DESIGN.md) for the reasoning behind these choices, including an entity-relationship diagram of how the three models relate.

## Containerized deployment

Two Compose files at the repo root (`docker-compose.yml`, `docker-compose.prod.yml`) wrap the same three pieces — `mongo`, `api` (`backend-api/Dockerfile`), `client` (`frontend-client/Dockerfile`) — into containers; see the root [README](../README.md#running-with-docker) for how to run them. The main difference between the two is how the client is fronted:

```mermaid
flowchart LR
    subgraph "docker-compose.yml (dev)"
        B1["Browser :4000"] -->|HTTP| C1["client (nginx)"] -->|"/api/*"| A1["api :3000"]
    end
    subgraph "docker-compose.prod.yml (prod-like)"
        B2["Browser :8443 / :8080"] -->|"HTTPS / HTTP→redirect"| C2["client (nginx + TLS)"] -->|"/api/*"| A2["api :3000 (not published)"]
    end
    C1 --> M1[("mongo")]
    C2 --> M2[("mongo")]
```

In both cases nginx (baked from `frontend-client/nginx.conf` or, in prod, `nginx-ssl.conf` bind-mounted over it) serves the built SPA and proxies `/api/*` to the `api` service by Docker service name, so the browser only ever talks to one origin — the same shape as the Vite dev-server proxy used outside Docker. `docker-compose.prod.yml` additionally mounts a self-signed cert (`generate-certs.sh`) and does not publish the `api` port to the host at all, since only the `client` container needs to reach it.

## Testing

The Vitest suite (`vitest.config.mts`) splits into two kinds of tests:

- **Pure unit tests** — no database: `Policy` model validation (via `.validate()` on an unsaved document), `generateToken`, the `validate` and `errorHandler` middleware, and `authenticate` (with the `User` model mocked via `vi.mock`).
- **DB-backed tests** — `User` and `Claim` models, since their behavior (password hashing, claim-number generation) only fires on `.save()`. These connect to a dedicated `policy-claims-test` MongoDB database via `src/test/db.ts` helpers, cleared between tests.

Because the DB-backed tests share one real external database, `vitest.config.mts` sets `fileParallelism: false` — running test files concurrently was observed to race one file's cleanup (`afterEach`) against another file's in-progress assertions, producing a flaky duplicate-key test. Running files sequentially trades a small amount of speed for determinism.

Route handlers themselves are not unit-tested directly — they're thin composition of already-tested middleware and models. They were verified manually end-to-end against a live server and MongoDB instance during development (auth flows, CRUD lifecycles, filtering/pagination, aggregation, and error paths).
