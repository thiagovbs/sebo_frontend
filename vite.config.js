import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O dev server roda em 5173 (origem liberada no CORS do backend).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
