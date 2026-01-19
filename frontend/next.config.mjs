/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    '@demox-labs/aleo-wallet-adapter-base',
    '@demox-labs/aleo-wallet-adapter-react',
    '@demox-labs/aleo-wallet-adapter-reactui',
    '@demox-labs/aleo-wallet-adapter-leo',
    'aleo-adapters',
    'aleo-hooks',
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
