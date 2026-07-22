import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const alias = {
  '@mom/auth': fileURLToPath(new URL('../../packages/auth/src/index.ts', import.meta.url)),
  '@mom/access': fileURLToPath(new URL('../../packages/access/src/index.ts', import.meta.url)),
  '@mom/api-client': fileURLToPath(new URL('../../packages/api-client/src/index.ts', import.meta.url)),
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [vue()],
    resolve: { alias },
    server: {
      port: 5557,
      proxy: {
        '/api': {
          target: env.MOM_GATEWAY_PROXY_TARGET ?? 'http://127.0.0.1:20000',
          changeOrigin: true,
        },
        '/iam': {
          target: env.MOM_IAM_PROXY_TARGET ?? 'http://127.0.0.1:20100',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/iam/u, ''),
        },
      },
    },
    build: { sourcemap: true },
  };
});
