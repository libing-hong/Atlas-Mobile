# Native school plan and application flow

Status: NOT READY for phone distribution. Android empty-plan reads and the hosted synthetic application API flow passed. Android application-creation UI acceptance still requires its own run.

## 2026-09-18 hosted acceptance

The fixed new Preview deployment passed [24 authenticated/read-boundary checks](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35389861984) at mobile test source `aa0c61abdc7e377f09aa445612c5e4c27603d0dd`. Ordinary password sign-in, account binding, six resources, Chinese response language, journey consistency and local-session sign-out passed. Missing and invalid bearer tokens were refused on all six resources.

The separate [synthetic application API run](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35390591409), source `49ac849177979758778fb55fa19f9997bdf1c3b2`, passed 17 checks. It created one application through the same mobile selection route used by the app, then submitted the identical selection again. The duplicate returned the same application, with `created=false`; detail, list and plan membership readbacks agreed and the full public application DTO stayed unchanged. No request was sent to a school.

The coordinator independently confirmed one owned planning application, pending catalogue status, the expected final evidence snapshot, zero persisted materials/requirements, zero ingestion and zero journey tasks. Four virtual missing-material slots are not completed materials. This was a visibly labelled synthetic record with an `.invalid` URL, not evidence of real-school data quality. The raw evidence snapshot was checked after both POSTs, not sampled before and after the duplicate.

All five fixture row types were removed using a transaction that refused unexpected FK children. Subsequent reads confirmed zero fixture/application rows and unchanged profile/journey fingerprints. The database connector was read-only; fixture creation and cleanup used the already authenticated isolated project's SQL Editor. An initial editor replacement appended to the prior setup query; its empty-plan guard aborted without changes. Running the reviewed cleanup alone in a fresh query tab succeeded.

See [safe machine-readable evidence](2026-09-18-hosted-school-acceptance.json). Neither this API PASS nor the previous empty-plan Android PASS establishes the native write UI, physical ARM compatibility, cross-user isolation, uploads, real recommendations or full Web journey parity. The next dedicated Android workflow also runs the complete project/configuration checks against the exact new Preview origin. Its configuration is added as one exact approved origin/project pair; other origins and Production remain rejected.

## 2026-09-18 configuration recovery

The first dedicated Android write attempt, [35391445657](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35391445657), source `0fb97aaf8eb5a6b51026e0a174189ff96ff4e9f0`, passed credential preflight, KVM, TypeScript, lint and all 114 tests, including the fixed-origin pair restriction. The online Expo compatibility gate then required `expo ~57.0.24`, `expo-constants ~57.0.19` and `expo-router ~57.0.22`. It stopped before APK build, emulator login or any UI write. This is a failed build gate, not Android acceptance. The fixture was still one current synthetic discovery and zero applications when the run started.

The correction pins these three exact patches to `57.0.24`, `57.0.19` and `57.0.22`. The npm-generated lock also updates required Expo CLI/asset/metro-runtime/UI packages, plus five permitted resolver updates in the affected subtree: material-symbols `0.4.48`, xcpretty `4.4.5`, compression `1.8.2`, nanoid `3.3.19` and react-is `19.3.0`. React itself remains `19.2.3`, React Native remains `0.86.3`, and all other top-level pins stay unchanged. An isolated `npm ci --ignore-scripts` reproduced the lock. The local online Expo check encountered a proxy timeout; it is not a PASS, and the unchanged online CI gate must pass on the corrected source. The native harness changes only by a rerun comment; its Python AST is unchanged.

The approved Student Preview server key was saved successfully in Vercel as a **Secret**, scoped only to Preview branch `feature/native-school-applications-v1`. Its project and role were checked against `efvpndayardwjqtwtdmx` and `service_role` before saving. The value was not printed, committed, or included in the app. Vercel's saved row confirms the exact branch scope. Production settings, production deployments, database grants and website source were not changed.

The existing backend source `d7dcbb6b1ec1bea9d1f293d9fcc011c41bee1914` was redeployed with the updated configuration. Deployment `dpl_CRiG7zKcshuCL24GF7NAt8BoEZGR` is **READY**, target Preview, at `https://atlas-os-preview-efevbscqm-libing-hongs-projects.vercel.app`. Its existing branch alias now points to this deployment. The unauthenticated `/api/mobile/v1/me` request returned HTTP 401 `UNAUTHENTICATED` with `private, no-store` caching. This boundary check does not prove an authenticated write works.

A fresh read-only database check found one designated test account and zero applications, recommendations and discoveries for that account. The cloud-browser handoff previously failed for the owner, but the secure login subsequently completed and the configuration was saved. There is no remaining request for permission to configure this key. Authenticated post-deployment acceptance and application creation still require their own evidence.

The configuration baseline and all older sections below are historical checkpoints. The hosted acceptance section above supersedes their service-key and synthetic-write NOT_RUN entries; native UI results must still be reported separately.

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

## Remaining delivery gaps from source review

The experience reviewer identified five concrete gaps beyond the synthetic application flow. These are source findings, not a human/device experience session:

- `features/schools/SchoolPlanScreen.tsx` reads existing plans but offers no free catalogue search or generation path for a new user's empty plan. Real catalogue selection and evidence need their own end-to-end acceptance.
- `features/applications/ApplicationDetailScreen.tsx` displays materials but does not upload them. File selection, authenticated storage, replacement and next-step refresh are unverified/unimplemented in this screen.
- `features/journey/JourneyScreen.tsx` and `lib/navigation/actions.ts` do not provide the complete native Offer, visa, pre-departure and arrival action flow available on Web.
- `features/auth/SignInScreen.tsx` has sign-up/sign-in but lacks resend-verification and password-recovery UI. Expired email verification and forgotten-password recovery remain open.
- `.github/workflows/android-preview-apk.yml` still targets the older profile branch/API. It is not this candidate's delivery path; any future phone APK must bind the accepted source/backend, include ARM support, and verify signing, upgrade, cold-start and background recovery.
