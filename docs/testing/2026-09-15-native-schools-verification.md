# Native school plan and application flow

Status: NOT READY for phone distribution. Authenticated Android empty-school-plan read-only acceptance passed; application-creation acceptance remains NOT RUN.

## Current persisted candidate

Mobile source: `30a6ea21fecdaa4cca782de2f2139e03e8a8d786`, draft [Atlas-Mobile PR #5](https://github.com/libing-hong/Atlas-Mobile/pull/5).

[Mobile foundation run 35033339899](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35033339899) completed successfully for this exact source after the Expo patch correction: clean install, TypeScript, lint, all 113 tests, online Expo configuration/dependency validation, Android and iOS bundle exports, and both native prebuilds. This resolves the previous dependency gate; it is not an on-device iOS acceptance result.

[Android school-plan read run 35033336540](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35033336540), attempt 1, completed successfully. Job `104596678952` and its normal Android login/read step both succeeded. The final report at `2026-09-15T23:12:23.8492621Z` records **13/13 PASS** and **8 NOT_RUN**. The independent test reviewer re-fetched the run metadata, job status and allowlisted report on 2026-09-17 and matched the exact source above and APK SHA-256 `0f91aebf29ebada6c0a62ab59291e494898370579bbeb2f9405c2ddf506da54d`. See the [safe JSON evidence](2026-09-15-authenticated-school-read-pass.json). Later documentation-only commits do not change the tested app.

At the 2026-09-17 evidence checkpoint, the user has explicitly approved saving the existing Student Preview service key to the Vercel configuration for `feature/native-school-applications-v1` only. Production remains outside this authorization. The coordinator is handling that configuration; the key has not yet been saved or its branch binding verified at this checkpoint. Approval is obtained, so pending configuration must not be described as pending user permission. This prerequisite blocks live application-creation acceptance, not the completed read-only Android run.

The Supabase browser session has been restored through its secure GitHub sign-in. Vercel displays a new account-level 2FA setup prompt. Automatic approval review rejected the action to skip that prompt because declining account security setup is outside the test-secret authorization. No workaround was attempted; the existing key remains unrevealed and unsaved. The account owner needs to handle that security prompt before the authorized configuration can continue. No new deployment or database write occurred at this checkpoint. A fresh read-only query still found one designated test account and zero recommendations, discoveries and applications for it.

## Implemented scope

Native Chinese/English school-plan list, programme details, evidence and eligibility comparison, owned selection submission, duplicate/readback recovery, application detail with Core next step, and navigation from Home/My applications. No AI generation, external school submission, material upload or new service purchase is invoked.

The backend is the stacked draft Atlas-OS PR #44, source d7dcbb6b1ec1bea9d1f293d9fcc011c41bee1914. It shares existing Web selection/material initialization and Core decisions. Native selection deliberately requires the intersection of Web reader visibility and action eligibility; existing Web differences are recorded in its audit document.

## Independent review

Three roles reviewed development, logical behavior and Chinese first-use experience. The experience review was a source review, not a human or device session. Its fixes include explicit empty states/exits, per-field evidence labels, accurate retrieval timestamps, eligibility-not-admission wording, preserving uncertain additions through same-owner token refresh, and keeping account changes isolated.

Application creation uses a fixed selection DTO and a verified account binding. Unknown writes require a readback before another attempt. A failed membership read cannot confirm absence. Existing application state/evidence is never overwritten by duplicate selection.

## Local evidence

- Mobile: 113/113 Node tests, including 21 independently written mutation/DTO tests, pass.
- Mobile ESLint and TypeScript pass.
- The local `npm test` CLI encounters the same runtime IPC restriction; all 113 tests pass using `node --import tsx --test tests/*.test.ts`, also passed on the standard GitHub runner.
- Android automation regressions: 12/12 pass (6 keyboard/button cases plus 6 actual startup-context boundary cases); read-only script syntax and credential boundary reviewed.
- Backend: 295/295 complete tests pass; lint, TypeScript, UI audit and Next production build pass.
- The exact backend test:ci command reaches tsx CLI IPC and is blocked by runtime EPERM. The identical test tsconfig and complete original test globs pass via node --import tsx, without skipped tests.

Local controller tests do not prove React lifecycle behavior on Android or live cross-user isolation.

## Hosted baseline and required configuration

Read-only Student Preview inspection confirmed exactly one designated test account and zero recommendations, discoveries, recommendation runs and applications for that account. No records were seeded, AI invoked or user profile altered during this story.

Actual applications grants are SELECT=true and INSERT/UPDATE/DELETE=false for authenticated. These grants remain intact. The backend uses a narrow server-only capability after JWT ownership/visibility checks. Its configured service JWT must bind to efvpndayardwjqtwtdmx; missing/mismatched keys fail closed. The new branch has eight public Preview-only configuration entries, with both AI flags false, and automatic Git deployment disabled. A dedicated server-secret binding is not yet verified.

Backend Preview deployment `dpl_C78fq37VcKdF3n7n7HPB1S8PqCMj` is READY for the exact backend source above. Anonymous requests to the recommendations, applications and application-detail routes each returned 401 UNAUTHENTICATED. This only verifies their unauthenticated boundary.

The first Android run, [35032265963](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35032265963), source `461b6369479946803e010ebe522c37c88a226c8f`, passed credentials preflight, code checks and SDK setup but stopped at emulator preflight with CONFIG / INVALID_CONTEXT. The shared startup helper still required the previous profile branch. No APK was built and no UI login ran. The follow-up explicitly selects the exact new branch while retaining the old default and refusing unknown branches, injected credentials, wrong refs and private repositories.

Run [35032689657](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35032689657), source `664ca082580b6b442beb85611c8d636724911116`, passed emulator preflight and reached the native build. It was deliberately cancelled before UI acceptance when the companion foundation run found that Expo's current compatibility metadata requires patch 57.0.23 instead of pinned 57.0.22. The dependency gate is preserved and now also runs before the Android build. App source and dependency changes trigger fresh Android acceptance; documentation-only changes do not. This cancelled run is not a PASS.

The patch correction updates only Expo 57.0.23 and its required CLI 57.0.25, router-server 57.0.10 and babel-preset-expo 57.0.12 lock entries. React Native, React and unrelated dependencies remain pinned. This corrected candidate now has its own successful foundation and Android read-only results above; those results do not establish application-creation acceptance.

## Acceptance boundary

The new Android script tests normal UI login, account identity, Chinese/English empty application and school-plan states, return navigation, cold restart, final sign-out and emulator-session removal. It does not seed data or write business records. Only allowlisted result JSON is persisted; no authenticated screenshots, UI XML, credentials or raw logs are published.

The 13 passing checks are credential preflight, bundled release verification, Android login, account identity, Chinese empty applications, Chinese empty school plan, return to applications, English empty applications, English empty school plan, restoring Chinese, cold-start school-plan readback, final sign-out and emulator-session removal. These are actual emulator UI results, not an extrapolation from local controller tests.

The report explicitly retains these eight unexecuted checks:

| Check | Result |
| --- | --- |
| Add application | NOT_RUN |
| Duplicate application persistence | NOT_RUN |
| Application detail | NOT_RUN |
| Same-user token refresh during a pending write | NOT_RUN |
| Cross-user isolation | NOT_RUN |
| Real school quality | NOT_RUN |
| Material upload | NOT_RUN |
| Physical ARM device | NOT_RUN |

Hosted partial initialization and write-result recovery also remain unverified. An empty-plan PASS must never be reported as application-creation acceptance or full Web parity. The app remains NOT READY for distribution.

Do not redistribute a previous APK as this candidate. The eventual release needs its exact bundle, signature, package/version upgrade behavior and artifact hash verified after the relevant business flows pass.
