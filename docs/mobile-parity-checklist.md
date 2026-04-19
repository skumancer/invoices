# Mobile Parity Checklist (Capacitor)

Use this checklist before internal/external release builds.

## Auth

- [ ] Email/password login works on iOS and Android
- [ ] Signup flow completes and redirects correctly
- [ ] Password reset email opens app and reaches `/reset-password`
- [ ] Google sign-in works through native browser OAuth flow
- [ ] Logout clears session and returns to `/login`

## Core Data Flows

- [ ] Customers list loads
- [ ] Create/edit/delete customer works
- [ ] Items list loads
- [ ] Create/edit/delete item works
- [ ] Invoices list loads
- [ ] Create/edit invoice works
- [ ] Invoice detail renders full totals and line items correctly

## Recurring + Assistant + Email

- [ ] Recurring invoice fields save and display properly
- [ ] Stop recurrence action updates invoice state
- [ ] Assistant panel can draft invoice content
- [ ] Send invoice email action succeeds from invoice detail

## PDF and Native Device Behavior

- [ ] Invoice PDF generation succeeds on iOS
- [ ] Invoice PDF generation succeeds on Android
- [ ] Native share sheet opens with generated PDF file
- [ ] App handles offline state visibly and reconnects cleanly

## Release Gate

- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build:mobile:prod` (or `npm run build:mobile`) passes
- [ ] `npx cap sync` generates no unexpected native diffs

## Debugging Non-Minified Mobile Bundles

- Local non-minified build (Xcode reads from `dist`):
  - Run `npm run build:mobile:dev`
  - Build/run from Xcode
  - Development mode now emits sourcemaps and skips minification to improve stack traces
- Live reload against Vite dev server (best debugging experience):
  - Run `npm run dev -- --host`
  - Run `CAPACITOR_SERVER_URL=http://<your-mac-lan-ip>:5173 npm run cap:dev:ios`
  - Keep `<your-mac-lan-ip>` reachable from simulator/device network
