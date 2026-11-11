import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { DraftRecipientInput, FieldInput, OfferDetail, OfferInput } from '../../shared/types.js';
import { config } from './config.js';
import { ANCHORS, offerLetterPdf } from './offerLetter.js';
import { twala, unwrap } from './twala/client.js';

export const offers = Router();

const envelopePath = (id: string) => ({ params: { path: { envelope_id: id } } });
const recipientPath = (id: string, recipientId: string) => ({ params: { path: { envelope_id: id, recipient_id: recipientId } } });
const AUTO_FILL_TYPES = ['date', 'name', 'email'];

// Fields read back carry ids, nulls and an autoFill their own type refuses, so they're trimmed before a PUT.
const writable = ({ fieldId, documentIdGuid, ...field }: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(field).filter(([k, v]) => v != null && (k !== 'autoFill' || AUTO_FILL_TYPES.includes(field.type as string)))) as FieldInput;

offers.get('/', async (req, res) => {
  const { status, page } = req.query as Record<string, string | undefined>;
  // The metadata filter is documented but missing from the OpenAPI document, so it isn't in the generated type.
  const query = { 'metadata[source]': 'hiring-desk', status: status || undefined, page: Number(page) || 1, limit: 20 } as { page: number };
  res.json(await unwrap(twala.GET('/envelopes', { params: { query } })));
});

offers.get('/:id', async (req, res) => {
  const path = envelopePath(req.params.id);
  const [envelope, recipients, documents, history, formData] = await Promise.all([
    unwrap(twala.GET('/envelopes/{envelope_id}', path)),
    unwrap(twala.GET('/envelopes/{envelope_id}/recipients', path)),
    unwrap(twala.GET('/envelopes/{envelope_id}/documents', path)),
    unwrap(twala.GET('/envelopes/{envelope_id}/audit-events', path)),
    unwrap(twala.GET('/envelopes/{envelope_id}/form-data', path)),
  ]);
  res.json({ envelope, recipients, documents, history, formData } satisfies OfferDetail);
});

offers.get('/:id/documents/:documentId', async (req, res) => {
  const { url } = await unwrap(
    twala.GET('/envelopes/{envelope_id}/documents/{document_id}', {
      params: { path: { envelope_id: req.params.id, document_id: req.params.documentId } },
    }),
  );
  res.redirect(url);
});

async function fromTemplate(offer: OfferInput & { templateId: string }) {
  const template = await unwrap(twala.GET('/templates/{template_id}', { params: { path: { template_id: offer.templateId } } }));
  const [candidate, manager] = (template.roles ?? []).filter((r) => r.type !== 'viewer').sort((a, b) => a.routingOrder - b.routingOrder);
  const role = (r: typeof candidate | undefined) => (r?.roleName ? { roleName: r.roleName } : { roleId: r?.roleId });
  return {
    templateId: offer.templateId,
    name: `Offer letter - ${offer.candidateName}`,
    status: offer.send ? ('sent' as const) : ('draft' as const),
    metadata: { source: 'hiring-desk', jobTitle: offer.jobTitle },
    templateRoles: [
      { ...role(candidate), recipientId: 'candidate', name: offer.candidateName, email: offer.candidateEmail, clientUserId: `candidate-${randomUUID()}` },
      ...(manager ? [{ ...role(manager), recipientId: 'manager', name: offer.managerName, email: offer.managerEmail }] : []),
    ],
  };
}

