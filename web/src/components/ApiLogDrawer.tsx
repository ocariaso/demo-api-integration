import { useEffect, useState } from 'react';
import { api, type ApiLogEntry } from '../api';
import { onStream } from '../stream';

const tone = ({ status }: ApiLogEntry) => (!status || status >= 500 ? 'bad' : status >= 400 ? 'warn' : 'ok');

export function Json({ value }: { value: unknown }) {
  if (value == null || value === '') return <span className="muted">—</span>;
  return <pre>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>;
}

function EntryDetail({ entry }: { entry: ApiLogEntry }) {
  const meta: Record<string, string | number | null> = {
    URL: entry.url,
    'Idempotency-Key': entry.idempotencyKey,
    Attempt: entry.attempt > 1 ? entry.attempt : null,
    'Network error': entry.networkError,
    ...entry.responseHeaders,
  };
  return (
    <div className="log-detail">
      <div className="log-meta">
        {Object.entries(meta).map(([name, value]) => value != null && (
          <div key={name}><span className="muted">{name}</span> {value}</div>
        ))}
      </div>
      <div className="log-bodies">
        <div><h4>Request body</h4><Json value={entry.requestBody} /></div>
        <div><h4>Response body</h4><Json value={entry.responseBody} /></div>
      </div>
    </div>
  );
}

export function ApiLogDrawer() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    api<ApiLogEntry[]>('/api/log').then(setEntries, () => {});
    return onStream((event) => {
      if (event.type === 'clear') setEntries([]);
      if (event.type === 'entry') setEntries((current) => (current.some((e) => e.id === event.entry.id) ? current : [...current, event.entry]));
    });
  }, []);

  const notOk = entries.filter((e) => tone(e) !== 'ok').length;
  const current = entries.find((e) => e.id === selected);

  return (
    <div className="drawer">
      <button className="drawer-handle" onClick={() => setOpen(!open)} aria-expanded={open}>
        API log <span className="muted">{entries.length} calls</span>
        {notOk > 0 && <span className="pill pill-warn">{notOk} not OK</span>}
        <span className="drawer-chevron">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="drawer-body">
          <div className="log-list">
            <div className="log-toolbar">
              <button className="link" onClick={() => api('/api/log', { method: 'DELETE' })}>Clear</button>
            </div>
            {entries.length === 0 && <p className="muted pad">No calls yet.</p>}
            {entries.toReversed().map((entry) => (
              <button
                key={entry.id}
                className={`log-row ${entry.id === selected ? 'log-row-selected' : ''}`}
                onClick={() => setSelected(entry.id)}
              >
                <span className={`code code-${tone(entry)}`}>{entry.status ?? 'ERR'}</span>
                <span className="method">{entry.method}</span>
                <span className="path">{entry.path}</span>
                {entry.errorCode && <span className="err-code">{entry.errorCode}</span>}
                {entry.responseHeaders['idempotent-replayed'] === 'true' && <span className="pill">replayed</span>}
                <span className="muted dur">{entry.durationMs} ms</span>
              </button>
            ))}
          </div>
          <div className="log-pane">
            {current ? <EntryDetail entry={current} /> : <p className="muted pad">Select a call to see it in full.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
