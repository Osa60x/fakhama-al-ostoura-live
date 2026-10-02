import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: "0.0.0.0", allowedHosts: true, proxy: { "/api/live-quote": { target: "https://sabaaek-gold-api.osa60x.workers.dev", changeOrigin: true, rewrite: path => path.replace(/^\/api\/live-quote/, "/quote") }, "/api/live-history": { target: "https://sabaaek-gold-api.osa60x.workers.dev", changeOrigin: true, rewrite: path => { const url = new URL(path, "http://localhost"); const map: Record<string, string> = { day: "24h", week: "7d", month: "30d" }; return `/history?range=${map[url.searchParams.get("range") ?? "day"] ?? "24h"}`; } } } },
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { reporter: ["text", "html"] }
  }
});
