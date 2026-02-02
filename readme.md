# Pole Progress (MVP)

Angular + Nx monorepo + Supabase (local dev).

## Requirements
- Node.js (LTS)
- Docker
- Supabase CLI

## Install
```bash
npm i
```

## Run app
```bash
npx nx serve app
```

## Start local Supabase:
```bash
supabase start
```
## Stop:
```bash
supabase stop
```


## Supabase Studio:
- http://127.0.0.1:54323/project/default

## Mailpit (email for local auth):
- http://127.0.0.1:54324


## Reset DB (applies migrations + seed):
```bash
supabase db reset
```
