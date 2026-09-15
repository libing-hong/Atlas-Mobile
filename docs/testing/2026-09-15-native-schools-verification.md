# Native school plan and application flow

Status: NOT READY for phone distribution. New authenticated Android acceptance is pending.

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

## Acceptance boundary

The new Android script tests normal UI login, account identity, Chinese/English empty application and school-plan states, return navigation, cold restart, final sign-out and emulator-session removal. It does not seed data or write business records. Only allowlisted result JSON is persisted; no authenticated screenshots, UI XML, credentials or raw logs are published.

Adding a real or clearly marked synthetic programme, duplicate persistence, detail/readback, partial initialization in the hosted environment, token refresh during an actual pending write, cross-user data isolation and ARM phone behavior remain NOT RUN. An empty-plan PASS must never be reported as application-creation acceptance.

Do not redistribute a previous APK as this candidate. The eventual release needs its exact bundle, signature, package/version upgrade behavior and artifact hash verified after the relevant business flows pass.
