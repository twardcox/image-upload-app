import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['canvas', 'face-api.js', '@tensorflow/tfjs'],
  images: {
    localPatterns: [
      {
        pathname: "/api/images/**",
      },
      {
        pathname: "/api/faces/**",
      },
    ],
  },
};

export default nextConfig;
