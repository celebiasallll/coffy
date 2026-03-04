import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter, Outfit } from 'next/font/google';
import Web3Provider from './providers/Web3Provider';

// Font optimizasyonu
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata = {
  title: 'Coffy Coin - Play to Earn Gaming Platform',
  description: 'The first Drink-to-Earn, Play-to-Earn, and SocialFi platform on Base Mainnet. Earn COFFY tokens while gaming!',
  keywords: 'coffy coin, play to earn, blockchain gaming, Base, crypto gaming, coffee token',
  metadataBase: new URL('https://coffycoin.io'),
  icons: {
    icon: [
      { url: '/images/coffy-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/coffy-logo.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: '/images/coffy-logo.png',
    shortcut: '/images/coffy-logo.png'
  },
  openGraph: {
    title: 'Coffy Coin - Play to Earn Gaming Platform',
    description: 'Earn COFFY tokens while gaming! The first coffee-themed blockchain gaming ecosystem.',
    images: ['/images/coffy-logo.png'],
    type: 'website',
    url: 'https://coffycoin.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coffy Coin - Play to Earn Gaming Platform',
    description: 'Earn COFFY tokens while gaming!',
    images: ['/images/coffy-logo.png'],
  },
  robots: 'index, follow',
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#D4A017'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Mobil cihazlar için ekran iyileştirmesi */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <Web3Provider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:top-0 focus:left-0 focus:z-50 focus:bg-[#D4A017] focus:text-white">
            İçeriğe geç
          </a>
          {children}
          <Analytics />
          <SpeedInsights />
        </Web3Provider>
      </body>
    </html>
  );
}
