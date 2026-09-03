# Atlas Core API proposals — NOT implemented or confirmed

These are review proposals only. They do not assert that routes exist.
Mobile has no calls, fixtures or business response implementations for these endpoints.
Atlas Core owns business enums, current matters ordering, eligibility, authorization and all journey/status calculations.

## Shared request and response conventions

Proposed prefix: /api/mobile/v1. HTTPS only.
Each GET includes Authorization: Bearer <Supabase access token> and Accept: application/json.
Accept-Language can be added after language support is agreed. Never accept a client userId as authority.
Core validates the shared auth issuer/audience and derives the current user from the token.
Success: { "data": <payload>, "meta": { "requestId": "string", "generatedAt": "ISO-8601 UTC", "schemaVersion": "1" } }.
Failure: { "error": { "code": "stable_code", "message": "safe user message", "requestId": "string" } }.
Use 401 for absent/invalid/expired authentication, 403 for denied access, 429 with Retry-After, and 5xx for service faults. Personal responses should be private/no-store.
A successful empty collection is 200 with an empty list; it must be distinct from unavailable/error.
Dates use ISO-8601 UTC or null. IDs are opaque strings. Cursor pagination is opaque and ownership-bound.
Presentation status: { code: string, label: string, tone: "neutral" | "info" | "success" | "warning" | "danger" }; Core defines codes and semantic tone. Mobile renders an unknown tone neutrally.

## GET /me

Request: no query or body.
Proposed data:
```ts
{
  user: { id: string; displayName: string | null; email: string | null };
  preferences: { locale: string };
  privacy: { policyUrl: string; policyVersion: string };
}
```
Return only user-facing profile fields. Do not expose staff scopes or authorization internals for client-side permission decisions.
Confirm locale support and safe public policy URL before integration.

## GET /current-matters

Request: optional cursor and limit (default 10, server maximum to be confirmed). No userId.
Proposed data:
```ts
{
  primary: CurrentMatter | null;
  next: CurrentMatter[];
  nextCursor: string | null;
}
type CurrentMatter = {
  id: string;
  title: string;
  summary: string | null;
  whyNow: string | null;
  missingItems: { id: string; label: string }[];
  dueAt: string | null;
  status: DisplayStatus;
  action: {
    id: string;
    label: string;
    target: { kind: string; resourceId: string | null };
    enabled: boolean;
    unavailableReason: string | null;
  } | null;
};
```
Core chooses primary and order. Mobile must never rank matters, derive missing items, or enable an action.
Agree a bounded target-kind registry with Core before routing. Unknown targets render as unavailable; no arbitrary URL execution.
The Continue action's actual read/write endpoint requires a separate contract for each target; no generic mutation API is invented here.

## GET /applications

Request: optional cursor and limit (default 20; proposed maximum 50).
Proposed data:
```ts
{
  items: {
    id: string;
    institutionName: string;
    programmeName: string;
    intakeLabel: string | null;
    status: DisplayStatus;
    updatedAt: string;
    nextAction: {
      label: string;
      target: { kind: string; resourceId: string | null };
      enabled: boolean;
      unavailableReason: string | null;
    } | null;
  }[];
  nextCursor: string | null;
}
```
No synthetic status mapping, score or progress calculation on Mobile.
Core must filter applications to the authenticated user and redact internal staff notes.
Details, document upload and submission are subsequent contracts, outside Foundation.

## GET /journey

Request: no query or body.
Proposed data:
```ts
{
  currentStageId: string | null;
  stages: {
    id: string;
    key: string;
    title: string;
    status: DisplayStatus;
    isCurrent: boolean;
    completedAt: string | null;
    dependencySummary: string | null;
    action: {
      label: string;
      target: { kind: string; resourceId: string | null };
      enabled: boolean;
      unavailableReason: string | null;
    } | null;
  }[];
}
```
Core returns ordered stages and authoritative current/completed/dependency states.
Suggested display labels from the brief: Study Profile, School Plan, Applications, Offer, Visa, Pre-departure, Arrival, Settling in.
These labels are not a new journey enum; reconcile with Core's existing model.

## Later contracts to define separately

- Language update: only after supported locales and ownership rules are agreed.
- Application detail, uploads/camera, and Continue operations: define per real business action, including idempotency for writes.
- Atlas conversations: server-side service only; streaming format, conversation ownership, error handling and rate limits require a later proposal. No OpenAI secret belongs in Mobile.
- Notifications and account deletion/export: no endpoint assumption in V0.1.
- Authentication: use Supabase Auth's existing protocol, not a parallel Mobile login API. Confirm preview project, permitted login methods and future callback scheme before activation.

## Requested Core work, not performed

1. Confirm whether an existing API surface can supply the four reads; otherwise approve Mobile adapters around existing Core services.
2. Validate bearer-auth handling for native clients alongside existing Web cookie flows.
3. Preserve RLS and ownership checks; confirm staff data cannot appear in user responses.
4. Provide isolated preview identity configuration and contract examples from that environment.
5. Agree schema versioning, pagination, action targets and safe error semantics.

No Atlas-OS modification is necessary for the offline Foundation. None was made.
