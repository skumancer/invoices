# Invoicing

Mobile-first invoicing app: customers, reusable line items, one-off and recurring invoices. Built with Vite, React, Tailwind, and Supabase. PDF download and email via Resend.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Local Supabase

```bash
npx supabase start
```

Then copy the API URL and anon key from the output (or run `npx supabase status`) into `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>
```

Create `.env.local` from the example:

```bash
cp .env.example .env.local
# Edit .env.local with the values from `npx supabase status`
```

Migrations run automatically on `supabase start`. To reset the DB: `npx supabase db reset`.

### 3. Run the app

```bash
npm run dev
```

Sign up at `/signup` (email + password). With local Supabase, you may need to confirm email in Inbucket (http://127.0.0.1:54324) or disable confirm in Auth settings.

**Login from another device (e.g. phone on same WiFi):** The app uses `VITE_SUPABASE_URL` from the machine that runs `npm run dev`. If that is `http://127.0.0.1:54321`, the other device’s browser will try to reach Supabase on *its own* localhost and you’ll see “Load failed” or a network error. Fix: run the dev server with your machine’s LAN IP for Supabase so the other device can reach it, e.g. `VITE_SUPABASE_URL=http://192.168.1.100:54321 npm run dev`, and open the app at `http://192.168.1.100:5173`. Replace `192.168.1.100` with your computer’s IP (`ifconfig` / System Settings). For cross-device testing without exposing local Supabase, use a [Supabase Cloud](https://supabase.com) project and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to that project.

### 4. Recurring invoices (Supabase Cron)

The function `public.generate_recurring_invoices()` is created by migrations. To run it on a schedule:

- **Supabase Cloud**: Enable the [Cron module](https://supabase.com/modules/cron) and add a job that runs `SELECT public.generate_recurring_invoices();` daily (e.g. `0 0 * * *`).
- **Self-hosted / pg_cron**: Uncomment the lines in `supabase/migrations/20250201000001_recurring_invoices_cron.sql`.

### 5. Send invoice by email (Resend)

Deploy the Edge Function and set secrets:

```bash
npx supabase functions deploy send-invoice-email
npx supabase secrets set RESEND_API_KEY=re_xxxx
npx supabase secrets set FROM_EMAIL=invoices@yourdomain.com
```

Use a [Resend](https://resend.com) API key and a verified domain (or `onboarding@resend.dev` for testing). The app calls the function when you click “Send by email” on an invoice; the customer’s email is used unless overridden.

## Deploy to remote Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Link and push: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your host to the project’s URL and anon key.
4. **Auth redirect URLs**: In Supabase Dashboard → Authentication → URL configuration, set **Site URL** to your app’s public URL (e.g. `https://your-app.vercel.app`). Add the same URL (and `https://your-app.vercel.app/**`) to **Redirect URLs**. Add local dev URLs if needed (e.g. `http://127.0.0.1:5173`, `http://localhost:5173`). Without this, email confirmation and password-reset links can point to the wrong host and show “load failed” when opened (e.g. on another device).
5. Deploy the Edge Function and set `RESEND_API_KEY` (and optionally `FROM_EMAIL`) in the project secrets.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview production build
