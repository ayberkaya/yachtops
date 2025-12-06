import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Use Turbopack (default in Next.js 16)
  // Empty config to silence the warning
  turbopack: {},

  // Write build output to a configurable path (default .next). Set NEXT_DIST_DIR=/tmp/yachtops-next locally to avoid iCloud path issues.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // In dev with webpack, disable filesystem cache to avoid ENOENT on iCloud paths
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
