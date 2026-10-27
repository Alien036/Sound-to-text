import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Üst dizinlerdeki başka lockfile'lar kök tahminini şaşırtmasın.
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
};

export default nextConfig;
