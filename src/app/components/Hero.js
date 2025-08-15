'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import useAppStore from '../stores/useAppStore';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { Player as LottiePlayer } from "lottie-react";

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const baseScale = useTransform(scrollY, [0, 300], [1, 0.8]);
  
  // Modern intersection observer hook
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // Zustand store integration
  const { updatePortfolio, addNotification } = useAppStore();
  
  // Client-side state for particles
  const [particles, setParticles] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Enhanced particle system with performance optimization
  const generateParticles = useCallback(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: `particle-${i}-${Date.now()}`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 25 + 8,
      delay: Math.random() * 10,
      duration: Math.random() * 6 + 3,
      x: Math.random() * 200 - 100,
      type: Math.random() > 0.6 ? 'steam' : 'bean',
      opacity: Math.random() * 0.7 + 0.2,
      rotation: Math.random() * 360
    }));
  }, []);

  useEffect(() => {
    setIsLoaded(true);
    const newParticles = generateParticles();
    setParticles(newParticles);

    // Performance optimized particle regeneration
    const interval = setInterval(() => {
      setParticles(generateParticles());
    }, 12000);

    return () => clearInterval(interval);
  }, [generateParticles]);

  // Enhanced parallax effects
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const titleY = useTransform(scrollY, [0, 500], [0, 100]);
  const logoY = useTransform(scrollY, [0, 500], [0, -80]);
  const logoRotate = useTransform(scrollY, [0, 500], [0, 15]);
  const contentScale = useTransform(scrollY, [0, 500], [1, 0.9]);

  // Kahve çekirdeği SVG'si (partikül için)
  const coffeeBeanSVG = `<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'><ellipse cx='8' cy='8' rx='7' ry='4' fill='#6F4E37'/><ellipse cx='8' cy='8' rx='2' ry='4' fill='#3A2A1E'/></svg>`;

  // Particles config
  const particlesInit = useCallback(async (engine) => {
    try {
      await loadSlim(engine);
    } catch (error) {
      console.warn('Particles initialization failed:', error);
    }
  }, []);
  
  // Reduce particle count
  const particlesOptions = {
    fullScreen: false,
    background: { 
      color: { value: "transparent" } 
    },
    fpsLimit: 60,
    particles: {
      number: { value: 20, density: { enable: true, area: 1000 } },
      color: { 
        value: ["#D4A017", "#F4C430", "#A77B06", "#6F4E37"] 
      },
      shape: {
        type: "circle"
      },
      opacity: { 
        value: { min: 0.3, max: 0.8 },
        animation: {
          enable: true,
          speed: 1,
          sync: false
        }
      },
      size: { 
        value: { min: 2, max: 6 },
        animation: {
          enable: true,
          speed: 2,
          sync: false
        }
      },
      move: {
        enable: true,
        speed: { min: 0.5, max: 1.5 },
        direction: "top",
        random: true,
        straight: false,
        outModes: { 
          default: "out" 
        }
      }
    },
    interactivity: {
      detectsOn: "canvas",
      events: {
        onHover: { 
          enable: true, 
          mode: "repulse" 
        },
        resize: true
      },
      modes: {
        repulse: { 
          distance: 100, 
          duration: 0.4 
        }
      }
    },
    detectRetina: true
  };

  // Handle CTA clicks with modern state management
  const handleTradeClick = () => {
    addNotification({
      type: 'info',
      title: 'Redirecting to PancakeSwap',
      message: 'Opening COFFY trading page...'
    });
  };

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.25, 0.1, 0.25, 1],
        staggerChildren: 0.2
      }
    }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  // Only run heavy animations if inView
  const shouldAnimate = inView;

  return (
    <section 
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A]" 
      id="hero"
    >
      {/* Gradient Glow (arka plan) */}
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
          style={{ zIndex: 0 }}
        />
      )}
      {/* Kahve çekirdeği partikülleri */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {shouldAnimate && (
          <Particles id="coffee-particles" init={particlesInit} options={particlesOptions} style={{ width: '100%', height: '100%' }} />
        )}
      </div>
      {/* Main content with modern animations */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
          variants={heroVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          <motion.div
            variants={childVariants}
            style={{ y }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1"
          >
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#A77B06] leading-tight"
              variants={childVariants}
            >
              COFFY COIN
            </motion.h1>
            
            <motion.p 
              className="text-lg sm:text-xl text-[#E8D5B5] mb-6 sm:mb-8 max-w-xl leading-relaxed"
              variants={childVariants}
            >
              "Brewing the Future of Coffee with Blockchain! The First{' '}
              <span className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] bg-clip-text text-transparent font-semibold">Drink-to-Earn</span>,{' '}
              <span className="bg-gradient-to-r from-[#A77B06] to-[#8B6914] bg-clip-text text-transparent font-semibold">Play-to-Earn</span>, and{' '}
              <span className="bg-gradient-to-r from-[#8B6914] to-[#D4A017] bg-clip-text text-transparent font-semibold">SocialFi</span> Coin on Binance Smart Chain."
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-6 w-full sm:w-auto mb-8 sm:mb-12"
              variants={childVariants}
            >
              <motion.a
                href="https://pancakeswap.finance/swap?inputCurrency=BNB&outputCurrency=0x33AA3dbCB3c4fF066279AD33099Ce154936D8b88"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTradeClick}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(212,160,23,0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                className="group bg-gradient-to-br from-[#D4A017] via-[#F4C430] to-[#A77B06] text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-2xl hover:shadow-[#D4A017]/50 transition-all duration-500 transform hover:-translate-y-2 w-full sm:w-auto flex items-center justify-center relative overflow-hidden"
              >
                <span className="relative z-10">Trade Now</span>
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 ml-2 relative z-10" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </motion.svg>
                {/* Parlayan çizgi efekti */}
                <motion.div
                  className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#fff7] to-[#D4A017] rounded-full opacity-0 group-hover:opacity-100"
                  initial={{ opacity: 0, x: -20 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.a>
              
              <motion.a
                href="#tokenomics"
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: "rgba(212,160,23,0.1)" 
                }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#3A2A1E]/80 hover:bg-[#2C1B12] border-2 border-[#D4A017]/50 hover:border-[#D4A017] text-[#E8D5B5] font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-500 transform hover:-translate-y-2 w-full sm:w-auto text-center backdrop-blur-md relative overflow-hidden group"
              >
                Learn More
                {/* Glow efekti */}
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.18 }}
                  style={{ background: `radial-gradient(circle at 60% 20%, #D4A017 0%, transparent 70%)` }}
                  transition={{ duration: 0.4 }}
                />
              </motion.a>
            </motion.div>
          </motion.div>
          {/* Sağdaki büyük kahve fincanı/logo görseli ve efektleri geri eklendi */}
          <motion.div
            variants={childVariants}
            style={{ y: logoY }}
            className="flex justify-center lg:justify-end order-1 lg:order-2 pt-6 md:pt-0"
          >
            <div className="relative w-52 h-52 sm:w-60 sm:h-60 md:w-80 md:h-80">
              {/* Ana logo */}
              <motion.div 
                className="relative z-10 w-full h-full overflow-hidden rounded-[2.5rem] shadow-2xl"
                style={{ rotateY: logoRotate }}
                animate={{ y: [0, -10, 0, 10, 0], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.1, rotateY: 5 }}
              >
                <Image
                  src="/images/coffy-hero.png"
                  alt="Coffy Coin Hero"
                  width={320}
                  height={320}
                  className="w-full h-full object-contain drop-shadow-2xl filter brightness-110 rounded-[2.5rem]"
                  style={{ width: 'auto', height: 'auto' }}
                  priority
                />
              </motion.div>
              
              {/* Parlak glow efekti */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-gradient-radial from-[#D4A017]/30 via-[#D4A017]/10 to-transparent blur-3xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
              
              {/* Enhanced steam particles - Modern coffee cup steam */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`steam-${i}`}
                    className="absolute w-3 h-8 bg-gradient-to-t from-[#D4A017]/40 via-[#F4C430]/30 to-transparent rounded-full blur-sm"
                    style={{ 
                      left: `${45 + (i % 3) * 5}%`,
                      top: `10%`
                    }}
                    animate={{
                      y: [-10, -120, -160],
                      x: [0, (i % 2 ? 15 : -15), 0],
                      opacity: [0, 0.8, 0],
                      scale: [0.8, 1.2, 0.6],
                      rotate: [0, (i % 2 ? 10 : -10), 0]
                    }}
                    transition={{
                      duration: 3 + (i * 0.5),
                      repeat: Infinity,
                      delay: i * 0.8,
                      ease: [0.25, 0.1, 0.25, 1]
                    }}
                  />
                ))}
              </div>
              
              {/* Floating coffee beans animation */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`bean-${i}`}
                    className="absolute w-2 h-3 bg-gradient-to-br from-[#6F4E37] to-[#3A2A1E] rounded-full opacity-60"
                    style={{
                      left: `${20 + i * 20}%`,
                      top: `${60 + (i % 2) * 10}%`,
                    }}
                    animate={{
                      y: [-5, 5, -5],
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 4 + i,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced responsive styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          section {
            padding-top: 4rem;
            padding-bottom: 3rem;
            min-height: 100vh;
          }
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
        
        .bg-gradient-conic {
          background: conic-gradient(var(--tw-gradient-stops));
        }
      `}</style>
    </section>
  );
}