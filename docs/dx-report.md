# Twala API: developer-experience report

**What:** we built a demo HR hiring desk on the Twala public API (`v1`, stage)
that uses every endpoint, to check that the API works as documented and to
see how easy it is to integrate.
**Where:** this repo. Detailed, phase-by-phase notes with exact requests and
responses are in [dx-findings.md](dx-findings.md).
**When:** 10–12 November 2026, against `api-stage.twala.ai` with a test key.

## Summary

The API is in good shape. Nearly every endpoint did exactly what the docs
say, the errors are specific and tell you how to fix the problem, and the
design (DocuSign-style envelopes, idempotency keys, Standard Webhooks, an
events feed to catch up on missed webhooks) made a full integration
straightforward. The app needed one workaround for the API's behavior (bug 2
below) and three casts for gaps in its OpenAPI document (bugs 4 and 5).

What needs attention, in order:

1. **One reliability problem.** One of two documents in a timestamp upload
   was stuck in `sealing` for 17.5 minutes with no signal, until a background
   sweep failed it. A retry then worked.
2. **Two behavior bugs.** Fields read with `GET` can't be written back with
   `PUT`, and one refusal returns the generic code `conflict` instead of a
   specific one.
3. **The OpenAPI document lags the docs.** Three documented query parameters
   are missing, and several types are looser than the real responses. That
   costs every integrator who generates a client, since most do.

## Bugs

Ranked by how much they would hurt an integrator.

| # | Bug | Impact | Suggested fix | Details |
| --- | --- | --- | --- | --- |
| 1 | A timestamp stayed `sealing` for 17.5 min while the other document in the same upload sealed in 71 s; a retry sealed it in 76 s | High: integrators can't tell a slow seal from a stuck one, and wait up to 18 min before they can retry | Find why the job was lost on stage; shorter stale limit for timestamps, or a `sealingStartedAt` field | Phase 8 |
| 2 | Fields from `GET …/recipients/{id}/fields` are refused by `PUT` on the same path: ids, `null`s, and an `autoFill` that signature and mobile fields don't take | High: the obvious "read, add one, write back" fails with `422`, and the fix is undocumented trial and error | Make `PUT` accept what `GET` returns; stop returning `autoFill` on types without it | Phase 6 |
| 3 | `PATCH …/recipients/{id}` on a voided envelope answers `409` with `code: "conflict"` and an internal-style message | Medium: integrators can't branch on it; every other refusal has a specific code | Map it to a specific code such as `envelope_not_active` | Phase 7 |
| 4 | `metadata[key]=value` is documented and works, but is missing from `GET /envelopes` and `GET /timestamps` in the OpenAPI document | Medium: generated clients need a cast; reference-only readers never learn the filter exists | Declare `metadata` as a `deepObject` query parameter | Phases 3, 8 |
| 5 | `?include=fields` on `GET /templates/{id}` is documented but missing from the OpenAPI document | Low–medium: same as above | Declare the parameter, as `GET /envelopes/{id}` already does | Phase 6 |

## Mismatches between the docs, the spec and the responses

| Item | What we saw | Details |
| --- | --- | --- |
| Statuses | Envelope and recipient `status` are plain `string` in the spec, not enums | Phase 2 |
| Always-present fields | `signers`, `approvers`, `viewers`, form-data `recipients` and `values` are always returned but not `required` in the spec | Phase 3 |
| Path parameters | `{envelope_id}` in the spec, `{envelopeId}` in the guide and `envelopeId` in every body | Phase 0 |
| Time precision | Docs promise milliseconds; responses have microseconds (`07:48:59.037663Z`) | Phase 4 |
| Event `createdAt` | Records when the background scanner picked the event up, not when it happened: events from envelopes sent 1.3 s apart are 1 µs apart | Phase 5 |
| Default field sizes | Docs say only landscape pages scale; portrait US Letter did too (signature 20 × 8.74, not 20 × 8) | Phase 2 |
| Templates (unconfirmed) | Docs list `shared`, `documents`, `roles` on list items and call a role's kind `roleType`; the spec has none of those and calls it `type`. No template existed to check a real response | Phase 6 |

