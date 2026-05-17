# Google native sign-in (Capgo Social Login)

Native iOS/Android use `@capgo/capacitor-social-login` and exchange a Google **ID token** with Supabase (`signInWithIdToken`), same as the web GIS flow.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Web OAuth client (GIS on web, `webClientId` + `iOSServerClientId` on native) |
| `VITE_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client from Google Cloud (bundle `online.sendinvoices.app`) |

Set these in `.env.production.local` / `.env.development.local` for mobile builds.

## Google Cloud Console

1. **Web client** — used by Supabase and `webClientId` (Android + server token audience).
2. **iOS client** — application type iOS, bundle ID `online.sendinvoices.app`. Copy client ID → `VITE_GOOGLE_IOS_CLIENT_ID`.
3. **Android client** — package `online.sendinvoices.app`, SHA-1 from `./gradlew signInReport` (debug + release / Play App Signing as needed).

Supabase **Authentication → Providers → Google** must use the same Google project and accept ID tokens from these clients.

Register **both** the web and iOS client IDs in Supabase (comma-separated; web client first).

### Nonce / “Nonces mismatch” (required for native)

Enable **Skip nonce check** on the Google provider in the [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/providers?provider=Google). Supabase recommends this for native iOS Google Sign-In.

The app does **not** send a `nonce` to `signInWithIdToken` on native. If you pass a client nonce while the ID token contains a different one (Google’s SDK), Supabase returns **Nonces mismatch** even with skip enabled for the “missing nonce” case.

For local Supabase, set `skip_nonce_check = true` under `[auth.external.google]` in `supabase/config.toml`.

## iOS: Info.plist URL scheme

Add a **second** URL scheme for Google Sign-In (reversed iOS client ID). For client ID `123456-abc.apps.googleusercontent.com`, the scheme is:

`com.googleusercontent.apps.123456-abc`

In [ios/App/App/Info.plist](../ios/App/App/Info.plist), add under `CFBundleURLTypes` (keep the existing `online.sendinvoices.app` deep-link entry):

```xml
<dict>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_SUFFIX</string>
  </array>
</dict>
```

[AppDelegate.swift](../ios/App/App/AppDelegate.swift) already forwards URLs to `GIDSignIn`.

## Android: MainActivity

[MainActivity.java](../android/app/src/main/java/online/sendinvoices/app/MainActivity.java) implements `ModifiedMainActivityForSocialLoginPlugin` per [Capgo Android docs](https://capgo.app/docs/plugins/social-login/google/android/).

Use a **Google Play** system image emulator and sign in to the Play Store on the device before testing.

## Verify

- `npm run build:mobile:dev` then run on iOS/Android
- Login → **Continue with Google** → lands on `/invoices`
- Web login still uses GIS (unchanged)
