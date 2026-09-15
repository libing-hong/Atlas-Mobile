# Student Preview email setup — 2026-09-15

**Superseded entry-point warning:** Later investigation found this report's
original Vercel deployment used the shared Supabase URL. Its old registration
URL must not be used. The SMTP/template observations below remain historical
configuration evidence, not proof of delivery or runtime isolation. See
`2026-09-15-preview-connection-investigation.md` for the branch-only repair,
replacement deployment and current verification boundary.

Scope: isolated Supabase `atlas-student-preview` (`efvpndayardwjqtwtdmx`).
No production website source, production database, existing mail keys, DNS,
Vercel settings or paid subscriptions were modified.

## Persisted configuration

- Resend dashboard reports Transactional **Free**; pay-as-you-go disabled.
- Existing sending domain `auth.goingatlas.com` is verified.
- The user created the dedicated `atlas-student-preview-smtp` API key and entered
  it into Student Preview SMTP. The prepared key scope was Sending access,
  restricted to `auth.goingatlas.com`. No secret is stored in this repository.
- Custom SMTP remains enabled after a fresh page load; the saved form has no
  pending changes. Prepared non-secret settings: `smtp.resend.com`, port `465`,
  SMTP username `resend`, sender `atlas-preview@auth.goingatlas.com`, sender name
  `Atlas 测试版`. These settings are not evidence of successful mail delivery.
- The signup-confirmation subject and body were replaced with Chinese text;
  navigation back to the page confirmed the final text and disabled Save button.
  The body retains the provider's `{{ .ConfirmationURL }}` variable. A copy is in
  `preview-confirm-signup.zh.html` alongside this report.

Default Site URL changed from `http://localhost:3000` to:

`https://atlas-os-preview-wuhwvt8h2-libing-hongs-projects.vercel.app/login`

Exactly one redirect URL was added, without a wildcard:

`https://atlas-os-preview-wuhwvt8h2-libing-hongs-projects.vercel.app/auth/callback?next=%2Fdashboard`

The saved configuration page confirmed both values. No other redirect scopes
were added. Future immutable Preview deployments will need their own reviewed
callback entry before using the Web signup action.

## Source and runtime checks

Vercel deployment `dpl_GwUcR2eu8zLbADfN3fowe8pVPL9x` reports READY and identifies
Atlas-OS commit `8c2c164bf256295577ed1cea2879d801d13dd879` on
`integration/mobile-preview-v1`. Its immutable hostname is the hostname above.
The existing Chinese `/signup` page was opened successfully without modifying
website code or deployment protection.

Read-only inspection at that exact commit confirms:

- Web signup computes `/auth/callback?next=%2Fdashboard` from the Preview
  deployment hostname and passes it as `emailRedirectTo`.
- Its SSR client uses PKCE and its callback exchanges a code using the browser's
  verifier cookie. Web confirmation must be opened in the same browser that
  registered; a browser error does not automatically mean email was unconfirmed.
- The native client does not implement this Web callback or automatic native
  login from a confirmation URL. The email and App copy instruct the user to
  return manually and sign in with the same email/password.
- Web registration also requires name and explicit versioned privacy/terms
  consent; the native password/error patch does not implement those missing
  registration fields or establish whole-flow parity.

## Current test boundary

Before the registration handoff, a narrowly scoped read-only query found **zero**
accounts for the user's designated test mailbox. This setup cycle did not send
an email, create an account or access the user's password, mailbox, session token
or verification link. Account creation, consent and choosing a new credential
are left to the user through the browser's documented handoff.

Actual delivery, confirmation, normal authenticated Mobile API access, the
reported homepage 503, Android installation and native user-flow verification
remain **NOT RUN / BLOCKED**. No APK was created or distributed.

Official implementation references:

- https://resend.com/docs/send-with-supabase-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/redirect-urls
