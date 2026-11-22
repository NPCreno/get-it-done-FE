import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Components compile with the automatic JSX runtime, as Next does (BUG-05 renders SidebarLink to markup).
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
