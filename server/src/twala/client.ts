import { randomUUID } from 'node:crypto';
import createClient from 'openapi-fetch';
import { config } from '../config.js';
import { clip, pickHeaders, record } from '../apiLog.js';
import type { components, paths } from './schema.js';

type ApiErrorOutput = components['schemas']['ApiErrorOutput'];

export class TwalaApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null = null,
    readonly details: unknown = null,
  ) {
    super(message);
  }
}

const MAX_ATTEMPTS = 3;
const basePath = new URL(config.apiBase).pathname;

const takesIdempotencyKey = (method: string, path: string) =>
  method === 'POST' || (method === 'PATCH' && /^\/envelopes\/[^/]+$/.test(path));

// Unkeyed writes are retried only when Twala refused them before doing any work.
function shouldRetry(method: string, keyed: boolean, status: number | null, code: string | null) {
  if (status === 429 || status === 503 || code === 'idempotency_key_in_progress') return true;
  const safe = keyed || method === 'GET' || method === 'PUT' || method === 'DELETE';
  return safe && (status === null || status >= 500);
}

async function describeBody(request: Request) {
  if (!request.body) return null;
  const copy = request.clone();
  return request.headers.get('content-type')?.startsWith('multipart/')
    ? `[multipart body, ${(await copy.arrayBuffer()).byteLength} bytes]`
    : clip(await copy.text());
}

export async function twalaFetch(input: Request): Promise<Response> {
  const url = new URL(input.url);
  const method = input.method;
  const path = url.pathname.slice(basePath.length) || '/';

  const headers = new Headers(input.headers);
  if (config.apiKey) headers.set('Authorization', `Bearer ${config.apiKey}`);
  const keyed = takesIdempotencyKey(method, path);
  if (keyed && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', randomUUID());

  const request = new Request(input, { headers });
  const requestBody = await describeBody(request);

  for (let attempt = 1; ; attempt++) {
    const startedAt = Date.now();
    let response: Response | null = null;
    let networkError: string | null = null;
    try {
      response = await fetch(request.clone());
    } catch (err) {
      networkError = String(err);
    }

    const responseBody = response && clip(await response.clone().text());
    const errorCode = (response && !response.ok && (responseBody as ApiErrorOutput | null)?.code) || null;
    const status = response?.status ?? null;

    record({
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      method,
      url: url.href,
      path: path + url.search,
      attempt,
      idempotencyKey: headers.get('Idempotency-Key'),
      requestBody,
      status,
      responseHeaders: response ? pickHeaders(response.headers) : {},
      responseBody,
      errorCode,
      networkError,
    });

    if (attempt < MAX_ATTEMPTS && shouldRetry(method, keyed, status, errorCode)) {
      const retryAfter = Number(response?.headers.get('retry-after')) * 1000 || 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 10_000)));
      continue;
    }
    if (!response) throw new TwalaApiError(0, 'network_error', networkError!);
    return response;
  }
}

export const twala = createClient<paths>({ baseUrl: config.apiBase, fetch: twalaFetch });

export async function unwrap<D>(pending: Promise<{ data?: D; error?: unknown; response: Response }>): Promise<D> {
  const { data, error, response } = await pending;
  if (response.ok) return data as D;
  const body = (error ?? {}) as Partial<ApiErrorOutput>;
  throw new TwalaApiError(
    response.status,
    body.code ?? 'unknown_error',
    body.message ?? `Twala answered ${response.status}`,
    body.requestId ?? response.headers.get('x-request-id'),
    body.details,
  );
}
