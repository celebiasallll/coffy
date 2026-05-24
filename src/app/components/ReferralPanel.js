'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Gift, Users, Award, ShieldCheck, Loader2 } from 'lucide-react';
import useWeb3Wallet from './useWeb3Wallet';
import { BASE_CONFIG } from '../config/baseConfig';
import { toast } from 'react-hot-toast';

export default function ReferralPanel() {
  const { userAddress, isConnected, connectWallet } = useWeb3Wallet();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    invites: 0,
    earned: '0.00',
    pending: '0.00'
  });
  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Human-readable ABI for Referral functions in ActivityModule
  const REFERRAL_ABI = [
    "function referralCount(address) view returns (uint256)",
    "function referralBonusEarned(address) view returns (uint256)",
    "function pendingReferralBonus(address) view returns (uint256)",
    "function claimPendingReferral() external"
  ];

  // Fetch Referral Stats from Contract
  const fetchReferralStats = async () => {
    if (!isConnected || !userAddress || typeof window === 'undefined' || !window.ethereum) return;
    
    setIsFetchingStats(true);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        BASE_CONFIG.CONTRACTS.ActivityModule,
        REFERRAL_ABI,
        provider
      );

      const count = await contract.referralCount(userAddress);
      const earned = await contract.referralBonusEarned(userAddress);
      const pending = await contract.pendingReferralBonus(userAddress);

      setStats({
        invites: Number(count),
        earned: parseFloat(ethers.formatEther(earned)).toFixed(2),
        pending: parseFloat(ethers.formatEther(pending)).toFixed(2)
      });
    } catch (error) {
      console.warn("Failed to fetch referral stats:", error);
    } finally {
      setIsFetchingStats(false);
    }
  };

  useEffect(() => {
    if (isConnected && userAddress) {
      fetchReferralStats();
      // Poll every 15 seconds to keep stats updated
      const interval = setInterval(fetchReferralStats, 15000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress]);

  // Generate Referral URL
  const getReferralUrl = () => {
    if (typeof window === 'undefined') return '';
    return `https://coffycoin.xyz?ref=${userAddress}`;
  };

  // Copy referral URL to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getReferralUrl());
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  // Claim Pending Referral Rewards on-chain
  const handleClaim = async () => {
    if (parseFloat(stats.pending) <= 0) {
      toast.error('No pending rewards to claim.');
      return;
    }

    setIsClaiming(true);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        BASE_CONFIG.CONTRACTS.ActivityModule,
        REFERRAL_ABI,
        signer
      );

      toast.loading('Confirming transaction...', { id: 'claimRef' });
      const tx = await contract.claimPendingReferral();
      toast.loading('Claiming your rewards on-chain...', { id: 'claimRef' });
      await tx.wait();
      
      toast.success('Successfully claimed referral rewards!', { id: 'claimRef' });
      fetchReferralStats();
    } catch (error) {
      console.error("Claim failed:", error);
      toast.error(error?.reason || error?.message || 'Transaction failed', { id: 'claimRef' });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <section className="py-10 bg-[#1A0F0A]" id="referral-system">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="glass-card bg-[#3A2A1E]/40 p-6 md:p-8 rounded-xl border border-[#D4A017]/20 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative mesh/radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-[#D4A017]/5 to-transparent pointer-events-none" />

          {/* Heading */}
          <div className="text-center relative z-10 mb-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="inline-flex p-2 rounded-full bg-[#D4A017]/10 text-[#D4A017] mb-3 border border-[#D4A017]/20"
            >
              <Gift className="w-6 h-6" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-[#D4A017] to-[#A77B06] bg-clip-text text-transparent mb-2.5 font-display">
              Referral Program
            </h2>
            <p className="text-[#E8D5B5]/75 text-xs md:text-sm max-w-md mx-auto">
              Invite your friends to Coffy Coin and earn <span className="text-[#D4A017] font-semibold">2% lifetime rewards</span> when they staking or interact on-chain.
            </p>
          </div>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Share Link Container */}
                  <div className="bg-[#1A0F0A]/60 p-3 rounded-xl border border-[#D4A017]/15">
                    <label className="block text-[11px] font-semibold text-[#D4A017] uppercase tracking-wider mb-1.5">
                      Your Unique Referral Link
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-[#120B07] px-4 py-3 rounded-lg border border-[#D4A017]/10 flex items-center overflow-hidden">
                        <code className="text-[#E8D5B5] font-mono text-xs sm:text-sm truncate select-all w-full">
                          {getReferralUrl()}
                        </code>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopy}
                        className="px-6 py-3 rounded-lg gradient-gold hover:gradient-gold-vibrant text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
                      >
                        <Copy className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Copy Link'}
                      </motion.button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Stat Card 1: Invites */}
                    <div className="bg-[#1A0F0A]/40 p-5 rounded-xl border border-[#D4A017]/10 text-center flex flex-col items-center">
                      <Users className="w-6 h-6 text-[#D4A017] mb-2" />
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {isFetchingStats ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#D4A017]" />
                        ) : (
                          stats.invites
                        )}
                      </span>
                      <span className="text-xs text-[#E8D5B5]/60 mt-1 uppercase tracking-wider">Total Friends Invited</span>
                    </div>

                    {/* Stat Card 2: Earned */}
                    <div className="bg-[#1A0F0A]/40 p-5 rounded-xl border border-[#D4A017]/10 text-center flex flex-col items-center">
                      <Award className="w-6 h-6 text-green-500 mb-2" />
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {isFetchingStats ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-green-500" />
                        ) : (
                          `${stats.earned} COFFY`
                        )}
                      </span>
                      <span className="text-xs text-[#E8D5B5]/60 mt-1 uppercase tracking-wider">Lifetime Earnings</span>
                    </div>

                    {/* Stat Card 3: Pending */}
                    <div className="bg-[#1A0F0A]/40 p-5 rounded-xl border border-[#D4A017]/10 text-center flex flex-col items-center relative overflow-hidden">
                      <ShieldCheck className="w-6 h-6 text-[#D4A017] mb-2" />
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {isFetchingStats ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#D4A017]" />
                        ) : (
                          `${stats.pending} COFFY`
                        )}
                      </span>
                      <span className="text-xs text-[#E8D5B5]/60 mt-1 uppercase tracking-wider">Pending Claimable</span>
                    </div>
                  </div>

                  {/* Claim Button Area */}
                  {parseFloat(stats.pending) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center pt-2"
                    >
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm tracking-wide uppercase shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all duration-300 flex items-center gap-2"
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          'Claim Referral Rewards'
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-6"
                >
                  <p className="text-[#E8D5B5]/60 text-sm mb-6 max-w-sm mx-auto">
                    To participate in the Referral Program and generate your personal invite link, please connect your Web3 wallet first.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={connectWallet}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4A017] to-[#A77B06] hover:from-[#E4B027] hover:to-[#B78B16] text-white font-bold text-sm uppercase tracking-wide shadow-lg transition-all duration-300"
                  >
                    Connect Wallet
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
