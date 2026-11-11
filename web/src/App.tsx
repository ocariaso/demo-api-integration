import { useEffect, useState } from 'react';
import { api, type Envelope, type Status } from './api';
import { AccountPanel } from './components/AccountPanel';
import { ApiLogDrawer } from './components/ApiLogDrawer';
import { OfferCard } from './components/OfferCard';
import { OfferForm } from './components/OfferForm';
import { StatusBar } from './components/StatusBar';

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [offers, setOffers] = useState<Envelope[]>([]);

  const refresh = () => {
    setStatusError(null);
    api<Status>('/api/status').then(setStatus, (err: Error) => setStatusError(err.message));
  };
  useEffect(refresh, []);

  const update = (id: string, next: Envelope | null) => {
    setOffers((list) => (next ? list.map((o) => (o.envelopeId === id ? next : o)) : list.filter((o) => o.envelopeId !== id)));
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
            <OfferForm account={status.account} onCreated={(o) => (setOffers((list) => [o, ...list]), refresh())} />
          </>
        )}
        {offers.map((o) => <OfferCard key={o.envelopeId} envelope={o} onChange={(next) => update(o.envelopeId, next)} />)}
      </main>
      <ApiLogDrawer />
    </div>
  );
}
