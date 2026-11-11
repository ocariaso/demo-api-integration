import { useEffect, useState, type FormEvent } from 'react';
import { api, type Account, type Envelope, type OfferInput, type Template, type TemplateSummary } from '../api';
import { sendBlocker } from '../account';
import { ErrorNotice } from './ErrorNotice';

type Fields = Omit<OfferInput, 'send' | 'salary' | 'templateId'> & { salary: string };

const FIELDS: { key: keyof Fields; label: string; type?: string }[] = [
  { key: 'candidateName', label: 'Candidate name' },
  { key: 'candidateEmail', label: 'Candidate email', type: 'email' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'salary', label: 'Monthly salary (PHP)', type: 'number' },
  { key: 'startDate', label: 'Start date', type: 'date' },
  { key: 'managerName', label: 'Hiring manager name' },
  { key: 'managerEmail', label: 'Hiring manager email', type: 'email' },
];

// Mirrors the server: signers and approvers in routing order fill the candidate, then the hiring manager.
const roleMap = (template: Template) => {
  let filled = 0;
  return [...(template.roles ?? [])]
    .sort((a, b) => a.routingOrder - b.routingOrder)
    .map((role) => ({ role, fills: role.type === 'viewer' ? 'not filled' : (['Candidate', 'Hiring manager'][filled++] ?? 'not filled') }));
};

export function OfferForm({ account, onCreated }: { account: Account; onCreated: (envelope: Envelope) => void }) {
  const [fields, setFields] = useState<Fields>({
    candidateName: '',
    candidateEmail: '',
    jobTitle: '',
    salary: '',
    startDate: '',
    managerName: account.sender.name,
    managerEmail: account.sender.email,
  });
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const blocker = sendBlocker(account);

  useEffect(() => void api<{ items: TemplateSummary[] }>('/api/templates').then((p) => setTemplates(p.items), setError), []);
  useEffect(() => {
    setTemplate(null);
    if (templateId) api<Template>(`/api/templates/${templateId}`).then(setTemplate, setError);
  }, [templateId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const send = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'send';
    setBusy(true);
    setError(null);
    try {
      const body: OfferInput = { ...fields, salary: Number(fields.salary), send, templateId: templateId || undefined };
      onCreated(await api<Envelope>('/api/offers', { method: 'POST', body: JSON.stringify(body) }));
      setFields((f) => ({ ...f, candidateName: '', candidateEmail: '', jobTitle: '', salary: '', startDate: '' }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <div>
          <h2>New offer</h2>
          <p className="muted">The candidate signs in this app first, then the hiring manager countersigns by email.</p>
        </div>
      </div>
      <label className="field">
        <span>Document</span>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Generated offer letter</option>
          {templates.map((t) => <option key={t.templateId} value={t.templateId}>Template: {t.name}</option>)}
        </select>
      </label>
      {templates.length === 0 && <p className="muted small">No templates yet. Save a remote-signing template in Twala to send from it here.</p>}
      {template && (
        <div className="notice">
          <div className="small"><strong>{template.name}</strong> · {template.documents?.map((d) => d.name).join(', ')}</div>
          {roleMap(template).map(({ role, fills }) => (
            <div key={role.roleId} className="small muted">
              {role.routingOrder}. {role.roleName ?? 'Unnamed role'} ({role.type}, {role.fields?.length ?? 0} fields) → {fills}
            </div>
          ))}
        </div>
      )}
      <div className="form-grid">
        {FIELDS.map(({ key, label, type = 'text' }) => (
          <label key={key} className="field">
            <span>{label}</span>
            <input
              type={type}
              required
              min={type === 'number' ? 1 : undefined}
              value={fields[key]}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <ErrorNotice error={error} />
      <div className="actions">
        <button className="btn" value="draft" disabled={busy}>Save draft</button>
        <button className="btn btn-primary" value="send" disabled={busy || !!blocker} title={blocker ?? undefined}>
          {busy ? 'Working…' : 'Send offer'}
        </button>
      </div>
    </form>
  );
}
