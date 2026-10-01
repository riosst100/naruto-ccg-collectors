import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["**/.next/**", "**/node_modules/**", "**/next-env.d.ts", "uploads/**", "data/**"]),
  {
    rules: {
      // Card art is user/admin-provided from our own storage; next/image optimisation is not needed.
      "@next/next/no-img-element": "off",
    },
    settings: { next: { rootDir: ["apps/web/", "apps/admin/"] } },
  },
]);
