import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use webpack explicitly since we need it for WASM support
  // Turbopack config is empty to silence the warning
  turbopack: {},
  // Next 16: moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: ['@provablehq/sdk'],
  // Fix “multiple lockfiles root” warning if present
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },
  // Webpack configuration for WASM and crypto support
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fallbacks for browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
  // Transpile specific packages that need it
  transpilePackages: [
<<<<<<< HEAD
    '@provablehq/aleo-wallet-adaptor-react',
    '@provablehq/aleo-wallet-adaptor-react-ui',
    '@provablehq/aleo-wallet-adaptor-core',
    '@provablehq/aleo-wallet-adaptor-leo',
    '@provablehq/aleo-wallet-adaptor-puzzle',
    '@provablehq/aleo-wallet-adaptor-fox',
    '@provablehq/aleo-wallet-adaptor-shield',
    '@provablehq/aleo-wallet-adaptor-soter',
    '@provablehq/aleo-types',
=======
    '@demox-labs/aleo-wallet-adapter-base',
    '@demox-labs/aleo-wallet-adapter-react',
    '@demox-labs/aleo-wallet-adapter-reactui',
    '@demox-labs/aleo-wallet-adapter-leo',
    'aleo-adapters',
    'aleo-hooks',
>>>>>>> 3f3da63b9a41d76fdc24cf22f7b5c9b54646e6ea
    '@puzzlehq/sdk-core',
  ],
  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_VOTING_PROGRAM_ID: process.env.NEXT_PUBLIC_VOTING_PROGRAM_ID,
    NEXT_PUBLIC_ALEO_NETWORK: process.env.NEXT_PUBLIC_ALEO_NETWORK,
    NEXT_PUBLIC_ALEO_RPC_URL: process.env.NEXT_PUBLIC_ALEO_RPC_URL,
  },
};

export default nextConfig;
