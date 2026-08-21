'use client';

import Image from 'next/image';
import { BASE_CONFIG } from '../config/baseConfig';
import { motion } from 'framer-motion';
import { ShieldCheck, ExternalLink, Linkedin, Send, Twitter, FileText, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 bg-gradient-to-b from-[#140C08] to-[#0A0503] border-t border-amber-500/20 relative overflow-hidden" id="footer">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        {/* Top Section: Founder & Leadership Trust Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 p-6 sm:p-8 rounded-3xl bg-[#1A0E08]/90 border border-amber-500/30 backdrop-blur-md shadow-2xl"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
            
            {/* Founder Info */}
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg bg-amber-950 flex-shrink-0">
                <Image
                  src="/team/ceo-photo.jpg"
                  alt="Çelebi Asal - Founder & CEO"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Founder &amp; Architect</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
                  Çelebi Asal
                </h3>
                <p className="text-amber-300 text-xs sm:text-sm font-medium">
                  CEO &amp; Lead Protocol Architect
                </p>
                <p className="text-[#E8D5B5]/70 text-xs sm:text-sm mt-1 max-w-xl">
                  Creator of Coffy Coin on Base Mainnet. Architect of decentralized EIP-712 reward systems, PvP game mechanics, and deflationary tokenomics.
                </p>
              </div>
            </div>

            {/* Social Verification Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://www.linkedin.com/in/%C3%A7elebi-asal-0495a1139"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/40 text-blue-400 hover:text-blue-300 text-xs font-semibold transition-all shadow-md"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href="https://x.com/celebiasalll"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-[#E8D5B5] hover:text-white text-xs font-semibold transition-all shadow-md"
              >
                <Twitter className="w-4 h-4 text-amber-400" />
                <span>@celebiasalll</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* 4-Column Footer Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-400 bg-amber-950 flex items-center justify-center shadow-md">
                <Image
                  src="/images/coffy-logo.png"
                  alt="Coffy Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 font-outfit">
                COFFY COIN
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#E8D5B5]/70 leading-relaxed">
              Decentralized GameFi &amp; SocialFi protocol built natively on Base L2. Sub-cent gas, verified on-chain rewards, and 100% deflationary mechanics.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://t.me/+DVdNX9nar99hN2Rk"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-amber-300 transition-colors"
                title="Telegram Community"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/coffycoinxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:text-amber-300 transition-colors"
                title="Official Twitter / X"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 font-outfit">
              Ecosystem
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#airdrop" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  Genesis Pioneer Airdrop
                </a>
              </li>
              <li>
                <a href="#games" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  On-Chain PvP Chess &amp; Checkers
                </a>
              </li>
              <li>
                <a href="#staking" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  50% APY Dynamic Staking
                </a>
              </li>
              <li>
                <a href="#tokenomics" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  Fixed 15B Tokenomics
                </a>
              </li>
              <li>
                <a href="#roadmap" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  Protocol Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Verification */}
          <div>
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 font-outfit">
              Verification &amp; Docs
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a
                  href="/whitepaper/coffy-whitepaper.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#E8D5B5]/75 hover:text-amber-300 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Technical Whitepaper (PDF)</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://basescan.org/address/${BASE_CONFIG.CONTRACTS.CoffyCore}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#E8D5B5]/75 hover:text-amber-300 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>BaseScan Verified Contract</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=${BASE_CONFIG.CONTRACTS.CoffyCore}&chain=base`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#E8D5B5]/75 hover:text-amber-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uniswap Base Pool</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Governance & Legal */}
          <div>
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 font-outfit">
              Security &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/terms" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-[#E8D5B5]/75 hover:text-amber-300 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <span className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  Chain ID: 8453 (Base L2)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Protocol Note */}
        <div className="pt-8 border-t border-amber-500/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E8D5B5]/50">
          <p>© {currentYear} Coffy Coin Protocol. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Architected on Base Mainnet Layer 2</span>
          </p>
        </div>
      </div>
    </footer>
  );
}