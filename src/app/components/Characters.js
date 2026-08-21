'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ethers } from 'ethers';
import Image from 'next/image';
import { CheckCircle2, AlertCircle, Crown, RotateCcw, Sparkles } from 'lucide-react';

const GAME_MODULE_ADDRESS = '0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea';
const COFFY_CORE_ADDRESS = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41';

const GAME_MODULE_ABI = [
    'function purchaseCharacter(uint8 cid, uint128 amount) external',
    'function getUserCharacterBalance(address user, uint256 cid) external view returns (uint128)',
];
const COFFY_CORE_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function getCharacterMultiplier(address user) external view returns (uint256)',
    'function isDAOMember(address user) external view returns (bool)',
];

const CHARACTERS = [
    { cid: 1, name: 'Barista', rarity: 'Common', tierLabel: 'TIER I', price: '1,000,000', priceWei: '1000000000000000000000000', multiplier: '+10%', accentColor: '#BFA181', image: '/characters/barista.png', perks: ['10% reward boost', 'Access to basic tournaments'], desc: 'The first step into the COFFY ecosystem.' },
    { cid: 2, name: 'Brewmaster', rarity: 'Uncommon', tierLabel: 'TIER II', price: '3,000,000', priceWei: '3000000000000000000000000', multiplier: '+20%', accentColor: '#C8A86B', image: '/characters/brewmaster.png', perks: ['20% reward boost', 'Priority matchmaking', 'Weekly bonus pool'], desc: 'Mastery over the brew, mastery over the game.' },
    { cid: 3, name: 'Alchemist', rarity: 'Rare', tierLabel: 'TIER III', price: '5,000,000', priceWei: '5000000000000000000000000', multiplier: '+30%', accentColor: '#D4A017', image: '/characters/alchemist.png', perks: ['30% reward boost', 'Custom battle rooms', 'Leaderboard badge'], desc: 'Transforms COFFY into pure gold with every match.' },
    { cid: 4, name: 'Champion', rarity: 'Epic', tierLabel: 'TIER IV', price: '8,000,000', priceWei: '8000000000000000000000000', multiplier: '+50%', accentColor: '#F0C040', image: '/characters/champion.png', perks: ['50% reward boost', 'Exclusive tournaments', 'Champion title'], desc: 'Reserved for those who have proven themselves in the arena.' },
    { cid: 5, name: 'Legend', rarity: 'Legendary', tierLabel: 'TIER V', price: '10,000,000', priceWei: '10000000000000000000000000', multiplier: '+100%', accentColor: '#FFD700', image: '/characters/legend.png', isDAO: true, perks: ['100% reward boost', 'DAO voting rights', 'Treasury proposals', 'Legend title on-chain'], desc: 'The pinnacle. DAO membership unlocked. Your voice shapes Coffy.' },
];

const RARITY_GLOW = { Common: 'rgba(191,161,129,0.4)', Uncommon: 'rgba(200,168,107,0.45)', Rare: 'rgba(212,160,23,0.5)', Epic: 'rgba(240,192,64,0.55)', Legendary: 'rgba(255,215,0,0.65)' };

