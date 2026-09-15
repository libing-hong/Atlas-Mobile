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

Deployment `dpl_5Ujk5fX2WLdT91ArC2k5qBS6tyaV` is the latest READY redeployment of the same source with both branch-only AI flags disabled. The health route was not called again. The later backend documentation-only commit is not the deployed application revision.

## Verification so far

- Independent Mobile logic suite: 92/92 passed, including 24 new request/contract cases.
- Final TypeScript, ESLint and diff checks passed after the access-denied navigation repair.
- Android Hermes export succeeded and included the native ProfileScreen and profile request. Export is not installation evidence.
- Backend full local suite: 279/279 passed; 13 profile behavior tests, lint, typecheck, UI audit and Next build passed. The literal backend test:ci command encountered the runtime's tsx IPC EPERM limitation; the same complete test set passed under Node's tsx import runner.
- Independent UX review: five interaction issues and one permission-error navigation dead end corrected. Review was source-based, not a human device session.
- A free standard public-repository Android CI job is prepared for this exact feature branch. It builds a bundled x86_64 release and checks fresh offline Chinese sign-in, registration-mode navigation and force-stop/reopen. It enters no credentials, submits no registration, uploads no APK and retains only smoke evidence for one day. Actual result must be recorded after execution.
- First real CI run `34997709876`, source `fe979353ebe14c63c18a76f47da91e0d292c5288`: all 92 tests, typecheck, lint, prebuild and Release assembly passed. Gradle completed in 8m55s. KVM preparation then failed; the emulator step was skipped and no native screen evidence exists for that run. The revised runner checks actual KVM availability before the expensive build, waits for udev rules and retains nonsecret diagnostics. It does not downgrade the requirement or weaken screen assertions.
- Second run `34999341318`, source `474e65e0f02bfd09b90159012ae9b53a23f74428`: KVM, tests and signed Release assembly passed. On API 35, a Pixel Launcher system ANR covered the already-rendered Chinese Atlas login and registration entrance. The UI dump contained only that system dialog, so the welcome-page assertion correctly failed. APK SHA-256: `40061ddbd31cc70763db02e454f09264261494cac6b5b9ea812e8f8bc89b0630`. No account data was entered; the result remains FAIL. The reviewed fixture repair recognizes only this exact system title/package/button, closes it at most once, preserves its evidence, and still requires every original App assertion. Emulator RAM is 3072M on the same standard runner.
- Third run `35001877010`, source `0b4f27c15b6c08cc0f8772d099e32ec83f435d2e`: PASS on the real API 35 x86_64 emulator. All six original assertions passed: signed bundled release, offline Chinese cold launch without Metro, registration confirmation and password-policy visibility, return to sign-in, force-stop/reopen and no observed fatal runtime errors. Actual cold-launch and registration screenshots were inspected. The emulator launcher recovery was not used (`emulatorLauncherRecovered: false`). APK SHA-256: `e585ae2b29acd3c89bd2b4950c318ce9546c8f952a94f92db37b7193166932b9`. Artifact `10411130005`, ZIP SHA-256 `458a6202219db23649d3a3a1f3f17caa99498b6afd13e58bf4556c70ff8e2430`, contains screenshots, hierarchies and sanitized smoke evidence, not an APK. No credentials were entered or account created. Later commits add only the separate authenticated test preparation and documentation; the native application source is unchanged.

## Authenticated acceptance handoff

The reviewed workflow and normal-UI Android script are committed as `b6451c361a7ba909a6cd597ecbeda886316f0844`. Credentials are restricted to two direct Python steps and removed from child-process environments. The script checks the synthetic account fixture before changing GPA, restores the original value, and reports any failed restoration explicitly. Authenticated XML stays in memory; screenshots, raw logs and account data are not uploaded. Static Python, YAML and shell checks passed; this is preparation, not proof of real authenticated Android execution.

The first hosted run `35002548097`, job `104494232465`, stopped as intended at `MISSING_TEST_CREDENTIALS` with status `BLOCKED` and exit 2. All application checks were `NOT_RUN`; SDK setup, build and emulator launch were skipped. This verifies only the missing-credential gate.

Automatic review rejected storing the test mailbox in GitHub Actions without explicit consent to that destination and workflow/collaborator access. No credential configuration was completed. See `native-profile-auth-handoff.md` for the two required secret names and the direct-entry process. The user should not repeat registration or send an Atlas password in chat.

## Approved credentials and second authenticated attempt

On 2026-09-15, the user explicitly approved the GitHub destination and automated testing purpose and authorized the coordinator to fill the encrypted settings. The normal GitHub settings UI confirmed creation of both repository secrets. No credential values are recorded here.

Run `35002548097`, attempt 2, job `104503081678`, source `b6451c361a7ba909a6cd597ecbeda886316f0844`: credential preflight, KVM, TypeScript, lint, 92 logic tests, Release build and official SDK/AVD preparation passed. The emulator startup step failed after 4 seconds with `EMULATOR_START_FAILED` (18:16:24–18:16:28 UTC). Actual login and profile checks were skipped; there was no profile mutation requiring restoration. The generic error did not identify the cause. This supersedes the earlier missing-credential blocker but does not establish authenticated acceptance.

