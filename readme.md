# todo-app
 
A full-stack todo application with a REST API, a CLI, and per-task sharing.
Built as a learning project for backend development.
 
**Live API:** https://todo-app-deluxe.onrender.com
 
---
 
## Stack
 
| Layer | Choice |
|---|---|
| Runtime | Node.js (native TypeScript execution, ESM) |
| Framework | Express 5 |
| Database | Postgres (Neon) |
| ORM | Drizzle |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Hosting | Render |
 
---
 
## Project structure
 
```
todo-app/
├── src/
│   ├── api/
│   │   ├── controllers/     HTTP layer — parse input, shape responses
│   │   │   ├── authcontroller.ts
│   │   │   └── taskcontroller.ts
│   │   ├── middleware/
│   │   │   └── auth.ts      requireAuth — verifies the Bearer token
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── tasks.ts
│   │   └── server.ts        app setup, CORS, mounting, shutdown
│   ├── bin/                 CLI entry points
│   ├── config/
│   │   ├── db.ts
│   │   └── env.ts           validated environment variables
│   └── core/
│       ├── errors.ts        ValidationError, ForbiddenError
│       └── modules/
│           ├── users/       schema, repository, service
│           ├── todo-items/  schema, repository, service
│           └── task-access/ schema, repository, service
├── drizzle/                 generated migrations
└── frontend/                (to be added) React + Vite client
```
 
**Layering rule:** controllers never touch the database. They call services,
which enforce business rules and call repositories, which own the SQL.
 
---
 
## Setup
 
```bash
npm install
npm run db:migrate
npm run api
```
 
The API starts on `http://localhost:3000`.
 
### Environment variables
 
Create a `.env` file in the project root:
 
```
DATABASE_URL=postgres://...
JWT_SECRET=some-long-random-string
API_PORT=3000
CORS_ORIGINS=http://localhost:5173
```
 
`DATABASE_URL` and `JWT_SECRET` are required — the app throws on startup if
either is missing. `API_PORT` defaults to 3000; Render supplies `PORT`, which
takes precedence. `CORS_ORIGINS` is a comma-separated list of allowed browser
origins and defaults to the Vite dev server.
 
### Scripts
 
| Command | Does |
|---|---|
| `npm run api` | Dev server with file watching |
| `npm run dev` | Dev server, no watch |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev only) |
 
---
 
## Authentication
 
Signup and login both return a JWT. Send it on every `/tasks` request:
 
```
Authorization: Bearer <token>
```
 
The token payload is `{ userId }` and expires after 7 days. `requireAuth`
verifies it and attaches `userId` to the request; every route in `tasks.ts`
sits behind it.
 
Failures return `401`:
- `Missing or invalid Authorization header` — no token, or no `Bearer ` prefix
- `Invalid or expired token` — signature or expiry check failed
---
 
## CORS
 
Browsers block cross-origin requests unless the server allows them. Because
the frontend runs on a different port than the API, `cors` middleware is
mounted before all routes and permits only the origins in `CORS_ORIGINS`.
 
This affects browsers only — curl and Postman ignore it entirely. The real
access control is `requireAuth`.
 
Verify the preflight without a browser:
 
```bash
curl -i -X OPTIONS http://localhost:3000/tasks \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```
 
Expect a `204` carrying `Access-Control-Allow-Origin: http://localhost:5173`.
 
---
 
## Data model
 
**users** — `id`, `email` (unique), `passwordHash`, `createdAt`
 
**task** — `id`, `text`, `completed`, `createdBy` → users, `deletedAt`, `updatedAt`
 
**task_access** — `id`, `taskId` → task, `userId` → users, `createdAt`,
unique on `(taskId, userId)`
 
`task_access` is the single source of truth for visibility. A user sees exactly
the tasks they hold a row for — including their own, which is inserted in the
same transaction as the task itself. Ownership stays on `task.createdBy` and
governs who may share.
 
Deletes are soft: `deletedAt` is set rather than the row removed, which is what
makes `restore` possible.
 
---
 
## API reference
 
All responses are JSON. Errors are `{ "error": "message" }`.
 
### Public
 
| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok" }` |
| `GET` | `/version` | — | `{ version }` |
| `POST` | `/auth/signup` | `{ email, password }` | `201 { id, email, token }` |
| `POST` | `/auth/login` | `{ email, password }` | `200 { id, email, token }` |
 
Signup returns `400` if the email is taken. Login returns `401` on bad
credentials.
 
### Tasks — all require a Bearer token
 
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| `POST` | `/tasks` | `{ text }` | `201 Task` |
| `GET` | `/tasks` | `?filter&start&end` | `200 { totalCount, tasks }` |
| `GET` | `/tasks/cursor` | `?filter&after&limit` | `200 { items, nextCursor }` |
| `GET` | `/tasks/:id` | — | `200 Task` \| `404` |
| `PATCH` | `/tasks/:id/toggle` | — | `200 Task` |
| `DELETE` | `/tasks/:id` | — | `204` |
| `POST` | `/tasks/:id/restore` | — | `200 { restored: true }` |
 
`filter` is one of `all`, `completed`, `pending`, `deleted` (default `all`).
`all` excludes soft-deleted tasks; `deleted` shows only those.
 
Offset pagination uses 1-based inclusive `start`/`end` (default 1–10). Cursor
pagination takes the last seen id as `after` and a `limit` capped at 100
(default 10); `nextCursor` is `null` on the final page.
 
**Task shape**
 
```json
{
  "id": 8,
  "text": "drink water",
  "completed": false,
  "createdBy": 5,
  "deletedAt": null,
  "updatedAt": "2026-09-13T09:03:05.000Z"
}
```
 
### Sharing
 
| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/tasks/:id/share` | `{ userId }` | `201` |
| `DELETE` | `/tasks/:id/share/:userId` | — | `204` |
| `GET` | `/tasks/:id/access` | — | `200 { taskId, ownerId, users }` |
| `GET` | `/tasks/shared-with-me` | — | `200 [ ... ]` |
 
Only the owner may share or revoke. Anyone with access may list who else has
it. `/shared-with-me` returns tasks owned by someone else:
`{ taskId, text, completed, ownerId }`.
 
Each entry from `/access` is `{ userId, email, grantedAt, isOwner }`.
 
Re-sharing with a user who already has access returns
`{ taskId, userId, alreadyShared: true }` rather than failing.
 
**Access is all-or-nothing.** A user the task is shared with can toggle,
delete, and restore it — not just read it. There is no read-only tier.
 
### Status codes
 
| Code | Meaning |
|---|---|
| `400` | Bad input — malformed id, empty text, missing field |
| `401` | Missing, malformed, or expired token |
| `403` | Authenticated but not permitted (e.g. non-owner sharing) |
| `404` | Not found, or exists but invisible to you |
| `500` | Unhandled server error |
 
`404` is deliberately returned for tasks that exist but aren't visible to the
caller, so task ids can't be enumerated.
 
---
 
## Known gaps
 
Things the frontend will run into:
 
- **No user lookup by email.** Sharing requires a numeric `userId`, which no
  real user knows. Needs either a lookup endpoint or for share to accept an
  email.
- **No `/auth/me`.** On page reload there's no way to validate a stored token
  or recover the user's email without calling a task endpoint and reading the
  status code.
- **No task text editing.** Only `toggle` changes a task after creation.
- **Cold starts.** Render's free tier sleeps when idle; the first request after
  can take up to ~50 seconds. Loading states need to tolerate that.
- **Signup errors are flat.** `authcontroller` returns `400` for every thrown
  error, so a duplicate email and a database outage are indistinguishable to
  the client.