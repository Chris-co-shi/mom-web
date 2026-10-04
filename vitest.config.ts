import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    // 账户页使用真实 TDesign 控件；由 Vite 处理其 CSS，而非交给 Node 直接加载。
    server: { deps: { inline: ['tdesign-vue-next', 'tdesign-icons-vue-next'] } },
  },
});
