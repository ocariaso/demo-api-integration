import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverPort = env.PORT || '3180';
  return {
    root: 'web',
    plugins: [react()],
    server: {
      port: 5180,
      strictPort: true,
      proxy: {
        '/api': `http://localhost:${serverPort}`,
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
