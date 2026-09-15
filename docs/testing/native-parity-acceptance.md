# Atlas Native: independent acceptance gates

## Scope and truth conditions

Story: a Chinese student signs up or signs in, completes the same study-profile
requirements as the website, receives the same authoritative next action, performs
it in the native app, and sees the resulting state persist after restart.

Owner: `logic_tester`, independently from `native_developer`.
Base Mobile snapshot: `13e5401a655530853d3c2b537d4f1353d2b3db11`, branch
`feature/native-team-first-flow-v1`; uncommitted changes must be described by hashes.
Web reference observed by the coordinator: Atlas-OS
`8c2c164bf256295577ed1cea2879d801d13dd879`, deployment
`dpl_GwUcR2eu8zLbADfN3fowe8pVPL9x`. The integration branch is not automatically the
same code as the production website: a production parity baseline is a separate gate.

Statuses: **PASS** = actual specified check executed with evidence; **FAIL** = a
specified check executed and violated its expectation; **BLOCKED** = prerequisite
not available; **NOT RUN** = no execution evidence. Unit PASS cannot upgrade a
native, hosted, security, or full user-flow gate to PASS.

No APK is acceptable as a complete test release until every applicable P0 gate
below passes on the same immutable build. A partial milestone must explicitly
list unavailable flows and must not be presented as website parity.

## First broken hosted boundary

Coordinator provided Vercel evidence: `2026-09-15T12:53:56Z`
`GET /api/mobile/v1/current-matters` returned **503** on the deployment above.
The app's configured branch alias matches this deployment. This confirms a
server/data-availability failure, not its underlying cause. The observed 401 at
12:55:51 was an earlier unauthenticated diagnostic call, not the user's request.
No user session was accessed by this tester. No synthetic identity was sent to
the hosted environment. The first broken boundary is reported; downstream
hosted verification stops until it is repaired and re-tested with consented data.

Read-only source inspection additionally proves that `missing_profile` maps to
409 `PROFILE_REQUIRED`; that is a separate unverified path, not an explanation
for this user's 503. No native profile write flow exists at this baseline.

## Acceptance matrix

