import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['canvas', 'face-api.js', '@tensorflow/tfjs'],
  images: {
    localPatterns: [
      {
        pathname: "/uploads/**",
      },
      {
        pathname: "/faces/**",
      },
    ],
  },
};

export default nextConfig;
