export type { Account, ApiLogEntry, LogEvent, Status } from '../../shared/types';

export interface AppError {
  source: 'twala' | 'app';
  status?: number;
  code: string;
  message: string;
  requestId?: string | null;
  details?: unknown;
}

export class RequestFailed extends Error {
  constructor(readonly error: AppError) {
    super(error.message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new RequestFailed(body ?? { source: 'app', code: 'http_error', message: `Request failed with ${response.status}` });
  return body as T;
}
