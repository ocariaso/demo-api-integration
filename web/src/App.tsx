import { useEffect, useState } from 'react';
import { api, type Status } from './api';
import { AccountPanel } from './components/AccountPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { ApiLogDrawer } from './components/ApiLogDrawer';
import { OfferDetail } from './components/OfferDetail';
import { OfferForm } from './components/OfferForm';
import { Pipeline } from './components/Pipeline';
import { StatusBar } from './components/StatusBar';
import { takeReturnEvent } from './returnEvent';
import { onStream } from './stream';

const returned = takeReturnEvent();

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(returned?.envelopeId ?? null);
  const [banner, setBanner] = useState(returned);
  const [version, setVersion] = useState(0);

  const refresh = () => {
    setStatusError(null);
    api<Status>('/api/status').then(setStatus, (err: Error) => setStatusError(err.message));
  };
  useEffect(refresh, []);

  const changed = () => {
    setVersion((v) => v + 1);
    refresh();
  };
  useEffect(() => onStream((event) => event.type === 'webhook' && changed()), []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">H</span>
          Hiring desk
        </div>
        <StatusBar status={status} error={statusError} onRefresh={refresh} />
      </header>
      <main className="content">
        {banner && (
          <div className={`notice notice-${banner.tone} banner`}>
            <span>{banner.message} The status below is read from Twala.</span>
            <button className="link" onClick={() => setBanner(null)}>Dismiss</button>
          </div>
        )}
        {status?.account && (
          <>
            <AccountPanel account={status.account} />
            <OfferForm account={status.account} onCreated={(o) => (setSelected(o.envelopeId), changed())} />
          </>
        )}
        <div className="board">
          <Pipeline version={version} selected={selected} onSelect={setSelected} />
          {selected && <OfferDetail key={`${selected}-${version}`} id={selected} onClose={() => setSelected(null)} onChanged={changed} onSelect={setSelected} />}
        </div>
        <ActivityFeed version={version} webhooks={!!status?.webhooks} />
      </main>
      <ApiLogDrawer />
    </div>
  );
}
