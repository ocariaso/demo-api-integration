import { RequestFailed } from '../api';

type FieldError = { field: string; message: string };

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error instanceof RequestFailed ? error.error : { code: 'error', message: String(error) };
  const fieldErrors = (e as { details?: { errors?: FieldError[] } }).details?.errors ?? [];
  return (
    <div className="notice notice-bad">
      <strong>{e.code}</strong>: {e.message}
      {fieldErrors.map((f) => <div key={f.field}><code>{f.field}</code>: {f.message}</div>)}
      {'requestId' in e && e.requestId && <div className="muted small">Request ID {e.requestId}</div>}
    </div>
  );
}
