import { EventEmitter } from 'node:events';
import { config } from './config.js';
import type { ApiLogEntry, LogEvent } from '../../shared/types.js';

const SURFACED_HEADERS = [
  'x-request-id',
  'idempotent-replayed',
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset',
  'retry-after',
  'deprecation',
  'sunset',
];
const MAX_BODY_CHARS = 20_000;

let nextId = 1;
const entries: ApiLogEntry[] = [];
const events = new EventEmitter().setMaxListeners(50);

export const pickHeaders = (headers: Headers) =>
  Object.fromEntries(SURFACED_HEADERS.flatMap((name) => (headers.has(name) ? [[name, headers.get(name)!]] : [])));

export function clip(text: string): unknown {
  if (text.length > MAX_BODY_CHARS) return `${text.slice(0, MAX_BODY_CHARS)}… [${text.length - MAX_BODY_CHARS} more characters]`;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function record(entry: Omit<ApiLogEntry, 'id'>) {
  const full = { id: nextId++, ...entry };
  if (entries.push(full) > config.logLimit) entries.shift();
  events.emit('log', { type: 'entry', entry: full } satisfies LogEvent);
}

export const recent = () => entries;

export function clear() {
  entries.length = 0;
  events.emit('log', { type: 'clear' } satisfies LogEvent);
}

export function subscribe(listener: (event: LogEvent) => void) {
  events.on('log', listener);
  return () => events.off('log', listener);
}
