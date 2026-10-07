import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'MOM_');
  const gatewayTarget = env.MOM_GATEWAY_DEV_TARGET || 'http://127.0.0.1:20000';

  return {
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: 'localhost',
      strictPort: true,
      proxy: {
        '/api': {
          // Gateway 统一接受 /api/auth、/api/system、/api/mdm；开发和生产保持同一路径。
          rewrite: (path) => path.replace(/^\/api/, ''),
          target: gatewayTarget,
        },
      },
    },
  };
});
