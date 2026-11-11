import { useEffect, useState, type FormEvent } from 'react';
import { api, type DraftRecipientInput, type Field } from '../api';
import { label } from '../format';
import { ErrorNotice } from './ErrorNotice';

type Run = (action: () => Promise<unknown>) => void;

export const toBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export function AttachDocument({ id, run }: { id: string; run: Run }) {
  return (
    <label className="link small file">
      Attach PDF
      <input
        type="file"
        accept="application/pdf"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) run(async () => api(`/api/offers/${id}/documents`, { method: 'POST', body: JSON.stringify({ name: file.name, base64: await toBase64(file) }) }));
        }}
      />
    </label>
  );
}

export function AddRecipient({ id, run }: { id: string; run: Run }) {
  const [form, setForm] = useState<DraftRecipientInput>({ group: 'approvers', name: '', email: '', embedded: true });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => api(`/api/offers/${id}/recipients`, { method: 'POST', body: JSON.stringify(form) }));
  };
  return (
    <form className="inline-form" onSubmit={submit}>
      <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as DraftRecipientInput['group'] })}>
        <option value="approvers">Approver</option>
        <option value="viewers">Viewer (gets a copy)</option>
      </select>
      <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      {form.group === 'approvers' && (
        <label className="small"><input type="checkbox" checked={form.embedded} onChange={(e) => setForm({ ...form, embedded: e.target.checked })} /> In this app</label>
      )}
      <button className="btn">Add recipient</button>
    </form>
  );
}

const NEW_FIELD = { type: 'text', label: '', pageNumber: 1, xPercent: 12, yPercent: 80 };

export function FieldEditor({ id, recipientId, name }: { id: string; recipientId: string; name: string }) {
  const [fields, setFields] = useState<Field[] | null>(null);
  const [draft, setDraft] = useState(NEW_FIELD);
  const [error, setError] = useState<unknown>(null);
  const url = `/api/offers/${id}/recipients/${recipientId}/fields`;

  useEffect(() => void api<Field[]>(url).then(setFields, setError), [url]);

  const save = (next: unknown[]) => {
    setError(null);
    api<Field[]>(url, { method: 'PUT', body: JSON.stringify(next) }).then((f) => (setFields(f), setDraft(NEW_FIELD)), setError);
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    const fieldKey = draft.label.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase() || undefined;
    save([...(fields ?? []), { ...draft, label: draft.label || undefined, fieldKey, documentId: fields?.[0]?.documentId ?? 'offer' }]);
  };

  return (
    <div className="line-group">
      <span className="small">{name}</span>
      {fields?.map((f) => (
        <div key={f.fieldId} className="line">
          <span className="small">{f.label ?? label(f.type)} <span className="muted">· page {f.pageNumber}, {Math.round(f.xPercent)}% × {Math.round(f.yPercent)}%</span></span>
          <button className="link small" onClick={() => save(fields.filter((x) => x.fieldId !== f.fieldId))}>Remove</button>
        </div>
      ))}
      <form className="inline-form" onSubmit={add}>
        <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          {['text', 'date', 'checkbox', 'initials'].map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </select>
        <input placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <input type="number" min={0} max={100} title="Left, % of page" value={draft.xPercent} onChange={(e) => setDraft({ ...draft, xPercent: Number(e.target.value) })} />
        <input type="number" min={0} max={100} title="Top, % of page" value={draft.yPercent} onChange={(e) => setDraft({ ...draft, yPercent: Number(e.target.value) })} />
        <button className="btn">Add field</button>
      </form>
      <ErrorNotice error={error} />
    </div>
  );
}