function formatCoffy(wei) {
    try { const n = Number(ethers.formatEther(wei)); if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`; return n.toFixed(0); } catch { return '—'; }
}

// Single swipeable card
function SwipeCard({ char, index, total, onSwipe, onBuy, isOwned, affordable, account, txStatus }) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
    const opacity = useTransform(x, [-250, -80, 0, 80, 250], [0, 1, 1, 1, 0]);
    const likeOpacity = useTransform(x, [20, 80], [0, 1]);
    const nopeOpacity = useTransform(x, [-80, -20], [1, 0]);

    const scale = index === 0 ? 1 : index === 1 ? 0.93 : 0.86;
    const yOffset = index === 0 ? 0 : index === 1 ? 12 : 24;

    const handleDragEnd = (_, info) => {
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
            const direction = info.offset.x > 0 ? 'right' : 'left';
            if (direction === 'right') {
                // If they swipe right, we act as if they clicked Buy
                onBuy(char);
                // We keep the card so it can say 'Owned' or if tx fails they can swipe it again.
                // We reset its position so they see what happened.
                x.set(0);
            } else {
                // Left swipe dismisses
                onSwipe('left');
            }
        }
    };

    return (
        <motion.div
            style={{
                x: index === 0 ? x : 0,
                rotate: index === 0 ? rotate : 0,
                opacity: index === 0 ? opacity : 1,
                scale,
                y: yOffset,
                position: 'absolute',
                width: '100%',
                zIndex: total - index,
                transformOrigin: 'bottom center',
                touchAction: index === 0 ? 'pan-y' : 'auto',
            }}
            drag={index === 0 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.85}
            dragMomentum={false}
            onDragEnd={index === 0 ? handleDragEnd : undefined}
            className={`rounded-3xl overflow-hidden select-none ${index === 0 ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* LIKE / NOPE overlays */}
            {index === 0 && (
                <>
                    <motion.div style={{ opacity: likeOpacity }}
                        className="absolute top-6 left-6 z-20 border-4 border-green-400 text-green-400 font-extrabold text-2xl rounded-xl px-3 py-1 rotate-[-20deg] font-outfit">
                        BUY ✓
                    </motion.div>
                    <motion.div style={{ opacity: nopeOpacity }}
                        className="absolute top-6 left-6 z-20 border-4 border-red-400 text-red-400 font-extrabold text-2xl rounded-xl px-3 py-1 rotate-[-20deg] font-outfit">
                        ← Skip
                    </motion.div>
                </>
            )}
            <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, #3A2A1E 0%, #1A0F0A 100%)',
                    border: `1px solid ${char.accentColor}44`,
                    boxShadow: index === 0
                        ? `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${RARITY_GLOW[char.rarity]}`
                        : '0 8px 30px rgba(0,0,0,0.4)',
                }}
            >
                {/* Owned badge */}
                {isOwned && index === 0 && (
                    <div className="absolute top-4 right-4 z-10 bg-[#D4A017] text-[#1A0F0A] text-xs font-extrabold rounded-full px-3 py-1 font-outfit">✓ OWNED</div>
                )}

                {/* Tier */}
                <div className="absolute top-4 left-4 z-10 text-[11px] font-bold tracking-widest font-outfit" style={{ color: char.accentColor }}>
                    {char.tierLabel}
                </div>

                {/* Character image */}
                <div className="relative h-72 w-full overflow-hidden">
                    <div className="absolute inset-0 z-10 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent 50%, #1A0F0A 100%)' }} />
                    <div className="absolute inset-0 z-10 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 50% 30%, ${RARITY_GLOW[char.rarity]} 0%, transparent 60%)` }} />

                    {/* Subtle blinking swipe cues */}
                    <motion.div
                        animate={{
                            opacity: [0.4, 0.9, 0.4],
                            x: [0, -6, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-4 top-1/3 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-2 bg-red-500/20 backdrop-blur-md border border-red-500/40 px-3 py-1.5 rounded-full shadow-lg"
                    >
                        <span className="text-red-400 text-lg font-bold">←</span>
                        <span className="text-red-400 text-[11px] font-black uppercase tracking-wider font-outfit">Skip</span>
                    </motion.div>

                    <motion.div
                        animate={{
                            opacity: [0.4, 0.9, 0.4],
                            x: [0, 6, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute right-4 top-1/3 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-2 bg-emerald-400/20 backdrop-blur-md border border-emerald-400/40 px-3 py-1.5 rounded-full shadow-lg"
                    >
                        <span className="text-emerald-400 text-[11px] font-black uppercase tracking-wider font-outfit">Buy</span>
                        <span className="text-emerald-400 text-lg font-bold">→</span>
                    </motion.div>

                    <Image src={char.image} alt={char.name} fill className="object-cover object-top" sizes="380px" />
                    <div className="absolute bottom-3 left-5 z-20">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-2xl font-extrabold text-white font-outfit">{char.name}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full font-outfit"
                                style={{ color: char.accentColor, background: `${char.accentColor}22`, border: `1px solid ${char.accentColor}55` }}>
                                {char.rarity}
                            </span>
                        </div>
                        <div className="text-[#E8D5B5]/60 text-sm font-outfit">{char.desc}</div>
                    </div>
                </div>

                {/* Info row */}
                <div className="p-4 pt-3">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-[10px] text-[#E8D5B5]/40 font-outfit mb-0.5">REWARD BOOST</div>
                            <div className="text-xl font-extrabold font-outfit" style={{ color: char.accentColor }}>{char.multiplier}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-[#E8D5B5]/40 font-outfit mb-0.5">BURN TO UNLOCK</div>
                            <div className="text-xl font-extrabold text-[#D4A017] font-outfit">{char.price}</div>
                            <div className="text-[10px] text-[#E8D5B5]/30 font-outfit">COFFY</div>
                        </div>
                    </div>

                    {char.isDAO && (
                        <div className="flex items-center gap-1.5 mb-3 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl px-3 py-1.5">
                            <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
                            <span className="text-[#FFD700] text-xs font-bold font-outfit">Unlocks DAO Membership</span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {index === 0 && (
                            <>
                                <button onClick={() => onSwipe('left')}
                                    className="flex-1 py-2.5 rounded-xl border border-[#E8D5B5]/20 text-[#E8D5B5]/50 font-outfit text-sm hover:border-red-400/40 hover:text-red-400 transition-all flex items-center justify-center gap-1">
                                    <span>←</span><span>Skip</span>
                                </button>
                                <button
                                    onClick={() => onBuy(char)}
                                    disabled={txStatus !== null}
                                    className="flex-[2] py-2.5 rounded-xl font-extrabold text-sm font-outfit transition-all text-[#1A0F0A] shadow-md"
                                    style={{ background: isOwned ? `${char.accentColor}40` : `linear-gradient(135deg, ${char.accentColor}, #A77B06)` }}
                                >
                                    {isOwned ? 'Owned' : !account ? 'Connect Wallet' : affordable ? `Buy ${char.name}` : 'Insufficient COFFY'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function Characters() {
    const [deck, setDeck] = useState([...CHARACTERS].reverse()); // top = last element
    const [gone, setGone] = useState([]);
    const [account, setAccount] = useState(null);
    const [coffyBalance, setCoffyBalance] = useState(null);
    const [ownedChars, setOwnedChars] = useState({});
    const [isDAO, setIsDAO] = useState(false);
    const [multiplier, setMultiplier] = useState(100);
    const [txStatus, setTxStatus] = useState(null);
    const [txError, setTxError] = useState('');
    const [selected, setSelected] = useState(null);

    // deck shown in reverse so CHARACTERS[0] is on top
    const visibleDeck = [...deck].reverse().slice(0, 3); // max 3 visible at once

    const getProvider = useCallback(() => {
        if (typeof window === 'undefined' || !window.ethereum) return null;
        return new ethers.BrowserProvider(window.ethereum);
    }, []);

    const loadUserData = useCallback(async (addr) => {
        const provider = getProvider();
        if (!provider || !addr) return;
        try {
            const core = new ethers.Contract(COFFY_CORE_ADDRESS, COFFY_CORE_ABI, provider);
            const game = new ethers.Contract(GAME_MODULE_ADDRESS, GAME_MODULE_ABI, provider);
            const [bal, mult, dao] = await Promise.all([core.balanceOf(addr), core.getCharacterMultiplier(addr), core.isDAOMember(addr)]);
            setCoffyBalance(bal); setMultiplier(Number(mult)); setIsDAO(dao);
            const owned = {};
            await Promise.all(CHARACTERS.map(async c => { const b = await game.getUserCharacterBalance(addr, c.cid); if (b > 0n) owned[c.cid] = Number(b); }));
            setOwnedChars(owned);
        } catch (e) { console.error('loadUserData:', e); }
    }, [getProvider]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.ethereum) return;
        window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
            if (accounts[0]) { setAccount(accounts[0]); loadUserData(accounts[0]); }
        });
        const handler = (accounts) => { setAccount(accounts[0] || null); if (accounts[0]) loadUserData(accounts[0]); };
        window.ethereum.on('accountsChanged', handler);
        return () => window.ethereum.removeListener('accountsChanged', handler);
    }, [loadUserData]);

    const connectWallet = async () => {
        const provider = getProvider();
        if (!provider) return;
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]); loadUserData(accounts[0]);
    };

    const purchaseCharacter = async (char) => {
        if (!account) { connectWallet(); return; }
        const provider = getProvider();
        if (!provider) return;
        try {
            setTxStatus('buying'); setTxError('');
            const signer = await provider.getSigner();
            const game = new ethers.Contract(GAME_MODULE_ADDRESS, GAME_MODULE_ABI, signer);
            const tx = await game.purchaseCharacter(char.cid, 1);
            await tx.wait();
            setTxStatus('success');
            await loadUserData(account);
            setTimeout(() => setTxStatus(null), 4000);
        } catch (e) {
            const msg = e?.reason || e?.data?.message || e?.message?.slice(0, 100) || 'Transaction failed';
            setTxError(msg); setTxStatus('error');
            setTimeout(() => setTxStatus(null), 5000);
        }
    };

    const canAfford = (char) => { if (!coffyBalance) return false; try { return coffyBalance >= BigInt(char.priceWei); } catch { return false; } };

    const handleSwipe = (direction) => {
        setDeck(prev => {
            if (prev.length === 0) return prev;
            const newDeck = [...prev];
            const removed = newDeck.pop();
            // auto-loop: if deck runs out, silently refill from the bottom
            if (newDeck.length === 0) {
                return [...CHARACTERS].reverse();
            }
            return newDeck;
        });
    };

    const resetDeck = () => { setDeck([...CHARACTERS].reverse()); setGone([]); };

    const currentTop = visibleDeck[0]; // the card being shown on top

    return (
        <section id="characters" className="py-12 bg-gradient-to-b from-[#1A0F0A] via-[#2A1810] to-[#1A0F0A] overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
                    <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#D4A017] mb-3 font-outfit tracking-tight">Choose Your Character</h2>

                    {/* Wallet stats - Compact & Clean */}
                    {account && (
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                            <div className="bg-[#2A1810]/80 border border-[#D4A017]/20 rounded-xl px-4 py-1.5 text-sm font-outfit">
                                <span className="text-[#E8D5B5]/50">Balance: </span>
                                <span className="text-[#D4A017] font-bold">{coffyBalance !== null ? `${formatCoffy(coffyBalance)} COFFY` : '…'}</span>
                            </div>
                            <div className="bg-[#2A1810]/80 border border-[#D4A017]/20 rounded-xl px-4 py-1.5 text-sm font-outfit">
                                <span className="text-[#E8D5B5]/50">Multiplier: </span>
                                <span className="text-[#F4C430] font-bold">{multiplier}%</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="flex flex-col items-center justify-center gap-4 mt-10 md:mt-12 pb-6">

                    {/* Swipe stack */}
                    <div className="flex flex-col items-center gap-4 md:scale-100 lg:scale-105 transition-transform duration-300">
                        {/* Card stack */}
                        <div className="relative" style={{ width: 340, height: 520, touchAction: 'pan-y' }}>
                            <AnimatePresence>
                                {visibleDeck.length > 0 ? visibleDeck.map((char, i) => (
                                    <SwipeCard
                                        key={char.cid}
                                        char={char}
                                        index={i}
                                        total={visibleDeck.length}
                                        onSwipe={handleSwipe}
                                        onBuy={purchaseCharacter}
                                        isOwned={ownedChars[char.cid] > 0}
                                        affordable={canAfford(char)}
                                        account={account}
                                        txStatus={txStatus}
                                    />
                                )) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-3xl border border-[#D4A017]/20"
                                        style={{ background: 'linear-gradient(160deg, #3A2A1E, #1A0F0A)' }}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                            <RotateCcw className="w-8 h-8" />
                                        </div>
                                        <div className="text-white font-bold font-outfit text-xl">All cards reviewed</div>
                                        <div className="text-[#E8D5B5]/50 text-sm font-outfit text-center px-8">You&apos;ve browsed all available character tiers.</div>
                                        <motion.button onClick={resetDeck} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-2.5 px-6 rounded-xl font-outfit text-sm">
                                            <RotateCcw className="w-4 h-4" />
                                            <span>Browse Again</span>
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Progress dots (Bottom) */}
                        <div className="flex gap-2 justify-center mt-4">
                            {CHARACTERS.map((c, i) => {
                                const isGone = gone.some(g => g.cid === c.cid);
                                const isCurrent = currentTop?.cid === c.cid;
                                return (
                                    <div key={c.cid} className="w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                                        style={{ background: isGone ? '#3A2A1E' : isCurrent ? c.accentColor : `${c.accentColor}44`, width: isCurrent ? 24 : 10 }} />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* TX Toast */}
                <AnimatePresence>
                    {txStatus && (
                        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border font-outfit ${txStatus === 'error' ? 'bg-[#2A1810]/95 border-red-500/40 text-red-300' : txStatus === 'success' ? 'bg-[#2A1810]/95 border-[#D4A017]/40 text-[#D4A017]' : 'bg-[#2A1810]/95 border-[#D4A017]/30 text-[#E8D5B5]'}`}>
                                {txStatus === 'buying' && <><div className="w-4 h-4 border-2 border-[#D4A017]/40 border-t-[#D4A017] rounded-full animate-spin" /><span>Purchasing on-chain…</span></>}
                                {txStatus === 'success' && <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="font-bold">Character purchased!</span></>}
                                {txStatus === 'error' && <><AlertCircle className="w-5 h-5 text-red-400" /><span>{txError || 'Transaction failed'}</span></>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