offers.post('/', async (req, res) => {
  const offer = req.body as OfferInput;
  if (offer.templateId) {
    return void res.status(201).json(await unwrap(twala.POST('/envelopes', { body: await fromTemplate({ ...offer, templateId: offer.templateId }) })));
  }
  const envelope = await unwrap(
    twala.POST('/envelopes', {
      body: {
        name: `Offer letter - ${offer.candidateName}`,
        message: 'Please review and sign your offer of employment.',
        status: offer.send ? 'sent' : 'draft',
        metadata: { source: 'hiring-desk', jobTitle: offer.jobTitle },
        documents: [{ documentId: 'offer', name: 'Offer letter.pdf', documentBase64: await offerLetterPdf(offer) }],
        recipients: {
          signers: [
            {
              recipientId: 'candidate',
              name: offer.candidateName,
              email: offer.candidateEmail,
              routingOrder: 1,
              clientUserId: `candidate-${randomUUID()}`,
              fields: [
                { type: 'signature', anchorString: ANCHORS.candidateSign },
                { type: 'date', autoFill: true, anchorString: ANCHORS.candidateDate },
                { type: 'mobile', fieldKey: 'mobile', label: 'Mobile number', anchorString: ANCHORS.candidateMobile, anchorYOffset: -4 },
              ],
            },
            {
              recipientId: 'manager',
              name: offer.managerName,
              email: offer.managerEmail,
              routingOrder: 2,
              fields: [
                { type: 'signature', anchorString: ANCHORS.managerSign },
                { type: 'date', autoFill: true, anchorString: ANCHORS.managerDate },
              ],
            },
          ],
        },
      },
    }),
  );
  res.status(201).json(envelope);
});

offers.post('/:id/send', async (req, res) => {
  res.json(await unwrap(twala.PATCH('/envelopes/{envelope_id}', { ...envelopePath(req.params.id), body: { status: 'sent' } })));
});

offers.delete('/:id', async (req, res) => {
  await unwrap(twala.DELETE('/envelopes/{envelope_id}', envelopePath(req.params.id)));
  res.status(204).end();
});

offers.post('/:id/views/signing', async (req, res) => {
  res.json(
    await unwrap(
      twala.POST('/envelopes/{envelope_id}/views/recipient', {
        ...envelopePath(req.params.id),
        body: { recipientId: 'candidate', returnUrl: `${config.appUrl}/?view=signing`, authenticationInstant: new Date().toISOString() },
      }),
    ),
  );
});

offers.post('/:id/views/sending', async (req, res) => {
  res.json(
    await unwrap(
      twala.POST('/envelopes/{envelope_id}/views/sender', { ...envelopePath(req.params.id), body: { returnUrl: `${config.appUrl}/?view=sending` } }),
    ),
  );
});

offers.post('/:id/documents', async (req, res) => {
  const { name, base64 } = req.body as { name: string; base64: string };
  const documentId = `doc-${randomUUID().slice(0, 8)}`;
  res.status(201).json(
    await unwrap(twala.POST('/envelopes/{envelope_id}/documents', { ...envelopePath(req.params.id), body: { documents: [{ documentId, name, documentBase64: base64 }] } })),
  );
});

offers.delete('/:id/documents/:documentId', async (req, res) => {
  await unwrap(
    twala.DELETE('/envelopes/{envelope_id}/documents/{document_id}', {
      params: { path: { envelope_id: req.params.id, document_id: req.params.documentId } },
    }),
  );
  res.status(204).end();
});

offers.post('/:id/recipients', async (req, res) => {
  const { group, name, email, embedded } = req.body as DraftRecipientInput;
  const recipientId = `${group.slice(0, -1)}-${randomUUID().slice(0, 8)}`;
  const recipient = { recipientId, name, email, routingOrder: 3, ...(embedded && group === 'approvers' ? { clientUserId: recipientId } : {}) };
  res.status(201).json(await unwrap(twala.POST('/envelopes/{envelope_id}/recipients', { ...envelopePath(req.params.id), body: { [group]: [recipient] } })));
});

offers.delete('/:id/recipients/:recipientId', async (req, res) => {
  await unwrap(twala.DELETE('/envelopes/{envelope_id}/recipients/{recipient_id}', recipientPath(req.params.id, req.params.recipientId)));
  res.status(204).end();
});

offers.get('/:id/recipients/:recipientId/fields', async (req, res) => {
  res.json(await unwrap(twala.GET('/envelopes/{envelope_id}/recipients/{recipient_id}/fields', recipientPath(req.params.id, req.params.recipientId))));
});

offers.put('/:id/recipients/:recipientId/fields', async (req, res) => {
  const fields = (req.body as Record<string, unknown>[]).map(writable);
  res.json(await unwrap(twala.PUT('/envelopes/{envelope_id}/recipients/{recipient_id}/fields', { ...recipientPath(req.params.id, req.params.recipientId), body: { fields } })));
});
