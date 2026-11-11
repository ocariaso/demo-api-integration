import { useEffect, useState } from 'react';
import { api, type Status } from './api';
import { AccountPanel } from './components/AccountPanel';
import { ApiLogDrawer } from './components/ApiLogDrawer';
import { OfferDetail } from './components/OfferDetail';
import { OfferForm } from './components/OfferForm';
import { Pipeline } from './components/Pipeline';
import { StatusBar } from './components/StatusBar';

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
        {status?.account && (
          <>
            <AccountPanel account={status.account} />
            <OfferForm account={status.account} onCreated={(o) => (setSelected(o.envelopeId), changed())} />
          </>
        )}
        <div className="board">
          <Pipeline version={version} selected={selected} onSelect={setSelected} />
          {selected && <OfferDetail key={`${selected}-${version}`} id={selected} onClose={() => setSelected(null)} onChanged={changed} />}
        </div>
      </main>
      <ApiLogDrawer />
    </div>
  );
}