The source review also clarified that the `home_refresh` assertion only proves that Home successfully displays its current-matter data after saving. It does not independently prove a new request revision or changed next-action calculation. GPA 85→84 should not itself be expected to change completeness or the next action.

The reviewed follow-up moves a credential-free emulator boot preflight before Gradle, terminates that preflight process before compilation, and starts a fresh emulator after the build. Only the preflight captures startup output, drains it continuously and retains at most 256 KiB in memory; it reports fixed error categories rather than raw logs. Normal startup uses DEVNULL. The actual App script and acceptance assertions are unchanged. The local execution environment became unavailable, so no new local syntax result is claimed; the hosted workflow includes Python compilation before SDK setup.

## Emulator registry diagnosis

Run `35007978918`, job `104512448528`, source `eeaa4a4ca1088bb2db62333c359a15147f875fe8`, passed credential preflight, KVM, 92 logic tests, typecheck, lint, prebuild and Python syntax validation. The new emulator preflight stopped after 2.9 seconds with `AVD_NOT_FOUND`, natural emulator exit code 1 and confirmed cleanup. Gradle and all actual App steps were skipped; no profile values were changed.

The follow-up gives avdmanager and both emulator launches the same explicit Android user, emulator and AVD registry directories. It also requires the fixed AVD's registry pointer and `emulator -list-avds` visibility to agree before trying to boot. This is an environment repair; App code, credentials handling and all authenticated acceptance assertions remain unchanged. Its result must be recorded from the next hosted run, not inferred from source review.

## AVD repair result and device-tool follow-up

Run `35008824868`, job `104515329059`, source `0e4e0050cf51fa41b9fc6a322f0c9c9fcb245257`: the AVD registry guard passed, boot preflight passed in 36.3 seconds with confirmed cleanup, Release compilation passed, and normal emulator startup passed in 32.4 seconds. APK static verification completed and produced SHA-256 `d17410f1b6cd11f265df58f64665752f2bf617bd807a30dd2b7db148f2bfdf29`.

The actual App step failed after one second with `ADB_OPERATION_FAILED` before the grouped `release_package` check could be marked complete. That grouped check includes device preparation and installation, so its NOT_RUN status does not mean APK static verification was skipped. Only credential preflight was marked PASS; login and all profile operations were NOT_RUN. No GPA write or restoration occurred.

Source review found that startup uses the SDK's absolute adb path, while App preparation and workflow cleanup used bare `adb` from PATH. A PATH failure is a strong candidate, not a proven exception cause from the generic log. The follow-up makes all three use the same official SDK binary and fixed emulator port, validates the executable, and adds allowlisted failure reason, phase and return code without command arguments or raw output. Original business assertions and credential restrictions remain intact. A new hosted run is required to establish the outcome.

## Device connection fixed; login control automation follow-up

Run `35011034116`, job `104522732084`, source `9b15c1a496b2755ded850e13775e5501df4df7d3`: SDK setup, both emulator starts, Release assembly, APK verification and device preparation/install passed. APK SHA-256: `026c9637ae7c9f201ab7f9eed5b9ef4d05cba48f76dceddb61fedb49fb42bb1b`. The App step ran for 103 seconds and returned `UI_ELEMENT_NOT_FOUND`, phase `APP_FLOW`, reason `NONE`. Credential preflight, grouped release-package preparation and emulator-session cleanup were PASS. Login completion, account identity and every profile/GPA operation remained NOT_RUN. No profile mutation required restoration. NOT_RUN here means no passing result was recorded, not that the login function was never entered.

After the usage interruption, the local runtime and the retained anonymous XML became available again. The actual anonymous API 35 XML confirms that the existing email/password selectors match, and that the password input is secure. It also exposes a real selector defect: the login text child is enabled while its containing Button is disabled. The revised tap locator resolves the interactive ancestor and validates that actual control; text-only wait assertions are unchanged.

Official AOSP `android-15.0.0_r1` source review found that InputMethodService's `mIsInputViewShown` can retain a stale value after the window is hidden. The old helper mixed it with current IMMS `mInputShown` using an any-true search. The revised helper requires the unique current IMMS `mInputShown` line before `mStartInputHistory`, sends BACK only once when true, and confirms false within a bounded wait. Unknown or ambiguous state fails rather than sending another BACK. This is a concrete automation defect; the old generic failure does not establish which control failed in that run.

Six local Python regression checks passed for stale/history flags, malformed/ambiguous state, no BACK while hidden, a single confirmed hide, no second BACK when uncertain, and the disabled-button parent. Matching the three auth controls and rejecting the disabled login button was also checked against the retained real anonymous XML. Fixed login/account/profile phase diagnostics contain no credential or UI values. The hosted workflow runs the regressions before emulator setup; actual authenticated acceptance still requires a new hosted result. App source, business assertions, credential isolation and GPA restoration logic are unchanged.

