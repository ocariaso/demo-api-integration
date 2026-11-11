import { Router } from 'express';
import { twala, unwrap } from './twala/client.js';

export const templates = Router();

templates.get('/', async (_req, res) => {
  res.json(await unwrap(twala.GET('/templates', { params: { query: { limit: 100 } } })));
});

templates.get('/:id', async (req, res) => {
  // `include=fields` is documented but missing from the OpenAPI document, so it isn't in the generated type.
  const params = { path: { template_id: req.params.id }, query: { include: 'fields' } as never };
  res.json(await unwrap(twala.GET('/templates/{template_id}', { params })));
});
