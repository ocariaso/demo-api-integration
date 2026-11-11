const MESSAGES: Record<string, [string, 'ok' | 'warn']> = {
  signing_complete: ['The candidate signed the offer.', 'ok'],
  decline: ['The candidate declined the offer.', 'warn'],
  send_complete: ["The offer was sent from Twala's editor.", 'ok'],
  save: ["The draft was saved in Twala's editor.", 'ok'],
  session_timeout: ['The session timed out.', 'warn'],
  ttl_expired: ['The link had expired or was already used. Open it again.', 'warn'],
  exception: ['Something went wrong in Twala.', 'warn'],
};

export interface ReturnEvent {
  envelopeId: string | null;
  message: string;
  tone: 'ok' | 'warn';
}

// Twala's return is only a hint, so callers confirm by reading the envelope.
export function takeReturnEvent(): ReturnEvent | null {
  const params = new URLSearchParams(window.location.search);
  const event = params.get('event');
  if (!event) return null;
  window.history.replaceState(null, '', '/');
  const cancel = params.get('view') === 'sending' ? "Twala's editor was closed without saving." : 'The candidate chose to finish later.';
  const [message, tone] = event === 'cancel' ? [cancel, 'warn' as const] : (MESSAGES[event] ?? [`Returned with "${event}".`, 'warn' as const]);
  return { envelopeId: params.get('envelopeId'), message, tone };
}
