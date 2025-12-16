import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-alert-dialog',
      'date-fns',
    ],
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Write build output to a configurable path (default .next). Set NEXT_DIST_DIR=/tmp/helmops-next locally to avoid iCloud path issues.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Silence Next.js warning when using Turbopack alongside a webpack config
  turbopack: {},

  // In dev with webpack, disable filesystem cache to avoid ENOENT on iCloud paths
  // Add ProgressPlugin in prod to surface where build hangs
  webpack: (config, { dev, webpack }) => {
    if (dev) {
      config.cache = false;
    } else {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      config.plugins.push(
        new webpack.ProgressPlugin({
          activeModules: true,
          modules: true,
          modulesCount: 1,
          handler(percent: number, message: string, ...details: string[]) {
            if (percent >= 0.6) {
              const detail = details.filter(Boolean).join(" ");
              console.log(`[build] ${Math.round(percent * 100)}% ${message} ${detail}`);
            }
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;
