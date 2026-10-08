# Pole Progress (MVP)

The product is a student's personal training diary. Log an attempt on a pole element, mark a stage (`trying`, `in_progress`, `held`, `mastered`), and review a chronological photo and video timeline.

Schedule and class booking stay in the app as an optional secondary area (`/app/schedule`). One studio = one Supabase project + one Angular deploy.

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

1. Sign in at <http://localhost:4200/sign-in> with email and password. Magic link still works through Mailpit, and Google appears once `[auth.external.google]` is enabled. Local demo accounts from the schedule migration: `instructor.demo@pole.local` and `client.demo@pole.local`, password `demo-local-only`.
2. Find your user id in Supabase Studio → `auth.users`.
3. Run in SQL Editor (or via `supabase/snippets/Set admin role.sql`):
   ```sql
   update public.profiles
   set role = 'admin'
   where id = '<your-user-id>';
   ```
4. Sign out + back in (so the role is re-fetched).

## Promote a user to instructor

`student` stays the database value for clients (the shell shows **Клієнт**). `instructor` is staff together with `admin` (`is_staff()`), but only an admin can change `profiles.role`. After that person has signed in once:

```sql
update public.profiles
set role = 'instructor'
where id = '<user-id>';
```

Use `role = 'admin'` for a full admin. Sign out and back in so `AuthStore` reloads the role. These statements run as the database owner; a client cannot self-promote through the API.

After the first admin exists, later role changes are done in the app at `/admin/clients`. That page is behind `adminOnlyGuard`, and Postgres still rejects a role change unless `is_admin()` is true.

## Studio access

Signing in is not enough to open `/app`. Staff (`admin`, `instructor`) go straight in. A client needs an **active** `client_passes` row: `status = 'active'` and the current time between `valid_from` and `valid_until`. Anyone else lands on `/access-pending`.

The same rule is `public.has_studio_access()` in `supabase/migrations/202610080006_studio_access.sql`. Apply it with `supabase db reset` or `supabase migration up`. Sessions stay in the browser (`persistSession`), so a reload keeps the user signed in and re-checks membership.

## Admin: clients

`/admin/clients` lists every profile (name, email, id, role) and whether a pass is active right now. **Видати** inserts a `client_passes` row with `status = 'active'`, `valid_from`, and `valid_until`. **Продовжити** updates the pass that is already active and refills `remaining` from the chosen product. Emails come from `admin_profile_emails()` in `supabase/migrations/202610090001_admin_clients.sql`. Insert and update on `client_passes` require `is_admin()`.

## Project layout

```
apps/
  app/                      # Angular shell (bootstrap, root config, title strategy)
  app-e2e/                  # Playwright e2e
libs/
  core/
    supabase/               # @org/supabase  — DI tokens + provideSupabase
    auth/                   # @org/auth      — AuthApi, AuthStore, guards, sign-in (password, Google, magic link)
    data/                   # @org/data      — domain models, Catalog/Attempts/Media/Settings APIs, BrandingService
  features/
    shell/                  # @org/shell     — AppShellPage, ToastService, StateBlockComponent
    dashboard/              # @org/dashboard — diary home: stage summary + element grid
    element/                # @org/element   — chronological attempt timeline + stage when logging
    schedule/               # @org/schedule  — optional week list, book and cancel
    admin/                  # @org/admin     — Categories / Elements / Branding / Clients
supabase/
  migrations/               # ordered SQL migrations
  seed.sql                  # seeded categories + sample elements
```

Path aliases live in `tsconfig.base.json`. Module-boundary tags are enforced in `eslint.config.mjs` (`scope:app|feature|core|ui|shared`); `@org/data` is `scope:core` and must not depend on `@org/auth`.

## Storage buckets

Two buckets are provisioned via migrations:

- **`media`** — *private*. Per-user paths `user/{uid}/attempt/{attemptId}/{stamp}-{name}`. RLS only allows the owning user to read/write their own prefix. Used for attempt photos/videos. 100 MB limit, image+video mime allowlist (`202601240004` / `202601240005`).
- **`catalog`** — *public read, admin-only write*. Used for category/element artwork (`element/{id}/...`). `SELECT` open to `anon` + `authenticated`; `INSERT/UPDATE/DELETE` gated by `public.is_admin()`. 10 MB, image mime allowlist (`202601240007`).

DB rows store the storage **path**, not a URL. The app resolves private media via `storage.createSignedUrl(path, ttl)` on demand.

## Document title

`PpTitleStrategy` (`apps/app/src/app/title.strategy.ts`) composes `"{routeTitle} — {studioName}"`, falling back to just `studioName` for routes without a title. It reacts to `BrandingService.studioName()` via `effect()`, so renaming the studio in the admin Branding page updates the browser tab title live. Add a `title:` to any new route to participate.

## Production deploy

The app is shipped as a static SPA. Per-studio configuration is **build-time**, not runtime — Vite/Angular does not auto-load `.env`.

1. Edit `apps/app/src/environments/environment.ts` and replace the local Supabase URL + anon key with the production project's values (see `.env.example` for the keys you need to fill in).
2. Build:
   ```bash
   npx nx build app
   ```
3. Deploy `dist/apps/app/` to any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront). SPA fallback to `index.html` must be enabled (Angular routing is client-side).
4. In the Supabase dashboard add the production origin to **Authentication → URL Configuration → Site URL** and **Additional Redirect URLs** (magic link and Google both return to `${origin}/auth/callback`). Enable the Google provider there if the studio should offer it. Instagram is not a Supabase Auth provider.
5. Apply the migrations against the production project:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
6. Sign in once with your email, then run the admin bootstrap snippet above against the production DB.

`apps/app/src/main.ts` already bootstraps with `appConfig`, which wires `provideSupabase`, `provideAuth`, the `PpTitleStrategy`, and the `BrandingService` initial load.

## Useful scripts
```bash
npx nx serve app            # dev server
npx nx build app            # production build
npx nx test app             # unit tests (vitest)
npx nx lint app             # eslint
npx nx run-many -t lint test build
```

## Troubleshooting

- **Magic link does nothing** — ensure Supabase is running and check Mailpit. The link must redirect to `/auth/callback` on the same origin you signed in from, and that origin must be allow-listed in Supabase Auth settings (production only).
- **`supabase start` fails on Docker** — `docker ps` to ensure Docker Desktop is up; then `supabase stop --no-backup` followed by `supabase start`.
- **Reset DB does not pick up new migration** — confirm the file is named with the next sortable timestamp prefix (e.g. `2026XXYY...`).
- **Image in attempt timeline shows broken** — signed URLs expire after 1h; re-open the element page to mint fresh ones.
