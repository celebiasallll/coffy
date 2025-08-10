/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  swcMinify: true,
  
  // Disable image optimization
  images: {
    unoptimized: true,
  },
  
  // Handle specific environment variables
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/',
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
  
  // Oyun yönlendirmeleri
  async rewrites() {
    return [
      {
        source: '/games/coffy',
        destination: '/coffygame/game.html'
      },
      {
        source: '/coffygame/:path*',
        destination: '/coffygame/:path*'
      },
      {
        source: '/games/hungerium',
        destination: '/hungeriumgame/game.html'
      },
      {
        source: '/hungeriumgame/:path*',
        destination: '/hungeriumgame/:path*'
      },
      {
        source: '/games/flagracer',
        destination: '/flagraceronline/index.html'
      },
      {
        source: '/flagraceronline/:path*',
        destination: '/flagraceronline/:path*'
      },
      {
        source: '/chinesee/:path*',
        destination: '/chinesee/:path*'
      },
      // Yeni yönlendirme
      {
        source: '/lapse',  // Bu, kullanıcıların gireceği URL
        destination: 'https://coffylapse.vercel.app', // Vercel'deki oyun linki
      }
    ]
  }
}

module.exports = nextConfig
