'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import useAppStore from '../stores/useAppStore';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const IDLE_MESSAGES = [
  "Hey there! Ready to earn with your coffee? ☕",
  "I missed you... come stake with me 🥺",
  "Every sip brings you closer to rewards ✨",
  "You belong in the Coffy family 💛",
  "Your next win is just one game away 🎮",
  "10,000+ warriors can\'t be wrong. Join us! ⚔️",
  "I\'m rooting for you every step of the way 👟",
  "Your rewards are patiently waiting... 💎",
  "Together we brew something extraordinary 🌟",
  "Don\'t let your COFFY get cold! 🔥",
];

const HOVER_MESSAGES = [
  "Hi! I\'m Coffy ☕ Nice to meet you!",
  "Stake & earn up to 50% APY! 💰",
  "Play games, win real tokens! 🎮",
  "Walk more, earn more with Step Rewards 👟",
  "Legend holders shape the DAO 👑",
  "Real coffee chain partners coming soon! 🤝",
];

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const { updatePortfolio, addNotification } = useAppStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [idleMsg, setIdleMsg] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mascotRef = useRef(null);

  useEffect(() => { setIsLoaded(true); }, []);

  // Auto idle messages — show every 4s even without hover
  useEffect(() => {
    const show = () => {
      const idx = Math.floor(Math.random() * IDLE_MESSAGES.length);
      setIdleMsg(idx);
      setTimeout(() => setIdleMsg(null), 3000); // hide after 3s
    };
    const t = setInterval(show, 5000);
    setTimeout(show, 1500); // first message shortly after load
    return () => clearInterval(t);
  }, []);

  // Hover messages cycle
  useEffect(() => {
    if (!isHovered) return;
    setMsgIdx(0); // reset to first hover msg
    const t = setInterval(() => setMsgIdx(i => (i + 1) % HOVER_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, [isHovered]);

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
      number: { value: 18, density: { enable: true, area: 1000 } },
      color: { value: ["#D4A017", "#F4C430", "#A77B06", "#6F4E37"] },
      shape: { type: "circle" },
      opacity: { value: { min: 0.3, max: 0.8 }, animation: { enable: true, speed: 1, sync: false } },
      size: { value: { min: 2, max: 5 }, animation: { enable: true, speed: 2, sync: false } },
      move: { enable: true, speed: { min: 0.5, max: 1.5 }, direction: "top", random: true, straight: false, outModes: { default: "out" } }
    },
    interactivity: {
      detectsOn: "canvas",
      events: { onHover: { enable: true, mode: "repulse" }, resize: true },
      modes: { repulse: { distance: 100, duration: 0.4 } }
    },
    detectRetina: true
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.2 } }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } }
  };

  const shouldAnimate = inView;

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A]"
      id="hero"
    >
      {/* Background animated glow */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, #D4A01733 0%, transparent 70%)',
              'radial-gradient(circle at 80% 70%, #F4C43033 0%, transparent 70%)',
              'radial-gradient(circle at 20% 30%, #D4A01733 0%, transparent 70%)'
            ]
          }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Particles */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {shouldAnimate && (
          <Particles id="coffee-particles" init={particlesInit} options={particlesOptions} style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Main content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
          variants={heroVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Left — text */}
          <motion.div
            variants={childVariants}
            style={{ y }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1"
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#A77B06] leading-tight font-outfit tracking-tighter"
              variants={childVariants}
            >
              COFFY COIN
            </motion.h1>

            <motion.p
              className="text-lg sm:text-xl text-[#E8D5B5] mb-6 sm:mb-8 max-w-xl leading-relaxed"
              variants={childVariants}
            >
              Brewing the Future of Coffee with Blockchain! The First{' '}
              <span className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] bg-clip-text text-transparent font-semibold">Drink-to-Earn</span>,{' '}
              <span className="bg-gradient-to-r from-[#A77B06] to-[#8B6914] bg-clip-text text-transparent font-semibold">Play-to-Earn</span>, and{' '}
              <span className="bg-gradient-to-r from-[#8B6914] to-[#D4A017] bg-clip-text text-transparent font-semibold">SocialFi</span> Coin on Base Mainnet.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center lg:items-start gap-4 mb-8 sm:mb-12"
              variants={childVariants}
            >
              <motion.a
                href="#airdrop"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold py-3.5 px-7 rounded-2xl text-base sm:text-lg shadow-xl shadow-amber-500/25 transition-all duration-300 flex items-center gap-2"
              >
                🎁 Claim Free $COFFY
              </motion.a>
              <motion.a
                href="#games"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="border-2 border-[#D4A017]/60 hover:border-[#D4A017] text-[#E8D5B5] font-bold py-3.5 px-6 rounded-2xl text-base sm:text-lg transition-all duration-300 flex items-center gap-2 bg-[#1A0F0A]/40"
              >
                🎮 Play Games
              </motion.a>
              <motion.a
                href="#staking"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="border border-amber-500/30 hover:border-amber-500/60 text-amber-300/90 hover:text-amber-200 font-bold py-3.5 px-6 rounded-2xl text-base sm:text-lg transition-all duration-300 flex items-center gap-2 bg-amber-950/30"
              >
                ⚡ 50% APY Staking
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right — circular interactive avatar mascot */}
          <motion.div
            variants={childVariants}
            style={{ y: logoY }}
            className="flex justify-center lg:justify-end order-1 lg:order-2 pt-6 md:pt-0"
          >
            <div ref={mascotRef} className="relative w-44 h-44 sm:w-48 sm:h-48 md:w-56 md:h-56">


              {/* Pulsing glow aura */}
              <motion.div
                className="absolute rounded-full z-[2] pointer-events-none"
                style={{
                  inset: '-12px',
                  background: 'radial-gradient(circle, rgba(212,160,23,0.3) 0%, transparent 68%)',
                }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Speech bubble — idle OR hover, idle takes priority when not hovered */}
              <AnimatePresence mode="wait">
                {(isHovered || idleMsg !== null) && (
                  <motion.div
                    key={isHovered ? `hover-${msgIdx}` : `idle-${idleMsg}`}
                    initial={{ opacity: 0, y: 10, scale: 0.88 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.92 }}
                    transition={{ duration: 0.28 }}
                    className="absolute z-30 whitespace-nowrap pointer-events-none"
                    style={{ bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)' }}
                  >
                    <div className="bg-[#1A0F0A]/95 border border-[#D4A017]/70 text-[#F4C430] text-sm font-bold font-outfit px-4 py-2 rounded-2xl shadow-xl shadow-[#D4A017]/20 relative">
                      {isHovered ? HOVER_MESSAGES[msgIdx] : IDLE_MESSAGES[idleMsg ?? 0]}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-[7px]"
                        style={{
                          width: 0, height: 0,
                          borderLeft: '7px solid transparent',
                          borderRight: '7px solid transparent',
                          borderTop: '7px solid rgba(212,160,23,0.7)',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* LIVE badge */}
              <motion.div
                className="absolute bottom-1 right-1 z-30 flex items-center gap-1 bg-[#1A0F0A]/90 border border-[#D4A017]/40 rounded-full px-2 py-0.5 shadow-lg"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 200 }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
                <span className="text-[9px] text-emerald-400 font-bold font-outfit tracking-widest">LIVE</span>
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