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
            Coffy Coin V2 introduces a revolutionary modular ecosystem combining gaming, DeFi, and community governance.
            Our advanced smart contract architecture provides sustainable rewards through character-based gameplay and enhanced staking mechanisms.
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
            <div
              className="space-y-6"
            >
              <h3 className="text-2xl md:text-3xl font-semibold text-[#E8D5B5]">Our Mission</h3>
              <p className="text-[#E8D5B5]/80">
                Our V2 modular smart contract creates a transparent, secure ecosystem that revolutionizes
                the coffee gaming experience. With advanced sybil protection
                and a character-based reward system, we provide sustainable value across our entire gaming ecosystem.
              </p>
              <p className="text-[#E8D5B5]/80">
                Through our enhanced staking system (dynamic APY) and modular-ready architecture planned for
                DAO, NFT, Social, and Cross-chain modules in 2026, token holders will actively shape the project's future
                while earning through engaging gameplay and community participation.
              </p>
              <div className="pt-4">
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
            {/* SVG icon inline for better performance - Path: /public/icons/blockchain-icon.svg */}
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
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">Modular Ready</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              V2 contract ready for DAO, NFT, Social, and Cross-chain modules starting 2026.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            {/* SVG icon inline - Path: /public/icons/staking-icon.svg */}
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v12"></path>
                <path d="M8 10h8"></path>
                <path d="M8 14h8"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">Enhanced Staking</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              Dynamic APY with no minimum stake and early unstake protection.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            {/* SVG icon inline - Path: /public/icons/community-icon.svg */}
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">Future DAO</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              Legendary Dragon holders will get DAO membership for protocol governance in Q2.
            </p>
          </div>

          <div className="card-coffee hover-lift reveal-on-scroll p-4 text-center">
            {/* SVG icon inline - Path: /public/icons/gaming-icon.svg */}
            <div className="h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <path d="M6 12h4"></path>
                <path d="M8 10v4"></path>
                <path d="M15 13h.01"></path>
                <path d="M18 11h.01"></path>
              </svg>
            </div>
            <h4 className="text-lg font-semibold mb-2 text-[#E8D5B5]">Character System</h4>
            <p className="text-[#E8D5B5]/70 text-sm">
              5 unique characters with 2x-10x multipliers and advanced sybil protection.
            </p>
          </div>
        </div>

        {/* Minimal Call to Action */}
        <div className="mt-12 text-center reveal-on-scroll">
          <a href="#community" className="btn-primary mx-auto inline-block">
            Join Community
          </a>
        </div>
      </div>
    </section>
  );
};

export default About;
