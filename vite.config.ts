import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/** 开发代理只移除浏览器契约最前面的 `/api`，其余路径、查询参数和请求属性由代理原样转发。 */
export function rewriteBrowserApiPath(path: string): string {
  return path.replace(/^\/api(?=\/|$)/, '');
}

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
          // 浏览器统一使用 /api/{module}，Gateway 只接收 /{module}。
          rewrite: rewriteBrowserApiPath,
          target: gatewayTarget,
        },
      },
    },
  };
});
