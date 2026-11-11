import { useEffect, useState } from 'react';
import { api, type OfferDetail as Detail } from '../api';
import { dateTime, label, STATUS_TONE } from '../format';
import { ErrorNotice } from './ErrorNotice';

type Value = NonNullable<NonNullable<Detail['formData']['recipients']>[number]['values']>[number];

const shown = (v: Value) => v.value ?? (v.checked !== undefined ? (v.checked ? 'Checked' : 'Unchecked') : v.filled ? 'Signed' : '—');

export function OfferDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = () => api<Detail>(`/api/offers/${id}`).then(setDetail, setError);
  useEffect(() => {
    setDetail(null);
    setError(null);
    load();
  }, [id]);

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!detail) {
    return (
      <section className="card">
        {error ? <ErrorNotice error={error} /> : <p className="muted">Loading offer…</p>}
      </section>
    );
  }

  const { envelope, recipients, documents, history, formData } = detail;
  const signers = recipients.signers ?? [];
  const candidate = signers.find((r) => r.recipientId === 'candidate');
  const candidateTurn = ['pending', 'in_progress'].includes(envelope.status) && ['notified', 'opened'].includes(candidate?.status ?? '');
  const openView = async (view: 'signing' | 'sending') => {
    setBusy(true);
    setError(null);
    try {
      window.location.assign((await api<{ url: string }>(`/api/offers/${id}/views/${view}`, { method: 'POST' })).url);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{envelope.name}</h2>
          <p className="muted small">{envelope.envelopeId}</p>
        </div>
        <div className="head-actions">
          <span className={`pill ${STATUS_TONE[envelope.status] ?? ''}`}>{label(envelope.status)}</span>
          <button className="link" onClick={onClose}>Close</button>
        </div>
      </div>

      <ErrorNotice error={error} />
      {candidateTurn && (
        <div className="actions">
          <button className="btn btn-primary" disabled={busy} onClick={() => openView('signing')}>Sign as candidate</button>
        </div>
      )}
      {envelope.status === 'draft' && (
        <div className="actions">
          <button className="btn" disabled={busy} onClick={() => run(() => api(`/api/offers/${id}`, { method: 'DELETE' }), onClose)}>
            Delete draft
          </button>
          <button className="btn" disabled={busy} onClick={() => openView('sending')}>Review in Twala</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api(`/api/offers/${id}/send`, { method: 'POST' }), load)}>
            Send offer
          </button>
        </div>
      )}

      <div>
        <h4>Signing order</h4>
        <ol className="recipients">
          {signers.map((r) => (
            <li key={r.recipientIdGuid}>
              <span>{r.name} <span className="muted">· {r.deliveryMethod === 'embedded' ? 'signs in this app' : r.email}</span></span>
              <span className={`pill ${STATUS_TONE[r.status] ?? ''}`}>{label(r.status)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4>Documents</h4>
        {documents.map((d) => (
          <div key={d.documentIdGuid} className="line">
            <a className="link" href={`/api/offers/${id}/documents/${d.documentId}`} target="_blank" rel="noreferrer">{d.name}</a>
            <span className="muted small">{d.sealed ? 'Signed copy' : 'Original'} · {Math.ceil((d.sizeBytes ?? 0) / 1024)} KB</span>
          </div>
        ))}
      </div>

      <div>
        <h4>Form data</h4>
        {formData.recipients?.map((r) => (
          <div key={r.recipientIdGuid} className="line-group">
            <span className="small">{r.name}</span>
            {r.values?.map((v) => (
              <div key={v.fieldId} className="line">
                <span className="muted small">{v.label ?? v.fieldKey ?? label(v.type)}</span>
                <span className="small">{shown(v)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div>
        <h4>History</h4>
        {history.map((h, i) => (
          <div key={i} className="line">
            <span className="small">{label(h.action)}{h.actor?.name ? ` · ${h.actor.name}` : ''}</span>
            <span className="muted small">{dateTime(h.occurredAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
