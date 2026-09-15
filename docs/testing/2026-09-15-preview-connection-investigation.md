# Preview connection investigation — 2026-09-15

Status: branch configuration repair deployed; normal authenticated re-test
pending. This does not pass Hosted or native acceptance.

After the user reported email verification, an exact-mailbox read of isolated
Student Preview `efvpndayardwjqtwtdmx` returned zero matching/confirmed accounts
twice. Resend showed the designated recipient's confirmation email delivered,
but with the old English subject. Filtering by the dedicated
`atlas-student-preview-smtp` key returned no matching recipient row.

Vercel Dashboard then provided decisive non-secret configuration evidence:
`NEXT_PUBLIC_SUPABASE_URL`, explicitly scoped to Preview branch
`integration/mobile-preview-v1`, contained
`https://asxdnimpgmnmuyynxtze.supabase.co`, the prohibited shared project,
instead of the isolated Student Preview URL. A correct branch/source SHA had
previously been mistaken for proof that its runtime database was isolated.

The existing Preview Web signup action reads this same public URL. The deployed
Mobile API environment guard explicitly refuses the shared project with
503 `PREVIEW_UNAVAILABLE`. This establishes a concrete configuration defect;
the historical phone request's exact response code was not captured, and normal
authenticated Mobile re-testing is still required after deployment.

Neither the shared nor the production database was queried to locate the misplaced signup.
Broader recent-account metadata and unrelated mail-list reads were rejected by
automatic approval review; the subsequent checks stayed limited to the
designated recipient and non-secret Preview configuration.

Repair completed, scope restricted to the existing integration branch:

- Replaced `NEXT_PUBLIC_SUPABASE_URL` with the isolated Student Preview URL.
- Replaced its paired public key with that project's existing active modern
  publishable key, obtained through the Supabase connector. No key is generated,
  stored in this report, or given broader privileges.
- Read back the branch-scoped Mobile flags: API enabled `true`, environment
  `preview`, target `atlas-student-preview`, Mobile Preview Supabase URL pointing
  to `efvpndayardwjqtwtdmx`.
- Redeployed the exact integration source with existing Build Cache unchecked.
  The old immutable deployment is not repaired by environment edits.

## Replacement deployment

- Vercel deployment: `dpl_GxC7WCzsxZy5wgFmgtq4GmqQQf61`.
- Source: Atlas-OS `8c2c164bf256295577ed1cea2879d801d13dd879`,
  `integration/mobile-preview-v1`.
- Environment: Preview (`target: null`), not Production.
- Immutable host:
  `atlas-os-preview-iqug68xeh-libing-hongs-projects.vercel.app`.
- Existing integration branch alias remains assigned to this new deployment.
- Connector reports `READY`; build logs confirm deployment completed at
  2026-09-15 15:22:33 UTC, with no alias error.
- The new immutable `/signup` renders the Chinese registration form, name,
  email, password confirmation, consent controls, and login link.
- Student Preview Site URL is now the new immutable `/login`. The only allowed
  redirect is the same new origin's `/auth/callback?next=%2Fdashboard`, without
  a wildcard. The old deployment callback was removed. A fresh reload confirmed
  the saved URL configuration.

Independent logic-agent inspection of the exact deployed source found that the
Mobile environment guard explicitly accepts modern publishable keys, the Web
SSR client passes the public key directly to Supabase, and the Mobile client
uses a real user token separately. No application-source incompatibility with
the replacement key format was found. This is not a successful live login.

## Remaining evidence gap

The designated test mailbox did not have an account in the isolated project at
the last exact-mailbox check. Its earlier confirmation cannot be counted as a
Student Preview confirmation. Normal registration with the repaired origin,
Chinese mail delivery, confirmation and login still require the user to choose
their credential and accept the displayed terms through secure browser handoff.
No password, session token, verification URL or unrelated account was accessed.

Anonymous Mobile 401 is not evidence that the environment guard passes: source
checks the missing bearer before loading its environment. Real authenticated
`/me`, current matters, journey, applications and Core/RLS behavior remain
unverified. A missing profile should produce the defined first-use state,
not an unexplained 503. Android installation, bundled launch, native persistence,
full workflow parity and cross-user isolation remain separate unpassed gates.
Two unauthenticated shell HTTP probes ended in network `URLError` and establish
no server result; the browser confirmed only the public registration page.

The earlier email-setup report describes saved Supabase settings only. It is
not evidence that the Vercel Web runtime used that database, and its old signup
URL must not be used as the repaired test entry.

Production website code, production environment variables, existing user data,
DNS, mail credentials and production deployment aliases remain outside this
repair. No production promotion or new APK is authorized by passing this setup.
