# Pole Progress (MVP)

Single-tenant white-label app for pole-dance studios. One studio = one Supabase project + one Angular deploy.

Stack: **Angular 21** (standalone + signals + OnPush) · **Nx 22** monorepo · **Tailwind 3** · **Supabase** (Postgres + Auth + Storage + RLS).

---

## Requirements
- Node.js (LTS 20+)
- Docker (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

## Install
```bash
npm i
```

## Run app
```bash
npx nx serve app
```
App: <http://localhost:4200>

## Local Supabase

Start / stop the local stack:
```bash
supabase start
supabase stop
```

- Studio (DB UI):  <http://127.0.0.1:54323/project/default>
- Mailpit (auth emails for magic link):  <http://127.0.0.1:54324>
- API URL:        <http://127.0.0.1:54321>

Reset DB (re-applies all migrations + seed):
```bash
supabase db reset
```

## Bootstrap an admin (one-time, after first sign-in)

The default role for any new user is `student`. To grant `admin`:

1. Sign in with your email at <http://localhost:4200/sign-in> and click the magic-link from Mailpit.
2. Find your user id in Supabase Studio → `auth.users`.
3. Run in SQL Editor (or via `supabase/snippets/Set admin role.sql`):
   ```sql
   update public.profiles
   set role = 'admin'
   where id = '<your-user-id>';
   ```
4. Sign out + back in (so the role is re-fetched).

## Project layout

```
apps/
  app/                      # Angular shell (bootstrap)
  app-e2e/                  # Playwright e2e
libs/
  core/
    supabase/               # @org/supabase — DI tokens + provider
    auth/                   # @org/auth — AuthApi, AuthStore, guards
  features/
    admin/                  # @org/admin — admin pages
supabase/
  migrations/               # ordered SQL migrations
  seed.sql                  # seeded categories + sample elements
```

Path aliases live in `tsconfig.base.json`.

## Useful scripts
```bash
npx nx serve app            # dev server
npx nx build app            # production build
npx nx test app             # unit tests (vitest)
npx nx lint app             # eslint
npx nx run-many -t lint test build
```

## Troubleshooting

- **Magic link does nothing** — ensure Supabase is running and check Mailpit. The link must redirect to `/auth/callback` on the same origin you signed in from.
- **`supabase start` fails on Docker** — `docker ps` to ensure Docker Desktop is up; then `supabase stop --no-backup` followed by `supabase start`.
- **Reset DB does not pick up new migration** — confirm the file is named with the next sortable timestamp prefix (e.g. `2026XXYY...`).