| Gate | Priority | Flow and expected result | Required evidence | Baseline status |
|---|---|---|---|---|
| A01 | P0 | Install signed standalone APK and cold launch without Metro | APK SHA, app version, emulator/device video and clean crash log | BLOCKED: Android tools/device absent |
| A02 | P0 | Empty/invalid login or registration fields, repeat taps, switch mode while pending | Native input/UI assertions, no duplicate auth request | NOT RUN: native renderer absent |
| A03 | P0 | Valid registration, confirmation-required, verification return | Approved preview account and mailbox, auth callback route, restart | BLOCKED: dedicated test identity/mailbox not configured; registration/cleanup scope not established |
| A04 | P0 | Correct/incorrect password, unconfirmed email, rate limit, network failure | Actual auth responses and Chinese actionable UI, no leaked details | BLOCKED: no approved test credentials |
| A05 | P0 | Restore, refresh, foreground/background, expired/revoked session, local sign-out | Native SecureStore and server evidence; old protected data disappears | BLOCKED: device and identity missing |
| P01 | P0 | First login without profile → guided create-profile, not endless retry | Native form → approved existing Core write contract → stored profile | FAIL: baseline has no native profile flow |
| P02 | P0 | Existing profile loads; validated updates save/reload; uploaded facts reused | Same backend validation/completeness as Web; persisted values | NOT RUN: profile implementation absent |
| H01 | P0 | Login → current matters live API succeeds | Hosted API → Data → safe response → native render | FAIL: observed 503; root cause still unknown |
| H02 | P0 | Current primary/action ordering and stages match Web for identical state | Same approved dataset and exact Web/Mobile commits, response comparison | NOT RUN: first hosted boundary broken |
| H03 | P0 | Every displayed Continue button reaches its native target and returns updated state | Device action path, write response, refresh/restart | FAIL: baseline button always disabled |
| H04 | P0 | Null primary/incomplete differs from completed; empty applications differs from error | Contract and render assertions, no invented success/progress | FAIL: baseline success copy unconditional |
| H05 | P0 | 401/403/404/409/429/503/timeout/offline produce correct Chinese recovery | Client unit tests plus actual native UI; no infinite retry | FAIL: baseline all HTTP failures share generic English text |
| H06 | P0 | Switch user/locale/path while request pending; old results never paint new identity | Deterministic race tests plus device identity switch | FAIL: baseline lacks success cancellation guard |
| S01 | P0 | Two students cannot read/change each other's profile/application/files | Two approved preview users, ownership tests, actual RLS denied evidence | BLOCKED: identities and sandbox dataset absent |
| S02 | P0 | Bearer token never goes to foreign origins/redirects/logs | Executed client boundary tests and actual network audit | Unit PASS at baseline; device NOT RUN |
| L01 | P0 | All core screens, statuses, errors, empty states Chinese by default | Executed copy/state tests plus native screenshots | FAIL: raw statuses/errors still English |
| L02 | P1 | Language switch changes server content, survives restart; unknown enums safe | Request header test, persistence/device check | FAIL: baseline no Accept-Language or persistence |
| W01 | P0 | School plan → requirements comparison/evidence → add application | Actual server-side recommendation; cost permission before paid calls | NOT RUN: no native implementation |
| W02 | P0 | Upload/recognize/replace/delete required document with owner access | Private storage, signed links, failure/retry and metadata persistence | NOT RUN: no native implementation |
| W03 | P0 | Application details → materials → submitted → decision | Core transition validation, idempotency, duplicate submission prevention | NOT RUN: no native implementation |
| W04 | P0 | Confirm eligible final offer → destination visa, UK/FR prerequisite order | Same Core guards as website; no premature unlock | NOT RUN: no native implementation |
| W05 | P0 | Visa → pre-departure → arrival → French settling | Native tasks, dependencies, completion rollback and copyable bilingual data | NOT RUN: no native implementation |
| W06 | P0 | Password reset, privacy export/deletion and authenticated deep links | Explicitly approved test identity and guarded write flows | NOT RUN: no native implementation |
| R01 | P0 | Airplane/reconnect, kill/restart, Android back, small screen/large font | Device recording and assertions, no stuck button/data loss | BLOCKED: Android runtime absent |
| R02 | P0 | All passed checks tied to identical signed build and server snapshot | SHA-256 manifest, source commit/diff, test logs and release checklist | NOT RUN: no release candidate produced |

## Offline checks are narrow evidence

`node --import tsx --test tests/*.test.ts` runs deterministic local client/contract
tests. Fixture tokens only enter injected in-memory transports; tests must never
perform a real network call. Contract fixtures are synthetic non-personal data,
not copies of private student records.

At baseline, the 12 pre-existing unit tests passed. Independent contract fixtures
then found a real mismatch: Core disabled actions use
`{ enabled: false, kind: null, resourceId: null }`, while the app required a string
`kind`. The prior unit fixture invented `kind: 'UNAVAILABLE'`. The added contract
suite initially produced **1 PASS / 3 FAIL**, proving the defect before its fix.

Read-only Core references:

- `src/features/mobile-api/actions.ts` blob `828c9aad6050e723944c302beb990b0bdb6b6e09`.
- `src/features/mobile-api/contracts.ts` blob `6f98c1bba67f50401e4ea4f7168fd6fb644f2db2`.
- `src/features/mobile-api/handler.ts` blob `a171443586f84a583f08fb2dd8db9c428518694e`.
- `src/features/mobile-api/locale.ts` blob `10cefb9041782563d4023bab2e84e72f550d3559`.

The tester re-fetched actions, contracts, and handler at the immutable deployed
commit `8c2c164bf256295577ed1cea2879d801d13dd879`; all three blob IDs matched the
branch inspection. Contract fixture parity is therefore tied to that exact
Preview code, not just a moving branch.

## Regression work completed in this cycle

The independent tester added 42 deterministic tests across seven files, alongside
the original 12 tests. No test calls a real HTTP transport or uses a real student
token. Native hook rendering, native SecureStore behavior, actual Supabase/RLS,
and real Android UI are outside these unit checks.

