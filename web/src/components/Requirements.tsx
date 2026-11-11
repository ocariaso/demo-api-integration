import { useEffect, useState } from 'react';
import { api, type RequirementUpload, type Timestamp, type TimestampDetail, type TimestampPage } from '../api';
import { dateTime, label } from '../format';
import { toBase64 } from './DraftTools';
import { ErrorNotice } from './ErrorNotice';

const REQUIREMENTS = [
  { key: 'nbi', name: 'NBI clearance' },
  { key: 'medical', name: 'Medical certificate' },
  { key: 'diploma', name: 'Diploma or transcript' },
];

const TONE: Record<string, string> = { completed: 'pill-ok', sealing: 'pill-warn', sealing_failed: 'pill-bad' };
const STATUS: Record<string, string> = { completed: 'Timestamped', sealing: 'Sealing…', sealing_failed: 'Sealing failed' };

export function Requirements({ offerId }: { offerId: string }) {
  const [items, setItems] = useState<Timestamp[]>([]);
  const [open, setOpen] = useState<TimestampDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = () => api<TimestampPage>(`/api/offers/${offerId}/requirements`).then((p) => setItems(p.items), setError);
  useEffect(() => void load(), [offerId]);
  // Sealing is asynchronous, so check back until nothing is still sealing.
  useEffect(() => {
    if (!items.some((t) => t.status === 'sealing')) return;
    const timer = setTimeout(load, 5000);
    return () => clearTimeout(timer);
  }, [items]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const upload = (key: string, files: FileList | null) =>
    files?.length &&
    act(async () => {
      const body: RequirementUpload[] = await Promise.all([...files].map(async (f) => ({ requirement: key, name: f.name, base64: await toBase64(f) })));
      await api(`/api/offers/${offerId}/requirements`, { method: 'POST', body: JSON.stringify(body) });
    });

  const toggle = (id: string) => (open?.timestamp.timestampId === id ? setOpen(null) : api<TimestampDetail>(`/api/timestamps/${id}`).then(setOpen, setError));

  return (
    <div>
      <h4>Requirements</h4>
      <ErrorNotice error={error} />
      {REQUIREMENTS.map(({ key, name }) => {
        const latest = items.find((t) => t.metadata?.requirement === key);
        return (
          <div key={key} className="line-group">
            <div className="line">
              <span className="small">{name}</span>
              <span className="head-actions">
                {latest?.status === 'completed' && (
                  <a className="link small" href={`/api/timestamps/${latest.timestampId}/document`} target="_blank" rel="noreferrer">Sealed copy</a>
                )}
                {latest?.status === 'sealing_failed' && (
                  <button className="link small" disabled={busy} onClick={() => act(() => api(`/api/timestamps/${latest.timestampId}/sealing-attempts`, { method: 'POST' }))}>
                    Retry
                  </button>
                )}
                {latest && <button className="link small" onClick={() => toggle(latest.timestampId)}>Details</button>}
                <label className="link small file">
                  {latest ? 'Upload again' : 'Upload'}
                  <input type="file" accept="application/pdf" hidden disabled={busy} onChange={(e) => (upload(key, e.target.files), (e.target.value = ''))} />
                </label>
                <span className={`pill ${latest ? (TONE[latest.status] ?? '') : ''}`}>{latest ? (STATUS[latest.status] ?? label(latest.status)) : 'Missing'}</span>
              </span>
            </div>
            {open && open.timestamp.timestampId === latest?.timestampId && (
              <div className="notice small">
                <div>{open.timestamp.name} · SHA-256 {open.timestamp.sha256 ?? 'not sealed yet'}</div>
                {open.history.map((h, i) => (
                  <div key={i} className="line">
                    <span>{label(h.action)}</span>
                    <span className="muted">{dateTime(h.occurredAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
