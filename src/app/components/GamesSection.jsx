'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

// Constants
const COFFEE_BEAN_IMAGE = '/images/coffee-beans-pattern.png';
const FALLBACK_IMAGE = '/images/game-placeholder.jpg';



// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
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
    boxShadow: '0 12px 30px -8px rgba(212, 160, 23, 0.25)',
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 300,
    },
  },
};

const GamesSection = ({ id }) => {
  const [isLoading, setIsLoading] = useState({});

  // Game data - could be moved to external config or API
  const games = useMemo(() => [
    {
      id: 'futbol-simulator',
      title: 'Futbol Menajerlik Simülatörü',
      image: '/images/game-previews/futbol-preview.png',
      purpose: 'Manage your own football club! Balance budget, supporters, board, and player chemistry. Make critical tactical choices and lead your team to victory in this immersive swipe simulator.',
      path: 'https://play.google.com/store/apps/details?id=com.futbol.simulator',
      gradient: 'from-[#0F291B] via-[#1B3B22] to-[#2E6F40]',
      rewards: 'Play on Android',
      category: 'Sports & Simulation',
      isNew: true
    },
    {
      id: 'gorev-2070',
      title: 'GÖREV 2070: Siber Strateji',
      image: '/images/game-previews/gorev2070-preview.png',
      purpose: 'Our immersive cyberpunk text-strategy and card survival mobile game. Manage resources, control lead stress, expand territories, and lead your cyber empire to survival!',
      path: 'https://play.google.com/store/apps/details?id=com.gorev2070.strategy',
      gradient: 'from-[#1A0F0A] via-[#2A1810] to-[#D4A017]',
      rewards: 'Play on Android',
      category: 'Text-Strategy & Survival',
      isNew: true
    },
    {
      id: 'sleepness',
      title: 'Sleepness (Open World AAA)',
      image: '/images/game-previews/sleepness-preview.png',
      purpose: 'Experience a high-fidelity open-world AAA prototype with advanced graphics, immersive environments, and dynamic gameplay mechanics.',
      path: '/sleepness/index.html',
      gradient: 'from-[#0F172A] to-[#1E293B]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Open World',
      isNew: true
    },
    {
      id: 'coffee-chess',
      title: 'Coffee Chess (Multiplayer PvP)',
      image: '/images/game-previews/coffeechess-preview.jpg',
      purpose: 'Classic chess with on-chain stakes. Outsmart your opponent in real-time PvP matches and earn COFFY tokens!',
      path: '/CoffeeChess/index.html',
      gradient: 'from-[#D4A017] to-[#A77B06]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Multiplayer PvP',
      isNew: true
    },
    {
      id: 'chinesee',
      title: 'Coffee Checkers (Multiplayer PvP)',
      image: '/images/game-previews/chinesee-preview.jpg',
      purpose: 'Real-time PvP checkers on-chain stakes. Create a room, join by ID, or use Quick Match. Earn COFFY by winning!',
      path: '/chinesee/index.html',
      gradient: 'from-[#BFA181] to-[#6F4E37]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Multiplayer PvP',
      isNew: true
    }
    /* Geliştirme aşamasında oldukları için geçici olarak gizlendi
    ,
    {
      id: 'bee-game',
      title: 'Bee Game Adventure',
      image: '/images/game-previews/beegame-preview.jpg',
      purpose: 'Experience an immersive open-world adventure as a brave bee! Explore vast environments, battle enemies, collect nectar, and survive in this action-packed 3D world. Use flight mechanics, combat skills, and strategic thinking to overcome challenges while earning COFFY rewards.',
      path: '/beegame/index.html',
      gradient: 'from-[#FFD700] to-[#FFA500]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Adventure',
      isNew: true
    },
    {
      id: 'flagracer-online',
      title: 'FlagRacer Online (Multiplayer)',
      image: '/images/game-previews/flagracer-preview.jpg',
      purpose: 'Experience high-speed multiplayer racing across dynamically generated tracks. Compete in real-time tournaments, master precision driving, and customize your vehicles. Earn COFFY tokens by winning races, completing weekly challenges, and participating in seasonal events. Climb the ranks and unlock exclusive rewards.',
      path: '/flagraceronline/index.html',
      gradient: 'from-[#A77B06] to-[#3A2A1E]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Multiplayer Racing'
    },
    {
      id: 'coffy-in-maze',
      title: 'Coffy in Maze',
      image: '/images/game-previews/coffy-maze-preview.jpg',
      purpose: 'Navigate through complex 3D mazes filled with challenging puzzles, hidden traps, and collectible rewards. Use strategic thinking and quick reflexes to unlock new areas, discover shortcuts, and maximize your COFFY earnings. Each maze offers unique layouts and increasing difficulty for endless replayability.',
      path: '/coffyinmaze/index.html',
      gradient: 'from-[#8B6F4E] to-[#3A2A1E]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Puzzle'
    },
    {
      id: 'coffyverse-city3d',
      title: 'Coffyverse City3D',
      image: '/images/game-previews/hungerium-preview.jpg',
      purpose: 'Lead tactical rescue missions in a futuristic city under siege. Deploy advanced strategies to save hostages, defend against the robot invasion, and restore peace. Upgrade your equipment, unlock new characters, and collaborate with other players in co-op missions for greater rewards.',
      path: '/hungeriumgame/index.html',
      gradient: 'from-[#D4A017] to-[#A77B06]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Strategy'
    },
    {
      id: 'coffy-adventure',
      title: 'Coffy Adventure',
      image: '/images/game-previews/coffy-adventure-preview.jpg',
      purpose: 'Embark on an epic journey collecting coffee beans while battling tea enemies in this action-packed adventure. Master combat mechanics, unlock new abilities, and compete for global leaderboard dominance. Discover hidden secrets, power-ups, and face unique bosses as you progress through increasingly challenging levels.',
      path: '/coffygame/game.html',
      gradient: 'from-[#BFA181] to-[#6F4E37]',
      rewards: 'Max 50,000 COFFY/week (base)',
      category: 'Action'
    }
    */
  ], []);

  const securityMetrics = useMemo(() => [
    {
      icon: 'fas fa-wallet',
      label: 'Min Balance',
      value: 'No Minimum',
      color: 'text-[#A77B06] border-[#A77B06]/30',
      description: 'Open to everyone'
    },
    {
      icon: 'fas fa-coins',
      label: 'Max Claim',
      value: '50K COFFY/week (base)',
      color: 'text-[#BFA181] border-[#BFA181]/30',
      description: 'Weekly limit (increases with character)'
    }
    ,
    {
      icon: 'fas fa-hourglass-half',
      label: 'Min. Play Time',
      value: '2 mins',
      color: 'text-[#6F4E37] border-[#6F4E37]/30',
      description: 'Minimum session duration (V6 Standard)'
    },
    {
      icon: 'fas fa-user-check',
      label: 'Wallet Age',
      value: 'None',
      color: 'text-[#F4C430] border-[#F4C430]/30',
      description: 'No age limit for now'
    }
  ], []);

  // No filtering needed - show all games
  const filteredGames = games;

  // Handlers
  const handleGameClick = useCallback(async (gameId, gamePath) => {
    setIsLoading(prev => ({ ...prev, [gameId]: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate loading
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
    <section id={id || "games"} className="py-10 md:py-20 bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] scroll-mt-24 overflow-hidden" aria-label="Play to Earn Games Section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#D4A017] mb-4 tracking-tight">
            Play to Earn Games
          </h2>
          <p className="text-lg text-[#E8D5B5] max-w-3xl mx-auto mb-6 leading-relaxed">
            Dive into our immersive gaming ecosystem and earn COFFY tokens while experiencing
            cutting-edge gameplay mechanics
          </p>
        </motion.div>

        {/* Anti-Sybil Security Section (compact, animated cards) */}
        <motion.div
          className="max-w-4xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-gradient-to-br from-[#3A2A1E]/60 via-[#2A1F15]/80 to-[#3A2A1E]/60 border border-[#A77B06]/30 rounded-lg p-2 md:p-3 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-1 bg-[#A77B06]/20 rounded-full">
                <i className="fas fa-shield-alt text-[#A77B06] text-lg" />
              </div>
              <h3 className="text-base font-bold text-[#A77B06] whitespace-nowrap">Anti-Sybil Protection</h3>
              <span className="text-xs text-[#E8D5B5]/80 ml-2 whitespace-nowrap">V2 modular smart contract with advanced sybil protection & dynamic rewards</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 place-items-center">
              {securityMetrics.map((metric, index) => (
                <motion.article
                  key={metric.label + '-' + index}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  whileHover="hover"
                  viewport={{ once: true }}
                  className={`group relative bg-gradient-to-br from-[#2A1F15] to-[#3A2A1E] border border-[#BFA181]/20 rounded-xl overflow-hidden shadow-md min-h-[120px] flex flex-col items-center justify-center p-2 transition-all duration-300 ${metric.color}`}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {/* Particle Effect on Hover (like game cards) */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="w-6 h-6 relative overflow-hidden rounded-full">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-0.5 h-0.5 bg-gradient-to-br from-[#D4A017] to-[#A77B06] rounded-full animate-bounce"
                          style={{
                            left: `${(i * 33) % 100}%`,
                            top: `${(i * 57) % 100}%`,
                            animationDelay: `${(i * 0.4)}s`,
                            animationDuration: `${1.5 + (i * 0.2)}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 p-1">
                    <div className="p-0.5 bg-current/10 rounded-lg mb-0.5">
                      <i className={`${metric.icon} text-sm`} />
                    </div>
                    <p className="font-semibold text-[11px] mb-0.5 opacity-80 leading-tight">{metric.label}</p>
                    <p className="text-white text-[12px] font-bold mb-0.5 leading-tight">{metric.value}</p>
                    <p className="text-[9px] text-gray-400 leading-tight text-center">{metric.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
            <div className="mt-2 text-center">
              <div className="inline-flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 border border-[#D4A017]/20">
                <i className="fas fa-info-circle text-[#D4A017] text-xs" />
                <span className="text-xs text-gray-300">
                  V2 modular smart contract with advanced sybil protection & dynamic rewards
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Game Cards Grid */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 md:gap-8 mb-16 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {filteredGames.map((game, idx) => (
            <motion.article
              key={game.id}
              variants={cardVariants}
              whileHover="hover"
              className="group relative bg-gradient-to-b from-[#1F140D] to-[#140C08] border border-[#D4A017]/10 hover:border-[#D4A017]/35 rounded-xl overflow-hidden cursor-pointer shadow-lg backdrop-blur-md flex flex-col w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-22px)] max-w-[340px] transition-all duration-300"
              onClick={() => handleGameClick(game.id, game.path)}
              role="button"
              tabIndex={0}
              aria-label={`Play ${game.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGameClick(game.id, game.path);
                }
              }}
            >
              {/* Game Image Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                <img
                  src={game.image}
                  alt={`${game.title} game preview`}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={handleImageError}
                  loading="lazy"
                  width={340}
                  height={212}
                />
                {/* Image Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Play Button */}
                <div className="absolute top-3 left-3">
                  <motion.button
                    className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-[11px] hover:bg-[#D4A017] hover:text-[#1A0F0A] hover:border-[#D4A017] rounded-full px-3 py-1.5 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading[game.id]}
                  >
                    {isLoading[game.id] ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <i className="fas fa-play text-[9px]" />
                    )}
                    {isLoading[game.id] ? 'Loading...' : 'Play Now'}
                  </motion.button>
                </div>
                
                {/* NEW Badge for new games */}
                {game.isNew && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-[#FF6B6B] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-sm border border-white/20">
                      NEW
                    </span>
                  </div>
                )}
              </div>
              
              {/* Card Content */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm md:text-base font-bold text-white group-hover:text-[#D4A017] transition-colors duration-300 line-clamp-1">
                      {game.title}
                    </h3>
                  </div>
                  {game.category && (
                    <span className="inline-block px-2 py-0.5 text-[9px] font-semibold text-[#D4A017] bg-[#D4A017]/10 rounded-full mb-3 uppercase tracking-wider">
                      {game.category}
                    </span>
                  )}
                  <p className="text-xs text-[#E8D5B5]/70 leading-relaxed line-clamp-3 mb-4 min-h-[3.75rem]">
                    {game.purpose}
                  </p>
                </div>
                
                {/* Rewards Section */}
                <div className="mt-auto pt-3 border-t border-[#D4A017]/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-coins text-[#D4A017] text-xs" />
                    <span className="text-[10px] text-[#E8D5B5]/50 font-medium">Weekly Rewards</span>
                  </div>
                  <span className="text-xs font-bold text-[#F4C430]">{game.rewards}</span>
                </div>
              </div>

              {/* Subtle Ambient Hover Glow */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${game.id === 'futbol-simulator' ? 'from-green-500/5 to-emerald-500/5' : 'from-[#D4A017]/5 to-[#A77B06]/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default GamesSection;