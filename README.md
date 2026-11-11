# Hiring desk

A demo HR hiring desk built on the [Twala API](https://platform-stage.twala.ai/developer-guide).
It covers every endpoint so we can test two things: whether the API works as
documented, and how easy it is to integrate. Findings go in
[docs/dx-findings.md](docs/dx-findings.md).

## How it fits together

```
browser (React, :5180)  →  app server (Express, :3180)  →  Twala API
                              holds the API key
                              logs every call
```

Twala API keys are for servers only, and the API sends no CORS headers to
other sites. So the browser never talks to Twala directly. The app server
holds the key and makes every call.

- `server/src/twala/client.ts` is a typed client generated from Twala's
  OpenAPI document. It adds the `Authorization` header, adds an
  `Idempotency-Key` to every `POST` and to `PATCH /envelopes/{id}`, retries
  only when retrying is safe, and records every attempt.
- `server/src/twala/schema.d.ts` is generated. Regenerate it with
  `npm run gen:api`, which reads `openapi.json` from `TWALA_API_BASE`.
- The **API log** drawer at the bottom of the app shows each call with its
  status, error `code`, `X-Request-ID`, rate-limit headers, idempotency key,
  and request and response bodies.

## Running it

Requires Node 22 or later.

```bash
cp .env.example .env     # then paste a test key into TWALA_API_KEY
npm install
npm run dev              # server on :3180, UI on http://localhost:5180
```

### Webhooks (optional)

Twala only delivers webhooks to a public HTTPS address, so expose the app
server with a tunnel:

1. Run `npm run tunnel` in a second terminal and copy the
   `https://….trycloudflare.com` address it prints.
2. In Twala: **Apps** → your App → **Webhook endpoints** → add
   `<tunnel address>/webhooks/twala` in **Test** mode, for all events.
3. Copy the endpoint's signing secret into `.env` as `TWALA_WEBHOOK_SECRET`,
   then restart `npm run dev`.

A quick tunnel gets a new address each time it starts, so update the endpoint
in Twala when you restart it. Without webhooks, the **Activity** feed still
lists every event from `GET /events`; click **Refresh** to catch up.

Other scripts:

| Script | Does |
| --- | --- |
| `npm run gen:api` | Regenerate API types from the OpenAPI document |
| `npm run typecheck` | Type-check the server and the UI |
| `npm run build` | Build the UI into `web/dist` |
| `npm run tunnel` | Expose the app server on a public HTTPS address for webhooks |

## Build phases

| # | Phase | Endpoints |
| --- | --- | --- |
| 0 | Scaffold: client, API log, config | `openapi.json` |
| 1 | Account panel and credits | `GET /account` |
| 2 | Send offer letter | `POST /envelopes`, `PATCH /envelopes/{id}`, `DELETE /envelopes/{id}` |
| 3 | Candidate pipeline | `GET /envelopes`, envelope, recipients, documents, document download, audit events, form data |
| 4 | Embedded signing and sending | `views/recipient`, `views/sender` |
| 5 | Live status | `GET /events`, `GET /events/{id}`, webhooks |
| 6 | Drafts and templates | add/remove documents and recipients, get/replace fields, templates |
| 7 | Fixes and nudges | correct a recipient, reminders, void, expiry, metadata, sealing retries |
| 8 | Pre-employment requirements | timestamps |
| 9 | Developer-experience report | — |
