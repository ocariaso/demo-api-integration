import type { components } from '../server/src/twala/schema.js';

export type Account = components['schemas']['AccountOutput'];
export type Envelope = components['schemas']['EnvelopeOutput'];
export type EnvelopePage = components['schemas']['PaginatedResponse_EnvelopeOutput_'];
export type TwalaEvent = components['schemas']['EventOutput'];
export type EventPage = components['schemas']['PaginatedResponse_EventOutput_'];

export interface OfferDetail {
  envelope: Envelope;
  recipients: components['schemas']['RecipientsOutput'];
  documents: components['schemas']['DocumentOutput'][];
  history: components['schemas']['AuditEventOutput'][];
  formData: components['schemas']['FormDataOutput'];
}

export interface OfferInput {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  salary: number;
  startDate: string;
  managerName: string;
  managerEmail: string;
  send: boolean;
  templateId?: string;
  replaces?: string;
}

export interface OfferUpdate {
  expiresAt?: string | null;
  note?: string;
}

export interface DraftRecipientInput {
  group: 'approvers' | 'viewers';
  name: string;
  email: string;
  embedded: boolean;
}

export type FieldInput = components['schemas']['FieldsReplaceInput']['fields'][number];
export type Field = components['schemas']['FieldOutput'];
export interface RequirementUpload {
  requirement: string;
  name: string;
  base64: string;
}

export type Timestamp = components['schemas']['TimestampOutput'];
export type TimestampPage = components['schemas']['PaginatedResponse_TimestampOutput_'];
export interface TimestampDetail {
  timestamp: Timestamp;
  history: components['schemas']['TimestampEventOutput'][];
}
export type TemplateSummary = components['schemas']['TemplateSummaryOutput'];
export type Template = components['schemas']['TemplateOutput'];

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

export type LogEvent = { type: 'entry'; entry: ApiLogEntry } | { type: 'clear' } | { type: 'webhook'; event: TwalaEvent };

export interface Status {
  apiBase: string;
  keyMode: 'test' | 'live' | 'missing' | 'malformed';
  key: string | undefined;
  reachable: boolean;
  keyError: string | null;
  account: Account | null;
  webhooks: boolean;
}
