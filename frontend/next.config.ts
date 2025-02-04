import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Exclude problematic packages and binaries
    config.externals = [...(config.externals || []), {
      'onnxruntime-node': 'onnxruntime-node',
      'chromadb-default-embed': 'chromadb-default-embed',
      '@xenova/transformers': '@xenova/transformers',
      'chromadb': 'chromadb'
    }];

    // Ignore .node files completely
    config.module.noParse = /\.node$/;
    
    // Add resolve fallbacks
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
        crypto: false,
        https: false,
        http: false,
        url: false
      }
    };

    return config;
  },
  // Disable image optimization for docker build
  images: {
    unoptimized: true
  },
  // Add these lines to ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
