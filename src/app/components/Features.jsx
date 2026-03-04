'use client';

import { motion } from 'framer-motion';
import { FaCoffee, FaGamepad, FaUsers, FaCoins } from 'react-icons/fa';

export default function Features() {
  const features = [
    { 
      icon: <FaCoffee />, 
      title: 'Drink-to-Earn', 
      desc: 'Earn COFFY tokens by enjoying your favorite coffee!' 
    },
    { 
      icon: <FaGamepad />, 
      title: 'Play-to-Earn', 
      desc: 'Engage in exciting games to earn rewards' 
    },
    { 
      icon: <FaUsers />, 
      title: 'SocialFi', 
      desc: 'Connect with coffee lovers worldwide' 
    },
    { 
      icon: <FaCoins />, 
      title: 'Staking', 
      desc: 'Earn passive income through staking' 
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 0 30px rgba(212, 160, 23, 0.3)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <section className="py-24 bg-[#1A0F0A]/50">
      <motion.div 
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl md:text-5xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Key Features
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover="hover"
              className="bg-[#3A2A1E] rounded-xl shadow-xl border border-[#D4A017]/20 overflow-hidden group"
            >
              <div className="p-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#D4A017] to-[#A77B06] rounded-full flex items-center justify-center text-3xl text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-[#D4A017] to-[#A77B06] rounded-full opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"
                  />
                </div>
                <h3 className="text-xl font-semibold text-[#D4A017] mb-2 group-hover:text-[#E8B923] transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-[#E8D5B5] group-hover:text-white transition-colors duration-300">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}