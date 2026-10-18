import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

/** 浏览器到 Gateway 的稳定前缀；代理原样转发路径，禁止注入或移除 /api。 */
export const browserGatewayContexts = ["/auth", "/system", "/mdm"] as const;

/** 页面路由与 API 共用模块前缀；只将浏览器 HTML 导航交回 SPA，JSON/SSE 继续代理。 */
export function gatewayDocumentBypass(request: { method?: string; headers: { accept?: string } }): string | undefined {
  if (request.method === "GET" && request.headers.accept?.includes("text/html")) return "/index.html";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "MOM_");
  const gatewayTarget = env.MOM_GATEWAY_DEV_TARGET || "http://127.0.0.1:20000";

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "localhost",
      strictPort: true,
      proxy: Object.fromEntries(
        browserGatewayContexts.map((prefix) => [
          prefix,
          { target: gatewayTarget, bypass: gatewayDocumentBypass },
        ]),
      ),
    },
  };
});
