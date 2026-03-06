'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../components/Footer'), { ssr: false });

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] text-white">
            <Navbar />
            <main className="container mx-auto px-6 py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#D4A017]">Terms of Use</h1>
                <div className="space-y-6 text-[#E8D5B5]/80 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using the Coffy Coin website and services, you agree to be bound by these Terms of Use. If you do not agree, please refrain from using our platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">2. Description of Service</h2>
                        <p>
                            Coffy Coin provides a blockchain-based ecosystem on the Base network, including the COFFY token, staking mechanisms, and gaming integrations. All transactions are final and managed by decentralized smart contracts.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">3. Risk Warning</h2>
                        <p>
                            Cryptocurrency investments involve high risk. Coffy Coin is not responsible for any financial losses. Users should conduct their own research before interacting with smart contracts or purchasing COFFY tokens.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">4. Prohibited Activities</h2>
                        <p>
                            Users are prohibited from using the platform for illegal activities, market manipulation, or any form of exploitation of the smart contracts or website infrastructure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">5. Intellectual Property</h2>
                        <p>
                            All content on the Coffy Coin website, including logos, designs, and text, is the property of Coffy Coin and protected by relevant intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">6. Amendments</h2>
                        <p>
                            Coffy Coin reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <p className="pt-8 text-sm italic">Last Updated: March 2026</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
