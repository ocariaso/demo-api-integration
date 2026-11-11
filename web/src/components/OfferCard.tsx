import { useState } from 'react';
import { api, type Envelope } from '../api';
import { ErrorNotice } from './ErrorNotice';

export const STATUS_TONE: Record<string, string> = {
  draft: '',
  pending: 'pill-warn',
  in_progress: 'pill-warn',
  sealing: 'pill-warn',
  completed: 'pill-ok',
  sealing_failed: 'pill-bad',
  declined: 'pill-bad',
  voided: 'pill-bad',
  expired: 'pill-bad',
};

export const label = (status: string) => (status.charAt(0).toUpperCase() + status.slice(1)).replace('_', ' ');

export function OfferCard({ envelope, onChange }: { envelope: Envelope; onChange: (envelope: Envelope | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async (action: () => Promise<Envelope | null>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const send = () => run(() => api<Envelope>(`/api/offers/${envelope.envelopeId}/send`, { method: 'POST' }));
  const remove = () => run(async () => (await api(`/api/offers/${envelope.envelopeId}`, { method: 'DELETE' }), null));

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h2>{envelope.name}</h2>
          <p className="muted small">{envelope.envelopeId}</p>
        </div>
        <span className={`pill ${STATUS_TONE[envelope.status] ?? ''}`}>{label(envelope.status)}</span>
      </div>
      <ol className="recipients">
        {envelope.recipients.signers?.map((r) => (
          <li key={r.recipientIdGuid}>
            <span>{r.name} <span className="muted">· {r.email}</span></span>
            <span className="muted">{r.deliveryMethod === 'embedded' ? 'Signs in this app' : 'Signs by email'} · {label(r.status)}</span>
          </li>
        ))}
      </ol>
      <ErrorNotice error={error} />
      {envelope.status === 'draft' && (
        <div className="actions">
          <button className="btn" onClick={remove} disabled={busy}>Delete draft</button>
          <button className="btn btn-primary" onClick={send} disabled={busy}>Send offer</button>
        </div>
      )}
    </article>
  );
}
