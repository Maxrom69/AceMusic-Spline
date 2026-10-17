import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleAceProxy } from "./server/ace-proxy.mjs";

function aceProxyPlugin(): Plugin {
  return {
    name: "ace-music-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/ace")) {
          next();
          return;
        }
        void handleAceProxy(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/ace")) {
          next();
          return;
        }
        void handleAceProxy(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), aceProxyPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
  },
});
