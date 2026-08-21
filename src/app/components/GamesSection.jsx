'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Gamepad2, Sparkles, ShieldCheck, Coins, Clock, ArrowRight, Zap, Loader2 } from 'lucide-react';

const FALLBACK_IMAGE = '/images/game-placeholder.jpg';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 25,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 350,
    },
  },
  hover: {
    y: -6,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 300,
    },
  },
};

export default function GamesSection({ id }) {
  const [isLoading, setIsLoading] = useState({});

  // Game data configuration
  const games = useMemo(() => [
    {
      id: 'sleepness',
      title: 'Sleepness (Open World AAA)',
      image: '/images/game-previews/sleepness-preview.png',
      purpose: 'High-fidelity open-world AAA prototype with advanced graphics, rich physics simulation, and immersive dynamic mechanics.',
      path: '/sleepness/index.html',
      rewards: 'Up to 50,000 COFFY',
      category: 'Open World AAA',
      isNew: true,
      isMobile: false
    },
    {
      id: 'coffee-chess',
      title: 'Coffee Chess (Multiplayer PvP)',
      image: '/images/game-previews/coffeechess-preview.jpg',
      purpose: 'Strategic on-chain PvP chess. Compete in real-time matchmaking, outsmart opponents, and earn $COFFY rewards.',
      path: '/CoffeeChess/index.html',
      rewards: 'Competitive Stakes',
      category: 'PvP Strategy',
      isNew: true,
      isMobile: false
    },
    {
      id: 'chinesee',
      title: 'Coffee Checkers (Multiplayer PvP)',
      image: '/images/game-previews/chinesee-preview.jpg',
      purpose: 'Fast-paced real-time checkers with smart contract prize pool settlements and instant room creation.',
      path: '/chinesee/index.html',
      rewards: 'Competitive Stakes',
      category: 'PvP Board Game',
      isNew: true,
      isMobile: false
    },
    {
      id: 'futbol-simulator',
      title: 'Futbol Menajerlik Simülatörü',
      image: '/images/game-previews/futbol-preview.png',
      purpose: 'Manage your own football club! Balance budget, supporters, and tactics.',
      path: 'https://play.google.com/store/apps/details?id=com.futbol.simulator',
      rewards: 'Play on Android',
      category: 'Mobile Simulation',
      isNew: false,
      isMobile: true // Hidden from web gaming section
    },
    {
      id: 'gorev-2070',
      title: 'GÖREV 2070: Siber Strateji',
      image: '/images/game-previews/gorev2070-preview.png',
      purpose: 'Cyberpunk text-strategy and card survival mobile game.',
      path: 'https://play.google.com/store/apps/details?id=com.gorev2070.strategy',
      rewards: 'Play on Android',
      category: 'Mobile Strategy',
      isNew: false,
      isMobile: true // Hidden from web gaming section
    }
  ], []);

  const securityMetrics = useMemo(() => [
    {
      icon: ShieldCheck,
      label: 'Min Balance',
      value: 'Zero Required',
      description: 'Open to all wallets'
    },
    {
      icon: Coins,
      label: 'Pool Reward',
      value: '50K COFFY / wk',
      description: 'Character scaling pool'
    },
    {
      icon: Clock,
      label: 'Min Session',
      value: '2 Minutes',
      description: 'Anti-bot verified'
    },
    {
      icon: Zap,
      label: 'Settlement',
      value: 'Instant On-Chain',
      description: 'Base L2 Execution'
    }
  ], []);

  // Filter out mobile games as requested
  const filteredGames = useMemo(() => {
    return games.filter(game => !game.isMobile);
  }, [games]);

  // Handlers
  const handleGameClick = useCallback(async (gameId, gamePath) => {
    setIsLoading(prev => ({ ...prev, [gameId]: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      window.open(gamePath, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open game:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, [gameId]: false }));
    }
  }, []);

  const handleImageError = useCallback((event) => {
    event.target.src = FALLBACK_IMAGE;
  }, []);

  return (
    <section id={id || "games"} className="py-16 md:py-24 bg-gradient-to-b from-[#120A06] via-[#1A0E08] to-[#120A06] scroll-mt-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide mb-4">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>PLAY TO EARN ECOSYSTEM</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 font-outfit">
            Decentralized <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">Web3 Gaming</span>
          </h2>
          <p className="text-base sm:text-lg text-[#E8D5B5]/75 max-w-2xl mx-auto leading-relaxed">
            Play high-performance browser games, challenge players in on-chain PvP tournaments, and earn $COFFY tokens backed by smart contracts.
          </p>
        </motion.div>

        {/* Security & Architecture Strip */}
        <motion.div
          className="max-w-4xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="bg-[#180E09]/80 border border-amber-500/25 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {securityMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label + '-' + index}
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-black/30 border border-amber-500/10 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mb-2">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-[#E8D5B5]/60 uppercase tracking-wider mb-0.5">{metric.label}</span>
                    <span className="text-sm font-bold text-white mb-0.5">{metric.value}</span>
                    <span className="text-[10px] text-[#E8D5B5]/50">{metric.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Game Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {filteredGames.map((game) => (
            <motion.article
              key={game.id}
              variants={cardVariants}
              whileHover="hover"
              className="group relative bg-[#1A0E08]/90 border border-amber-500/20 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md flex flex-col transition-all duration-300 hover:shadow-amber-500/10 hover:shadow-2xl"
              onClick={() => handleGameClick(game.id, game.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameClick(game.id, game.path);
                }
              }}
            >
              {/* Game Image Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/60">
                <img
                  src={game.image}
                  alt={`${game.title} preview`}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  onError={handleImageError}
                  loading="lazy"
                  width={380}
                  height={240}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A0E08] via-black/30 to-transparent" />
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    {game.category}
                  </span>
                </div>

                {/* NEW Badge */}
                {game.isNew && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      ACTIVE
                    </span>
                  </div>
                )}
              </div>
              
              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors duration-200 mb-2">
                    {game.title}
                  </h3>
                  <p className="text-xs text-[#E8D5B5]/70 leading-relaxed line-clamp-3 mb-4">
                    {game.purpose}
                  </p>
                </div>
                
                {/* Footer Action */}
                <div className="pt-4 border-t border-amber-500/15 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#E8D5B5]/50 uppercase tracking-wider font-semibold">Reward Rate</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{game.rewards}</span>
                  </div>

                  <button
                    disabled={isLoading[game.id]}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 group-hover:from-amber-400 group-hover:to-orange-400 text-black font-bold text-xs transition-all shadow-md"
                  >
                    {isLoading[game.id] ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}