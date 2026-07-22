import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Direct Turbopack to treat the project folder as the root directory
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
