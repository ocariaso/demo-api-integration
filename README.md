# Acme hiring desk

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

Other scripts:

| Script | Does |
| --- | --- |
| `npm run gen:api` | Regenerate API types from the OpenAPI document |
| `npm run typecheck` | Type-check the server and the UI |
| `npm run build` | Build the UI into `web/dist` |

## Build phases

| # | Phase | Endpoints |
| --- | --- | --- |
| 0 | Scaffold: client, API log, config | `openapi.json` |
| 1 | Account header and credits | `GET /account` |
| 2 | Send offer letter | `POST /envelopes`, test mode |
| 3 | Candidate pipeline | `GET /envelopes`, `GET /envelopes/{id}` |
| 4 | Embedded sending and signing | `views/sender`, `views/recipient` |
| 5 | Live status | `/events`, webhooks |
| 6 | Fixes and nudges | reminders, recipients, `PATCH /envelopes/{id}` |
| 7 | Onboarding documents | second envelope, documents, timestamps |
| 8 | Developer-experience report | — |
