import { useEffect, useState } from 'react';
import { api, type EnvelopePage } from '../api';
import { candidate, dateTime, label, STATUS_TONE } from '../format';
import { ErrorNotice } from './ErrorNotice';

const FILTERS = [
  { name: 'All', status: '' },
  { name: 'Drafts', status: 'draft' },
  { name: 'Awaiting signature', status: 'pending,in_progress' },
  { name: 'Completed', status: 'completed' },
  { name: 'Closed', status: 'declined,voided,expired,sealing_failed' },
];

export function Pipeline({ version, selected, onSelect }: { version: number; selected: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EnvelopePage | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setError(null);
    api<EnvelopePage>(`/api/offers?status=${filter}&page=${page}`).then(setData, setError);
  }, [filter, page, version]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Candidates</h2>
        <span className="muted small">{data ? `${data.total} offers` : 'Loading…'}</span>
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.name} className={`chip ${filter === f.status ? 'chip-on' : ''}`} onClick={() => (setFilter(f.status), setPage(1))}>
            {f.name}
          </button>
        ))}
      </div>
      <ErrorNotice error={error} />
      {data?.items.length === 0 && <p className="muted">No offers here yet.</p>}
      <div className="rows">
        {data?.items.map((e) => (
          <button key={e.envelopeId} className={`row ${selected === e.envelopeId ? 'row-on' : ''}`} onClick={() => onSelect(e.envelopeId)}>
            <span>
              <strong>{candidate(e)?.name ?? e.name}</strong>
              <span className="muted small"> · {e.metadata?.jobTitle ?? '—'}</span>
            </span>
            <span className="muted small">{dateTime(e.updatedAt)}</span>
            <span className={`pill ${STATUS_TONE[e.status] ?? ''}`}>{label(e.status)}</span>
          </button>
        ))}
      </div>
      {data && data.pages > 1 && (
        <div className="actions">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted small">Page {data.page} of {data.pages}</span>
          <button className="btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
