import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude better-sqlite3 from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }
    
    // Handle native modules
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    return config;
  },
};

export default nextConfig;

