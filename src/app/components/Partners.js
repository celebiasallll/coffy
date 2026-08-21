'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Handshake, Send, Twitter, Building2 } from 'lucide-react';

export default function Partners() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  return (
    <section className="py-24 bg-gradient-to-b from-[#180E08] to-[#120A06] relative overflow-hidden" id="partners">
      <motion.div style={{ opacity }} className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-4">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>INSTITUTIONAL &amp; ECOSYSTEM</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3 font-outfit">
            Ecosystem &amp; <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">Partnerships</span>
          </h2>
          <p className="text-base sm:text-lg text-[#E8D5B5]/75 max-w-xl mx-auto leading-relaxed">
            Collaborating with premier Web3 protocols, gaming guilds, and coffee retailers on Base Mainnet.
          </p>
        </motion.div>

        {/* Become a Partner CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          viewport={{ once: true }}
          className="flex flex-col items-center"
        >
          <div className="bg-[#1A0E08]/90 border border-amber-500/25 rounded-2xl px-8 py-8 max-w-xl w-full text-center backdrop-blur-md shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Handshake className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-outfit">Join the Coffy Ecosystem</h3>
            <p className="text-[#E8D5B5]/70 text-sm mb-6 leading-relaxed">
              Coffee brands, gaming studios, and liquidity providers — explore strategic syndication and cross-promotions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://t.me/+DVdNX9nar99hN2Rk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#0088CC]/90 hover:bg-[#0088CC] text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all duration-200 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Telegram Direct</span>
              </a>
              <a
                href="https://x.com/coffycoinxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-black/50 hover:bg-black/80 border border-white/20 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all duration-200"
              >
                <Twitter className="w-4 h-4 text-sky-400" />
                <span>Official X / Twitter</span>
              </a>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}