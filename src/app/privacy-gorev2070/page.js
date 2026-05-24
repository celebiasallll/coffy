'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../components/Footer'), { ssr: false });

export default function Gorev2070PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] text-white">
            <Navbar />
            <main className="container mx-auto px-6 py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#D4A017]">Privacy Policy for GÖREV 2070: Siber Strateji</h1>
                <div className="space-y-6 text-[#E8D5B5]/80 leading-relaxed">
                    <p className="italic">Last Updated: May 2026</p>
                    
                    <p>
                        At GÖREV 2070: Siber Strateji, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and disclose information when you play our mobile game.
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">1. Information We Collect</h2>
                        <p>
                            We do not collect any personal identity information (such as your name, email address, or phone number) directly from the game. However, we use third-party services that may collect automated technical data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">2. Third-Party Services & Advertising (Google AdMob)</h2>
                        <p>
                            To keep our game free, we display advertisements provided by Google AdMob. 
                            Google AdMob may collect and use pseudonymous data such as your mobile device's Advertising ID (e.g., Android AAID) and device technical specifications to show you personalized or non-personalized advertisements.
                        </p>
                        <p className="mt-2">
                            You can learn more about how Google uses your data by visiting the following link:
                            <br />
                            <a 
                                href="https://policies.google.com/technologies/ads" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[#D4A017] underline hover:text-[#F4C430]"
                            >
                                Google Advertising Policies
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">3. Data Security</h2>
                        <p>
                            We take reasonable steps to secure any automated data processed by the game and the Google AdMob SDK. You can reset or opt-out of personalized ads at any time via your Android Device Settings (Settings &gt; Google &gt; Ads).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#D4A017] mb-3">4. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, you can contact us at: 
                            <br />
                            <a href="mailto:celebiasal.oficial@gmail.com" className="text-[#D4A017] underline hover:text-[#F4C430]">
                                celebiasal.oficial@gmail.com
                            </a>
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
