import { Router } from 'express';
import type { RequirementUpload } from '../../shared/types.js';
import { twala, unwrap } from './twala/client.js';

const timestampPath = (id: string) => ({ params: { path: { timestamp_id: id } } });

export const requirements = Router({ mergeParams: true });

requirements.get('/', async (req, res) => {
  // The metadata filter is documented but missing from the OpenAPI document, so it isn't in the generated type.
  const query = { 'metadata[offerId]': (req.params as { id: string }).id, limit: 100 } as { limit: number };
  res.json(await unwrap(twala.GET('/timestamps', { params: { query } })));
});

requirements.post('/', async (req, res) => {
  const offerId = (req.params as { id: string }).id;
  const documents = (req.body as RequirementUpload[]).map(({ requirement, name, base64 }) => ({
    name,
    documentBase64: base64,
    metadata: { source: 'hiring-desk', offerId, requirement },
  }));
  res.status(201).json(await unwrap(twala.POST('/timestamps', { body: { documents } })));
});

export const timestamps = Router();

timestamps.get('/:id', async (req, res) => {
  const path = timestampPath(req.params.id);
  const [timestamp, history] = await Promise.all([
    unwrap(twala.GET('/timestamps/{timestamp_id}', path)),
    unwrap(twala.GET('/timestamps/{timestamp_id}/audit-events', path)),
  ]);
  res.json({ timestamp, history });
});

timestamps.get('/:id/document', async (req, res) => {
  res.redirect((await unwrap(twala.GET('/timestamps/{timestamp_id}/document', timestampPath(req.params.id)))).url);
});

timestamps.post('/:id/sealing-attempts', async (req, res) => {
  res.status(202).json(await unwrap(twala.POST('/timestamps/{timestamp_id}/sealing-attempts', timestampPath(req.params.id))));
});
