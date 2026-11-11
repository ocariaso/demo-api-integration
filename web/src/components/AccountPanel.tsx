import type { Account } from '../api';
import { sendBlocker } from '../account';

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  return (
    <div className="usage">
      <div className="usage-label"><span>{label}</span><span className="muted">{used} / {max}</span></div>
      <progress value={used} max={max} />
    </div>
  );
}

export function AccountPanel({ account }: { account: Account }) {
  const { app, mode, sender, credits, features, limits } = account;
  const blocker = sendBlocker(account);

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{app.name}</h2>
          <p className="muted">
            Demo app · Sends as {sender.name} · {sender.email}
          </p>
        </div>
        <span className={`pill ${mode === 'test' ? 'pill-warn' : 'pill-ok'}`}>{mode === 'test' ? 'Test mode' : 'Live'}</span>
      </div>

      {blocker && <p className="notice notice-bad">{blocker}</p>}

      <dl className="facts">
        <div><dt>API credits</dt><dd>{credits.balance}</dd></div>
        <div><dt>Documents per envelope</dt><dd>{limits.documentsPerEnvelope ?? 'No limit'}</dd></div>
        <div><dt>Recipients per envelope</dt><dd>{limits.recipientsPerEnvelope}</dd></div>
        <div><dt>Fields per envelope</dt><dd>{limits.fieldsPerEnvelope}</dd></div>
        <div><dt>Largest PDF</dt><dd>{mb(limits.fileSizeBytes)}</dd></div>
        <div><dt>Identity verification</dt><dd>{features.identityVerification ? 'Available' : 'Not available'}</dd></div>
      </dl>

      {mode === 'test' && (
        <div className="usages">
          <Usage label="Test envelopes today" used={limits.testEnvelopesToday} max={limits.testEnvelopesPerDay} />
          <Usage label="Test timestamps today" used={limits.testTimestampsToday} max={limits.testTimestampsPerDay} />
        </div>
      )}
    </section>
  );
}
