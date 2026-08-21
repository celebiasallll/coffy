'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Calendar, Rocket, Sparkles, Milestone, ArrowUpRight } from 'lucide-react';

export default function Roadmap() {
  const achievements = [
    'Base Mainnet Modular Architecture Deployed',
    'Play-to-Earn Browser Games Integrated',
    'Anti-Sybil EIP-712 Verification Active',
    'Staking Engine (Dynamic APY 2–50%) Live',
    'Coffee Chess & Checkers PvP Live',
    '5.25 Billion Community Reward Pool Active',
  ];

  const roadmapData = [
    {
      quarter: "Q1 2026",
      title: "AI Integration & Dynamic Staking",
      status: "ACTIVE",
      statusIcon: Flame,
      statusBadge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      items: [
        "AI-Powered Matchmaking & Anti-Bot Verification",
        "EIP-712 Cryptographic Signature Optimization",
        "Character Multiplier & XP Leveling Integration",
        "Mobile App Beta for iOS & Android",
        "Dynamic APY Staking Contract Scaling"
      ]
    },
    {
      quarter: "Q2 2026",
      title: "Metaverse & On-Chain PvP Tournaments",
      status: "PLANNED",
      statusIcon: Calendar,
      statusBadge: "bg-purple-500/15 border-purple-500/30 text-purple-400",
      items: [
        "Competitive Social Tournaments with Dedicated Prize Pools",
        "Coffee Shop Partner Loyalty Integrations",
        "User-Generated Content & Creator Reward Economy",
        "DAO Governance V2 & Treasury Voting",
        "Smart Contract Automated Burn System"
      ]
    },
    {
      quarter: "Q3 2026",
      title: "DeFi & Liquidity Mining",
      status: "DEVELOPMENT",
      statusIcon: Rocket,
      statusBadge: "bg-blue-500/15 border-blue-500/30 text-blue-400",
      items: [
        "Automated Liquidity Mining & Yield Incentives",
        "COFFY Ecosystem Launchpad Integration",
        "Enterprise POS API for Real Coffee Retailers",
        "Decentralized Secondary Marketplace",
        "Global Multi-Language Localization"
      ]
    },
    {
      quarter: "Q4 2026",
      title: "Global Scale & Institutional Solutions",
      status: "VISION",
      statusIcon: Sparkles,
      statusBadge: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      items: [
        "Global Esports Series with High-Stakes On-Chain Pools",
        "Augmented Reality (AR) Drink-to-Earn App",
        "Web3 Virtual Coffee Card Solution",
        "Strategic Tier-1 Studio Collaborations",
        "Cross-Chain Liquidity Routing"
      ]
    }
  ];

  return (
    <section
      className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-b from-[#120A06] via-[#1A0E08] to-[#120A06]"
      id="roadmap"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-4">
            <Milestone className="w-4 h-4 text-amber-400" />
            <span>PROJECT TIMELINE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 font-outfit">
            Ecosystem <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">Roadmap</span>
          </h2>
          <p className="text-base sm:text-lg text-[#E8D5B5]/75 max-w-2xl mx-auto leading-relaxed">
            Strategic milestones and key development phases driving long-term decentralization, gaming expansion, and community utility.
          </p>
        </motion.div>

        {/* Achievements — What We've Built */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto mb-14"
        >
          <div className="bg-[#180E09]/80 border border-amber-500/25 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white font-outfit">Completed Milestones</h3>
              <span className="text-xs text-[#E8D5B5]/50">— Verified on Base Mainnet</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {achievements.map((text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#E8D5B5]/85"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="leading-snug">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Roadmap Timeline */}
        <div className="max-w-4xl mx-auto space-y-6">
          {roadmapData.map((phase, index) => {
            const StatusIcon = phase.statusIcon;
            return (
              <motion.div
                key={phase.quarter}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#1A0E08]/85 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-md transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-amber-500/10">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">
                        {phase.quarter}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${phase.statusBadge}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{phase.status}</span>
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight font-outfit">
                      {phase.title}
                    </h3>
                  </div>
                </div>

                {/* Items List */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {phase.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-[#E8D5B5]/80"
                    >
                      <ArrowUpRight className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}