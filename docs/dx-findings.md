# Twala API: developer-experience findings

Notes collected while building the hiring desk demo, phase by phase. Each entry
says what we hit, why it matters to an integrator, and a suggested fix.

Severity: **Bug** (doesn't work as documented) · **Gap** (missing or unclear
in the docs) · **Friction** (works, but harder than it should be) · **Good**
(worth keeping).

## Phase 0: scaffold

### Friction: path parameters are snake_case in the OpenAPI document

The guide and every JSON body use camelCase (`envelopeId`, `recipientId`), but
the OpenAPI paths name their parameters `{envelope_id}`, `{recipient_id}`,
`{document_id}`, `{timestamp_id}`, `{template_id}` and `{event_id}`. A
generated client then asks for `params.path.envelope_id`, which disagrees with
the guide's `{envelopeId}` and with the `envelopeId` field it just read from a
response.

Suggested fix: rename the path parameters in the OpenAPI document to camelCase
(the URL doesn't change, so this isn't a breaking change for raw HTTP callers).

### Gap: the developer guide can't be read without JavaScript

`/developer-guide` is a client-rendered page. Without running its scripts, a
fetch returns only "Loading Twala...", so search engines, link previews and AI
coding assistants can't read the guide. An integrator asking an assistant for
help gets nothing from the link.

Suggested fix: pre-render the guide pages, or publish them as static Markdown
alongside `openapi.json`.

### Good: the OpenAPI document is public and complete

`GET /api/v1/openapi.json` needs no key, and `openapi-typescript` generated
usable types from it on the first try, including the shared `ApiErrorOutput`
error shape on every operation. The top-level description is a compact guide in
itself.

### Good: error responses are consistent

A request with no key answers `401` with `code: missing_api_key`, a
`requestId`, a matching `X-Request-ID` header, and
`WWW-Authenticate: Bearer realm="twala-api"`, exactly as documented.

## Phase 1: account

### Good: `GET /account` is a useful startup check

One call returns the App, mode, sender, credit balance, features and limits,
and the stage response matched the OpenAPI schema field for field. Accepted
requests carry `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`
as documented.

### Gap: no way to know who a test envelope may be emailed to

With a test key, email recipients must be the App's own people, or the send
fails with `400 test_recipient_not_allowed`. For a personal App that's the
sender, which `/account` shows. For a team App it's the team's members, which
`/account` doesn't list, so an integrator only finds out at send time.

Suggested fix: add the allowed test recipients (or the team's member emails)
to `/account` in test mode.

### Gap: daily test counts have no reset time

`limits.testEnvelopesToday` and `testTimestampsToday` reset at midnight
Philippine time, but the response doesn't say when. An integrator has to know
the rule and compute it in Asia/Manila time to show "resets in 3 hours".

Suggested fix: add a `testCountsResetAt` timestamp to `limits`.

### Friction: `features.timestamps` is always `true`

Its own description says every App may timestamp, so this is always `true`.
A field that can't vary invites integrators to write dead branches for
`false`.

Suggested fix: drop it in a future version, or document it as reserved.
