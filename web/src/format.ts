import type { Envelope } from './api';

export const STATUS_TONE: Record<string, string> = {
  pending: 'pill-warn',
  in_progress: 'pill-warn',
  sealing: 'pill-warn',
  notified: 'pill-warn',
  opened: 'pill-warn',
  completed: 'pill-ok',
  sealing_failed: 'pill-bad',
  declined: 'pill-bad',
  voided: 'pill-bad',
  expired: 'pill-bad',
};

export const label = (value: string) => (value.charAt(0).toUpperCase() + value.slice(1)).replaceAll(/[_.]/g, ' ');

export const dateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const candidate = (envelope: Envelope) =>
  envelope.recipients.signers?.find((r) => r.recipientId === 'candidate') ?? envelope.recipients.signers?.[0];
