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

      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center py-2">
          {/* Logo Section */}
          <motion.div 
            className="flex items-center z-20 relative cursor-pointer"
            variants={logoVariants}
            whileHover="hover"
            onClick={(e) => handleScroll(e, 'hero')}
          >
            <Image 
              src="/images/coffy-logo.png" 
              alt="Coffy Logo" 
              width={48} 
              height={48} 
              className="rounded-full animate-float"
              style={{ width: '48px', height: '48px' }}
            />
            <span className="ml-3 text-base lg:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">COFFY</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center gap-3 lg:gap-5 flex-1 px-4">
            {["About", "Tokenomics", "Roadmap", "Partners", "Community"].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => handleScroll(e, item.toLowerCase())}
                variants={navItemVariants}
                whileHover="hover"
                className="text-[#E8D5B5] transition-colors duration-200 text-sm lg:text-base"
              >
                {item}
              </motion.a>
            ))}
            
            {/* Presale Button for Desktop - Enhanced with red pulsing effect */}
            <motion.a
              href="#presale-section"
              onClick={(e) => handleScroll(e, 'presale-section')}
              className="relative group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button className="py-2 px-4 bg-gradient-to-r from-[#FF3A00] to-[#FF0000] text-white rounded-lg font-semibold transition-all duration-300 hover:brightness-110 hover:scale-105 hover:shadow-lg hover:shadow-[#FF0000]/50 animate-pulse">
                JOIN PRESALE
                {/* Enhanced glowing animation */}
                <span className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-[#FFD700] rounded-full animate-ping"></span>
              </button>
            </motion.a>
          </div>

          {/* Game and Wallet Buttons */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {/* Coffy Lapse Button */}
            <motion.a
              href="/hungeriumgame"
              className="relative group bg-gradient-to-r from-blue-600 to-blue-900 text-white font-bold py-2 px-3 lg:py-2.5 lg:px-4 rounded-full transition duration-300 shadow-lg hover:shadow-blue-700/50 overflow-hidden flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-gamepad mr-1.5 text-xs lg:text-sm"></i>
              <div className="flex flex-col items-start">
                <span className="relative z-10 text-[10px] lg:text-xs">Play to Earn</span>
                <span className="relative z-10 text-xs lg:text-sm whitespace-nowrap">Coffyverse City3D</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-900 blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </motion.a>

            {/* Coffy Adventure Button */}
            <motion.a
              href="/coffygame/game.html"
              className="relative group bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-2 px-3 lg:py-2.5 lg:px-4 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 overflow-hidden flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-gamepad mr-1.5 text-xs lg:text-sm"></i>
              <div className="flex flex-col items-start">
                <span className="relative z-10 text-[10px] lg:text-xs">Play to Earn</span>
                <span className="relative z-10 text-xs lg:text-sm whitespace-nowrap">Coffy Adventure</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4A017] to-[#A77B06] blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </motion.a>

            {/* Wallet Connection Button */}
            <motion.button
              onClick={connectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:flex bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-2 px-3 lg:py-2.5 lg:px-4 rounded-full items-center shadow-lg hover:shadow-[#D4A017]/50 transition-all duration-300 group ml-1"
            >
              <i className="fas fa-wallet text-xs lg:text-sm mr-1.5 group-hover:scale-110 transition-transform"></i>
              <span className="relative z-10 text-xs lg:text-sm whitespace-nowrap">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connect Wallet'}
              </span>
              {userAddress && (
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-2" />
              )}
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <motion.button
              onClick={connectWallet}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-1 px-3 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 text-xs"
            >
              {userAddress ? `${userAddress.slice(0, 4)}...` : 'Connect'}
            </motion.button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[#E8D5B5] focus:outline-none p-1">
              <i className="fas fa-bars text-xl"></i>
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
            className="md:hidden absolute top-full left-0 w-full bg-[#1A0F0A]/95 backdrop-blur-lg border-t border-[#D4A017]/20 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex flex-col space-y-3 p-4">
              {userAddress && (
                <div className="text-[#D4A017] text-sm font-bold py-2 border-b border-[#D4A017]/30">
                  Wallet: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </div>
              )}
              
              {/* Presale Button for Mobile Menu - Enhanced */}
              <motion.a 
                href="#presale-section"
                onClick={(e) => handleScroll(e, 'presale-section')}
                className="text-white bg-gradient-to-r from-[#FF3A00] to-[#FF0000] hover:brightness-110 transition duration-200 py-2 px-3 rounded-lg font-bold flex items-center justify-center animate-pulse shadow-md shadow-[#FF0000]/30" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">🔥</span> JOIN PRESALE
                <span className="ml-1 animate-ping">!</span>
              </motion.a>

              {/* Oyun Butonları - Mobil Menü için */}
              <motion.a
                href="/hungeriumgame"
                className="relative group bg-gradient-to-r from-blue-600 to-blue-900 text-white font-bold py-2 px-4 rounded-full transition duration-300 shadow-lg hover:shadow-blue-700/50 overflow-hidden flex items-center justify-center mt-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-gamepad mr-2 text-sm"></i>
                <div className="flex flex-col items-start">
                  <span className="relative z-10 text-xs">Play to Earn</span>
                  <span className="relative z-10 text-sm">Coffyverse City3D</span>
                </div>
              </motion.a>
              <motion.a
                href="/coffygame/game.html"
                className="relative group bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-2 px-4 rounded-full transition duration-300 shadow-lg hover:shadow-[#D4A017]/50 overflow-hidden flex items-center justify-center mt-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fas fa-gamepad mr-2 text-sm"></i>
                <div className="flex flex-col items-start">
                  <span className="relative z-10 text-xs">Play to Earn</span>
                  <span className="relative z-10 text-sm">Coffy Adventure</span>
                </div>
              </motion.a>
              
              {/* Mevcut menü öğeleri */}
              {["About", "Tokenomics", "Roadmap", "Partners", "Community"].map((item) => (
                <motion.a 
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={(e) => handleScroll(e, item.toLowerCase())}
                  className="text-[#E8D5B5] hover:text-[#D4D4A017] transition duration-200 py-1" 
                  whileHover={{ scale: 1.05 }}
                >
                  {item}
                </motion.a>
              ))}
              
              {/* ... mevcut diğer butonlar ... */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}