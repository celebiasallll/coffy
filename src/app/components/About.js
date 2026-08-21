'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FileCode2, TrendingUp, Footprints, ShieldCheck, ArrowRight } from 'lucide-react';

export default function About({ id }) {
  return (
    <section id={id} className="py-20 bg-gradient-to-b from-[#140C08] to-[#1E110A] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-amber-600/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-orange-700/15 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <span>Protocol Architecture</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-outfit tracking-tight mb-4"
          >
            About Coffy Coin
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm md:text-base text-[#E8D5B5]/80 max-w-3xl mx-auto leading-relaxed"
          >
            An on-chain decentralized ecosystem on Base Mainnet where daily activities — walking, gaming PvP matches, and staking — are cryptographically verified and rewarded with zero hidden mechanics.
          </motion.p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16">
          {/* Left: Mascot Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-5 flex justify-center items-center"
          >
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 bg-[#180E09]/80 border border-amber-500/25 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-orange-500/10 rounded-3xl" />
              <Image
                src="/images/coffy-mascot.png"
                alt="Coffy Mascot"
                width={240}
                height={240}
                className="object-contain relative z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                priority
              />
            </div>
          </motion.div>

          {/* Right: Technical Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 space-y-4 text-xs sm:text-sm text-[#E8D5B5]/85 leading-relaxed"
          >
            <div className="bg-[#180E09]/80 border border-amber-500/20 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
              <p>
                COFFY is deployed natively on <strong className="text-amber-300 font-semibold">Base Mainnet L2</strong> with a modular V7 smart contract architecture — fully auditable on-chain. Advanced Sybil rate-limiting and oracle-signed EIP-712 proofs guarantee that all ecosystem rewards are mathematically backed.
              </p>
            </div>

            <div className="bg-[#180E09]/80 border border-amber-500/20 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
              <p>
                Participate in verified <strong className="text-amber-300 font-semibold">Play-to-Earn PvP battles (Chess & Checkers)</strong>, stake tokens for up to <strong className="text-amber-300 font-semibold">50% dynamic APY</strong>, or walk with Step-to-Earn. Character multipliers boost rewards up to <strong className="text-amber-300 font-semibold">+100%</strong> with 100% burn mechanics on purchase.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="#tokenomics"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all"
              >
                <span>Explore Verified Tokenomics</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#180E09]/90 border border-amber-500/20 hover:border-amber-500/40 p-5 rounded-2xl transition-all shadow-lg text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">3 Live Verified Contracts</h4>
            <p className="text-[#E8D5B5]/70 text-xs">
              CoffyCore V7, GameModule V16, and ActivityModule V14 on BaseScan.
            </p>
          </div>

          <div className="bg-[#180E09]/90 border border-amber-500/20 hover:border-amber-500/40 p-5 rounded-2xl transition-all shadow-lg text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">50% Dynamic APY</h4>
            <p className="text-[#E8D5B5]/70 text-xs">
              Stake COFFY with 7-day minimum lock and character boost multipliers.
            </p>
          </div>

          <div className="bg-[#180E09]/90 border border-amber-500/20 hover:border-amber-500/40 p-5 rounded-2xl transition-all shadow-lg text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Footprints className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Step-to-Earn</h4>
            <p className="text-[#E8D5B5]/70 text-xs">
              HealthKit & Google Fit integration with oracle-signed daily claims.
            </p>
          </div>

          <div className="bg-[#180E09]/90 border border-amber-500/20 hover:border-amber-500/40 p-5 rounded-2xl transition-all shadow-lg text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Deflationary Sinks</h4>
            <p className="text-[#E8D5B5]/70 text-xs">
              100% token burn on character purchase and 5% early unstake burn.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
