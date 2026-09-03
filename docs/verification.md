# Verification

All executable checks run on GitHub-hosted runners; no local checkout or dependency installation is required for this delivery.

## Automated gates

- TypeScript with strict, noUncheckedIndexedAccess and exactOptionalPropertyTypes.
- ESLint with zero warnings.
- Boundary tests: offline/production guards, unapproved keys/origins, token injection, cross-origin paths, cancellation, timeouts and sanitized errors.
- Expo public configuration, compatible dependency versions and Expo Doctor.
- Separate Android and iOS Metro exports.
- Expo native prebuild for both platforms, without dependency installation or signing.

CI uses only public offline configuration. It must not contain Supabase, OpenAI, signing or backend secrets.
Exports and native configuration generation do not establish runtime device compatibility.
Native projects are generated only in the runner and are not committed.

## Required before preview auth activation / release

Not executed by the foundation export checks:
- Launch on iOS simulator and Android emulator/device; verify all five tabs, auth route, privacy and unknown route recovery.
- Check small screens, larger font sizes, screen reader labels, contrast, keyboard avoidance, safe areas and Android back behavior.
- With a reviewed isolated Supabase project, exercise correct/incorrect credentials, cold-start restoration, expiry/refresh, background/foreground transitions, sign out and protected deep links.
- Verify native secure persistence, large-session handling and storage failure recovery.
- Exercise airplane mode, backend timeout, 401 and 403 using approved preview integration.
- Build native binaries with the required platform toolchains, then perform device acceptance and signing separately.

No live authentication, device, signed build or production verification is claimed.
