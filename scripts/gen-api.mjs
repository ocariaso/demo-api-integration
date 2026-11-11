import { execFileSync } from 'node:child_process';

const base = (process.env.TWALA_API_BASE ?? 'https://api-stage.twala.ai/api/v1').replace(/\/+$/, '');
execFileSync('npx', ['openapi-typescript', `${base}/openapi.json`, '-o', 'server/src/twala/schema.d.ts'], { stdio: 'inherit' });
