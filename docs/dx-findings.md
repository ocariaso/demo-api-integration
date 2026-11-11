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

## Phase 2: send offer

### Good: create, send and delete work as documented

`POST /envelopes` with `"status": "draft"` or `"sent"`, `PATCH` with
`{"status": "sent"}` and `DELETE` on a draft all behaved exactly as the docs
say. Anchor text placed every field on the first try. Errors are specific and
say how to fix them:

- Deleting a sent envelope: `409 envelope_not_draft`, "Only a draft can be
  changed this way. Void an envelope that was sent."
- A test send to an outside email: `400 test_recipient_not_allowed`, "A test
  envelope goes only to you. Make someone@example.com an embedded recipient,
  or send with a live key."

### Friction: statuses are plain strings in the OpenAPI document

`EnvelopeOutput.status` and `RecipientOutput.status` are typed `string`, with
the allowed values only in the description. Generated clients can't check a
`switch` on status for typos or missing cases.

Suggested fix: declare them as enums (`draft`, `pending`, `in_progress`, …).

### Gap: default field sizes change on portrait pages that aren't A4

The docs say a field without a size takes the editor's default (signature
20 × 8 percent) and that only landscape pages scale the height. On a portrait
US Letter page, a signature came back 20 × 8.74 and a date 15 × 3.28, so the
height scaling applies to any page shaped differently from A4.

Suggested fix: document the rule as "scaled by A4's aspect over the page's",
or limit it to landscape as written.

### Friction: TypeScript generators mark defaulted fields as required

`openapi-typescript` treats every property with a `default` as required, so
`SignerInput` demanded `routingOrder`, `attachCompletedCopy`, `requireAccount`
and `requireIdentityVerification` even though the spec only requires
`recipientId`, `name` and `email`. The fix is `--default-non-nullable false`.
The spec is correct, but most TypeScript integrators will hit this.

Suggested fix: mention the flag in the guide's "generate a client" tip.

## Phase 3: pipeline

### Bug: the `metadata[key]` filter is missing from the OpenAPI document

The docs say `GET /envelopes?metadata[source]=hiring-desk` finds an
integration's own envelopes, and it works on stage. But the OpenAPI document's
`listEnvelopes` parameters stop at `status`, `createdFrom`, `createdTo`,
`updatedSince`, `order`, `page` and `limit`. A generated client has no way to
pass it without a type cast, and an integrator reading only the reference
never learns it exists.

Suggested fix: declare it as a `deepObject` query parameter
(`style: deepObject, explode: true`) named `metadata`.

### Friction: always-present response fields are marked optional

The API always returns `signers`, `approvers` and `viewers` (as empty arrays
when unused), a form-data response's `recipients` and each recipient's
`values`, but the OpenAPI document leaves them out of `required`. Generated
types then force null checks on fields that are never missing.

Suggested fix: generate response schemas in serialization mode so every field
the API always sends is listed in `required`.

### Good: the read endpoints are complete and consistent

The detail page loads with five parallel calls (envelope, recipients,
documents, audit events, form data), all of which worked on drafts as well
as sent envelopes. Highlights:

- Form data works before anyone signs, listing each field with `filled:
  false`, so an integration can show progress.
- The audit trail names who did what, in order, with times.
- A document download answers a one-hour link plus `expiresAt`, so the
  server never has to proxy the file.

## Phase 4: embedded signing and sending

### Good: both views are simple to integrate

`POST /envelopes/{id}/views/recipient` and `/views/sender` each answer a
`url` and `expiresAt`, and a test key may return to `http://localhost`, so
embedded signing works locally with no return address registered. The
refusals are specific:

- Sender view on a sent envelope: `409 envelope_not_draft`, "Only a draft has
  a sender view."
- Recipient view on a draft: `409 envelope_not_active`, "Only an envelope
  that is out for signing has a recipient view."

### Friction: timestamps have microseconds, not milliseconds

The docs promise RFC 3339 times "in UTC with milliseconds"
(`2026-10-30T01:23:45.678Z`), but `expiresAt` came back as
`2026-11-11T07:48:59.037663Z`. JavaScript's `Date` accepts it, but strict
parsers (and string comparisons against millisecond values) don't.

Suggested fix: serialize every time with milliseconds, as documented.

## Phase 5: live status

### Friction: event `createdAt` is when Twala picked the event up, not when it happened

