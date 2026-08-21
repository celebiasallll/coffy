'use client';

import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('./components/Navbar'), { ssr: false });
const Hero = dynamic(() => import('./components/Hero'), { ssr: false });
const Roadmap = dynamic(() => import('./components/Roadmap'));
const Staking = dynamic(() => import('./components/Staking'), { ssr: false });
const Whitepaper = dynamic(() => import('./components/Whitepaper'), { ssr: false });
const Community = dynamic(() => import('./components/Community'), { ssr: false });
const Footer = dynamic(() => import('./components/Footer'));
const GamesSection = dynamic(() => import('./components/GamesSection'), { ssr: false });
const Tokenomics = dynamic(() => import('./components/Tokenomics'));
const ContractInfo = dynamic(() => import('./components/ContractInfo'));
const Partners = dynamic(() => import('./components/Partners'));
const About = dynamic(() => import('./components/About'));
const Characters = dynamic(() => import('./components/Characters'), { ssr: false });
const Team = dynamic(() => import('./components/Team'));
const ReferralPanel = dynamic(() => import('./components/ReferralPanel'), { ssr: false });
const AirdropClaim = dynamic(() => import('./components/AirdropClaim'), { ssr: false });

export default function Home() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#2A1810',
            color: '#E8D5B5',
            border: '1px solid #D4A017',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 25px rgba(212, 160, 23, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#D4A017',
              secondary: '#2A1810',
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#2A1810',
            },
          },
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] text-white">
        <Navbar />
        <main>
          <Hero id="hero" />
          <AirdropClaim />
          <About id="about" />
          <Characters />
          <GamesSection id="games" />
          <Staking id="staking" />
          <ReferralPanel />
          <Tokenomics />
          <ContractInfo />
          <Roadmap />
          <Team />
          <Partners />
          <Whitepaper />
          <Community />
          <Footer />
        </main>
      </div>
    </>
  );
}