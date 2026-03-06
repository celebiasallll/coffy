'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../components/Footer'), { ssr: false });

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] text-white">
            <Navbar />
            <main className="container mx-auto px-6 py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#D4A017]">Privacy Policy</h1>
                <div className="space-y-6 text-[#E8D5B5]/80 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">1. Information Collection</h2>
                        <p>
                            Coffy Coin does not collect personal identity information (such as names or emails) unless voluntarily provided (e.g., through contact forms). We track anonymous usage data to improve our platform experience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">2. Blockchain Data</h2>
                        <p>
                            All transactions involving COFFY tokens or staking are recorded on the public Base blockchain. Public wallet addresses and transaction histories are permanent and viewable by anyone.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">3. Cookies</h2>
                        <p>
                            We use essential cookies to maintain session states and provide a smooth user interface. You can disable cookies in your browser, but some features may not function correctly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">4. Third-Party Services</h2>
                        <p>
                            We may use third-party tools (like analytics) that collect data according to their own privacy policies. Our platform also links to external sites like BaseScan.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">5. Data Security</h2>
                        <p>
                            While we implement industry-standard security measures, no digital platform is 100% secure. Users are responsible for the security of their own private keys and digital wallets.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">6. International Users</h2>
                        <p>
                            Coffy Coin is a decentralized project. Users from all regions are responsible for complying with their local regulations regarding cryptocurrency and data privacy.
                        </p>
                    </section>

                    <p className="pt-8 text-sm italic">Last Updated: March 2026</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
