import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { OfferInput } from '../../shared/types.js';
import { ANCHORS, offerLetterPdf } from './offerLetter.js';
import { twala, unwrap } from './twala/client.js';

export const offers = Router();

const envelopePath = (id: string) => ({ params: { path: { envelope_id: id } } });

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
