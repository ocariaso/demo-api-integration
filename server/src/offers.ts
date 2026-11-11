import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { OfferDetail, OfferInput } from '../../shared/types.js';
import { ANCHORS, offerLetterPdf } from './offerLetter.js';
import { twala, unwrap } from './twala/client.js';

export const offers = Router();

const envelopePath = (id: string) => ({ params: { path: { envelope_id: id } } });

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

offers.post('/', async (req, res) => {
  const offer = req.body as OfferInput;
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
