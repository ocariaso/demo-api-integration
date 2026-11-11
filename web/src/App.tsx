import { useEffect, useState } from 'react';
import { api, type Status } from './api';
import { AccountPanel } from './components/AccountPanel';
import { ApiLogDrawer } from './components/ApiLogDrawer';
import { StatusBar } from './components/StatusBar';

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const refresh = () => {
    setStatusError(null);
    api<Status>('/api/status').then(setStatus, (err: Error) => setStatusError(err.message));
  };
  useEffect(refresh, []);

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
        {status?.account && <AccountPanel account={status.account} />}
        <section className="placeholder">
          <h1>Candidates</h1>
          <p>The pipeline arrives in a later phase. Open the API log below to see every call this app makes to Twala.</p>
        </section>
      </main>
      <ApiLogDrawer />
    </div>
  );
}
