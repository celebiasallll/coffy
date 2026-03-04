'use client';

import { motion } from 'framer-motion';

export default function Community() {
  const socialLinks = [
    {
      platform: "Telegram",
      url: "https://t.me/+DVdNX9nar99hN2Rk",
      icon: "telegram-plane",
      bgColor: "bg-[#0088CC]",
      hoverEffect: "hover:bg-[#0099DD]"
    },
    {
      platform: "Twitter",
      url: "https://x.com/coffycoinxyz",
      icon: "twitter",
      bgColor: "bg-[#1DA1F2]",
      hoverEffect: "hover:bg-[#1A91DA]"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-[#1A0F0A] to-[#3A2A1E] relative overflow-hidden" id="community">
      {/* Arkaplan Efekti */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              'radial-gradient(circle at 20% 20%, #D4A017 0%, transparent 50%)',
              'radial-gradient(circle at 80% 80%, #D4A017 0%, transparent 50%)',
              'radial-gradient(circle at 20% 20%, #D4A017 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">
            Join Our Community
          </h2>
          <div className="w-20 h-1 bg-[#D4A017] mx-auto mb-4"></div>
        </motion.div>

        {/* Sosyal Medya Butonları */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-2xl mx-auto">
          {socialLinks.map((social) => (
            <motion.a
              key={social.platform}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`${social.bgColor} ${social.hoverEffect} px-8 py-4 rounded-xl flex items-center gap-3 w-full sm:w-auto justify-center transition-all duration-300 shadow-lg`}
            >
              <i className={`fab fa-${social.icon} text-2xl text-white`}></i>
              <span className="text-white font-bold">{social.platform}</span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}