Two envelopes sent 1.3 seconds apart (`sentAt` `07:13:38.231` and
`07:13:39.514`) produced four events whose `createdAt` were
`07:13:42.522022` to `.522025`, one microsecond apart. `createdAt` records
when the background scanner turned them into events, in batch order. The docs
say to "use `createdAt` and the event `id`" when order matters, but
`createdAt` can't tell events in the same batch apart, and it lags the real
moment by seconds.

Suggested fix: add an `occurredAt` with the time the underlying envelope
event happened, and keep `createdAt` for when the webhook event was made.

### Good: Standard Webhooks signing works exactly as documented

A delivery signed by hand following the docs (HMAC-SHA256 over
`{webhook-id}.{webhook-timestamp}.{body}`, keyed by the bytes after
`whsec_`) was accepted unchanged by the `standardwebhooks` npm library, and a
tampered body or missing signature was refused. Integrators can use the
library with no custom code.

### Good: `GET /events` makes webhooks safe to miss

Events are listed for 30 days whether or not they were delivered, so the app
shows which events never arrived by webhook and can catch up. A missing event
answers `404 event_not_found`.

### Gap: local webhook testing needs a tunnel and re-registration

Webhook endpoints must be public HTTPS, so local development needs a tunnel.
A free quick tunnel gets a new address every time it starts, and each new
address has to be added in the Apps page by hand, with a new signing secret.
Test keys can already return to `http://localhost` for embedded views, but
there's no local equivalent for webhooks.

Suggested fix: a "Send test event" target that streams events to a CLI (like
`stripe listen`), or let test-mode endpoints keep their secret when only the
address changes.

## Phase 6: drafts and templates

### Bug: fields read with `GET` can't be written back with `PUT`

To add one field to a draft signer, an integrator reads their fields, appends
one, and `PUT`s the list. Sending the fields back as `GET` returned them fails
with `422 validation_error`, and it takes three rounds of trial and error to
find out why:

1. `fieldId` and `documentIdGuid` are refused as extra inputs.
2. Every property `GET` returned as `null` (`placeholder`, `dateFormat`,
   `options`, …) is refused, because the field's type doesn't take it.
3. `GET` returns `autoFill: false` on **signature** and **mobile** fields,
   whose types refuse `autoFill` altogether.

What works: drop the ids and every `null`, and keep `autoFill` only on `date`,
`name` and `email` fields. None of this is in the docs.

Suggested fix: make `PUT` accept what `GET` returns (ignore the ids and
`null`s), and stop returning `autoFill` on types that don't have it.

### Bug: `include=fields` on `GET /templates/{id}` is missing from the OpenAPI document

The docs say `?include=fields` adds each role's fields, but the operation
declares no query parameters at all, so a generated client needs a cast to
send it. (`GET /envelopes/{id}` declares its `include` correctly.)

### To confirm: template list and role shapes differ between docs and spec

There were no templates in the test account, so these couldn't be checked
against real responses:

- The docs say each `GET /templates` item has `shared`, `documents` and
  `roles`; the OpenAPI `TemplateSummaryOutput` has only `templateId`, `name`,
  `createdAt` and `updatedAt`.
- The docs call a role's kind `roleType`; the OpenAPI `TemplateRoleOutput`
  calls it `type`.

### Good: draft editing is complete and its errors are precise

Attaching and removing documents, adding and removing recipients, and
replacing fields all worked on stage. Errors name the exact problem:
`duplicate_recipient_email` for a second recipient with the same email,
`field_out_of_bounds` naming `fields[3]`, and `template_not_found` for an
unknown template.

### Friction: removing a draft's last document silently drops its fields

`DELETE /envelopes/{id}/documents/{documentId}` on the only document answers
`204`, and every signer's fields go with it, as documented. It's legal for a
draft, but an integrator who removes and re-adds a document to "replace" it
loses all field placements without warning.

Suggested fix: a `PUT` to replace a document's file while keeping its fields,
or a warning in the response.

## Phase 7: fixes and nudges

### Bug: correcting a recipient on a voided envelope returns the generic code `conflict`

