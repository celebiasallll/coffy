'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function Partners() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  return (
    <section className="py-24 bg-gradient-to-b from-[#3A2A1E] to-[#1A0F0A] relative overflow-hidden" id="partners">
      <motion.div style={{ opacity }} className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">
            Ecosystem &amp; Partners
          </h2>
          <div className="w-24 h-1 bg-[#D4A017] mx-auto rounded-full"></div>
          <p className="text-xl text-[#E8D5B5] mt-4">Built on leading Web3 infrastructure</p>
        </motion.div>

        {/* Become a Partner CTA — prominent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-14 flex flex-col items-center"
        >
          <div className="bg-gradient-to-br from-[#3A2A1E]/80 to-[#2A1810]/80 border border-[#D4A017]/30 rounded-2xl px-8 py-6 max-w-xl w-full text-center backdrop-blur-sm shadow-xl">
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="text-xl font-bold text-white mb-1">Become a Strategic Partner</h3>
            <p className="text-[#E8D5B5]/80 text-sm mb-5">
              Coffee brands, gaming studios &amp; Web3 projects — reach out to us directly
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://t.me/+DVdNX9nar99hN2Rk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#0088CC] hover:bg-[#0099DD] text-white font-bold py-2.5 px-6 rounded-xl transition-all duration-300"
              >
                <i className="fab fa-telegram-plane"></i>
                Telegram
              </a>
              <a
                href="https://x.com/coffycoinxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#1DA1F2] hover:bg-[#1A91DA] text-white font-bold py-2.5 px-6 rounded-xl transition-all duration-300"
              >
                <i className="fab fa-twitter"></i>
                Twitter / X
              </a>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}