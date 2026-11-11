import { useState, type FormEvent } from 'react';
import { api, type Envelope, type OfferInput } from '../api';

type Run = (action: () => Promise<unknown>) => void;

export function RecipientEditor({ id, recipientId, name, email, run, onDone }: { id: string; recipientId: string; name: string; email: string; run: Run; onDone: () => void }) {
  const [form, setForm] = useState({ name, email });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => api(`/api/offers/${id}/recipients/${recipientId}`, { method: 'PATCH', body: JSON.stringify(form) }).then(onDone));
  };
  return (
    <form className="inline-form" onSubmit={submit}>
      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <button className="btn">Save</button>
      <button type="button" className="link small" onClick={onDone}>Cancel</button>
    </form>
  );
}

export function OfferSettings({ envelope, run }: { envelope: Envelope; run: Run }) {
  const [expiry, setExpiry] = useState(envelope.expiresAt?.slice(0, 10) ?? '');
  const [note, setNote] = useState(envelope.metadata?.note ?? '');
  const patch = (body: object) => run(() => api(`/api/offers/${envelope.envelopeId}`, { method: 'PATCH', body: JSON.stringify(body) }));
  const canExpire = ['draft', 'pending', 'in_progress'].includes(envelope.status);
  return (
    <div className="line-group">
      {canExpire && (
        <form className="inline-form" onSubmit={(e) => (e.preventDefault(), patch({ expiresAt: expiry ? new Date(`${expiry}T23:59:59+08:00`).toISOString() : null }))}>
          <span className="small muted">Expires</span>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <button className="btn">Set expiry</button>
        </form>
      )}
      <form className="inline-form" onSubmit={(e) => (e.preventDefault(), patch({ note }))}>
        <span className="small muted">Internal note</span>
        <input placeholder="Only HR sees this" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn">Save note</button>
      </form>
    </div>
  );
}

export function CorrectionForm({ envelope, run, onCreated, onCancel }: { envelope: Envelope; run: Run; onCreated: (id: string) => void; onCancel: () => void }) {
  const signer = (rid: string) => envelope.recipients.signers?.find((r) => r.recipientId === rid);
  const m = envelope.metadata ?? {};
  const [form, setForm] = useState({ jobTitle: m.jobTitle ?? '', salary: m.salary ?? '', startDate: m.startDate ?? '', reason: '' });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const correction: OfferInput = {
      candidateName: signer('candidate')?.name ?? '',
      candidateEmail: signer('candidate')?.email ?? '',
      managerName: signer('manager')?.name ?? '',
      managerEmail: signer('manager')?.email ?? '',
      jobTitle: form.jobTitle,
      salary: Number(form.salary),
      startDate: form.startDate,
      send: true,
    };
    run(async () => {
      const next = await api<Envelope>(`/api/offers/${envelope.envelopeId}/void`, { method: 'POST', body: JSON.stringify({ reason: form.reason, correction }) });
      onCreated(next.envelopeId);
    });
  };
  return (
    <form className="notice line-group" onSubmit={submit}>
      <span className="small"><strong>Void and send a corrected offer</strong></span>
      <div className="inline-form">
        <input required placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
        <input required type="number" min={1} placeholder="Monthly salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </div>
      <div className="inline-form">
        <input required placeholder="Reason, e.g. Salary corrected" value={form.reason} maxLength={200} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn btn-primary">Void and resend</button>
        <button type="button" className="link small" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
