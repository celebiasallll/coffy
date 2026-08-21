"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Gamepad2,
  Coins,
  Info,
  Menu,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import useWeb3Wallet from './useWeb3Wallet';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Global Web3 Wallet hook (Real On-Chain Data)
  const { isConnected, userAddress, balance, rawBalance, connectWallet, refreshBalance } = useWeb3Wallet();

  // Capture referral parameter from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
        localStorage.setItem('coffy_referrer', ref);
        console.log('Saved referrer address:', ref);
      }
    }
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (sectionId) => {
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const navbar = document.querySelector('nav');
        const navbarHeight = navbar ? navbar.offsetHeight : 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight - 8;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        if (isMobileMenuOpen) {
          setTimeout(() => setIsMobileMenuOpen(false), 250);
        }
      }
    }, 50);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobileMenuOpen) {
      setTimeout(() => setIsMobileMenuOpen(false), 250);
    }
  };

  // Navigation items
  const navItems = [
    { id: 'airdrop', label: 'Genesis Airdrop', icon: Sparkles, subtitle: 'Claim 9.9K' },
    { id: 'games', label: 'Play Games', icon: Gamepad2, subtitle: 'PvP Chess' },
    { id: 'staking', label: 'Staking', icon: Coins, subtitle: '50% APY' },
    { id: 'tokenomics', label: 'Tokenomics', icon: Info, subtitle: '15B Supply' },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#120A06]/95 backdrop-blur-md border-b border-amber-500/20 shadow-2xl'
          : 'bg-transparent'
      }`}
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <div className="flex items-center cursor-pointer gap-2.5" onClick={handleLogoClick}>
            <div className="rounded-full overflow-hidden border-2 border-amber-400 shadow-lg bg-amber-950 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
              <Image
                src="/images/coffy-logo.png"
                alt="Coffy Logo"
                width={48}
                height={48}
                priority
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <span className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 font-outfit tracking-tight">
              COFFY
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-[#E8D5B5]/80 hover:text-white hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all duration-200 cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-amber-400" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Right: Real-time Balance & Wallet */}
          <div className="hidden lg:flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2.5">
                {/* On-Chain $COFFY Live Balance Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={refreshBalance}
                  title={rawBalance ? `Exact: ${Number(rawBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} COFFY (Click to refresh)` : 'Click to refresh on-chain balance'}
                  className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#180E09]/90 border border-amber-500/30 hover:border-amber-400/60 shadow-lg backdrop-blur-md transition-all duration-200"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-amber-950 border border-amber-400/60 flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <Image src="/images/coffy-logo.png" alt="COFFY" width={20} height={20} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] uppercase tracking-wider text-[#E8D5B5]/50 font-bold leading-none mb-0.5">COFFY Balance</span>
                    <div className="flex items-center gap-1 leading-none">
                      <span className="text-sm font-black text-amber-400 font-mono">{balance}</span>
                      <span className="text-[10px] text-amber-300/80 font-bold">$COFFY</span>
                    </div>
                  </div>
                  <RotateCcw className="w-3 h-3 text-amber-500/40 group-hover:text-amber-400 transition-colors ml-1" />
                </motion.div>

                {/* Connected Wallet Address Pill */}
                <div
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/20 text-[#E8D5B5] shadow-md"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold">{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Wallet className="w-4 h-4 text-black" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 text-amber-300 hover:text-white rounded-xl bg-amber-500/10 border border-amber-500/20 transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:hidden bg-[#180E09]/98 backdrop-blur-2xl border-t border-amber-500/20 shadow-2xl overflow-hidden"
            >
              <div className="py-5 px-4 space-y-3">
                {/* Mobile Live Balance Card if connected */}
                {isConnected && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-950 border border-amber-400 flex items-center justify-center">
                        <Image src="/images/coffy-logo.png" alt="COFFY" width={36} height={36} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#E8D5B5]/60 font-bold block">Your Balance</span>
                        <span className="text-lg font-black text-amber-400 font-mono">{balance} <span className="text-xs text-amber-300 font-sans">$COFFY</span></span>
                      </div>
                    </div>
                    <button
                      onClick={refreshBalance}
                      className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      title="Refresh"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Nav Links */}
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-left text-[#E8D5B5] hover:text-white hover:bg-amber-500/10 rounded-xl transition-colors font-medium text-sm"
                  >
                    <item.icon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="text-[11px] text-amber-500/70">{item.subtitle}</span>
                    </div>
                  </button>
                ))}

                {/* Mobile Wallet Button */}
                <div className="pt-2 border-t border-amber-500/15">
                  <button
                    onClick={connectWallet}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl text-sm shadow-md cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-black" />
                    <span>{isConnected ? `${userAddress?.slice(0, 6)}...${userAddress?.slice(-4)} (Connected)` : 'Connect Wallet'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}