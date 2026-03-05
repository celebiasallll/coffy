'use client';

import { motion } from 'framer-motion';

const steps = [
    {
        number: '01',
        icon: '🔗',
        title: 'Connect Your Wallet',
        description: 'Connect MetaMask or any Web3 wallet on Base Mainnet. No minimum balance required — everyone can participate.',
        color: '#D4A017',
    },
    {
        number: '02',
        icon: '🎮',
        title: 'Play or Drink',
        description: 'Jump into any of our 7 games and compete in real-time matches, or visit a partner coffee shop and scan to earn.',
        color: '#F4C430',
    },
    {
        number: '03',
        icon: '💰',
        title: 'Earn COFFY Tokens',
        description: 'Win games, climb leaderboards, and claim your COFFY rewards on-chain. Stake them for 5% APY or use them in-game.',
        color: '#A77B06',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2, delayChildren: 0.1 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
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
            className="py-20 bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] overflow-hidden"
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-14"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] text-xs font-bold tracking-widest uppercase mb-4">
                        ☕ How It Works
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#D4A017] tracking-tight mb-3">
                        Start Earning in 3 Simple Steps
                    </h2>
                    <p className="text-[#E8D5B5]/80 text-lg max-w-2xl mx-auto">
                        No complicated setup. No minimum balance. Just connect, play, and earn.
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
                    <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-[#D4A017]/20 z-0" />

                    {steps.map((step) => (
                        <motion.div
                            key={step.number}
                            variants={cardVariants}
                            whileHover={{ y: -6 }}
                            className="relative group bg-gradient-to-br from-[#3A2A1E]/80 to-[#2A1810]/80 border border-[#BFA181]/20 rounded-2xl p-7 text-center backdrop-blur-sm shadow-xl hover:border-[#D4A017]/40 transition-colors duration-300 z-10"
                        >
                            {/* Number badge */}
                            <div
                                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${step.color}, #3A2A1E)` }}
                            >
                                {step.number}
                            </div>

                            {/* Hover glow */}
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{ background: `radial-gradient(circle at 50% 0%, ${step.color}15 0%, transparent 70%)` }}
                            />

                            <div className="text-5xl mb-4 mt-2">{step.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-2" style={{ color: step.color }}>
                                {step.title}
                            </h3>
                            <p className="text-[#E8D5B5]/80 text-sm leading-relaxed">{step.description}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <a
                        href="#games"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-[#D4A017]/30 hover:shadow-[#D4A017]/50 transition-shadow duration-300"
                    >
                        🎮 Start Playing Now
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
