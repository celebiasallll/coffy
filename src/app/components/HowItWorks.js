'use client';

import { motion } from 'framer-motion';
import { Wallet, Gamepad2, Coins, Sparkles, ArrowRight } from 'lucide-react';

const steps = [
    {
        number: '01',
        icon: Wallet,
        title: 'Connect Your Wallet',
        description: 'Connect MetaMask, Coinbase Wallet, or Rabby on Base Mainnet. No minimum balance required.',
        color: '#D4A017',
    },
    {
        number: '02',
        icon: Gamepad2,
        title: 'Play or Verify Activity',
        description: 'Compete in browser games, challenge players in on-chain PvP matches, or verify daily drink & steps.',
        color: '#F4C430',
    },
    {
        number: '03',
        icon: Coins,
        title: 'Earn & Stake $COFFY',
        description: 'Claim your on-chain token rewards directly. Stake in our vault for 50% APY or level up characters.',
        color: '#A77B06',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', damping: 20, stiffness: 200 },
    },
};

export default function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="py-20 md:py-28 bg-gradient-to-b from-[#120A06] via-[#1A0E08] to-[#120A06] overflow-hidden"
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-4">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>QUICK ONBOARDING</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3 font-outfit">
                        Start Earning in <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">3 Simple Steps</span>
                    </h2>
                    <p className="text-[#E8D5B5]/75 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Zero gas overhead, instant on-chain settlement, and non-custodial Web3 architecture.
                    </p>
                </motion.div>

                {/* Steps */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {/* Connecting dashed line (desktop only) */}
                    <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-amber-500/20 z-0" />

                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={step.number}
                                variants={cardVariants}
                                whileHover={{ y: -6 }}
                                className="relative group bg-[#180E09]/90 border border-amber-500/20 rounded-2xl p-7 text-center backdrop-blur-md shadow-xl hover:border-amber-500/40 transition-colors duration-300 z-10"
                            >
                                {/* Number badge */}
                                <div
                                    className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black shadow-lg bg-gradient-to-br from-amber-400 to-orange-400"
                                >
                                    {step.number}
                                </div>

                                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-5 mt-2 text-amber-400 group-hover:scale-105 transition-transform">
                                    <Icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 font-outfit">
                                    {step.title}
                                </h3>
                                <p className="text-[#E8D5B5]/70 text-sm leading-relaxed">{step.description}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-center mt-12"
                >
                    <a
                        href="#games"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3 px-7 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-200"
                    >
                        <span>Explore Web3 Games</span>
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
