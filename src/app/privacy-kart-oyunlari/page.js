'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import('../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../components/Footer'), { ssr: false });

export default function KartOyunlariPrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A1C15] via-[#1B4332] to-[#081C15] text-white">
            <Navbar />
            <main className="container mx-auto px-6 py-24 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#FFD700]">Privacy Policy for Kart Oyunları: Pişti</h1>
                <div className="space-y-6 text-[#E0E0E0]/80 leading-relaxed">
                    <p className="italic">Last Updated: June 2026</p>
                    
                    <p>
                        At <strong>Kart Oyunları: Pişti</strong>, we are committed to protecting your privacy. This Privacy Policy outlines how we collect, use, and process data when you play our mobile game.
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#FFD700] mb-3">1. Information We Collect</h2>
                        <p>
                            We do not collect any personal identity information (such as your name, email address, phone number, or physical address) directly through the game. The game runs locally on your device, and your gaming data (scores, match records) is stored locally.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#FFD700] mb-3">2. Permissions and Haptic Feedback</h2>
                        <p>
                            Our app requests standard android permissions:
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2">
                            <li><strong>Vibrate:</strong> Used to provide physical haptic feedback (vibrations) when cards are played or won, enhancing your gaming experience.</li>
                            <li><strong>Internet:</strong> Used to load Google Fonts and remote app settings dynamically on first launch.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#FFD700] mb-3">3. Data Security</h2>
                        <p>
                            Since we do not collect or upload any personal data to external servers, your data is secure on your own device. The app uses standard Android security mechanisms to prevent unauthorized access to local game data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#FFD700] mb-3">4. Children's Privacy</h2>
                        <p>
                            Our game does not collect any personal information from anyone, including children. It is fully compliant with children's privacy regulations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-[#FFD700] mb-3">5. Contact Us</h2>
                        <p>
                            If you have any questions or feedback regarding this Privacy Policy, please feel free to reach out to us at:
                            <br />
                            <a href="mailto:celebiasal.oficial@gmail.com" className="text-[#FFD700] underline hover:text-[#FFEA70]">
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
