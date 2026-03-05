'use client';

import { motion } from 'framer-motion';

export default function Roadmap() {
  const achievements = [
    { icon: '✅', text: 'Base Mainnet Smart Contract Deploy (V2 Modular)' },
    { icon: '✅', text: '7 Play-to-Earn Games Launched' },
    { icon: '✅', text: 'Anti-Sybil Protection V2 with Dynamic Rewards' },
    { icon: '✅', text: 'Staking System (Dynamic APY 2–50%) Live' },
    { icon: '✅', text: 'Coffee Chess & Checkers Multiplayer PvP Live' },
    { icon: '✅', text: 'FlagRacer Online Multiplayer Racing Live' },
  ];

  const roadmapData = [
    {
      quarter: "Q1 2026",
      title: "AI Integration & Cross-Chain Expansion",
      status: "🔥 ACTIVE",
      statusColor: "from-emerald-500 to-teal-500",
      items: [
        "AI-Powered Game Matchmaking & Anti-Cheat System",
        "Cross-Chain Bridge (BNB, Polygon, Arbitrum)",
        "Advanced Character NFT System with Rarity Tiers",
        "Mobile App Beta Launch (iOS & Android)",
        "Dynamic Staking Rewards with APY Booster NFTs"
      ]
    },
    {
      quarter: "Q2 2026",
      title: "Metaverse & Social Gaming",
      status: "📅 PLANNED",
      statusColor: "from-violet-500 to-purple-500",
      items: [
        "Coffyverse Metaverse Launch - Virtual Coffee Shops & Gaming Lounges",
        "Social Gaming Tournaments with Prize Pools (up to 1M COFFY)",
        "Creator Economy - User-Generated Content & Rewards",
        "DAO Governance V2 - Community Treasury Management",
        "Real-World Coffee Shop Partnerships & Rewards"
      ]
    },
    {
      quarter: "Q3 2026",
      title: "DeFi & Enterprise Integration",
      status: "🚀 FUTURE",
      statusColor: "from-blue-500 to-cyan-500",
      items: [
        "Yield Farming & Liquidity Mining Pools",
        "COFFY Launchpad for Gaming Projects",
        "Enterprise API for Coffee Shop Integrations",
        "NFT Marketplace V2 with Auction System",
        "Multi-Language Support (10+ Languages)"
      ]
    },
    {
      quarter: "Q4 2026",
      title: "Global Expansion & Innovation",
      status: "✨ VISION",
      statusColor: "from-amber-500 to-orange-500",
      items: [
        "Global Gaming Championships with $500K+ Prize Pool",
        "AR/VR Coffee Gaming Experiences",
        "COFFY Debit Card & Payment Solutions",
        "Strategic Partnerships with Major Gaming Studios",
        "Layer 2 Scaling Solution for Ultra-Low Fees"
      ]
    }
  ];

  return (
    <section
      className="relative py-32 overflow-hidden bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A]"
      id="roadmap"
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            'radial-gradient(circle at 20% 20%, hsl(43, 75%, 47%) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 80%, hsl(43, 75%, 47%) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 20%, hsl(43, 75%, 47%) 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            viewport={{ once: true }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#D4A017] to-[#A77B06] rounded-2xl flex items-center justify-center shadow-lg shadow-[#D4A017]/30 animate-pulse-glow">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 gradient-text-animated tracking-tight font-outfit">
            2026 Roadmap to the Future
          </h2>
          <p className="text-lg text-[#E8D5B5]/90 max-w-2xl mx-auto font-medium">
            Our ambitious vision for revolutionizing coffee gaming and blockchain technology
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#D4A017] to-transparent mx-auto mt-6 rounded-full" />
        </motion.div>

        {/* Achievements — What We've Built */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto mb-14"
        >
          <div className="bg-gradient-to-br from-[#2A1810]/80 to-[#3A2A1E]/60 border border-[#D4A017]/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-[#D4A017]/20 flex items-center justify-center">
                <span className="text-[#D4A017] text-xs">✓</span>
              </div>
              <h3 className="text-lg font-bold text-white font-outfit">What We&apos;ve Built</h3>
              <span className="text-xs text-[#E8D5B5]/50 ml-1">— Completed milestones</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm text-[#E8D5B5]/80"
                >
                  <span className="text-base flex-shrink-0">{a.icon}</span>
                  <span className="leading-tight">{a.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Roadmap Timeline */}
        <div className="max-w-4xl mx-auto space-y-6">
          {roadmapData.map((phase, index) => (
            <motion.div
              key={phase.quarter}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Connecting Line */}
              {index < roadmapData.length - 1 && (
                <div className="hidden md:block absolute left-1/2 top-full h-6 w-0.5 bg-gradient-to-b from-[#D4A017]/30 to-transparent -translate-x-1/2 z-0" />
              )}

              <div className={`flex flex-col md:flex-row items-center gap-6 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}>
                {/* Quarter Badge */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative flex-shrink-0 w-28 h-28 glass-card group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#D4A017]/20 to-[#A77B06]/20 rounded-2xl animate-pulse-glow" />
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-white">
                    <div className="text-3xl font-black gradient-text font-outfit">{phase.quarter.split(' ')[1]}</div>
                    <div className="text-[10px] font-bold text-[#E8D5B5] mt-0.5 tracking-widest">{phase.quarter.split(' ')[0]}</div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-[#D4A017] to-[#A77B06] rounded-full animate-pulse shadow-lg shadow-[#D4A017]/30" />
                  </div>
                </motion.div>

                {/* Content Card */}
                <motion.div
                  whileHover={{ y: -3 }}
                  className="flex-1 glass-card group relative overflow-hidden"
                >
                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#D4A017]/0 via-[#D4A017]/10 to-[#D4A017]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="relative p-7">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-xl md:text-2xl font-extrabold gradient-text-animated mb-2 tracking-tight font-outfit">
                          {phase.title}
                        </h3>
                        <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${phase.statusColor} text-white shadow-lg tracking-wider`}>
                          {phase.status}
                        </span>
                      </div>
                      <div className="hidden md:block text-3xl opacity-20 group-hover:opacity-60 group-hover:scale-110 transition-all duration-300">
                        🚀
                      </div>
                    </div>

                    {/* Items List */}
                    <ul className="space-y-3">
                      {phase.items.map((item, itemIndex) => (
                        <motion.li
                          key={itemIndex}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: itemIndex * 0.1 }}
                          viewport={{ once: true }}
                          className="flex items-start text-[#E8D5B5]/90 group/item hover:text-white transition-colors duration-300"
                        >
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#D4A017] to-[#A77B06] flex items-center justify-center mr-3 mt-0.5 group-hover/item:scale-110 shadow-lg transition-transform duration-300">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm leading-relaxed font-medium">{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                </motion.div>
              </div>
            </motion.div>
          ))
          }</div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="glass-panel inline-block px-8 py-5 border border-[#D4A017]/30">
            <p className="text-lg text-white font-extrabold mb-1 tracking-tight">Join us on this exciting journey!</p>
            <p className="text-[#E8D5B5]/80 text-sm font-medium">Follow our progress and be part of the future of coffee gaming</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}