import express, { type ErrorRequestHandler } from 'express';
import { config } from './config.js';
import { clear, recent, subscribe } from './apiLog.js';
import { TwalaApiError, twala } from './twala/client.js';
import type { Status } from '../../shared/types.js';

const app = express();
app.use(express.json({ limit: '30mb' }));

app.get('/api/status', async (_req, res) => {
  const status: Status = { apiBase: config.apiBase, keyMode: config.keyMode, key: config.maskedKey, reachable: false, keyError: null };
  try {
    const { error, response } = await twala.GET('/account');
    status.reachable = true;
    if (!response.ok) status.keyError = error?.code ?? `http_${response.status}`;
  } catch {}
  res.json(status);
});

app.get('/api/log', (_req, res) => {
  res.json(recent());
});

app.delete('/api/log', (_req, res) => {
  clear();
  res.status(204).end();
});

app.get('/api/log/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }).flushHeaders();
  const unsubscribe = subscribe((event) => res.write(`data: ${JSON.stringify(event)}\n\n`));
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

app.use(((err, _req, res, _next) => {
  if (err instanceof TwalaApiError) {
    const { status, code, message, requestId, details } = err;
    res.status(status || 502).json({ source: 'twala', status, code, message, requestId, details });
    return;
  }
  console.error(err);
  res.status(500).json({ source: 'app', code: 'internal_error', message: String(err?.message ?? err) });
}) satisfies ErrorRequestHandler);

app.listen(config.port, () => {
  console.log(`Hiring desk server on http://localhost:${config.port} → ${config.apiBase} (${config.keyMode} key)`);
});
