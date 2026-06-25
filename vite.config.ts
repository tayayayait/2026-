// Shared TanStack Start/Vite defaults live in the base config wrapper.
// Add project-specific overrides here only.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import {
  readNcpmsDevProxyApiKey,
  rewriteNcpmsDevProxyPath,
} from "./src/integrations/ncpms/dev-proxy";

const loadedDevEnv = loadEnv("development", process.cwd(), "");
const ncpmsDevProxyApiKey = readNcpmsDevProxyApiKey({ ...loadedDevEnv, ...process.env });

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/api/ncpms-proxy": {
          target: "http://ncpms.rda.go.kr",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              proxyRes.headers["access-control-allow-origin"] = "*";
              proxyRes.headers["access-control-allow-methods"] = "GET, OPTIONS";
              proxyRes.headers["access-control-allow-headers"] = "Content-Type";
            });
          },
          rewrite: (path) => rewriteNcpmsDevProxyPath(path, ncpmsDevProxyApiKey),
        },
      },
    },
    optimizeDeps: {
      include: ["zustand", "use-sync-external-store/shim/with-selector.js"],
    },
  },
});
