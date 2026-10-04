import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'MOM_');
  const gatewayTarget = env.MOM_GATEWAY_DEV_TARGET || 'http://127.0.0.1:20000';

  return {
    plugins: [vue()],
    server: {
      host: 'localhost',
      strictPort: true,
      proxy: {
        '/api': {
          rewrite: (path) => path.replace(/^\/api/, ''),
          target: gatewayTarget,
        },
      },
    },
  };
});
