import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", allowedHosts: true, proxy: { "/api/live-quote": { target: "https://sabaaek-gold-api.osa60x.workers.dev", changeOrigin: true, rewrite: path => path.replace(/^\/api\/live-quote/, "/quote") } } },
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { reporter: ["text", "html"] }
  }
});
