'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import useAppStore from '../stores/useAppStore';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

import { Gift, Gamepad2, Zap, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

const HIGHLIGHT_BADGES = [
  "Base Mainnet L2 Live",
  "Up to 50% APY Staking",
  "Real-Time PvP On-Chain",
  "5.25B Community Pool",
  "Zero Sybil Architecture",
  "Drink-to-Earn Ecosystem",
];

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [badgeIdx, setBadgeIdx] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mascotRef = useRef(null);

  useEffect(() => { setIsLoaded(true); }, []);

  // Cycle feature badges smoothly
  useEffect(() => {
    const t = setInterval(() => {
      setBadgeIdx(prev => (prev + 1) % HIGHLIGHT_BADGES.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  // Mouse tracking for 3D tilt
  useEffect(() => {
    const handleMouse = (e) => {
      if (!mascotRef.current) return;
      const rect = mascotRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      setMousePos({ x: dx * 8, y: dy * 5 });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const logoY = useTransform(scrollY, [0, 500], [0, -80]);

  const particlesInit = useCallback(async (engine) => {
    try { await loadSlim(engine); } catch (e) { console.warn('Particles init failed:', e); }
  }, []);

  const particlesOptions = {
    fullScreen: false,
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      number: { value: 16, density: { enable: true, area: 1000 } },
      color: { value: ["#D4A017", "#F4C430", "#A77B06", "#6F4E37"] },
      shape: { type: "circle" },
      opacity: { value: { min: 0.2, max: 0.6 }, animation: { enable: true, speed: 1, sync: false } },
      size: { value: { min: 2, max: 4 }, animation: { enable: true, speed: 1.5, sync: false } },
      move: { enable: true, speed: { min: 0.4, max: 1.2 }, direction: "top", random: true, straight: false, outModes: { default: "out" } }
    },
    interactivity: {
      detectsOn: "canvas",
      events: { onHover: { enable: true, mode: "repulse" }, resize: true },
      modes: { repulse: { distance: 80, duration: 0.4 } }
    },
    detectRetina: true
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.15 } }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } }
  };

  const shouldAnimate = inView;

  return (
    <section
      ref={ref}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#120A06] via-[#1E110A] to-[#120A06] py-16 md:py-24"
      id="hero"
    >
      {/* Background animated glow */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, rgba(212,160,23,0.12) 0%, transparent 65%)',
              'radial-gradient(circle at 80% 70%, rgba(244,196,48,0.12) 0%, transparent 65%)',
              'radial-gradient(circle at 20% 30%, rgba(212,160,23,0.12) 0%, transparent 65%)'
            ]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Particles */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {shouldAnimate && (
          <Particles id="coffee-particles" init={particlesInit} options={particlesOptions} style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Main content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
          variants={heroVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Left — Text (7 cols) */}
          <motion.div
            variants={childVariants}
            style={{ y }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1 lg:col-span-7"
          >
            {/* Top Micro-Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-6 backdrop-blur-md"
              variants={childVariants}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Base Mainnet L2 Ecosystem</span>
              <span className="w-1 h-1 rounded-full bg-amber-400" />
              <span className="text-amber-400/80 font-normal">Next-Gen Web3 Gaming</span>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 leading-[1.1] font-outfit tracking-tight"
              variants={childVariants}
            >
              The Next Evolution of Decentralized Gaming
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg text-[#E8D5B5]/85 mb-8 max-w-2xl leading-relaxed"
              variants={childVariants}
            >
              Powering a seamless Web3 ecosystem on Base Mainnet. Experience high-yield{' '}
              <span className="text-amber-300 font-semibold">50% APY Staking</span>, on-chain{' '}
              <span className="text-amber-300 font-semibold">Play-to-Earn PvP</span>, and verified{' '}
              <span className="text-amber-300 font-semibold">Community Rewards</span> with institutional security.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-8"
              variants={childVariants}
            >
              <motion.a
                href="#airdrop"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all duration-200 flex items-center gap-2.5"
              >
                <Gift className="w-4 h-4 text-black" />
                <span>Claim Free $COFFY</span>
              </motion.a>
              <motion.a
                href="#games"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="border border-amber-500/40 hover:border-amber-400 text-[#E8D5B5] hover:text-white font-semibold py-3.5 px-6 rounded-xl text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 bg-black/30 backdrop-blur-sm"
              >
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>Play Games</span>
              </motion.a>
              <motion.a
                href="#staking"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="border border-amber-500/20 hover:border-amber-500/50 text-amber-300/90 hover:text-amber-200 font-semibold py-3.5 px-6 rounded-xl text-sm sm:text-base transition-all duration-200 flex items-center gap-2.5 bg-amber-950/20"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>50% APY Staking</span>
              </motion.a>
            </motion.div>

            {/* Micro Feature Row */}
            <motion.div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-2 text-xs text-[#E8D5B5]/60 font-medium"
              variants={childVariants}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>EIP-712 Signed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Dynamic APY</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Zero Gas Overhead</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — Avatar (5 cols) */}
          <motion.div
            variants={childVariants}
            style={{ y: logoY }}
            className="flex flex-col items-center justify-center lg:col-span-5 order-1 lg:order-2"
          >
            <div ref={mascotRef} className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-72 md:h-72">
              {/* Pulsing glow aura */}
              <motion.div
                className="absolute rounded-full z-[2] pointer-events-none"
                style={{
                  inset: '-16px',
                  background: 'radial-gradient(circle, rgba(212,160,23,0.25) 0%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Dynamic Institutional Badge */}
              <div
                className="absolute z-30 whitespace-nowrap"
                style={{ bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)' }}
              >
                <motion.div
                  key={badgeIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#180E09]/95 border border-amber-500/40 text-amber-300 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-xl shadow-black/60 flex items-center gap-2 backdrop-blur-md"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{HIGHLIGHT_BADGES[badgeIdx]}</span>
                </motion.div>
              </div>

              {/* LIVE indicator */}
              <motion.div
                className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 bg-black/85 border border-amber-500/30 rounded-full px-2.5 py-1 shadow-lg backdrop-blur-md"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold tracking-wider">BASE LIVE</span>
              </motion.div>

              {/* Avatar image — circular, soft edge blend, mouse-tracked tilt */}
              <motion.div
                className="absolute z-10 rounded-full overflow-hidden cursor-pointer"
                style={{
                  inset: '0',
                  WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                  maskImage: 'radial-gradient(circle, black 60%, transparent 85%)',
                }}
                animate={{
                  rotateX: mousePos.y,
                  rotateY: mousePos.x,
                  y: [0, -7, 0, 7, 0],
                }}
                transition={{
                  rotateX: { type: 'spring', stiffness: 90, damping: 18 },
                  rotateY: { type: 'spring', stiffness: 90, damping: 18 },
                  y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                whileHover={{ scale: 1.04 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
              >
                <Image
                  src="/images/coffy-hero.webp"
                  alt="Coffy Mascot"
                  width={288}
                  height={288}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: 'center 30%',
                    transform: 'scale(1.3)',
                    transformOrigin: 'center 50%',
                    filter: 'brightness(1.08) saturate(1.15)',
                  }}
                  priority
                />
                {/* Hover shimmer */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(140deg, rgba(212,160,23,0.18) 0%, transparent 55%)' }}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          section {
            padding-top: 3.5rem;
            padding-bottom: 2rem;
            min-height: auto;
          }
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </section>
  );
}