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
  Shield,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { BASE_CONFIG, ACTIVITY_MODULE_ABI } from '../config/baseConfig';

// Helper: UUID generator for profileId
function generateUUID() {
  // RFC4122 version 4 compliant UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper: Kalıcı verified kontrolü
function checkPermanentVerification() {
  try {
    return localStorage.getItem('coffy_human_verified') === 'true';
  } catch (e) {
    return false;
  }
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Wallet states
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);

  // --- Human Verification State ---
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifyingHuman, setIsVerifyingHuman] = useState(false);
  const [showHumanTooltip, setShowHumanTooltip] = useState(false);

  // Mount sırasında localStorage'dan durumu oku ve referral parametresini yakala
  useEffect(() => {
    const verified = localStorage.getItem('coffy_human_verified') === 'true';
    if (verified) setIsVerified(true);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
        localStorage.setItem('coffy_referrer', ref);
        console.log('Saved referrer address:', ref);
      }
    }
  }, []);

  // Scroll event listener — isScrolled ve scrollProgress güncelle
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Function to check on-chain verification
  const checkOnChainVerification = async (address) => {
    try {
      if (!address || typeof window === "undefined" || !window.ethereum) return;
      const ethersModule = await import("ethers");
      const { BrowserProvider, Contract } = ethersModule;
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(BASE_CONFIG.CONTRACTS.ActivityModule, ACTIVITY_MODULE_ABI, provider);
      const existingProfile = await contract.userProfiles(address);
      if (existingProfile && existingProfile !== "") {
        console.log("Profile automatically verified from blockchain:", existingProfile);
        setIsVerified(true);
        localStorage.setItem('coffy_human_verified', 'true');
      } else {
        setIsVerified(false);
        localStorage.setItem('coffy_human_verified', 'false');
      }
    } catch (e) {
      console.warn("Could not check on-chain profile automatically", e);
    }
  };

  // Wallet connection
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setIsConnected(true);
        setUserAddress(accounts[0]);
        await checkOnChainVerification(accounts[0]);
      } catch (error) {
        console.error('Wallet connection failed:', error);
      }
    }
  };

  // Human verification
  const handleHumanVerification = async () => {
    setShowHumanTooltip(true);
    setIsVerifyingHuman(true);
    try {
      if (!isConnected) {
        await connectWallet();
      }
      if (typeof window === "undefined" || !window.ethereum) {
        setIsVerifyingHuman(false);
        alert("No Ethereum provider found. Please install MetaMask or another wallet.");
        return;
      }
      // --- Reset any old verification state before new verification ---
      localStorage.removeItem('coffy_human_verification_ts');
      localStorage.removeItem('coffy_human_verified');
      // ---




      const ethersModule = await import("ethers");
      const { BrowserProvider, Contract } = ethersModule;

      // Ensure network is Base Mainnet
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== BASE_CONFIG.CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_CONFIG.CHAIN_ID_HEX }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: BASE_CONFIG.CHAIN_ID_HEX,
                  chainName: BASE_CONFIG.CHAIN_NAME,
                  rpcUrls: [BASE_CONFIG.RPC_URL],
                  nativeCurrency: BASE_CONFIG.NATIVE_CURRENCY,
                  blockExplorerUrls: [BASE_CONFIG.EXPLORER_URL]
                }
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = new Contract(BASE_CONFIG.CONTRACTS.ActivityModule, ACTIVITY_MODULE_ABI, signer);

      // Check if profile already exists
      try {
        const existingProfile = await contract.userProfiles(userAddress);
        if (existingProfile && existingProfile !== "") {
          console.log("Profile already exists:", existingProfile);
          // Success automatically if already linked
          const now = Date.now();
          setVerificationTimestamp(now);
          localStorage.setItem('coffy_human_verification_ts', now.toString());
          localStorage.setItem('coffy_human_verified', 'true');
          setIsVerifyingHuman(false);
          alert('Verification successful (Already Linked)!');
          return;
        }
      } catch (e) {
        console.warn("Could not fetch existing profile", e);
      }

      // Generate random profileId
      const profileId = generateUUID();
      // Read stored referrer from localStorage if it exists, otherwise use address(0)
      const storedReferrer = localStorage.getItem('coffy_referrer') || "0x0000000000000000000000000000000000000000";

      try {
        // On-chain transaction: linkUserProfile with referrer
        const tx = await contract.linkUserProfile(profileId, storedReferrer);
        await tx.wait();

        // Success: set localStorage and timer (only new values)
        const now = Date.now();
        setVerificationTimestamp(now);
        localStorage.setItem('coffy_human_verification_ts', now.toString());
        localStorage.setItem('coffy_human_verified', 'true');
        setIsVerifyingHuman(false);
        alert('Verification successful!');
      } catch (txError) {
        throw txError;
      }
    } catch (error) {
      setIsVerifyingHuman(false);
      alert("Verification failed: " + (error?.message || error));
    }
  };

  const handleNavigation = (sectionId) => {
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        // Get navbar height dynamically
        const navbar = document.querySelector('nav');
        const navbarHeight = navbar ? navbar.offsetHeight : 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight - 8;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        if (isMobileMenuOpen) {
          setTimeout(() => setIsMobileMenuOpen(false), 300);
        }
      }
    }, 50); // Wait for DOM to be ready
  };

  // Add a separate handler for logo click
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobileMenuOpen) {
      setTimeout(() => setIsMobileMenuOpen(false), 300);
    }
  };

  // Navigation items
  const navItems = [
    { id: 'games', label: 'Games', icon: Gamepad2, subtitle: 'Earn COFFY' },
    { id: 'about', label: 'About Coffy', icon: Info, subtitle: 'Learn More' },
    { id: 'staking', label: 'Staking', icon: Coins, subtitle: 'Earn Rewards' },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed w-full z-50 transition-all duration-500 ${isScrolled
        ? 'glass-nav shadow-xl'
        : 'bg-transparent'
        }`}
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600"
        style={{ width: `${scrollProgress}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${scrollProgress}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
            <div className="rounded-full overflow-hidden border-2 border-[#D4A017] shadow-xl bg-amber-950 w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 flex items-center justify-center animate-float">
              <Image
                src="/images/coffy-logo.png"
                alt="Coffy Logo"
                width={60}
                height={60}
                priority
                className="w-full h-full object-cover scale-110 transform"
              />
            </div>
            <span className="ml-2 text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06] font-outfit tracking-tighter">
              COFFY
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">

            {/* Main Navigation */}
            <div className="flex items-center gap-6">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className="group relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 hover:bg-amber-900/20 backdrop-blur-sm border border-transparent hover:border-amber-700/30"
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <item.icon className="w-5 h-5 text-amber-300 group-hover:text-amber-200 transition-colors duration-300 drop-shadow-lg" />
                  <span className="text-sm font-medium text-amber-100 group-hover:text-white transition-colors duration-300">
                    {item.label}
                  </span>
                  <span className="text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.subtitle}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.button>
              ))}
            </div>

            {/* Human Verification */}
            <div className="relative">
              <motion.button
                onClick={isVerified || isVerifyingHuman ? undefined : handleHumanVerification}
                onMouseEnter={() => setShowHumanTooltip(true)}
                onMouseLeave={() => setShowHumanTooltip(false)}
                disabled={isVerified || isVerifyingHuman}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300
                  ${isVerified
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 cursor-default'
                    : isVerifyingHuman
                      ? 'bg-amber-900/50 text-amber-300 cursor-wait'
                      : 'bg-amber-800/50 text-amber-200 hover:bg-amber-700/50 hover:text-amber-100 hover:scale-105'}
                `}
                whileHover={isVerified || isVerifyingHuman ? {} : { scale: 1.05 }}
                whileTap={isVerified || isVerifyingHuman ? {} : { scale: 0.95 }}
              >
                {isVerified ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Verified Human</span>
                  </>
                ) : isVerifyingHuman ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Verifying...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">Verify Human</span>
                  </>
                )}
              </motion.button>

              {/* Tooltip */}
              <AnimatePresence>
                {showHumanTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute left-1/2 top-full mt-2 -translate-x-1/2 px-4 py-2 rounded-lg bg-amber-950/95 text-amber-100 text-xs shadow-lg border border-amber-800/30 z-50"
                  >
                    {isVerified
                      ? 'You are verified as a human on the Base network'
                      : 'Verify to prevent bots and earn rewards'
                    }
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-amber-950 border-l border-t border-amber-800/30 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wallet Connection */}
            <motion.button
              onClick={connectWallet}
              className="relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 overflow-hidden group"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wallet className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              <div className="flex flex-col items-start">
                <span className="text-sm leading-none font-bold">
                  {isConnected ? `${userAddress?.slice(0, 6)}...` : 'Connect'}
                </span>
                <span className="text-xs opacity-90 leading-none">
                  {isConnected ? 'Wallet' : 'Get Started'}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-white/20 to-amber-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-3 text-amber-300 hover:text-amber-200 transition-colors duration-300 rounded-xl hover:bg-amber-900/30 active:scale-95 touch-manipulation"
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle mobile menu"
          >
            <motion.div
              animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </motion.div>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden absolute left-0 right-0 top-full bg-amber-950/98 backdrop-blur-xl border-t border-amber-800/30 shadow-2xl z-40"
            >
              <div className="py-6 px-4 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleNavigation(item.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left text-amber-200 hover:text-white hover:bg-amber-900/40 rounded-xl transition-all duration-300 active:scale-95 touch-manipulation"
                  >
                    <item.icon className="w-6 h-6 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium text-base">{item.label}</span>
                      <span className="text-sm text-amber-500">{item.subtitle}</span>
                    </div>
                  </motion.button>
                ))}

                <div className="pt-4 border-t border-amber-800/30 space-y-3">
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={isVerified || isVerifyingHuman ? undefined : handleHumanVerification}
                    disabled={isVerified || isVerifyingHuman}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 touch-manipulation ${isVerifyingHuman
                      ? 'bg-amber-900/40 text-amber-300'
                      : isVerified
                        ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-800/40 text-amber-200 hover:bg-amber-700/40 active:scale-95'
                      }`}
                  >
                    {isVerifyingHuman ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium text-base">Verifying...</span>
                          <span className="text-sm text-amber-500">Anti-Bot Protection</span>
                        </div>
                      </>
                    ) : isVerified ? (
                      <>
                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium text-base">Verified Human</span>
                          <span className="text-sm text-emerald-400">On-chain active</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Shield className="w-6 h-6 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium text-base">Verify Human</span>
                          <span className="text-sm text-amber-500">Anti-Bot Protection</span>
                        </div>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={connectWallet}
                    className="w-full flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300 active:scale-95 touch-manipulation shadow-lg"
                  >
                    <Wallet className="w-6 h-6 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="text-base">{isConnected ? `${userAddress?.slice(0, 6)}...${userAddress?.slice(-4)}` : 'Connect Wallet'}</span>
                      <span className="text-sm opacity-90">{isConnected ? 'Connected' : 'Get Started'}</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}