# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Mobile-first invoicing app (React 19 + Vite + Tailwind + Supabase). Single-package project with a `supabase/` directory for backend (migrations, edge functions, config).

### Services

| Service | Command | Port | Notes |
|---|---|---|---|
| Supabase local stack | `npx supabase start` | API 54321, DB 54322, Studio 54323, Mailpit 54324 | Requires Docker; pulls images on first run (~1 min). Runs PostgreSQL 15, Auth, PostgREST, Storage, Realtime. |
| Vite dev server | `npm run dev` | 5173 | Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` from `npx supabase status`. |

### Docker in Cloud Agent VM

Docker must be started before `npx supabase start`. The daemon needs `fuse-overlayfs` storage driver and `iptables-legacy`:

```bash
sudo dockerd &>/tmp/dockerd.log &
sleep 5
sudo chmod 666 /var/run/docker.sock
```

### Environment variables

Run `npx supabase status` to get the anon key after Supabase starts. Create `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon key from supabase status>
VITE_GOOGLE_CLIENT_ID=
```

Google OAuth (`VITE_GOOGLE_CLIENT_ID`) is optional — email/password auth works without it.

### Lint / Build / Dev

Standard commands from `package.json`:

- `npm run lint` — ESLint. Pre-existing warnings/errors exist in hooks (react-hooks/set-state-in-effect) and contexts (react-refresh/only-export-components); these are not regressions.
- `npm run build` — TypeScript check + Vite production build.
- `npm run dev` — Vite dev server on port 5173.

### Testing notes

- No automated test suite exists in this repo.
- Sign up at `/signup` with email + password. Local Supabase does not require email confirmation by default.
- Mailpit is at `http://127.0.0.1:54324` if email confirmation is needed.
- Edge function `send-invoice-email` requires `RESEND_API_KEY` secret — optional for core flow testing.
