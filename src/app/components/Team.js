'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const CEO = {
    name: 'Çelebi Asal',
    title: 'CEO & Founder',
    photo: '/team/ceo-photo.jpg',
    bio: 'Founder of Coffy Coin. Builder at the intersection of Web3, gaming, and the global coffee culture.',
    twitter: 'https://x.com/celebiasalll',
    linkedin: 'https://www.linkedin.com/in/%C3%A7elebi-asal-0495a1139',
};

const ANON_MEMBERS = [
    {
        name: 'Mert K.',
        title: 'Lead Blockchain Developer',
        avatar: '/team/dev1.png',
        note: 'Anonim — on-chain doğrulanabilir',
    },
    {
        name: 'Burak A.',
        title: 'Game Engine & Backend Lead',
        avatar: '/team/dev2.png',
        note: 'Anonim — on-chain doğrulanabilir',
    },
    {
        name: 'Deniz Ç.',
        title: 'UI/UX & Frontend Developer',
        avatar: '/team/dev3.png',
        note: 'Anonim — on-chain doğrulanabilir',
    },
];

export default function Team() {
    return (
        <section id="team" className="py-24 bg-gradient-to-b from-[#2A1810] to-[#1A0F0A] overflow-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-14"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] text-xs font-bold tracking-widest uppercase mb-4 font-outfit">
                        👥 Team
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#D4A017] mb-3 font-outfit tracking-tight">
                        Meet the Builders
                    </h2>
                    <p className="text-[#E8D5B5]/70 text-lg max-w-xl mx-auto">
                        A passionate team building the future of coffee & Web3. Core team verified on-chain.
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
                        className="relative bg-gradient-to-br from-[#3A2A1E] to-[#2A1810] border border-[#D4A017]/40 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
                        style={{ boxShadow: '0 0 60px rgba(212,160,23,0.12)' }}
                    >
                        {/* Gold top accent */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />

                        {/* CEO Photo */}
                        <div className="relative w-28 h-28 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D4A017] to-[#A77B06] p-[2px]">
                                <div className="w-full h-full rounded-2xl overflow-hidden bg-[#2A1810]">
                                    <Image
                                        src={CEO.photo}
                                        alt={CEO.name}
                                        width={112}
                                        height={112}
                                        className="object-cover w-full h-full"
                                        style={{ objectPosition: 'center top' }}
                                    />
                                </div>
                            </div>
                            {/* Gold glow */}
                            <div className="absolute inset-0 rounded-2xl shadow-lg shadow-[#D4A017]/30 pointer-events-none" />
                        </div>

                        {/* Badge */}
                        <div className="inline-block bg-[#D4A017]/15 border border-[#D4A017]/40 text-[#D4A017] text-[11px] font-bold tracking-widest uppercase rounded-full px-3 py-1 mb-3 font-outfit">
                            {CEO.title}
                        </div>

                        <h3 className="text-2xl font-extrabold text-white mb-2 font-outfit">{CEO.name}</h3>
                        <p className="text-[#E8D5B5]/70 text-sm leading-relaxed mb-6 font-outfit">{CEO.bio}</p>

                        {/* Social Links */}
                        <div className="flex items-center justify-center gap-3">
                            <a
                                href={CEO.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-[#1A0F0A] border border-[#D4A017]/20 hover:border-[#D4A017]/60 text-[#E8D5B5] hover:text-[#D4A017] transition-all duration-300 rounded-xl px-4 py-2.5 text-sm font-bold font-outfit"
                            >
                                <i className="fab fa-x-twitter text-base"></i>
                                <span>Twitter / X</span>
                            </a>
                            <a
                                href={CEO.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-[#1A0F0A] border border-[#D4A017]/20 hover:border-[#D4A017]/60 text-[#E8D5B5] hover:text-[#D4A017] transition-all duration-300 rounded-xl px-4 py-2.5 text-sm font-bold font-outfit"
                            >
                                <i className="fab fa-linkedin text-base"></i>
                                <span>LinkedIn</span>
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Anonymous Team Members */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {ANON_MEMBERS.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-gradient-to-br from-[#3A2A1E]/80 to-[#2A1810]/80 border border-[#D4A017]/15 hover:border-[#D4A017]/35 rounded-2xl p-5 text-center backdrop-blur-sm transition-all duration-300"
                        >
                            {/* Avatar */}
                            <div className="relative w-20 h-20 mx-auto mb-3">
                                <div className="w-full h-full rounded-2xl overflow-hidden border border-[#D4A017]/20">
                                    <Image
                                        src={m.avatar}
                                        alt={m.name}
                                        width={80}
                                        height={80}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                            </div>

                            <div className="inline-block bg-[#D4A017]/10 text-[#D4A017] text-[10px] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 mb-2 font-outfit">
                                {m.name}
                            </div>
                            <h4 className="text-white font-bold text-sm mb-1 font-outfit">{m.title}</h4>
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A017]/50"></div>
                                <span className="text-[#E8D5B5]/40 text-[11px] font-outfit">{m.note}</span>
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
                    <div className="inline-flex items-center gap-2 bg-[#D4A017]/5 border border-[#D4A017]/15 rounded-xl px-5 py-3 text-sm text-[#E8D5B5]/50 font-outfit">
                        <span>🔒</span>
                        <span>Anonymous contributors verifiable via on-chain activity and GitHub commits</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
