'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

const About = ({ id }) => {
  const sectionRef = useRef(null);

  // Scroll observer for animations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(element => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id={id} ref={sectionRef} className="py-20 bg-gradient-to-b from-[#1A0F0A] to-[#3A2A1E] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#D4A017] blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-[#A0522D] blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="text-center mb-16 reveal-on-scroll">
          <h2
            className="text-4xl md:text-5xl font-bold text-gradient mb-6"
          >
            About Coffy Coin
          </h2>

          <p
            className="text-lg text-[#E8D5B5]/80 max-w-3xl mx-auto"
          >
            We didn&apos;t just build a token. We built an on-chain economy where every cup of coffee, every step you take, and every game you win puts real COFFY in your wallet — permanently, transparently, on Base Mainnet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          {/* Left side - Coffy mascot - Improved mask and rounded edges */}
          <div className="reveal-on-scroll flex justify-center items-center">
            <div className="relative w-full max-w-xs">
              <div className="w-full aspect-square relative">
                {/* Image path: /public/images/coffy-mascot.png */}
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  {/* Soft gradient overlay for better edge blending */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1A0F0A]/40 via-transparent to-transparent z-10 pointer-events-none"></div>

                  {/* Background light effect to help with blending */}
                  <div className="absolute inset-0 rounded-full bg-[#D4A017]/5"></div>

                  {/* The image with better masking */}
                  <div className="relative w-[90%] h-[90%] flex items-center justify-center">
                    <Image
                      src="/images/coffy-mascot.png"
                      alt="Coffy Mascot"
                      width={280}
                      height={280}
                      className="object-contain animate-float"
                      priority={true}
                      loading="eager"
                      style={{
                        objectFit: 'contain',
                        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                        maskImage: 'radial-gradient(circle, black 60%, transparent 85%)'
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Bottom light effect */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-[#D4A017]/20 blur-3xl rounded-full -z-10"></div>
            </div>
          </div>

          {/* Right side - Information */}
          <div className="flex flex-col justify-center reveal-on-scroll">
            <div className="space-y-5">
              <p className="text-[#E8D5B5]/80">
                COFFY is deployed on <span className="text-[#D4A017] font-semibold">Base Mainnet</span> with a fully modular V7 smart contract architecture — auditable on-chain, zero hidden mechanics. Advanced sybil protection and oracle-signed EIP-712 rewards ensure every token you earn is legitimate. Your rewards are earned, not inflated.
              </p>
              <p className="text-[#E8D5B5]/80">
                Earn COFFY by gaming PvP battles, staking for up to <span className="text-[#D4A017] font-semibold">50% dynamic APY</span>, walking (Step-to-Earn), or photographing your coffee (Snap-to-Earn). Characters permanently boost rewards up to <span className="text-[#D4A017] font-semibold">+100%</span> and the Legend tier unlocks on-chain DAO governance.
              </p>
              <p className="text-[#E8D5B5]/80">
                On the horizon: <span className="text-[#D4A017] font-semibold">real-world coffee chain partnerships</span> where you pay with COFFY at partner cafés and earn cashback rewards, the <span className="text-[#D4A017] font-semibold">Coffy Wallet</span> for seamless in-app token management without MetaMask friction, and an expanding game library — from Coffee Chess to new strategy and casual titles — all sharing the same on-chain economy.
              </p>
              <div className="pt-2">
                <a href="#tokenomics" className="btn-primary">Explore Tokenomics</a>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section - More minimal */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16"
        >
          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                <path d="M6 11h4"></path>
                <path d="M14 11h4"></path>
                <path d="M6 15h4"></path>
                <path d="M14 15h4"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">3 Live Contracts</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              CoffyCore V7 + GameModule V16 + ActivityModule V14 — all verified on BaseScan.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v12"></path>
                <path d="M8 10h8"></path>
                <path d="M8 14h8"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">2–50% Dynamic APY</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              Stake COFFY, earn up to 50% APY boosted by your character multiplier. No minimum.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">Walk & Earn</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              Step-to-Earn + Snap-to-Earn — get paid for moving and drinking coffee in real life.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <path d="M6 12h4"></path>
                <path d="M8 10v4"></path>
                <path d="M15 13h.01"></path>
                <path d="M18 11h.01"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">5 Tier Characters</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              +10% to +100% reward multipliers on-chain. Legend tier unlocks DAO membership forever.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default About;
