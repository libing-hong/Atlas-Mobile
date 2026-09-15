# Atlas Native App: three-role delivery contract

Status: **NOT READY for user testing**.

## Ownership

| Role | Responsibility | Evidence required |
| --- | --- | --- |
| Native developer | Extend the existing Expo/React Native application; reuse approved Atlas Core business rules through scoped Mobile APIs | Reviewed code and an identified source revision |
| Logic tester | Independently exercise contracts, state transitions, cancellation, failure recovery, authentication, and data isolation | Reproducible tests, failure cases, and explicit PASS/FAIL/BLOCKED/NOT RUN results |
| User-experience reviewer | Walk the Chinese first-time-student journey and feed actionable findings back to development | Separate static review, screenshot evidence, and actual device interaction |
| Coordinator | Integrate fixes and evidence, protect production, decide release readiness | Both reviewers' results on the same candidate |

These roles are active collaborators in the current task, not permanently running background services. Review findings must be returned to development and independently rechecked; a role name is not a test result.

## Protected boundaries

- No changes to goingatlas.com, Atlas-OS web UI, main, production data, or deployment protection.
- No paid services, account upgrades, OpenAI generation calls, or production writes as part of this cycle.
- Keep the Student Preview isolated. Do not reuse or extract the user's password/session, impersonate a user, fabricate a JWT, or bypass email confirmation.
- Do not introduce a WebView wrapper, fake-success response, speculative business endpoint, or local replacement for server-owned eligibility/stage rules.
- Keep new code in a separate branch until review. Do not replace the distributed APK merely because compilation passes.

## Verified starting evidence

Mobile baseline: `13e5401a655530853d3c2b537d4f1353d2b3db11`.

Preview API deployed source: Atlas-OS `8c2c164bf256295577ed1cea2879d801d13dd879`.
Deployment: `dpl_GwUcR2eu8zLbADfN3fowe8pVPL9x`.
Branch: `integration/mobile-preview-v1`.
The inspected deployment's branch alias matches the Mobile API origin in the App.

Vercel access logs, 2026-09-15 (UTC):

- `12:53:56 GET /api/mobile/v1/current-matters 503` corresponds to the screenshot's login/home failure window.
- `12:55:51 GET /api/mobile/v1/current-matters 401` was the earlier unauthenticated diagnostic request, not proof that the user's token was rejected.
- The inspected time-window logs contain no internal exception or response error code. A 503 alone cannot distinguish preview configuration, upstream auth, or Core data failure.

The historical screenshot confirms the page displayed a request error while also claiming progress was loaded. Source inspection confirms the existing App is read-only beyond authentication, without an actionable native study-profile flow.

## First complete acceptance story

A new Chinese-speaking student creates and verifies a Preview account, logs in, sees the server-selected next action, completes a study profile, saves it, and sees both profile and next-action state survive refresh/relaunch consistently with the approved Web/Core baseline.

Current blockers:

1. Reproduce the 503 with a dedicated, normally authenticated test identity and capture the sanitized response code/request ID.
2. Identify and expose the Web/Core study-profile read/write contract in the isolated Preview. Existing four Mobile resources are GET-only; a client form alone does not complete this story.
3. Provide an Android emulator or device runner. No `adb`, emulator, or Maestro executable was found in the current PATH during initial inventory.
4. Provide a controlled test identity/mail-confirmation workflow. None was available in the current normal test environment at inventory time.

The first broken boundary blocks downstream Hosted E2E claims. Independent local regression tests can proceed but do not substitute for that boundary.

## Incremental parity roadmap

| Slice | Native user action | Shared rules/data to verify |
| --- | --- | --- |
| Authentication and study profile | Register, confirm email, recover access, edit/save profile, resume next step | Auth policy, profile validation, consent, ownership, readiness and reuse |
| School plan and applications | View requirements, choose programmes, upload materials, update application | Evidence-backed recommendations, document permissions, quota/status/ownership |
| Offer and visa | Confirm offer/final school, follow destination-specific steps | Eligibility, dependencies, saved answers, official links and bilingual copy |
| Pre-departure, arrival, settling | Continue dependent tasks and administrative guidance | Shared timing/dependency rules, state persistence, reuse of prior information |

Inspect the current approved Web/Core revision before implementing each slice. Route presence is not proof that the current production website has the same source or behavior.

## Release gates

1. Identify the same candidate revision for both reviewers.
2. Run typecheck, lint, independent contract/error/cancellation tests.
3. Complete normally authenticated Hosted tests with controlled accounts and synthetic data; verify ownership and account switching.
4. Exercise installation, cold launch without Metro, email confirmation, re-login, background/resume, interrupted network and recovery on Android.
5. Complete the Chinese first-use story; no misleading completion labels, dead-end primary actions, or untranslated system errors.
6. Record remaining unavailable features explicitly. No claim of whole-Web parity while any promised story remains missing.

Only a candidate passing the relevant Hosted and native interaction gates is eligible for another user-facing APK. Present PASS, FAIL, BLOCKED and NOT RUN separately.

## First collaboration cycle: 2026-09-15

The developer, independent tester, and experience reviewer ran a real review-and-rework cycle on the isolated Mobile branch. The experience review is a source/screenshot walkthrough, not a human participant or a native-device session.

Candidate changes:

- Accept the deployed Core contract's disabled action with a null target; still reject an enabled action without a target kind.
- Separate loading, empty, ready, unavailable, and error states. Hide stale responses across request, identity, and language changes, including transports that ignore cancellation.
- Classify errors into localized recovery instructions and keep only allowlisted server codes and UUID correlation identifiers; do not display arbitrary response bodies.
- Preserve cancellation and timeout classification when reading a response body fails.
- Send the selected language to the API; translate verified Core status and stage enums without changing business rules.
- Remove unconditional loaded-progress claims and an inert primary button. Explain the remaining read-only limitations, rather than implying that removing the button implements its missing workflow.
- Prevent repeat authentication submissions and mode changes during a request; clear stale notices and password confirmation values.

Coordinator source review used the React component checklist to check hooks, request lifecycle, accessibility labels, and explicit UI states. Independent tests found failures before fixes, including the null action contract, query/hash rejection, and response-body cancellation classification. See the testing report for executed commands, final counts, and the candidate file hashes, and the UX report for remaining findings.

This cycle does not fix or reproduce the Hosted 503 with an authenticated test user, implement a native profile write flow, establish production-Web parity, or validate an APK on Android. Those release gates remain open. No new APK was built or distributed.
