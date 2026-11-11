import type { Account } from './api';

export function sendBlocker({ mode, credits, limits }: Account): string | null {
  if (mode === 'live' && credits.balance < 1) {
    return `Sending needs 1 API credit and the account has ${credits.balance}. Buy API credits in Twala.`;
  }
  if (mode === 'test' && limits.testEnvelopesToday >= limits.testEnvelopesPerDay) {
    return `All ${limits.testEnvelopesPerDay} test envelopes for today are used. The count resets at midnight Philippine time.`;
  }
  return null;
}
