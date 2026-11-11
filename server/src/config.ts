import type { Status } from '../../shared/types.js';

const apiKey = process.env.TWALA_API_KEY?.trim() || undefined;

const keyMode: Status['keyMode'] = !apiKey
  ? 'missing'
  : apiKey.startsWith('twk_test_')
    ? 'test'
    : apiKey.startsWith('twk_live_')
      ? 'live'
      : 'malformed';

// Live keys send binding envelopes and spend credits.
if (keyMode === 'live' && process.env.ALLOW_LIVE_KEY !== 'true') {
  throw new Error('TWALA_API_KEY is a live key. Set ALLOW_LIVE_KEY=true to use it.');
}

export const config = {
  port: Number(process.env.PORT ?? 3180),
  appUrl: (process.env.APP_URL ?? 'http://localhost:5180').replace(/\/+$/, ''),
  apiBase: (process.env.TWALA_API_BASE ?? 'https://api-stage.twala.ai/api/v1').replace(/\/+$/, ''),
  apiKey,
  keyMode,
  maskedKey: apiKey && `${apiKey.slice(0, 9)}…${apiKey.slice(-4)}`,
  logLimit: Number(process.env.API_LOG_LIMIT ?? 200),
  webhookSecret: process.env.TWALA_WEBHOOK_SECRET?.trim() || undefined,
};
