# Native first-profile verification — 2026-09-15

Status: internal candidate. Do not distribute as an accepted user-test APK.

## Confirmed hosted Web baseline

The designated test account exists and is email-confirmed in the isolated Student Preview project. The corrected immutable Web Preview at `atlas-os-preview-iqug68xeh-libing-hongs-projects.vercel.app` displayed the Chinese dashboard and profile form under a real signed-in browser session.

Normal visible Web controls saved synthetic education facts, then GPA, target degree, country, field and intake year. Reload preserved the values: completeness progressed from 25% to 75%, with the next profile priority changing to language information. Entering an invalid year (1800) produced the validation alert; reload restored the previously saved year (2027). No recommendation generation was submitted. No password, browser session token, real study records or unrelated user data was collected.

## Native implementation

Added a protected native profile route and Chinese/English three-step form, review page and explicit draft save. Enabled profile actions on Home, Account and explicit PROFILE_REQUIRED errors. The API accepts only the complete approved profile snapshot, binds writes to the editor's signed-in account and reads canonical values and completeness from the server. Home, Account, Journey and Applications resources refresh after confirmed saves.

Draft inputs remain available after validation or failed saves. An ambiguous network outcome requires reading and comparing the server version before another write. Leaving a page with an unresolved save does not imply the server write was cancelled. Unsaved-change confirmation remains visible even when a refreshed request returns 401/403. Language errors retain row numbers, unknown existing choices remain visible, and notices scroll into view.

The backend companion is Atlas-OS draft PR #43, commit `cb85fcbcaeef3c9cce35c00e0044239ff5019ac1`, based on `8c2c164bf256295577ed1cea2879d801d13dd879`. Its dedicated Preview branch has the six reviewed configuration values bound to the isolated Student Preview project. Deployment `dpl_BfBRRLouqSbY2XaNvuyupD8jDXzz` became READY with the profile route; a missing-token request returned 401, which is not proof of authenticated environment or data access. The new branch origin is separately allowlisted as an exact pair in Mobile and used by internal smoke CI. The frontend alone does not complete hosted native acceptance.

The legacy Preview health route returned 500 `preview_catalog_import_failed`. Source inspection found that this GET can import catalog rows before checking counts, so it must not be repeated as a read-only diagnostic. A failure does not establish whether partial import writes occurred. No recommendation generation was called. Both AI generation flags were overridden to false only for the new branch. Profile and current-matters do not depend on this catalog import path; catalog readiness remains a separate unresolved gate.

## Verification so far

- Independent Mobile logic suite: 92/92 passed, including 24 new request/contract cases.
- Final TypeScript, ESLint and diff checks passed after the access-denied navigation repair.
- Android Hermes export succeeded and included the native ProfileScreen and profile request. Export is not installation evidence.
- Backend full local suite: 279/279 passed; 13 profile behavior tests, lint, typecheck, UI audit and Next build passed. The literal backend test:ci command encountered the runtime's tsx IPC EPERM limitation; the same complete test set passed under Node's tsx import runner.
- Independent UX review: five interaction issues and one permission-error navigation dead end corrected. Review was source-based, not a human device session.
- A free standard public-repository Android CI job is prepared for this exact feature branch. It builds a bundled x86_64 release and checks fresh offline Chinese sign-in, registration-mode navigation and force-stop/reopen. It enters no credentials, submits no registration, uploads no APK and retains only smoke evidence for one day. Actual result must be recorded after execution.
- First real CI run `34997709876`, source `fe979353ebe14c63c18a76f47da91e0d292c5288`: all 92 tests, typecheck, lint, prebuild and Release assembly passed. Gradle completed in 8m55s. KVM preparation then failed; the emulator step was skipped and no native screen evidence exists for that run. The revised runner checks actual KVM availability before the expensive build, waits for udev rules and retains nonsecret diagnostics. It does not downgrade the requirement or weaken screen assertions.
- Second run `34999341318`, source `474e65e0f02bfd09b90159012ae9b53a23f74428`: KVM, tests and signed Release assembly passed. On API 35, a Pixel Launcher system ANR covered the already-rendered Chinese Atlas login and registration entrance. The UI dump contained only that system dialog, so the welcome-page assertion correctly failed. APK SHA-256: `40061ddbd31cc70763db02e454f09264261494cac6b5b9ea812e8f8bc89b0630`. No account data was entered; the result remains FAIL. The reviewed fixture repair recognizes only this exact system title/package/button, closes it at most once, preserves its evidence, and still requires every original App assertion. Emulator RAM is 3072M on the same standard runner.

## Unpassed gates

Actual Android release execution, authenticated native GET/PUT, save/reopen persistence, token expiry and account switching on device, cross-user isolation, ARM phone installation, and the full application/material/visa/journey story remain unaccepted. Synthetic transport tests and authenticated Web autosave do not stand in for these checks. Pending profile facts are read-only, and other unfinished native actions remain explicitly unavailable.

No production deployment, main merge, database migration, paid service or paid recommendation request is included in this change.
