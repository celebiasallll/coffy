/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  swcMinify: true,

  // Image optimization enabled
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Handle specific environment variables
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org',
  },

  // Add custom webpack configuration for Web3
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  output: 'standalone',

  // Build and tracing optimizations
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'public/CoffeeChess/**/*',
        'public/flagraceronline/**/*',
        'public/chinesee/**/*',
        'public/beegame/**/*',
        'public/hungeriumgame/**/*',
        'public/coffyinmaze/**/*',
        '**/node_modules/**'
      ],
    },
  },

  // Oyun yönlendirmeleri
  async rewrites() {
    return [
      {
        source: '/games/coffy',
        destination: '/coffygame/game.html'
      },
      {
        source: '/games/hungerium',
        destination: '/hungeriumgame/game.html'
      },
      {
        source: '/games/flagracer',
        destination: '/flagraceronline/index.html'
      },
      // Yeni yönlendirme
      {
        source: '/lapse',
        destination: 'https://coffylapse.vercel.app'
      }
    ]
  }
}

module.exports = nextConfig