`PATCH /envelopes/{id}/recipients/{recipientId}` on a voided envelope answers
`409` with `code: "conflict"` and "Recipients can only be updated on pending or
in-progress envelopes". Every other refusal in this phase has a specific code
(`invalid_status_transition`, `no_recipients_to_remind`,
`envelope_not_retryable`, `test_recipient_not_allowed`), and the message is in
a different style. The platform source shows it's `EnvelopeService`'s own
`ConflictException` (`server/app/services/envelope.py`) falling through to the
default code, so integrators can't branch on it reliably.

Suggested fix: map it to a specific code, such as `envelope_not_active` (which
the recipient view already uses for the same situation).

### Good: lifecycle changes behave exactly as documented

All of these matched the docs on stage:

- `metadata` merges on any status, even voided, and a key set to `null` is
  removed.
- `expiresAt` in the past is refused with a field-level message ("expiresAt
  must be in the future").
- A reminder while only an embedded candidate is waiting answers `409
  no_recipients_to_remind`, so embedded recipients really are never emailed.
- A recipient correction to an outside email in test mode is refused with
  `test_recipient_not_allowed`, the same rule as at send time.
- Retrying a seal that hasn't failed answers `409 envelope_not_retryable`.
- Voiding twice or reminding a voided envelope answers `409
  invalid_status_transition`, naming the status and the action.

### Not testable: a real sealing retry

`POST /envelopes/{id}/sealing-attempts` only works after a seal actually
fails, and there's no way to make one fail on demand. The app shows **Retry
sealing** on a `sealing_failed` offer, but only the refusal was exercised.

Suggested fix: a test-mode way to simulate `sealing_failed`, so integrators
can test their retry path.

## Phase 8: pre-employment requirements (timestamps)

### Good: timestamps are simple and behave as documented

One `POST /timestamps` with two documents answered `201` with one timestamp
each, in order, both `sealing`. Each item's own `metadata` (`offerId`,
`requirement`) came back on every read, and `GET /timestamps` with
`metadata[offerId]` listed exactly that offer's requirements. Downloading
before sealing answered `409 timestamp_not_sealed`, retrying a completed one
`409 timestamp_not_retryable`, and a sealed copy downloaded through a one-hour
link once complete. The history listed `timestamp.created`,
`timestamp.sealing` and `timestamp.completed` with times.

### Bug: the `metadata[key]` filter is missing from `GET /timestamps` in the OpenAPI document too

As with `GET /envelopes` (Phase 3), the docs list `metadata[key]=value` as a
filter and it works on stage, but the OpenAPI operation doesn't declare it.

### Friction: a refused document is named by its position, not its name

Uploading a file named `Diploma.pdf` that isn't a PDF answered `400
invalid_pdf`, "The document "1" was refused: File content is not a valid
PDF". Timestamp documents have no `documentId`, so the message falls back to
the position. With several files in one request, the name would say which one
at a glance.

Suggested fix: name the document as the integrator did ("Diploma.pdf"), with
its position in `details`.

### Bug: one document of a two-document upload was stuck sealing for 17.5 minutes

Two documents were timestamped in one request at `20:28:27`. The medical
certificate sealed 71 seconds later. The NBI clearance stayed `sealing`, with
no further events, until the stale-seal sweep failed it at `20:45:59`. Its
seal job seems to have been lost, which the platform docs say is swallowed on
purpose and left for the sweep. A retry then sealed it in 76 seconds:

`timestamp.created 20:28:27` → `timestamp.sealing 20:28:27` →
`timestamp.sealing_failed 20:45:59` → `timestamp.sealing 20:46:28` →
`timestamp.completed 20:47:44`

So the retry path works end to end, and `timestamp.sealing_failed` reached
`GET /events`. But an integrator whose seal job is lost waits up to 18 minutes
(13 minutes, plus up to 5 for the sweep to run) before they can do anything,
and nothing in the API says whether a `sealing` timestamp is progressing or
stuck. A second retry while sealing correctly answered `409
timestamp_not_retryable`.

Suggested fix: investigate why one job of the pair was lost on stage, and
consider a shorter stale limit for timestamps (which hold one document) or a
`sealingStartedAt` field, so integrators can tell a slow seal from a stuck one.

### Resolved: sealing retries are testable after all

Phase 7 noted that a real sealing retry couldn't be tested. The stuck
timestamp above made one possible: `POST /timestamps/{id}/sealing-attempts`
answered `202 {"status": "sealing"}` and the seal completed. The envelope
version (`POST /envelopes/{id}/sealing-attempts`) is still only tested for its
refusal.
