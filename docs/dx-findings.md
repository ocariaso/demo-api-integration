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
