import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: deps are hoisted to repo root; limiting root to `frontend/` breaks
  // resolving packages like `leaflet` from ../../node_modules.
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
