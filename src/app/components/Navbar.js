'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useWeb3Wallet from './useWeb3Wallet';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { connectWallet, userAddress } = useWeb3Wallet();

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler
  const handleScroll = useCallback((e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setIsMobileMenuOpen(false);
    }
  }, []);

  // Enhanced mobile menu animations
  const menuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
    open: {
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  };

  // Hover effect for nav items
  const navItemVariants = {
    hover: {
      scale: 1.05,
      color: '#D4A017',
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
  };

  // Logo animation
  const logoVariants = {
    hover: {
      rotate: [0, -10, 10, -10, 0],
      transition: {
        duration: 0.5,
      },
    },
  };

  // Scroll progress indicator
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalScroll) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // İyileştirilmiş animasyon varyantları
  const navAnimations = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99],
      }
    },
    exit: {
      y: -100,
      opacity: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.nav
      variants={navAnimations}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#1A0F0A]/95 backdrop-blur-lg shadow-lg py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      {/* Scroll Progress Bar */}
      <motion.div 
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#D4A017] via-[#A77B06] to-[#D4A017]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Gradient border effect */}
      <motion.div 
        className="absolute bottom-0 left-0 w-full h-[1px]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isScrolled ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />
      </motion.div>

      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo Section */}
          <motion.div 
            className="flex items-center z-20 relative"
            variants={logoVariants}
            whileHover="hover"
          >
            <Image 
              src="/images/coffy-logo.png" 
              alt="Coffy Logo" 
              width={60} 
              height={60} 
              className="rounded-full animate-float"
              style={{ width: 'auto', height: 'auto' }}
            />
            <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">COFFY</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {["About", "Tokenomics", "Roadmap", "Partners", "Community"].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => handleScroll(e, item.toLowerCase())}
                variants={navItemVariants}
                whileHover="hover"
                className="text-[#E8D5B5] transition-colors duration-200"
              >
                {item}
              </motion.a>
            ))}

            {/* Bee Adventure Button - First */}
            <motion.a
              href="/hungeriumgame/game.html"
              className="relative group bg-gradient-to-r from-[#3A5FCD] to-[#1E40AF] text-white font-bold py-2.5 px-5 rounded-full transition duration-300 shadow-lg hover:shadow-[#3A5FCD]/50 overflow-hidden flex items-center whitespace-nowrap" // whitespace-nowrap eklendi
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-gamepad mr-2 text-base"></i>
              <div className="flex flex-col items-start min-w-[120px]"> {/* min-width eklendi */}
                <span className="relative z-10 text-xs">Play to Earn(HNG)</span>
                <span className="relative z-10 text-sm">Bee Adventure</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#4169E1] to-[#1E90FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#3A5FCD] to-[#1E40AF] blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </motion.a>

            {/* Coffy Adventure Button - Second */}
            <motion.a
              href="/coffygame/game.html"
              className="relative group bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-2.5 px-5 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 overflow-hidden flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-gamepad mr-2 text-base"></i>
              <div className="flex flex-col items-start">
                <span className="relative z-10 text-xs">Play to Earn(COFFY)</span>
                <span className="relative z-10 text-sm">Coffy Adventure</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4A017] to-[#A77B06] blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </motion.a>

            {/* Updated Wallet Connection Button */}
            <motion.button
              onClick={connectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-3 px-6 rounded-full items-center shadow-lg hover:shadow-[#D4A017]/50 transition-all duration-300 group"
            >
              <i className="fas fa-wallet text-base mr-2 group-hover:scale-110 transition-transform"></i>
              <div className="flex flex-col items-start">
                <span className="relative z-10 text-xs"></span>
                <span className="relative z-10 text-sm">
                  {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connect Wallet'}
                </span>
              </div>
              {userAddress && (
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-2" />
              )}
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <motion.button
              onClick={connectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-1 px-3 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 mr-2"
            >
              {userAddress ? `${userAddress.slice(0, 4)}...` : 'Connect'}
            </motion.button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#E8D5B5] focus:outline-none">
              <i className="fas fa-bars text-2xl"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Menu */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ 
              opacity: 1, 
              height: 'auto', 
              y: 0,
              transition: {
                duration: 0.3,
                ease: [0.6, -0.05, 0.01, 0.99]
              }
            }}
            exit={{ 
              opacity: 0, 
              height: 0, 
              y: -20,
              transition: { duration: 0.2 }
            }}
            className="md:hidden absolute top-full left-0 w-full bg-[#1A0F0A]/95 backdrop-blur-lg border-t border-[#D4A017]/20 max-h-[80vh] overflow-y-auto" // max-height ve overflow eklendi
          >
            <div className="flex flex-col space-y-4 p-4">
              {userAddress && (
                <div className="text-[#D4A017] font-bold py-2 border-b border-[#D4A017]/30">
                  Wallet: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </div>
              )}
              <motion.a href="#about" className="text-[#E8D5B5] hover:text-[#D4A017] transition duration-200" whileHover={{ scale: 1.05 }}>
                About
              </motion.a>
              <motion.a href="#tokenomics" className="text-[#E8D5B5] hover:text-[#D4A017] transition duration-200" whileHover={{ scale: 1.05 }}>
                Tokenomics
              </motion.a>
              <motion.a href="#roadmap" className="text-[#E8D5B5] hover:text-[#D4A017] transition duration-200" whileHover={{ scale: 1.05 }}>
                Roadmap
              </motion.a>
              <motion.a href="#partners" className="text-[#E8D5B5] hover:text-[#D4A017] transition duration-200" whileHover={{ scale: 1.05 }}>
                Partners
              </motion.a>
              <motion.a href="#community" className="text-[#E8D5B5] hover:text-[#D4A017] transition duration-200" whileHover={{ scale: 1.05 }}>
                Community
              </motion.a>
              <motion.a
                href="/coffygame/game.html"
                className="relative group bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-3 px-6 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 overflow-hidden flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-gamepad mr-2 text-lg"></i>
                <div className="flex flex-col items-start">
                  <span className="relative z-10 text-sm">Play to Earn</span>
                  <span className="relative z-10">Coffy Adventure (Earn COFFY)</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#D4A017] to-[#A77B06] blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
              </motion.a>
              <motion.a
                href="/hungeriumgame/game.html"
                className="relative group bg-gradient-to-r from-[#3A5FCD] to-[#1E40AF] text-white font-bold py-3 px-6 rounded-full transition duration-300 shadow-lg hover:shadow-[#3A5FCD]/50 overflow-hidden flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-gamepad mr-2 text-lg"></i>
                <div className="flex flex-col items-start">
                  <span className="relative z-10 text-sm">Play to Earn</span>
                  <span className="relative z-10">Bee Adventure (Earn HNG)</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#4169E1] to-[#1E90FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#3A5FCD] to-[#1E40AF] blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