| Suite | Count | What it verifies |
|---|---:|---|
| Original API/config | 12 | Preview-only config, credentials/origin restrictions, token injection, safe failure handling |
| HTTP-01–09 | 9 | Language header, status preservation, query rejection, empty vs invalid JSON, cancellation at token/transport/body stages, body AbortError and timeout |
| PARITY | 6 | Actual Core nullable disabled actions, enabled actions, invalid shapes, primary/order/completed preservation |
| META-01–07 | 7 | Error-code allowlist, UUID-only correlation, hostile/PII-bearing metadata removal, malformed envelopes, auth/preview infrastructure failures |
| COPY-01–07 | 7 | Chinese/English safe errors, correct recovery, 503 not password failure, precise 409 PROFILE_REQUIRED treatment |
| RACE-01–08 | 8 | Request generations, stale success/error suppression, retry cancellation, empty/error distinction |
| LABEL-01–05 | 5 | All 11 application statuses, 8 journey stages, 3 stage states, 5 matter statuses; unknown/prototype/hostile keys safely presented |

Red-to-green evidence, not just post-fix assertions:

1. Actual disabled-action fixture initially **3 FAIL / 1 PASS**. Developer fixed
   nullable action kinds. Expanded PARITY suite then **6 PASS**.
2. HTTP-06 initially **FAIL** because the client accepted query/hash paths that
   Core rejects. Developer added client guards; HTTP-06 then **PASS**.
3. Coordinator review found a missed body-read edge case. Tester added HTTP-08
   and HTTP-09; both initially **FAIL**, showing `AbortError` incorrectly became
   `invalid-response`. Developer preserved cancellation/timeout in the JSON-read
   catch; the complete HTTP suite then **9 PASS**.

These improvements remove concrete client defects. They do not repair the
observed Hosted 503, add a profile write endpoint, establish native Web parity,
or pass device/real-user gates.

## Final frozen-source verification

After the developer declared source freeze, the independent tester executed the
complete suite against the same tree and then recorded the relevant source/test
SHA-256 values in `candidate-sha256.txt`.

| Check | Final result | Scope |
|---|---|---|
| `node --import tsx --test tests/*.test.ts` | **PASS: 54/54**, zero fail/skip/todo | Offline client/contract/state/presentation tests only |
| `npm run typecheck` | **PASS** | TypeScript compile-time checking |
| `npm run lint` | **PASS** | ESLint, zero warnings |
| `git diff --check` | **PASS** | Whitespace/conflict-marker check |
| Hosted login → current matters | **FAIL / BLOCKED for retest** | Observed 503; no normally authenticated approved test session for reproduction |
| Native React UI rendering and account switching | **NOT RUN** | Pure request-controller tests are not React/device execution |
| Standalone Android install/launch/back/background/storage | **BLOCKED** | Android device/emulator toolchain unavailable |
| Native profile → first application and full website parity | **NOT RUN / implementation incomplete** | No native profile write flow or later complete user journeys |
| Cross-user Supabase RLS/storage isolation | **BLOCKED** | Dedicated accounts and synthetic dataset not configured |

Base commit remains `13e5401a655530853d3c2b537d4f1353d2b3db11`. The tested changes
were uncommitted in the separate team branch; the manifest identifies relevant
test sources, not a signed APK or a whole-production deployment. Any further
source change requires rerunning the affected tests and the final gate.

## Unblock requirements

1. Resolve the actual 503 with sanitized server error codes/request IDs and the
   same deployment's logs; do not guess token or schema causes.
2. Establish a native runtime through the normal approved toolchain. `adb`,
   `emulator`, and `maestro` were not found on PATH. Java/Node/npm exist.
3. Approve designated preview test accounts and synthetic data, including scope
   for registration/email verification and cleanup. No process environment
   variable naming Atlas/E2E/test identity was found; no credentials were read.
4. Identify the exact website baseline and reuse its Core write contracts without
   modifying production website code or database.

Overall baseline verdict: **NOT READY**. None of these records is evidence that
Hosted E2E, real-user testing, or Android device acceptance has passed.
