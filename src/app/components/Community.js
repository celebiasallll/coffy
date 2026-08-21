'use client';

import { motion } from 'framer-motion';
import { Send, Twitter, Users, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';

export default function Community() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#120A06] via-[#1A0E08] to-[#140C08] relative overflow-hidden" id="community">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-outfit tracking-tight mb-4">
            Join the <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">Coffy Movement</span>
          </h2>
          <p className="text-sm sm:text-base text-[#E8D5B5]/75 max-w-xl mx-auto leading-relaxed">
            Connect with thousands of gamers, holders, and coffee enthusiasts across our official verified channels.
          </p>
        </motion.div>

        {/* 2 Big Action Cards: Telegram & Twitter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* Telegram Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0F1E2A]/90 to-[#0A121A]/90 border border-[#0088CC]/30 hover:border-[#0088CC]/60 backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-[#0088CC]/15 border border-[#0088CC]/40 flex items-center justify-center text-[#0088CC] shadow-lg shadow-[#0088CC]/20">
                  <Send className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#0088CC]/10 text-[#0088CC] text-[11px] font-bold border border-[#0088CC]/25">
                  24/7 Live Chat
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 font-outfit">
                Telegram Global Hub
              </h3>
              <p className="text-xs sm:text-sm text-[#E8D5B5]/70 leading-relaxed mb-6">
                Join our main community chat for live announcements, PvP game matchmaking, airdrop support, and direct interactions with the team.
              </p>
            </div>

            <a
              href="https://t.me/+DVdNX9nar99hN2Rk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#0088CC] hover:bg-[#0077B5] text-white font-bold text-sm shadow-lg shadow-[#0088CC]/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Join Telegram Group</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </motion.div>

          {/* Twitter / X Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1F1710]/90 to-[#120B06]/90 border border-amber-500/30 hover:border-amber-400/60 backdrop-blur-md shadow-2xl transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                  <Twitter className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-bold border border-amber-500/25">
                  Official News
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 font-outfit">
                Twitter (X) Updates
              </h3>
              <p className="text-xs sm:text-sm text-[#E8D5B5]/70 leading-relaxed mb-6">
                Follow @coffycoinxyz for official protocol milestones, Base ecosystem news, partnership releases, and community spaces.
              </p>
            </div>

            <a
              href="https://x.com/coffycoinxyz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Twitter className="w-4 h-4 text-black" />
              <span>Follow on Twitter / X</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}