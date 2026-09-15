# Design

This document covers the data model and API design decisions behind the tracker, and the tradeoffs made along the way. For how the code is wired together, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Data model

### User

| Field | Type | Notes |
|---|---|---|
| `name` | String | required, trimmed |
| `email` | String | required, unique, lowercased, trimmed |
| `password` | String | required, min 8 chars, hashed with bcrypt (12 rounds) in a `pre("save")` hook |
| `role` | `"adjuster" \| "admin"` | defaults to `adjuster` |
| `createdAt` | Date | defaults to now |

The password is only rehashed when `isModified("password")` is true, so updating unrelated fields (e.g. `name`) doesn't churn the hash. `toJSON()` strips `password` so it's never accidentally serialized in an API response, even though the field is still fetched from the DB (needed for `comparePassword`).

### Policy

| Field | Type | Notes |
|---|---|---|
| `policyNumber` | String | required, unique, uppercased, trimmed |
| `holderName` | String | required, trimmed |
| `type` | `"auto" \| "home" \| "life"` | required |
| `premium` | Number | required, min 0 |
| `status` | `"active" \| "expired" \| "cancelled"` | required |
| `effectiveDate` / `expirationDate` | Date | required |
| `owner` | ObjectId ref → `User` | required |
| `createdAt` | Date | defaults to now |

`policyNumber` is uppercased at the schema level so `"pol-100"` and `"POL-100"` are treated as the same policy and collide on the unique index — this is enforced by MongoDB, and a duplicate submission surfaces as a 409 via the centralized error handler rather than a raw 500.

### Claim

| Field | Type | Notes |
|---|---|---|
| `claimNumber` | String | unique, **auto-generated** (`CLM-1000`, `CLM-1001`, …) |
| `policy` | ObjectId ref → `Policy` | required |
| `description` | String | required |
| `incidentDate` | Date | required |
| `amount` | Number | min 0 |
| `status` | `"submitted" \| "under-review" \| "approved" \| "denied" \| "closed"` | defaults to `submitted` |
| `assignedTo` | ObjectId ref → `User` | set from the authenticated user on creation |
| `notes` | `[{ author: ObjectId → User, text: String, createdAt: Date }]` | embedded sub-documents, no separate `_id` |
| `createdAt` / `updatedAt` | Date | via schema `{ timestamps: true }` |

**Claim number generation** happens in a `pre("save")` hook: on a new document with no `claimNumber` yet, it calls `countDocuments()` on the collection and derives `CLM-${1000 + count}`. This keeps numbers human-readable and roughly sequential without a separate counter collection.

> **Known tradeoff:** this counter approach has a race condition under concurrent inserts — two claims saved at the same instant could compute the same count and collide on the unique index. At this project's expected scale (a handful of adjusters filing claims, not a high-throughput system) that's an acceptable risk; a dedicated atomic counter document (`findOneAndUpdate` with `$inc`) would be the fix if that assumption changes. The seed script (`src/seed.ts`) sidesteps this entirely by creating claims sequentially rather than in parallel.

Notes are embedded rather than a separate collection because they're always accessed in the context of their claim, never independently queried or paginated — embedding avoids an extra join/populate for what is effectively a claim's activity log.

## API design

- **Resource-oriented REST.** `/api/policies` and `/api/claims` follow standard REST verbs (`GET`/`POST`/`PUT`/`DELETE`), with one deliberate extra: `POST /api/claims/:id/notes` as a sub-resource action, since appending a note isn't really "replacing" the claim (a `PUT` would imply that).
- **Pagination** is `page`/`limit` query params (default 1/10, capped at 100) on both list endpoints, returning `{ items, pagination: { page, limit, total, pages } }`. Kept minimal (offset-based) rather than cursor-based since the dataset sizes here don't warrant it.
- **Filtering** is done via query params matched directly to indexed/enum fields (`type`, `status`, `policy`, `assignedTo`) plus a `search` param that does a case-insensitive regex match across the couple of free-text fields that make sense to search (`holderName`/`policyNumber` for policies, `claimNumber`/`description` for claims). Search input is regex-escaped before being used to avoid a user-supplied pattern breaking the query or causing catastrophic backtracking.
- **Validation happens before the database is touched.** `express-validator` chains run in the `validate` middleware ahead of every mutating route, so most bad input (missing fields, invalid enums, malformed ObjectIds) never reaches Mongoose. The centralized error handler's `ValidationError`/`CastError` branches exist as defense-in-depth for anything that bypasses that layer (a script, a future route), not as the primary validation path.
- **`GET /api/claims/stats` is registered before `GET /api/claims/:id`** — otherwise Express would match `/stats` as an `:id` param and route it to the wrong handler.
- **Dashboard vs. per-resource stats.** `/api/claims/stats` and `/api/dashboard` overlap (both surface claims-by-status and totals) by design: `/claims/stats` is scoped to claims for a claims-focused view, while `/dashboard` aggregates across claims, policies, and users for an at-a-glance summary. Duplicating the small aggregation pipeline was judged simpler than building a shared abstraction for two call sites.

## Security & auth

- **JWT payload is intentionally minimal** — just `{ id, role }` — to keep tokens small and avoid embedding data that could go stale (e.g. `name`/`email`) before the token expires. Anything else needed is fetched fresh via `authenticate` looking up the user by id on every request.
- **Passwords never leave the server.** Hashed at rest (bcrypt, 12 rounds), stripped from every JSON response via `toJSON()`, and never logged.
- **CORS is currently unrestricted** (`cors()` with no `origin` option). This project doesn't yet have a fixed client origin to allow-list; tightening this to `cors({ origin: process.env.CLIENT_ORIGIN })` once a frontend exists is a known follow-up, not an oversight.
- **Health check reflects real DB state**, not just process liveness — `GET /api/health` reports `mongoose.connection.readyState` and returns 503 when MongoDB is unreachable, so uptime monitoring can distinguish "server up, DB down" from "all healthy."