## Smaller friction

- **Test mode:** for a team App, `/account` doesn't say who test envelopes may
  be emailed to, so you only find out at send time. The daily test counts
  have no reset time.
- **Drafts:** removing a draft's only document silently drops every field
  placed on it. There's no way to replace a document's file and keep its
  fields.
- **Errors:** a refused timestamp document is named by its position ("1"),
  not the file name the integrator gave.
- **Webhooks locally:** each new tunnel address must be re-registered by hand,
  with a new secret. Something like `stripe listen` would remove that.
- **Reference quirks:** `features.timestamps` is always `true`. The developer
  guide shows nothing without JavaScript, so link previews and AI coding
  assistants can't read it. TypeScript users need `--default-non-nullable
  false` with `openapi-typescript`, which the guide could mention.

## What worked well

- **Errors** have a stable `code`, a human `message` that says how to fix the
  problem, field-level `details` for validation, and a `requestId` that
  matches `X-Request-ID`.
- **Idempotency** keys on every write made retries safe with no extra code.
- **Embedded signing and sending** take one call each, and test keys may
  return to `http://localhost`, so they work locally with no setup.
- **Webhooks** follow Standard Webhooks exactly: a hand-signed delivery
  verified with the stock `standardwebhooks` library. `GET /events` lists 30
  days of events, so missed deliveries can be caught up.
- **Reads** are complete: form data works before anyone signs, the audit
  trail names who did what, and downloads are one-hour links.
- **The OpenAPI document** is public, needs no key, and generated usable types
  on the first try.

## Endpoint coverage

All 33 endpoints were called from the app against stage. "Refusal only"
means the documented error was confirmed but the success path couldn't be
triggered.

| Area | Endpoint | Result |
| --- | --- | --- |
| Setup | `GET /openapi.json`, `GET /account` | ✅ |
| Envelopes | `POST /envelopes` (draft and send), `GET /envelopes`, `GET /envelopes/{id}` | ✅ |
| | `PATCH /envelopes/{id}` (send, void, expiry, metadata), `DELETE /envelopes/{id}` | ✅ |
| Documents | `GET …/documents`, `POST …/documents`, `GET …/documents/{id}`, `DELETE …/documents/{id}` | ✅ |
| Recipients | `GET …/recipients`, `POST …/recipients`, `PATCH …/recipients/{id}`, `DELETE …/recipients/{id}` | ✅ (bug 3) |
| Fields | `GET …/recipients/{id}/fields`, `PUT …/recipients/{id}/fields` | ✅ (bug 2) |
| History | `GET …/form-data`, `GET …/audit-events` | ✅ |
| Actions | `POST …/reminders` | ✅ |
| | `POST /envelopes/{id}/sealing-attempts` | Refusal only: no envelope seal failed during testing |
| Embedded | `POST …/views/recipient`, `POST …/views/sender` | ✅ |
| Templates | `GET /templates`, `GET /templates/{id}` | Empty list and `404` only: no template in the test account |
| Timestamps | `POST /timestamps`, `GET /timestamps`, `GET /timestamps/{id}` | ✅ |
| | `GET …/document`, `GET …/audit-events`, `POST …/sealing-attempts` | ✅ (a real retry, bug 1) |
| Events | `GET /events`, `GET /events/{id}` | ✅ |
| Webhooks | Receiver with signature check | ✅ with locally signed deliveries; live delivery needs a public tunnel |

**Not testable with a test key:** `envelope.anchored` and `timestamp.anchored`
(live only), and live-mode credit spending (`402 insufficient_credits` was
only checked in the app's own logic).

## Next steps

1. Look into the stuck timestamp (bug 1). It may be a stage-only problem, but
   integrators need a way to tell slow from stuck either way.
2. Fix the fields round trip (bug 2) and the `conflict` code (bug 3).
3. Bring the OpenAPI document in line with the docs: the missing parameters,
   status enums, `required` fields, and camelCase path parameters.
4. Add a template to the test account and confirm the template shapes, the
   one open item here.
