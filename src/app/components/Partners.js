'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function Partners() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  const partnerMotion = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: {
        duration: 0.2,
        type: "tween",
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <section className="py-24 bg-gradient-to-b from-[#3A2A1E] to-[#1A0F0A] relative overflow-hidden" id="partners">
      {/* Background Effects */}
      <motion.div 
        className="absolute inset-0 opacity-5"
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, #D4A017 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, #D4A017 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, #D4A017 0%, transparent 50%)'
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      <motion.div style={{ opacity }} className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">Strategic Partners</h2>
          <div className="w-24 h-1 bg-[#D4A017] mx-auto rounded-full"></div>
          <p className="text-xl text-[#E8D5B5] mt-4">Proud to collaborate with the finest coffee brands</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {[
            { name: "RoastBrew", logo: "/images/partners/roastbrew-logo.png" },
            { name: "Javamingle", logo: "/images/partners/javamingle-logo.png" },
            { name: "Cafénest", logo: "/images/partners/cafenest-logo.png" },
            { name: "PerkCafé", logo: "/images/partners/perkcafe-logo.png" }
          ].map((partner, i) => (
            <motion.div
              key={partner.name}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true, margin: "-50px" }}
              custom={i}
              className="bg-[#2C1B12]/80 backdrop-blur-sm p-6 rounded-xl border border-[#D4A017]/20 hover:border-[#D4A017] shadow-lg hover:shadow-[#D4A017]/20 transition-all duration-300"
            >
              <motion.div
                variants={partnerMotion}
                className="relative group aspect-video flex items-center justify-center"
              >
                <Image 
                  src={partner.logo} 
                  alt={partner.name} 
                  width={200} 
                  height={100} 
                  className="w-full h-full object-contain filter brightness-90 group-hover:brightness-110 transition-all duration-300"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#D4A017]/0 via-[#D4A017]/10 to-[#D4A017]/0"
                  animate={{
                    x: ['100%', '-100%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Partnership CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <a 
            href="https://forms.gle/CQyCEYMGt6t2WGVN7" // Güncellenmiş çalışan Google Form linki
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:shadow-[#D4A017]/30 transition-all duration-300 group"
          >
            <span>Become a Partner</span>
            <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}