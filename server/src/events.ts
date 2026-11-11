import express, { Router } from 'express';
import { Webhook } from 'standardwebhooks';
import type { TwalaEvent } from '../../shared/types.js';
import { publish } from './apiLog.js';
import { config } from './config.js';
import { twala, unwrap } from './twala/client.js';

const received = new Set<string>();

export const webhooks = Router();

webhooks.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  if (!config.webhookSecret) return void res.status(503).json({ code: 'webhooks_not_configured' });
  let event: TwalaEvent;
  try {
    event = new Webhook(config.webhookSecret).verify(req.body, req.headers as Record<string, string>) as TwalaEvent;
  } catch {
    return void res.status(401).json({ code: 'invalid_signature' });
  }
  // Twala retries with the same webhook-id, so a repeat is acknowledged and ignored.
  if (!received.has(event.id)) {
    received.add(event.id);
    publish({ type: 'webhook', event });
  }
  res.status(204).end();
});

export const events = Router();

events.get('/', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const data = await unwrap(twala.GET('/events', { params: { query: { page, limit: 20 } } }));
  res.json({ ...data, received: data.items.filter((e) => received.has(e.id)).map((e) => e.id) });
});

events.get('/:id', async (req, res) => {
  res.json(await unwrap(twala.GET('/events/{event_id}', { params: { path: { event_id: req.params.id } } })));
});
