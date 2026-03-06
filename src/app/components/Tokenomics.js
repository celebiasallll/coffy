'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const Tokenomics = () => {
  const sectionRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Tokenomics data - V2 Contract Distribution
  const tokenDistribution = [
    { name: 'Community', percentage: 35, color: '#D4A017', description: 'Community rewards & ecosystem growth' },
    { name: 'Treasury', percentage: 25, color: '#E8D5B5', description: 'Game & Staking Rewards Pool' },
    { name: 'Liquidity Pool', percentage: 20, color: '#A77B06', description: 'DEX Liquidity & Trading' },
    { name: 'Marketing', percentage: 10, color: '#8B6914', description: 'Marketing & Partnerships' },
    { name: 'Team & Dev', percentage: 10, color: '#5F4B32', description: 'Team allocation & development' }
  ];

  // V2 Contract tokenomics data
  const tokenomicsData = [
    {
      title: "V2 Token Supply",
      items: [
        "Total Supply: 15 Billion COFFY",
        "Network: Base Mainnet",
        "Contract: Audited & Verified",
        "Decimals: 18"
      ]
    },
    {
      title: "Enhanced Distribution",
      items: [
        "Community: 5.25B COFFY (35%) - Long-term ecosystem rewards",
        "Treasury: 3.75B COFFY (25%) - Game rewards, staking, development",
        "Liquidity: 3B COFFY (20%) - DEX liquidity pools & trading",
        "Marketing: 1.5B COFFY (10%) - Partnerships & growth campaigns",
        "Team: 1.5B COFFY (10%) - Development & operations"
      ]
    },
    {
      title: "Sustainable Growth Features",
      items: [
        "Semi-Annual Inflation: 5.0% every 6 months - Sustainable growth",
        "Staking Rewards: 5% APY - Sustainable annual percentage yield",
        "Game Rewards: 35K weekly limit - Advanced sybil protection",
        "Modular System: DAO, NFT, Social, Cross-chain planned for 2026"
      ]
    }
  ];

  return (
    <section
      id="tokenomics"
      ref={sectionRef}
      className="py-8 bg-gradient-to-b from-[#3A2A1E] to-[#1A0F0A] relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-[#D4A017]/5 blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-80 h-80 rounded-full bg-[#D4A017]/5 blur-3xl"></div>

        {/* Coffee bean decorations */}
        <div className="absolute top-[20%] right-[5%] w-16 h-24 opacity-20">
          <svg viewBox="0 0 100 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bean-spin">
            <path d="M50 0C22.4 0 0 38.2 0 85s22.4 85 50 85 50-38.2 50-85S77.6 0 50 0zm0 10c16.6 0 30 33.7 30 75s-13.4 75-30 75-30-33.7-30-75 13.4-75 30-75z" fill="#D4A017" />
          </svg>
        </div>
        <div className="absolute bottom-[15%] left-[8%] w-12 h-20 opacity-20 rotate-45">
          <svg viewBox="0 0 100 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bean-spin" style={{ animationDirection: 'reverse', animationDuration: '15s' }}>
            <path d="M50 0C22.4 0 0 38.2 0 85s22.4 85 50 85 50-38.2 50-85S77.6 0 50 0zm0 10c16.6 0 30 33.7 30 75s-13.4 75-30 75-30-33.7-30-75 13.4-75 30-75z" fill="#D4A017" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        <div className="text-center mb-6 reveal-on-scroll">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gradient mb-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Tokenomics
          </motion.h2>

          <motion.p
            className="text-sm md:text-base text-[#E8D5B5] max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Coffy Coin is designed with a balanced tokenomics model for long-term sustainability and value.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Chart visualization - left side with modern circular design */}
          <div className="reveal-on-scroll">
            <motion.div
              className="card-coffee p-4 h-full"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-lg font-semibold text-[#E8D5B5] mb-3 text-center">Token Distribution</h3>

              {/* Larger circular chart */}
              <div className="relative w-full aspect-square max-w-[300px] mx-auto">
                {/* Max supply in center */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-[40%] h-[40%] rounded-full bg-[#1A0F0A]/80 border-2 border-[#D4A017]/30 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold text-[#D4A017]">15B</p>
                      <p className="text-xs text-[#E8D5B5] mt-0.5">Max Supply</p>
                    </div>
                  </div>
                </div>

                {/* Colored segments */}
                <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-md">
                  {isClient && tokenDistribution.map((segment, index) => {
                    // Calculate segments and positions
                    const segmentAngle = (segment.percentage / 100) * 360;
                    const startAngle = tokenDistribution
                      .slice(0, index)
                      .reduce((sum, item) => sum + (item.percentage / 100) * 360, 0);

                    // Convert to radians
                    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                    const endAngleRad = (startAngle + segmentAngle - 90) * (Math.PI / 180);

                    // Calculate arc path
                    const radius = 40;
                    const x1 = 50 + radius * Math.cos(startAngleRad);
                    const y1 = 50 + radius * Math.sin(startAngleRad);
                    const x2 = 50 + radius * Math.cos(endAngleRad);
                    const y2 = 50 + radius * Math.sin(endAngleRad);

                    // Large arc flag
                    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

                    // Path definition
                    const path = [
                      `M 50 50`,
                      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                      `Z`
                    ].join(' ');

                    // Label positioning
                    const midAngle = startAngle + (segmentAngle / 2) - 90;
                    const midAngleRad = midAngle * (Math.PI / 180);
                    const labelRadius = 25;
                    const labelX = 50 + labelRadius * Math.cos(midAngleRad);
                    const labelY = 50 + labelRadius * Math.sin(midAngleRad);

                    return (
                      <g key={`segment-${index}`}>
                        <path
                          d={path}
                          fill={segment.color}
                          className="hover:brightness-110 transition-all cursor-pointer"
                          stroke="#1A0F0A"
                          strokeWidth="0.5"
                        />
                        {segment.percentage >= 10 && (
                          <text
                            x={labelX.toFixed(2)}
                            y={labelY.toFixed(2)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#FFF"
                            fontSize="5"
                            fontWeight="bold"
                          >
                            {segment.percentage}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend with improved readability - moved below for better balance */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                {tokenDistribution.map((item, index) => {
                  // Calculate correct amount from percentage × 15B total
                  const totalSupply = 15;
                  const amount = ((item.percentage / 100) * totalSupply).toFixed(2);
                  const displayAmount = amount % 1 === 0 ? `${parseInt(amount)}B` : `${amount}B`;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shadow-sm flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                      <div className="text-xs">
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-[#E8D5B5]/80 text-[10px] flex gap-1">
                          <span>{displayAmount}</span>
                          <span>({item.percentage}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          </div>

          {/* Details - right side with improved readability */}
          <div className="reveal-on-scroll">
            <motion.div
              className="card-coffee p-4 h-full"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-lg font-semibold text-[#E8D5B5] mb-3">Token Details</h3>

              <div className="space-y-4">
                {/* Token info with better contrast */}
                <div className="bg-[#1A0F0A]/40 rounded-md p-3">
                  <h4 className="text-base text-[#D4A017] font-medium mb-2">Token Information</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/80">Name:</span>
                      <span className="text-white font-medium">Coffy Coin</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Network:</span>
                      <span className="text-white font-medium">Base</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Symbol:</span>
                      <span className="text-white font-medium">COFFY</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Type:</span>
                      <span className="text-white font-medium">ERC-20</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Max Supply:</span>
                      <span className="text-white font-medium">15B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Decimals:</span>
                      <span className="text-white font-medium">18</span>
                    </div>
                  </div>
                </div>

                {/* Key features with optimized rendering */}
                <div>
                  <h4 className="text-base text-[#D4A017] font-medium mb-2">Key Features</h4>
                  <ul className="space-y-2 text-sm">
                    {[
                      { title: "35% Community", desc: "Long-term ecosystem rewards and growth" },
                      { title: "25% Treasury", desc: "Game rewards, staking, and development" },
                      { title: "5.0% Inflation", desc: "Semi-annual sustainable growth rate" },
                      { title: "Future Modules", desc: "DAO, NFT, Social, and Cross-chain planned for 2026" }
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#D4A017]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="#D4A017">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-white">
                          <span className="text-[#D4A017] font-medium">{feature.title}:</span> {feature.desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Token utility section - Simplified and optimized */}
        <div className="mt-4 reveal-on-scroll">
          <motion.div
            className="flex flex-col md:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            {[
              {
                icon: (
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                ),
                title: "Staking",
                desc: "Earn passive rewards"
              },
              {
                icon: (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </>
                ),
                title: "Governance",
                desc: "Vote on proposals"
              },
              {
                icon: (
                  <>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 16h10" />
                  </>
                ),
                title: "In-Game",
                desc: "Game marketplace"
              }
            ].map((item, idx) => (
              <div key={idx} className="card-coffee p-3 flex-1 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4A017]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                  <p className="text-[#E8D5B5]/70 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Ultra compact CTA */}
        <div className="mt-5 text-center">
          <motion.a
            href="#staking"
            className="btn-primary text-sm py-2 px-4 inline-block"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
          >
            Start Staking
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default Tokenomics;
