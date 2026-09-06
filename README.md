# Atlas Mobile V0.1

Independent Expo / React Native client for Atlas OS. **Foundation only; offline by default.**
No business requests, fabricated user data, AI calls, production credentials, or backend changes.

## Screens

Five tabs: Home (Current Matter shell), Applications (list shell), Journey (eight section labels), Atlas (assistant entry), Account (user shell, language, privacy, sign out, version).
Sign-in and Privacy are separate stack routes. Unknown routes have a recovery screen.
Continue and assistant actions are visibly unavailable until real services exist.

## Structure

```text
app/
  _layout.tsx             # provider, session restoration, protected routes
  (auth)/                # sign-in stack
  (tabs)/                # Home | Applications | Journey | Atlas | Account
  privacy.tsx
  +not-found.tsx
components/              # design tokens, basic UI, remote states, display status
features/
  auth/ home/ current-matters/ applications/ journey/ atlas/ account/
lib/
  config/                # validated public configuration, reviewed target policy
  auth/                  # session lifecycle and UI state
  supabase/              # lazy mobile client and secure storage adapter
  api/                   # transport, errors, latest-token injection
types/                   # discriminated remote states; unknown contract placeholder
assets/                  # reserved brand assets
tests/                   # config and transport boundary tests
docs/                    # architecture, proposed contracts, verification limits
.github/workflows/       # GitHub-hosted validation
```

## Running in a development environment

Node 22.13+ and npm are required. Dependencies are pinned and package-lock.json is committed.
This delivery was authored through GitHub APIs; no project files were created on the user's computer.
The commands below are for a future developer environment, including a cloud checkout.

```sh
npm ci
npm start
npm run android
npm run ios
```

No environment file is required for the offline foundation. See .env.example.
Use EXPO_PUBLIC_APP_ENV=development or preview. The production value deliberately fails configuration validation.

The reviewed non-production Supabase target list is empty. Merely setting environment variables cannot enable an unreviewed server. Before preview authentication, Atlas Core must confirm a separate non-production project; its HTTPS origin must be added to lib/config/policy.ts in a reviewed change and paired with a publishable key. Never enter production configuration here.
Business API transport remains disabled independently of authentication.

## Architecture

Routes are thin adapters to feature screens. Features render server-owned state; they do not compute recommendations, application statuses, journey dependencies, permissions or staff roles.
RemoteState distinguishes unavailable, loading, empty, error and ready. Unavailable does not imply the user has no records.
StatusBadge takes an already-decided label and semantic tone, with no application status mapping.

AuthProvider owns restoration, auth event subscriptions, foreground refresh and local sign out.
Native SecureStore persists sessions; storage failures surface as an error instead of pretending the user signed in.
Protected routes are a navigation affordance only. Atlas Core must validate bearer tokens and enforce its existing authorization and RLS.
The offline foundation exposes only data-free shells and has no synthetic session.

The API helper injects the latest session token per request, restricts paths to the same HTTPS mobile API origin, refuses redirects, supports cancellation/timeouts, requires a decoder for unknown JSON and returns sanitized errors.
No feature imports or calls the API singleton in V0.1.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run config:check
npm run check:android
npm run check:ios
npx expo prebuild --no-install --platform all
```

GitHub Actions runs these checks on pull requests and main. Android/iOS export verifies their Metro bundles; prebuild checks native configuration generation. These are **not** signed native builds, emulator sessions or device tests.
Read [verification limits](docs/verification.md) before release.

## Handoff

- [Architecture and security boundaries](docs/architecture.md)
- [Proposed Atlas Core API contracts](docs/mobile-api-contracts.md)
- [Verification and device checklist](docs/verification.md)

Atlas-OS was inspected read-only. Its default branch had no src/app/api/mobile/v1 routes at inspection; no Atlas-OS files, migrations, production settings or protected recommendation code were changed.
