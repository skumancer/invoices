---
name: invoicing-agents
description: "Repo-specific agent guidelines for the invoicing app (Vite + React + Capacitor + Supabase). Use with skills for Supabase, Postgres, and React performance."
---

# Invoicing project — agent guidelines

Guidelines for AI assistants on this codebase. **Supabase behavior, RLS, auth, CLI, and React/performance patterns** live in `.agents/skills/` — read those skills when the task touches those areas; this file stays project-shaped.

## Related skills (read when relevant)

| Skill | Use for |
|-------|---------|
| `skills/supabase/SKILL.md` | Supabase products, client usage, auth, RLS, migrations, Edge Functions, security checklist |
| `skills/supabase-postgres-best-practices/SKILL.md` | Query tuning, indexes, connection usage, Postgres-oriented design |
| `skills/vercel-react-best-practices/SKILL.md` | Waterfalls, bundle size, re-renders, memoization, rendering and JS hot paths |

## Project overview

Mobile-first invoicing SaaS: **React 19**, **TypeScript**, **Vite**, **Tailwind 4**, **Supabase** (Postgres, Auth, Edge Functions), **Capacitor 8**, **Vitest**, **Resend**, **Gemini** (via Edge Functions).

### Layout

```
src/
├── components/   # Layout, Capacitor, InvoiceAssistant, ui/
├── contexts/     # Auth, Profile
├── hooks/        # useCustomers, useInvoices, …
├── lib/          # supabase client, auth, format, platform
├── pages/        # *Page.tsx route components
├── types/        # database types, etc.
└── test/         # Vitest setup
```

### Domain (high level)

Users (Supabase Auth), Customers, Items catalog, Invoices (+ lines, statuses, recurrence), InvoiceSequence (numbering per user).

---

## Core principles

1. **Read before write** — open the file and nearby callers; avoid drive-by refactors.
2. **Minimal diffs** — match existing patterns and types.
3. **TypeScript** — strict; avoid `any`; keep `src/types/database.ts` aligned with schema when it changes.
4. **Secrets** — no service role or third-party secrets in the client; sensitive calls go through **Edge Functions** (see below).
5. **Mobile** — consider `isNativePlatform()`, iOS + Android parity; see `docs/mobile-parity-checklist.md` when touching native behavior.

Row-level access and Supabase security details: **Supabase skill**.

---

## Backend touches this repo (pointers only)

- **Types**: `src/types/database.ts` with `supabase/migrations/`.
- **Edge Functions** (secrets live server-side only): `ai-create-invoice`, `send-invoice-email`, `generate_recurring_invoices` (cron). Deploy: `npx supabase functions deploy <name>`.
- **Do not** call Resend or Gemini from the Vite client; route through Edge Functions.

Migrations, RLS, `supabase-js` usage, and CLI workflows: **Supabase skill**.

---

## Frontend conventions

- **Pages**: `src/pages/`, default export, `*Page.tsx`; register routes in `src/App.tsx` and nav in `src/components/Layout/AppLayout.tsx` when adding screens.
- **Components**: `src/components/`; shared primitives under `src/components/ui/`. Tailwind + existing layout patterns.
- **Auth / profile**: `AuthProvider`, `ProfileProvider`; use `useAuth()`, `useProfileContext()` — do not bypass providers on protected flows.

**Forms**: `react-hook-form` + `zod`; validate on submit and surface field errors.

**React performance** (memo, lazy loading, waterfalls, bundle imports): **vercel-react-best-practices** skill.

---

## Mobile (Capacitor)

- `import { isNativePlatform } from '@/lib/platform'` for native vs web branches.
- Plugins via `@capacitor/*`; run `npx cap sync` after native-relevant changes.
- Builds: `npm run build:mobile`, `npm run build:capacitor`; run/open: `npx cap run ios|android`, `npx cap open ios|android`.

---

## Hooks

- One file per hook under `src/hooks/`, `use*` prefix.
- Prefer mirroring existing hooks (`{ data, loading, error }`, cleanup in `useEffect`, Supabase calls through shared client).
- Data fetching / effect discipline: Supabase skill + vercel-react-best-practices as needed.

---

## `src/lib` (orientation)

```
src/lib/
├── auth.ts, auth-session.ts
├── supabase.ts
├── format.ts, invoice-number.ts, recurrence.ts
└── platform/
```

Keep helpers pure where possible; explicit return types.

---

## Testing

- Vitest: `src/**/*.{test,spec}.{ts,tsx}`; setup `src/test/setup.ts`.
- Mock `@/lib/supabase` in unit tests; cover loading, error, and success paths for UI that fetches.

---

## Common tasks (checklist)

| Task | Steps |
|------|--------|
| New page | `src/pages/*Page.tsx` → `App.tsx` route → `AppLayout` nav → loading/error UX → tests |
| New hook | `src/hooks/useFoo.ts` → align return shape with siblings |
| Schema change | migration in `supabase/migrations/` → regenerate/update types → Edge Functions if API shape changes |
| Mobile feature | `src/lib/platform` + Capacitor plugin + parity checklist |

---

## Security (project checklist)

Before shipping changes that touch data or integrations:

- [ ] No API keys or service role in client or committed env samples
- [ ] Gemini / Resend only in Edge Functions
- [ ] Input validated with `zod` where user-controlled
- [ ] HTTPS in production

RLS, JWT claims, Storage policies: **Supabase skill** checklist.

---

## Debugging hints

- Supabase local: `npx supabase status`; types drift → `db push` + refresh `database.ts`
- Mobile: `npx cap sync --clean`; verify `.env` / Supabase URL on device builds
- Auth on native: `@capacitor/preferences` and session flow as implemented in `src/lib`

---

## Environment

**Vite (e.g. `.env.local`):**

```env
VITE_SUPABASE_URL=…
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=…
VITE_GOOGLE_CLIENT_ID=…
```

**Edge Function secrets (dashboard / CLI):** `RESEND_API_KEY`, `FROM_EMAIL`, `GOOGLE_GENERATIVE_AI_API_KEY`, etc.

---

## Quick reference

| Path | Role |
|------|------|
| `src/App.tsx` | Router |
| `src/lib/supabase.ts` | Client |
| `src/types/database.ts` | DB types |
| `src/contexts/AuthProvider.tsx`, `ProfileProvider.tsx` | Session / profile |
| `supabase/migrations/`, `supabase/functions/` | Schema, Edge Functions |

---

## Stack versions

Verify `package.json`

---

*Last updated: May 2026*
