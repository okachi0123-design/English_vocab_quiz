import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { validateApiBaseUrl } from "./src/api/apiConfig";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const base = validateApiBaseUrl(env.VITE_API_BASE_URL ?? "/api", command === "serve");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: new URL(base, "http://localhost:8000").href,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api(?=\/|\?|$)/, ""),
        },
      },
    },
  };
});
