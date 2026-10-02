import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// One .env at the repo root is shared by both apps and the Prisma CLI.
const rootEnv = path.resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  transpilePackages: ["@naruto-ccg/shared", "@naruto-ccg/database", "@naruto-ccg/auth", "@naruto-ccg/storage", "@naruto-ccg/ui"],
  serverExternalPackages: ["@prisma/client", ".prisma/client", "exceljs"],
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "naruto-ccg.local"],
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  basePath: "/admin",
  async redirects() {
    return [{ source: "/", destination: "/admin", basePath: false, permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default config;
