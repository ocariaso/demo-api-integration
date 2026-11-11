import type { Status } from '../api';

const KEY_LABELS: Record<Status['keyMode'], string> = {
  test: 'Test key',
  live: 'Live key',
  missing: 'No API key',
  malformed: 'Unrecognized key',
};

export function StatusBar({ status, error, onRefresh }: { status: Status | null; error: string | null; onRefresh: () => void }) {
  if (!status && !error) return <div className="status muted">Checking connection…</div>;

  const keyOk = status?.keyMode === 'test' && !status.keyError;
  return (
    <div className="status">
      {error || !status ? (
        <span className="pill pill-bad">App server unreachable</span>
      ) : (
        <>
          <span className={`pill ${status.reachable ? 'pill-ok' : 'pill-bad'}`} title={status.apiBase}>
            {new URL(status.apiBase).host}{status.reachable ? '' : ' · unreachable'}
          </span>
          <span className={`pill ${keyOk ? 'pill-ok' : 'pill-bad'}`} title={status.key ?? undefined}>
            {status.keyError ?? KEY_LABELS[status.keyMode]}
          </span>
        </>
      )}
      <button className="link" onClick={onRefresh}>Refresh</button>
    </div>
  );
}
