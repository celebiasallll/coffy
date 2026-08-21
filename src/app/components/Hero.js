'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import {
  Gamepad2,
  Gift,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import LiveStats from './LiveStats';

export default function Hero({ id }) {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(true);

  const heroRef = useRef(null);
  const mascotRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // IntersectionObserver for performance
  useEffect(() => {
    if (!heroRef.current || typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Mouse tilt on Mascot
  const handleMouseMove = useCallback((e) => {
    if (!mascotRef.current || prefersReduced) return;
    const rect = mascotRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setMousePos({
      x: Math.max(-1, Math.min(1, dx)) * 12,
      y: Math.max(-1, Math.min(1, dy)) * -12,
    });
  }, [prefersReduced]);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  // Parallax on scroll
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : 40]);
  const logoY = useTransform(scrollY, [0, 500], [0, prefersReduced ? 0 : -30]);

  // Particles setup
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const particlesOptions = useMemo(() => ({
    particles: {
      number: { value: 16, density: { enable: true, value_area: 900 } },
      color: { value: ["#D4A017", "#F4C430", "#8B5A2B"] },
      shape: { type: "circle" },
      opacity: { value: 0.25, random: true },
      size: { value: 3, random: true },
      move: { enable: true, speed: 0.5, direction: "top", out_mode: "out" },
    },
    interactivity: { events: { onhover: { enable: false } } },
    detectRetina: true,
  }), []);

  const heroVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
  };

  const shouldAnimate = mounted && !prefersReduced && inView;

  return (
    <>
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#120A06] via-[#1E110A] to-[#120A06] pt-24 pb-12 md:py-24"
        id={id || "hero"}
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
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            variants={heroVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            {/* Left — Text & Actions */}
            <motion.div
              variants={childVariants}
              style={{ y }}
              className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:col-span-7"
            >
              <motion.h1
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 leading-[1.15] font-outfit tracking-tight"
                variants={childVariants}
              >
                The Next Evolution of Decentralized Gaming
              </motion.h1>

              <motion.p
                className="text-sm sm:text-base md:text-lg text-[#E8D5B5]/85 mb-7 max-w-2xl leading-relaxed"
                variants={childVariants}
              >
                Powering an on-chain Web3 ecosystem on Base Mainnet. Compete in verified{' '}
                <span className="text-amber-300 font-semibold">Play-to-Earn PvP battles</span>, stake for dynamic rewards, and claim genesis pioneer allocations with zero hidden fees.
              </motion.p>

              {/* 2 Primary CTA Buttons */}
              <motion.div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 mb-7 w-full sm:w-auto"
                variants={childVariants}
              >
                <motion.a
                  href="#airdrop"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base shadow-lg shadow-amber-500/20 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Gift className="w-4 h-4 text-black" />
                  <span>Claim Pioneer Allocation</span>
                </motion.a>
                
                <motion.a
                  href="#games"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto border border-amber-500/40 hover:border-amber-400 text-[#E8D5B5] hover:text-white font-semibold py-3.5 px-6 rounded-xl text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2.5 bg-black/30 backdrop-blur-sm cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  <span>Play On-Chain Games</span>
                </motion.a>
              </motion.div>

              {/* Institutional Fair Launch Target Milestone */}
              <motion.div
                variants={childVariants}
                className="w-full max-w-xl p-4 rounded-2xl bg-[#180E09]/90 border border-amber-500/30 backdrop-blur-md shadow-xl flex items-center gap-3.5 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Fair Launch Target
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                      Target: 10,000 Holders
                    </span>
                  </div>
                  <p className="text-xs text-[#E8D5B5]/80 leading-snug">
                    Public DEX Liquidity &amp; Trading initialize automatically upon reaching <strong className="text-amber-300 font-semibold">10,000 verified on-chain Pioneer holders</strong>.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right — Clean Avatar (5 cols) */}
            <motion.div
              variants={childVariants}
              style={{ y: logoY }}
              className="flex flex-col items-center justify-center lg:col-span-5 order-2 my-2 lg:my-0"
            >
              <div ref={mascotRef} className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72">
                {/* Pulsing glow aura */}
                <motion.div
                  className="absolute rounded-full z-[2] pointer-events-none"
                  style={{
                    inset: '-12px',
                    background: 'radial-gradient(circle, rgba(212,160,23,0.2) 0%, transparent 70%)',
                  }}
                  animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* LIVE indicator */}
                <motion.div
                  className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 bg-black/90 border border-amber-500/40 rounded-full px-3 py-1 shadow-lg backdrop-blur-md"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-extrabold tracking-wider">BASE LIVE</span>
                </motion.div>

                {/* Avatar image */}
                <motion.div
                  className="absolute z-10 rounded-full overflow-hidden cursor-pointer"
                  style={{
                    inset: '0',
                    WebkitMaskImage: 'radial-gradient(circle, black 65%, transparent 90%)',
                    maskImage: 'radial-gradient(circle, black 65%, transparent 90%)',
                  }}
                  animate={{
                    rotateX: mousePos.y,
                    rotateY: mousePos.x,
                    y: [0, -6, 0, 6, 0],
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
                      transform: 'scale(1.25)',
                      transformOrigin: 'center 50%',
                      filter: 'brightness(1.06) saturate(1.15)',
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
      </section>

      {/* Live Verified On-Chain Stats Bar */}
      <LiveStats />
    </>
  );
}