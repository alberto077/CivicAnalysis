import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep off on Vercel unless you need it; avoids rare compiler-related runtime issues.
  reactCompiler: false,
};

export default nextConfig;
