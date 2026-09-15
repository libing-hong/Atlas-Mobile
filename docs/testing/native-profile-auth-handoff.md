# Authenticated Android acceptance: configuration handoff

This is an internal verification plan, not permission to distribute an APK.

The designated account is already confirmed in the isolated Student Preview project. Its normal Web session does not authenticate the separate Android emulator. The next test therefore needs a normal password login inside the native app; browser cookies, JWTs, administrator keys and confirmation bypasses are not substitutes.

## Before configuring credentials

Review `.github/workflows/android-profile-e2e.yml` and `scripts/android-profile-e2e.py` when available in the draft Mobile PR. The job is restricted to the public Atlas-Mobile repository's `feature/native-team-first-flow-v1` branch and standard GitHub-hosted runners. It must stop before the build when either test secret is missing.

Storing credentials in GitHub makes them available to workflows that explicitly use those secrets and to collaborators able to change those workflows. Use only the dedicated isolated test account, containing synthetic records. The user must explicitly accept that destination and purpose and enter the values directly in GitHub; do not send a password in chat. Automatic review rejected the coordinator's attempt to save even the test mailbox without that destination-specific consent, so neither credential is assumed configured.

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
