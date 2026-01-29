import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ]
  },
  experimental: { 
    webpackMemoryOptimizations: true 
  },
  reactCompiler: true,
};

export default nextConfig;
