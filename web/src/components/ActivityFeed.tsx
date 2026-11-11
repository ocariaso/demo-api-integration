import { useEffect, useState } from 'react';
import { api, type EventPage, type TwalaEvent } from '../api';
import { dateTime, label } from '../format';
import { Json } from './ApiLogDrawer';
import { ErrorNotice } from './ErrorNotice';

type Page = EventPage & { received: string[] };

export function ActivityFeed({ version, webhooks }: { version: number; webhooks: boolean }) {
  const [page, setPage] = useState<Page | null>(null);
  const [open, setOpen] = useState<TwalaEvent | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = () => api<Page>('/api/events').then(setPage, setError);
  useEffect(() => void load(), [version]);

  const toggle = (id: string) => (open?.id === id ? setOpen(null) : api<TwalaEvent>(`/api/events/${id}`).then(setOpen, setError));

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Activity</h2>
          <p className="muted small">
            {webhooks ? 'Webhooks on: new events refresh the app as they arrive.' : 'Webhooks off: set TWALA_WEBHOOK_SECRET to get live updates.'}
          </p>
        </div>
        <button className="link" onClick={load}>Refresh</button>
      </div>
      <ErrorNotice error={error} />
      {page?.items.length === 0 && <p className="muted">No events in the last 30 days.</p>}
      <div className="rows">
        {page?.items.map((e) => {
          const envelope = e.data.envelope as { name?: string } | undefined;
          const recipient = e.data.recipient as { name?: string } | undefined;
          return (
            <div key={e.id}>
              <button className={`row ${open?.id === e.id ? 'row-on' : ''}`} onClick={() => toggle(e.id)}>
                <span>
                  <strong>{label(e.type)}</strong>
                  <span className="muted small"> · {recipient?.name ?? envelope?.name ?? e.id}</span>
                </span>
                <span className="muted small">{dateTime(e.createdAt)}</span>
                {webhooks && <span className={`pill ${page.received.includes(e.id) ? 'pill-ok' : ''}`}>{page.received.includes(e.id) ? 'Webhook' : 'Not delivered'}</span>}
              </button>
              {open?.id === e.id && <div className="event-body"><Json value={open} /></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
