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
  },
  // Add this to disable static page generation
  output: 'standalone',
  experimental: {
    // Disable static page optimization
    workerThreads: false,
    cpus: 1
  },
  // Add this to force dynamic rendering
  staticPageGenerationTimeout: 60,
  generateEtags: false,
  pageExtensions: ['tsx', 'ts'],
  reactStrictMode: false
};

export default nextConfig;
