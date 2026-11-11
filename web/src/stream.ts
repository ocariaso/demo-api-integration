import type { LogEvent } from './api';

const source = new EventSource('/api/log/stream');

export function onStream(listener: (event: LogEvent) => void) {
  const handle = ({ data }: MessageEvent) => listener(JSON.parse(data));
  source.addEventListener('message', handle);
  return () => source.removeEventListener('message', handle);
}
