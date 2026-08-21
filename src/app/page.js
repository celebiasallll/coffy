'use client';

import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('./components/Navbar'), { ssr: false });
const Hero = dynamic(() => import('./components/Hero'), { ssr: false });
const AirdropClaim = dynamic(() => import('./components/AirdropClaim'), { ssr: false });
const Characters = dynamic(() => import('./components/Characters'), { ssr: false });
const GamesSection = dynamic(() => import('./components/GamesSection'), { ssr: false });
const Staking = dynamic(() => import('./components/Staking'), { ssr: false });
const ReferralPanel = dynamic(() => import('./components/ReferralPanel'), { ssr: false });
const Tokenomics = dynamic(() => import('./components/Tokenomics'));
const ContractInfo = dynamic(() => import('./components/ContractInfo'));
const Roadmap = dynamic(() => import('./components/Roadmap'));
const Footer = dynamic(() => import('./components/Footer'));

export default function Home() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#24150D',
            color: '#E8D5B5',
            border: '1px solid rgba(212, 160, 23, 0.4)',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#24150D',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#24150D',
            },
          },
        }}
      />

      <div className="min-h-screen bg-[#120A06] text-white selection:bg-amber-500 selection:text-black">
        <Navbar />
        <main className="space-y-4">
          <Hero id="hero" />
          <AirdropClaim />
          <Characters />
          <GamesSection id="games" />
          <Staking id="staking" />
          <ReferralPanel />
          <Tokenomics />
          <ContractInfo />
          <Roadmap />
          <Footer />
        </main>
      </div>
    </>
  );
}