import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const alias = {
  '@mom/auth': fileURLToPath(new URL('../../packages/auth/src/index.ts', import.meta.url)),
  '@mom/first-party-auth': fileURLToPath(new URL('../../packages/first-party-auth/src/index.ts', import.meta.url)),
  '@mom/access': fileURLToPath(new URL('../../packages/access/src/index.ts', import.meta.url)),
  '@mom/api-client': fileURLToPath(new URL('../../packages/api-client/src/index.ts', import.meta.url)),
  '@mom/portal-access': fileURLToPath(new URL('../../packages/portal-access/src/index.ts', import.meta.url)),
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [vue(), tailwindcss()],
    resolve: { alias },
    server: {
      port: 5556,
      proxy: {
        '/api': {
          target: env.MOM_GATEWAY_PROXY_TARGET ?? 'http://127.0.0.1:20000',
          changeOrigin: true,
        },
      },
    },
    build: {
      manifest: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-vue',
                priority: 20,
                test: /node_modules[\\/](?:vue|@vue|pinia)[\\/]/,
              },
              {
                entriesAware: true,
                maxSize: 450_000,
                name: 'vendor-antdv',
                priority: 10,
                test: /node_modules[\\/]ant-design-vue[\\/]/,
              },
            ],
          },
        },
      },
      sourcemap: false,
    },
  };
});
