# Mobile foundation architecture

## Scope and data ownership

Expo SDK 57, React Native 0.86, TypeScript strict mode and Expo Router.
The app is a mobile client, not a fork of Atlas business logic.
The five tabs have clear hierarchy, safe-area handling, scrollable content, system text scaling, labeled inputs and 48-point minimum action targets.
Colors mirror the semantic palette observed in Atlas-OS's globals.css; no Web components were copied.

Home prioritizes a single Current Matter. Journey displays only the eight navigation labels supplied in the brief. There is no current-stage inference, progress calculation, dependency resolution or fake application fixture.
Applications uses the reusable unavailable state; loading, empty and error components are available for approved future data sources.
Account language currently states English with future localization clearly marked; it does not claim to save an unsupported preference.

## Authentication

States: foundation, restoring, signed-out, signed-in, error.
Foundation is a public data-free preview with session=null.
Configured preview auth uses the existing Supabase Auth identity model; Mobile creates no new identity database.

1. Lazy client creation only after approved non-production configuration.
2. Subscribe to auth events and restore a saved session without overwriting a newer event.
3. Show restoration or error UI before deciding route guards.
4. Email/password sign-in architecture via Supabase Auth; inputs disabled in foundation.
5. Supabase refresh with processLock; foreground AppState starts refresh and background stops it.
6. Unmount cleans listeners and refresh work.
7. Local sign out clears the current device session and protected navigation history; other devices are not intentionally signed out.

Tokens are stored by Expo SecureStore. Persisting large sessions may fail on some native versions: errors must remain visible, and actual large-session persistence must be tested before preview auth is enabled. No plaintext fallback is used.
OAuth, password reset, registration, biometric protection and deep-link token exchange are deferred; no implicit token parsing is implemented.
Client session state is never proof of authorization. Core must verify token issuer, audience, signature, expiry and ownership; staff permissions remain server-controlled.

## Configuration

Environment names: development, preview, production. Production is recognized and rejected at both Expo config evaluation and runtime.
Only exact approved HTTPS Supabase origins can initialize auth; the list is deliberately empty.
Only sb_publishable_ keys are accepted, excluding legacy JWT keys and server keys. URLs reject embedded credentials, paths, queries and fragments.
No target approval can be bypassed with a public environment flag.
Business API URL configuration is rejected while contracts are unapproved.
There are no production deployments, database connections, OpenAI clients or direct table queries.

## Transport

createApiClient is a dependency-injected transport abstraction. Its tests use in-memory Response objects only; these are test fixtures, not app data flows.
The app singleton is disabled, with a reserved .invalid origin.
Future enablement requires reviewed source changes and a confirmed non-production origin, not an environment switch.
GET-only scope is intentional for Phase 1. Each request retrieves a fresh auth token; there is no automatic mutation or retry.
No caller-provided headers override authentication.
Redirects are refused to avoid forwarding tokens to another origin.
Responses remain unknown until a supplied decoder validates them.
HTTP 401/403, network, timeout, cancellation and decode failures are distinct. Raw server bodies and tokens never enter UI errors.

## Atlas-OS read-only findings

Inspected the default migration/ui-parity source tree on 2026-09-03. Observed route handlers for files, health, locale and preview catalog; no mobile/v1 directory.
This is repository evidence, not proof of what any deployed server exposes.
No backend or schema change is required to run the offline Foundation.
Before integration, Core owners must confirm the contracts, non-production identity target, authorization behavior and mobile-safe action navigation described in mobile-api-contracts.md.

## References

- [Expo SDK compatibility](https://docs.expo.dev/versions/latest/)
- [Expo protected routes](https://docs.expo.dev/router/advanced/protected/)
- [Supabase React Native authentication](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
