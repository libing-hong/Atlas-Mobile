# Native first-profile verification — 2026-09-15

Status: internal candidate. Do not distribute as an accepted user-test APK.

## Confirmed hosted Web baseline

The designated test account exists and is email-confirmed in the isolated Student Preview project. The corrected immutable Web Preview at `atlas-os-preview-iqug68xeh-libing-hongs-projects.vercel.app` displayed the Chinese dashboard and profile form under a real signed-in browser session.

Normal visible Web controls saved synthetic education facts, then GPA, target degree, country, field and intake year. Reload preserved the values: completeness progressed from 25% to 75%, with the next profile priority changing to language information. Entering an invalid year (1800) produced the validation alert; reload restored the previously saved year (2027). No recommendation generation was submitted. No password, browser session token, real study records or unrelated user data was collected.

## Native implementation

Added a protected native profile route and Chinese/English three-step form, review page and explicit draft save. Enabled profile actions on Home, Account and explicit PROFILE_REQUIRED errors. The API accepts only the complete approved profile snapshot, binds writes to the editor's signed-in account and reads canonical values and completeness from the server. Home, Account, Journey and Applications resources refresh after confirmed saves.

Draft inputs remain available after validation or failed saves. An ambiguous network outcome requires reading and comparing the server version before another write. Leaving a page with an unresolved save does not imply the server write was cancelled. Unsaved-change confirmation remains visible even when a refreshed request returns 401/403. Language errors retain row numbers, unknown existing choices remain visible, and notices scroll into view.

The backend companion is the Atlas-OS native profile patch based on `8c2c164bf256295577ed1cea2879d801d13dd879`. The currently deployed API does not yet include this new route. The frontend alone does not complete hosted native acceptance.

## Verification so far

- Independent Mobile logic suite: 92/92 passed, including 24 new request/contract cases.
- Final TypeScript, ESLint and diff checks passed after the access-denied navigation repair.
- Android Hermes export succeeded and included the native ProfileScreen and profile request. Export is not installation evidence.
- Backend full local suite: 279/279 passed; 13 profile behavior tests, lint, typecheck, UI audit and Next build passed. The literal backend test:ci command encountered the runtime's tsx IPC EPERM limitation; the same complete test set passed under Node's tsx import runner.
- Independent UX review: five interaction issues and one permission-error navigation dead end corrected. Review was source-based, not a human device session.
- A free standard public-repository Android CI job is prepared for this exact feature branch. It builds a bundled x86_64 release and checks fresh offline Chinese sign-in, registration-mode navigation and force-stop/reopen. It enters no credentials, submits no registration, uploads no APK and retains only smoke evidence for one day. Actual result must be recorded after execution.

## Unpassed gates

Actual Android release execution, authenticated native GET/PUT, save/reopen persistence, token expiry and account switching on device, cross-user isolation, ARM phone installation, and the full application/material/visa/journey story remain unaccepted. Synthetic transport tests and authenticated Web autosave do not stand in for these checks. Pending profile facts are read-only, and other unfinished native actions remain explicitly unavailable.

No production deployment, main merge, database migration, paid service or paid recommendation request is included in this change.
