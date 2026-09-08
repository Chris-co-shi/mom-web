import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:20000',
        changeOrigin: true,
      },
    },
  },
});
