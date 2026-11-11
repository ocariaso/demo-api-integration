import type { components } from '../server/src/twala/schema.js';

export type Account = components['schemas']['AccountOutput'];
export type Envelope = components['schemas']['EnvelopeOutput'];

export interface OfferInput {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  salary: number;
  startDate: string;
  managerName: string;
  managerEmail: string;
  send: boolean;
}

export interface ApiLogEntry {
  id: number;
  startedAt: string;
  durationMs: number;
  method: string;
  url: string;
  path: string;
  attempt: number;
  idempotencyKey: string | null;
  requestBody: unknown;
  status: number | null;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  errorCode: string | null;
  networkError: string | null;
}

export type LogEvent = { type: 'entry'; entry: ApiLogEntry } | { type: 'clear' };

export interface Status {
  apiBase: string;
  keyMode: 'test' | 'live' | 'missing' | 'malformed';
  key: string | undefined;
  reachable: boolean;
  keyError: string | null;
  account: Account | null;
}
