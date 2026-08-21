'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Users, ShieldCheck, Lock, ExternalLink } from 'lucide-react';

const CEO = {
    name: 'Çelebi Asal',
    title: 'CEO & Founder',
    photo: '/team/ceo-photo.jpg',
    bio: 'Founder of Coffy Coin. Architect of the ecosystem merging Web3 tokenomics, decentralized gaming, and real-world coffee utility.',
    twitter: 'https://x.com/celebiasalll',
    linkedin: 'https://www.linkedin.com/in/%C3%A7elebi-asal-0495a1139',
};

const ANON_MEMBERS = [
    {
        name: 'Mert K.',
        title: 'Lead Blockchain Architect',
        avatar: '/team/dev1.png',
        note: 'EVM & Smart Contract Security',
    },
    {
        name: 'Burak A.',
        title: 'Game Engine & Backend Lead',
        avatar: '/team/dev2.png',
        note: 'Real-time WebSocket & Engine',
    },
    {
        name: 'Deniz Ç.',
        title: 'UI/UX & Frontend Engineer',
        avatar: '/team/dev3.png',
        note: 'Web3 Integration & React Core',
    },
];

export default function Team() {
    return (
        <section id="team" className="py-24 bg-gradient-to-b from-[#1A0E08] to-[#120A06] overflow-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-4">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>CORE CONTRIBUTORS</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 font-outfit">
                        Leadership & <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">Engineering</span>
                    </h2>
                    <p className="text-[#E8D5B5]/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                        Dedicated team building sustainable on-chain utility and game-theoretic reward economies.
                    </p>
                </motion.div>

                {/* CEO Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 flex justify-center"
                >
                    <div
                        className="relative bg-[#1A0E08]/90 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl backdrop-blur-md"
                    >
                        {/* Photo */}
                        <div className="relative w-28 h-28 mx-auto mb-5">
                            <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-[#120A06] p-0.5">
                                <Image
                                    src={CEO.photo}
                                    alt={CEO.name}
                                    width={112}
                                    height={112}
                                    className="object-cover w-full h-full rounded-xl"
                                    style={{ objectPosition: 'center top' }}
                                />
                            </div>
                        </div>

                        {/* Badge */}
                        <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wider uppercase rounded-full px-3 py-1 mb-3">
                            {CEO.title}
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2 font-outfit">{CEO.name}</h3>
                        <p className="text-[#E8D5B5]/70 text-sm leading-relaxed mb-6">{CEO.bio}</p>

                        {/* Social Links */}
                        <div className="flex items-center justify-center gap-3">
                            <a
                                href={CEO.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-black/40 border border-amber-500/20 hover:border-amber-400 text-[#E8D5B5] hover:text-white transition-all duration-200 rounded-xl px-4 py-2 text-xs font-semibold"
                            >
                                <span>Twitter / X</span>
                                <ExternalLink className="w-3 h-3 text-amber-400" />
                            </a>
                            <a
                                href={CEO.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-black/40 border border-amber-500/20 hover:border-amber-400 text-[#E8D5B5] hover:text-white transition-all duration-200 rounded-xl px-4 py-2 text-xs font-semibold"
                            >
                                <span>LinkedIn</span>
                                <ExternalLink className="w-3 h-3 text-amber-400" />
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Core Engineers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {ANON_MEMBERS.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-[#180E09]/80 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 text-center backdrop-blur-sm transition-all duration-300 shadow-lg"
                        >
                            {/* Avatar */}
                            <div className="relative w-20 h-20 mx-auto mb-3">
                                <div className="w-full h-full rounded-2xl overflow-hidden border border-amber-500/25 bg-black/40">
                                    <Image
                                        src={m.avatar}
                                        alt={m.name}
                                        width={80}
                                        height={80}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                            </div>

                            <div className="inline-block bg-amber-500/10 text-amber-300 text-[10px] font-bold tracking-wider uppercase rounded-full px-2.5 py-0.5 mb-2">
                                {m.name}
                            </div>
                            <h4 className="text-white font-bold text-sm mb-1">{m.title}</h4>
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[#E8D5B5]/50 text-[11px]">{m.note}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Transparency note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-10 text-center"
                >
                    <div className="inline-flex items-center gap-2 bg-black/30 border border-amber-500/15 rounded-xl px-4 py-2.5 text-xs text-[#E8D5B5]/60">
                        <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>Core smart contracts and commits are verified on GitHub &amp; BaseScan</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
