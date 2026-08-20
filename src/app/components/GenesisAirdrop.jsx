'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Flame, Zap, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BASE_CONFIG, ACTIVITY_MODULE_ABI } from '../config/baseConfig';
import useWeb3Wallet from './useWeb3Wallet';

// Helper: UUID generator for unique on-chain profile ID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function GenesisAirdrop() {
    const { userAddress, isConnected, connectWallet } = useWeb3Wallet();
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStepText, setClaimStepText] = useState('');
    const [hasClaimed, setHasClaimed] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [dailyClaimedAmount, setDailyClaimedAmount] = useState('0');

    // Check if user already claimed today
    useEffect(() => {
        const checkClaimStatus = async () => {
            if (!isConnected || !userAddress) return;
            try {
                const { ethers } = await import('ethers');
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(
                    BASE_CONFIG.CONTRACTS.ActivityModule,
                    ACTIVITY_MODULE_ABI,
                    provider
                );
                const currentDay = Math.floor(Date.now() / 1000 / 86400);
                const claimedWei = await contract.dailyStepClaimed(userAddress, currentDay).catch(() => 0n);
                
                if (claimedWei > 0n) {
                    setHasClaimed(true);
                    setDailyClaimedAmount(ethers.formatUnits(claimedWei, 18));
                } else {
                    setHasClaimed(false);
                }
            } catch (err) {
                console.warn('Check claim status error:', err);
            }
        };

        checkClaimStatus();
    }, [isConnected, userAddress]);

    const handleClaimAirdrop = async () => {
        if (!isConnected) {
            connectWallet();
            return;
        }

        setIsClaiming(true);
        setErrorMsg('');
        setTxHash('');

        try {
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                BASE_CONFIG.CONTRACTS.ActivityModule,
                ACTIVITY_MODULE_ABI,
                signer
            );

            // Step 1: Check if wallet has initialized on-chain profile
            setClaimStepText('Verifying wallet status...');
            const existingProfile = await contract.userProfiles(userAddress).catch(() => '');

            if (!existingProfile || existingProfile === '') {
                setClaimStepText('Initializing Genesis Account (Step 1/2)...');
                toast.loading('Initializing Genesis Account on Base...', { id: 'airdrop-tx' });

                const profileId = generateUUID();
                const storedReferrer = (typeof window !== 'undefined' && localStorage.getItem('coffy_referrer')) 
                    ? localStorage.getItem('coffy_referrer') 
                    : ethers.ZeroAddress;

                const initTx = await contract.linkUserProfile(profileId, storedReferrer);
                await initTx.wait();
                toast.success('Genesis Account Initialized! Claiming reward...', { id: 'airdrop-tx' });
            }

            // Step 2: Request EIP-712 signed payload from backend
            setClaimStepText('Generating cryptographic signature...');
            const AIRDROP_AMOUNT = 10000; // 10,000 COFFY
            const res = await fetch('/api/activity-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: userAddress,
                    amount: AIRDROP_AMOUNT,
                    activityType: 'step',
                    steps: 1000
                })
            });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                throw new Error('API server returned an invalid response. Please try again in a few moments.');
            }

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to generate airdrop signature.');
            }

            const { steps, payout, deadline, signature } = data.data;

            // Step 3: Execute on-chain claimStepReward transaction
            setClaimStepText('Confirming 10,000 COFFY claim...');
            toast.loading('Claiming 10,000 COFFY from Community Pool...', { id: 'airdrop-tx' });
            
            const claimTx = await contract.claimStepReward(steps, payout, deadline, signature);
            setTxHash(claimTx.hash);
            
            await claimTx.wait();
            toast.success('🎉 Success! 10,000 COFFY deposited directly to your wallet!', { id: 'airdrop-tx', duration: 6000 });
            
            setHasClaimed(true);
            setDailyClaimedAmount('10000');
        } catch (err) {
            console.error('Airdrop Claim Error:', err);
            const rawMsg = err?.reason || err?.message || 'Transaction failed.';
            let friendlyError = 'An error occurred during airdrop claim.';
            
            if (rawMsg.includes('DailyLimitReached') || rawMsg.includes('WeeklyLimitReached')) {
                friendlyError = 'Daily or weekly reward limit reached. Please check back tomorrow!';
            } else if (rawMsg.includes('SignatureUsed')) {
                friendlyError = 'This airdrop signature has already been used.';
            } else if (rawMsg.includes('user rejected') || rawMsg.includes('ACTION_REJECTED')) {
                friendlyError = 'Transaction was rejected by user in wallet.';
            } else if (rawMsg.includes('WalletTooNew')) {
                friendlyError = 'Wallet initialized. Please click claim once more to receive tokens!';
            }

            setErrorMsg(friendlyError);
            toast.error(friendlyError, { id: 'airdrop-tx' });
        } finally {
            setIsClaiming(false);
            setClaimStepText('');
        }
    };

    return (
        <section id="airdrop" className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-20">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-600/15 to-yellow-500/10 rounded-3xl blur-2xl -z-10" />

            <div className="relative bg-[#1f120c]/90 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
                {/* Decorative Badges & Lights */}
                <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 transform -translate-x-6 translate-y-6 w-40 h-40 bg-orange-600/20 rounded-full blur-3xl" />

                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                    {/* Left: Info & Description */}
                    <div className="space-y-4 max-w-2xl text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs sm:text-sm font-semibold">
                            <Sparkles className="w-4 h-4 animate-pulse text-amber-400" />
                            <span>SEASON 1: GENESIS PUBLIC AIRDROP</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                            Claim Your Free <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">10,000 $COFFY</span>
                        </h2>

                        <p className="text-[#E8D5B5]/80 text-sm sm:text-base leading-relaxed">
                            Welcome to the Coffy ecosystem on Base Mainnet! Connect your wallet to instantly claim your free starter airdrop directly from the 5.25 Billion Community Pool. No minimum balance required, zero lockups.
                        </p>

                        {/* Feature Badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs font-medium text-[#E8D5B5]/90">
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <ShieldCheck className="w-4 h-4 text-green-400" />
                                <span>0 Min Balance (Free)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span>5.25B Community Pool</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span>Base Mainnet On-Chain</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Action Box */}
                    <div className="w-full lg:w-auto flex flex-col items-center">
                        <div className="w-full sm:w-80 bg-black/50 border border-amber-500/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
                                <Gift className="w-8 h-8 text-white" />
                            </div>

                            <span className="text-xs text-[#E8D5B5]/60 uppercase tracking-wider font-semibold">Reward Allocation</span>
                            <span className="text-3xl font-black text-amber-400 font-mono my-1">10,000 COFFY</span>
                            <span className="text-xs text-green-400 font-medium mb-5">Instant Direct On-Chain Claim</span>

                            {hasClaimed ? (
                                <div className="w-full space-y-3">
                                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span>Airdrop Claimed!</span>
                                    </div>
                                    <a
                                        href="#staking"
                                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-md"
                                    >
                                        <span>Stake with 50% APY</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={handleClaimAirdrop}
                                    disabled={isClaiming}
                                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm sm:text-base tracking-wide transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isClaiming ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                                            <span className="text-xs sm:text-sm font-bold">{claimStepText || 'Processing...'}</span>
                                        </>
                                    ) : !isConnected ? (
                                        <>
                                            <span>Connect Wallet &amp; Claim</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Claim 10,000 COFFY</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {errorMsg && (
                                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-3 text-left">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {txHash && (
                                <a
                                    href={`https://basescan.org/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-amber-400/80 hover:text-amber-300 underline mt-3 truncate max-w-full"
                                >
                                    View on BaseScan ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
