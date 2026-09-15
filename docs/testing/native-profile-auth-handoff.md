# Authenticated Android acceptance: configuration handoff

This is an internal verification plan, not permission to distribute an APK.

The designated account is already confirmed in the isolated Student Preview project. Its normal Web session does not authenticate the separate Android emulator. The next test therefore needs a normal password login inside the native app; browser cookies, JWTs, administrator keys and confirmation bypasses are not substitutes.

## Before configuring credentials

Review `.github/workflows/android-profile-e2e.yml` and `scripts/android-profile-e2e.py` when available in the draft Mobile PR. The job is restricted to the public Atlas-Mobile repository's `feature/native-team-first-flow-v1` branch and standard GitHub-hosted runners. It must stop before the build when either test secret is missing.

Storing credentials in GitHub makes them available to workflows that explicitly use those secrets and to collaborators able to change those workflows. Use only the dedicated isolated test account, containing synthetic records. The user must explicitly accept that destination and purpose. Prefer direct user entry in GitHub; an explicitly authorized coordinator may fill the encrypted settings form. Do not request passwords in chat or record values in code, documentation or diagnostics.

The initial coordinator attempt was rejected before destination-specific consent. On 2026-09-15, the user explicitly approved this use and asked the coordinator to fill both entries. Both repository secrets were then saved through the normal authenticated GitHub settings UI, which confirmed their creation. The previously blocked run `35002548097` was rerun against the unchanged reviewed source `b6451c361a7ba909a6cd597ecbeda886316f0844`. Credential readiness is confirmed; the final native acceptance result is tracked separately in `2026-09-15-native-profile-verification.md`.

After accepting this use, add these repository secrets under Settings → Secrets and variables → Actions:

| Secret name | Value |
| --- | --- |
| `ATLAS_PREVIEW_TEST_EMAIL` | The designated, email-confirmed Student Preview test account |
| `ATLAS_PREVIEW_TEST_PASSWORD` | That account's Atlas login password, not its email-provider password |

The test supports only credentials that the standard emulator keyboard can enter exactly. It must stop before typing if a character is unsupported. It must never change the password or install an unreviewed keyboard.

## Intended native checks

The script normally signs in, opens the native study profile, and first verifies the exact synthetic fixture prepared through the Web UI: fictional institution, GPA 85 and intake year 2027. It then changes only the GPA to 84, confirms the save, returns Home, force-stops and relaunches the app, and verifies the value persisted. It exercises an invalid graduation year, restores the original GPA and unchanged saved year, and checks sign-out and re-login. A failure to restore must be reported explicitly, never counted as success.

Only constant check names, source revision, APK hash and sanitized failure categories may leave the runner. Do not persist or upload authenticated screenshots, XML, raw logcat, account data or credentials. The workflow must not register another account, send mail, call recommendation generation, use privileged credentials, fabricate sessions or mutate another user's records.

Cross-user isolation and the full recommendation/application/material/visa/journey flow remain separate unpassed gates. Passing this script establishes only the stated single-account profile story.

## Current result

The authorized configuration and native profile acceptance are complete for this iteration. Run [35025648608](https://github.com/libing-hong/Atlas-Mobile/actions/runs/35025648608), source `f99fe12ed701648cd19f7dc2ec19fb2df0333790`, passed all 17 original checks. GPA was restored and checked after signing in again; final sign-out and emulator-session cleanup passed. No further credential entry, new registration or corrective data restoration is required for this completed run. The remaining product and phone-delivery gates are recorded in `2026-09-15-native-profile-verification.md`.
