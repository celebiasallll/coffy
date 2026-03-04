'use client';

import Image from 'next/image';
import { BASE_CONFIG } from '../config/baseConfig';
import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <footer className="py-12 bg-gradient-to-r from-[#1A0F0A] via-[#3A2A1E] to-[#1A0F0A] relative overflow-hidden">
      {/* Background Animation */}
      <motion.div
        className="absolute inset-0 opacity-5"
        animate={{
          background: [
            'radial-gradient(circle at 20% 20%, #D4A017 0%, transparent 50%)',
            'radial-gradient(circle at 80% 80%, #D4A017 0%, transparent 50%)',
            'radial-gradient(circle at 20% 20%, #D4A017 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Social Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Image
                  src="/images/coffy-logo.png"
                  alt="Coffy Logo"
                  width={48}
                  height={48}
                  className="rounded-full animate-float"
                />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">
                COFFY
              </span>
            </div>
            <p className="text-[#E8D5B5]/70">Brewing the Future of Coffee with Blockchain!</p>
            <div className="flex space-x-4">
              {[
                { icon: "telegram-plane", url: "https://t.me/+DVdNX9nar99hN2Rk" },
                { icon: "twitter", url: "https://x.com/coffycoinxyz" }
              ].map((social, i) => (
                <motion.a
                  key={social.icon}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, color: "#D4A017" }}
                  className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition-colors duration-300"
                >
                  <i className={`fab fa-${social.icon} text-xl`}></i>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-[#D4A017] mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#about" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">About</a></li>
              <li><a href="#tokenomics" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Tokenomics</a></li>
              <li><a href="#roadmap" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Roadmap</a></li>
              <li><a href="#partners" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Partners</a></li>
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-[#D4A017] mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="/whitepaper/coffy-whitepaper.pdf" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Whitepaper</a></li>
              <li><a href="https://basescan.org/address/${BASE_CONFIG.CONTRACTS.CoffyCore}" target="_blank" rel="noopener noreferrer" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">BaseScan</a></li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-bold text-[#D4A017] mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Terms of Use</a></li>
              <li><a href="#" className="text-[#E8D5B5]/70 hover:text-[#D4A017] transition duration-200">Privacy Policy</a></li>
            </ul>
          </motion.div>
        </div>

        {/* Copyright & Gradient Border */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="relative pt-8 mt-8 text-center"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4A017]/30 to-transparent" />
          <p className="text-[#E8D5B5]/50 text-sm">
            © {new Date().getFullYear()} Coffy Coin. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}