Source references: [IMMS dump boundaries](https://github.com/aosp-mirror/platform_frameworks_base/blob/android-15.0.0_r1/services/core/java/com/android/server/inputmethod/InputMethodManagerService.java#L6085), [live visibility field](https://github.com/aosp-mirror/platform_frameworks_base/blob/android-15.0.0_r1/services/core/java/com/android/server/inputmethod/ImeVisibilityStateComputer.java#L606), [IME hide behavior](https://github.com/aosp-mirror/platform_frameworks_base/blob/android-15.0.0_r1/core/java/android/inputmethodservice/InputMethodService.java#L3269).

## Authenticated native profile acceptance — PASS

Run [35025648608](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35025648608), job `104571902678`, source `f99fe12ed701648cd19f7dc2ec19fb2df0333790`: **17/17 original acceptance checks PASS** on the Android API 35 x86_64 emulator. The normal Android UI sequence ran from 21:40:26 to 21:48:52 UTC (506 seconds). Both the coordinator and independent logic tester parsed and checked the fixed-field result.

The signed bundled APK installed and launched, the designated account logged in, account identity and the synthetic fixture matched, the native profile loaded and saved GPA 85→84, Home displayed current-matter data after save, and a cold restart read back the saved value. Invalid graduation year 1900 was rejected and did not persist. The test restored GPA 85 and the original graduation-year state, signed out and back in, read the restored profile again, performed final sign-out and removed the emulator's App session. No manual or privileged data restoration was needed.

APK SHA-256: `45f4f9ffe0e96f62f9465871f5316608620adcdc5911dac2180c39c6d5638477`. Machine-readable allowlisted evidence: `2026-09-15-authenticated-profile-pass.json`. No APK, credential, authenticated screenshot, raw UI hierarchy or account log is distributed with this report. The native application source is unchanged from the previously accepted anonymous launch; the later changes repair the separate automation and record evidence.

This accepts the native profile story against the dedicated backend Preview of source `cb85fcbcaeef3c9cce35c00e0044239ff5019ac1`. It does not accept all Web features or prove ARM installation. The Home check establishes ready current-matter display after saving, not an independently observed request revision or changed next action. The final result explicitly leaves cross-user isolation, registration-email delivery, recommendations, full documents/applications/journey and physical ARM-device checks NOT_RUN.

## Phone APK candidate configuration

The phone APK workflow still referenced the previous integration API while the new profile tests use the dedicated profile branch. The candidate workflow is corrected to the new exact API origin and restricted to manual runs on this feature branch in the public repository. No phone APK build or upload was invoked. Its artifact-upload step remains, so a future manual run is an internal candidate build, not a private distribution mechanism or automatic approval.

Before handing over a phone APK, separately verify the accepted source revision, ARM libraries, package/version metadata, embedded bundle and signature. The source version is still 0.1.0 without an explicit Android versionCode. Two retained older APKs were independently verified with official Android tools: both use the same package, versionCode 1 and signing certificate; see `2026-09-15-previous-apk-identity.md`. The installed phone package and the next final candidate have not been compared, so an in-place upgrade is not promised. Full business parity remains unfinished.

## Unpassed gates

Profile authenticated GET/PUT, save/reopen persistence and sign-out/sign-in readback are accepted by the real native run above. Forced token expiry, switching between distinct accounts, cross-user isolation, registration-email delivery, ARM phone installation, and the full school/application/material/visa/journey story remain unaccepted. The accepted profile story does not stand in for these checks. Pending profile facts are read-only, and other unfinished native actions remain explicitly unavailable.

The final source-based UX inventory confirms that these are also implementation gaps, not merely tests waiting to run:

| User operation | Current source evidence |
| --- | --- |
| Generate and inspect school recommendations or add target schools | `features/current-matters/CurrentMatterShell.tsx` connects only `OPEN_PROFILE`; no school-selection route exists. |
| Create an application, open its details or change its stage | `features/applications/ApplicationsScreen.tsx` displays summaries without these actions. |
| Upload, capture, download or confirm materials and extracted facts | Application material counts and profile pending facts are display-only. |
| Offer, visa, departure and arrival task completion | `features/journey/JourneyScreen.tsx` displays stage/status without task actions. |
| Atlas assistant conversation | `features/atlas/AtlasScreen.tsx` keeps its conversation action disabled. |
| Resend verification, reset password and verification deep-link recovery | These flows are absent from `features/auth/SignInScreen.tsx` and `lib/auth/AuthProvider.tsx`; URL session detection is disabled. |
| Export/delete personal data and manage privacy | Account and privacy routes provide explanatory content without these operations. |
| Notifications and a language preference retained across restarts | Notifications are unavailable and `lib/i18n/I18nProvider.tsx` keeps the language in memory only. |

This iteration is limited to authentication foundations and the first native profile story. Full Web parity requires further implementation and acceptance of the operations above.

No production deployment, main merge, database migration, paid service or paid recommendation request is included in this change.
