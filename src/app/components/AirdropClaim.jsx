'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Flame, Zap, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BASE_CONFIG, ACTIVITY_MODULE_ABI } from '../config/baseConfig';
import useWeb3Wallet from './useWeb3Wallet';

// Unique profile ID generator for initial on-chain onboarding
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function AirdropClaim() {
    const { userAddress, isConnected, connectWallet } = useWeb3Wallet();
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimStatusText, setClaimStatusText] = useState('');
    const [hasClaimed, setHasClaimed] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [rewardFormatted, setRewardFormatted] = useState('10,000');

    // Fetch dynamic airdrop parameters and lifetime claim status from backend
    useEffect(() => {
        const fetchConfigAndStatus = async () => {
            try {
                const url = userAddress 
                    ? `/api/airdrop-claim?address=${encodeURIComponent(userAddress)}`
                    : '/api/airdrop-claim';
                
                const res = await fetch(url);
                const json = await res.json();
                if (json?.success && json?.data) {
                    if (json.data.formattedAmount) {
                        setRewardFormatted(json.data.formattedAmount);
                    }
                    if (userAddress && json.data.hasClaimed) {
                        setHasClaimed(true);
                    }
                }
            } catch (err) {
                console.warn('Could not fetch dynamic airdrop status:', err);
            }
        };

        fetchConfigAndStatus();
    }, [userAddress]);

    const handleClaim = async () => {
        if (!isConnected) {
            connectWallet();
            return;
        }

        setIsClaiming(true);
        setErrorMessage('');
        setTxHash('');

        try {
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);

            // Step 0: Ensure User is on Base Mainnet (Chain ID: 8453)
            const network = await provider.getNetwork();
            if (network.chainId !== 8453n && Number(network.chainId) !== 8453) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }],
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }],
                        });
                    } else {
                        throw new Error('Please switch your wallet to Base Mainnet to claim your airdrop.');
                    }
                }
            }

            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                BASE_CONFIG.CONTRACTS.ActivityModule,
                ACTIVITY_MODULE_ABI,
                signer
            );

            // Step 1: Check if wallet has linked an on-chain profile
            setClaimStatusText('Checking Pioneer status...');
            const existingProfile = await contract.userProfiles(userAddress).catch(() => '');

            if (!existingProfile || existingProfile === '') {
                setClaimStatusText('Activating Pioneer Pass (Step 1/2)...');
                toast.loading('Activating Pioneer Pass on Base...', { id: 'airdrop-toast' });

                const profileId = generateUUID();
                const storedReferrer = (typeof window !== 'undefined' && localStorage.getItem('coffy_referrer')) 
                    ? localStorage.getItem('coffy_referrer') 
                    : ethers.ZeroAddress;

                const initTx = await contract.linkUserProfile(profileId, storedReferrer, { gasLimit: 250000 });
                await initTx.wait();
                toast.success('Pioneer Pass Activated! Claiming tokens...', { id: 'airdrop-toast' });
            }

            // Step 2: Request verified EIP-712 signature from backend Oracle
            setClaimStatusText('Verifying eligibility & generating signature...');
            const response = await fetch('/api/airdrop-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress })
            });

            let jsonResponse;
            try {
                jsonResponse = await response.json();
            } catch (e) {
                throw new Error('Server returned an unexpected response. Please try again.');
            }

            if (!response.ok || !jsonResponse?.success) {
                throw new Error(jsonResponse?.error || 'Airdrop eligibility check failed.');
            }

            const { steps, payout, deadline, signature } = jsonResponse.data;

            // Step 3: Execute claimStepReward on-chain transaction
            setClaimStatusText('Please confirm transaction in your wallet...');
            toast.loading(`Claiming ${rewardFormatted} $COFFY from Community Pool...`, { id: 'airdrop-toast' });

            const tx = await contract.claimStepReward(steps, payout, deadline, signature, {
                gasLimit: 500000
            });

            setClaimStatusText('Waiting for Base block confirmation...');
            const receipt = await tx.wait();

            if (!receipt || receipt.status !== 1) {
                throw new Error('Transaction failed or reverted on Base network.');
            }

            // ONLY show BaseScan link and mark claimed after block confirmation
            setTxHash(tx.hash);

            // Step 4: Confirm transaction receipt to permanently record claim in DB
            try {
                await fetch('/api/airdrop-claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userAddress,
                        txHash: tx.hash,
                        action: 'confirm'
                    })
                });
            } catch (confirmErr) {
                console.warn('Backend confirmation sync notice:', confirmErr);
            }

            toast.success(`🎉 Success! ${rewardFormatted} $COFFY deposited into your wallet!`, { id: 'airdrop-toast', duration: 7000 });
            setHasClaimed(true);
        } catch (err) {
            console.error('Airdrop Claim Execution Error:', err);
            setTxHash(''); // Clear any unconfirmed hash
            const raw = err?.reason || err?.message || 'Transaction failed.';
            let friendly = 'An error occurred during airdrop claim. Please try again.';

            if (raw.includes('Unauthorized')) {
                friendly = 'Airdrop is temporarily paused by administrator.';
            } else if (raw.includes('Expired')) {
                friendly = 'Signature expired. Please click claim again.';
            } else if (raw.includes('InvalidAmount')) {
                friendly = 'Invalid claim parameters. Please refresh the page.';
            } else if (raw.includes('WalletTooNew')) {
                friendly = 'Account initialized. Please click claim once more to receive tokens!';
            } else if (raw.includes('MinBalanceRequired')) {
                friendly = 'Minimum balance requirement is not met.';
            } else if (raw.includes('SignatureUsed')) {
                friendly = 'This airdrop signature has already been processed.';
            } else if (raw.includes('DailyLimitReached') || raw.includes('WeeklyLimitReached')) {
                friendly = 'Daily or weekly reward limit reached for this period.';
            } else if (raw.includes('user rejected') || raw.includes('ACTION_REJECTED')) {
                friendly = 'Transaction was cancelled in your wallet.';
            } else if (err.message && !err.message.includes('0x')) {
                friendly = err.message;
            }

            setErrorMessage(friendly);
            toast.error(friendly, { id: 'airdrop-toast' });
        } finally {
            setIsClaiming(false);
            setClaimStatusText('');
        }
    };

    return (
        <section id="airdrop" className="relative py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-20">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-600/15 to-yellow-500/10 rounded-3xl blur-2xl -z-10" />

            <div className="relative bg-[#1f120c]/90 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md overflow-hidden">
                {/* Decorative Lights */}
                <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 transform -translate-x-8 translate-y-8 w-44 h-44 bg-orange-600/20 rounded-full blur-3xl" />

                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                    {/* Left: Headline & Benefits */}
                    <div className="space-y-4 max-w-2xl text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs sm:text-sm font-semibold">
                            <Sparkles className="w-4 h-4 animate-pulse text-amber-400" />
                            <span>GENESIS COMMUNITY AIRDROP</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                            Claim Free <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">{rewardFormatted} $COFFY</span>
                        </h2>

                        <p className="text-[#E8D5B5]/80 text-sm sm:text-base leading-relaxed">
                            Welcome to the Coffy ecosystem on Base Mainnet! Connect your wallet to instantly receive your Genesis Airdrop directly from the 5.25 Billion Community Pool. No minimum balance required, zero lockups.
                        </p>

                        {/* Feature Badges */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 text-xs font-medium text-[#E8D5B5]/90">
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <ShieldCheck className="w-4 h-4 text-green-400" />
                                <span>Zero Min Balance</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span>5.25B Community Pool</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span>Base Mainnet L2</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Claim Action Card */}
                    <div className="w-full lg:w-auto flex flex-col items-center">
                        <div className="w-full sm:w-80 bg-black/50 border border-amber-500/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
                                <Gift className="w-8 h-8 text-white" />
                            </div>

                            <span className="text-xs text-[#E8D5B5]/60 uppercase tracking-wider font-semibold">Reward Allocation</span>
                            <span className="text-3xl font-black text-amber-400 font-mono my-1">{rewardFormatted} COFFY</span>
                            <span className="text-xs text-green-400 font-medium mb-5">Instant On-Chain Transfer</span>

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
                                    onClick={handleClaim}
                                    disabled={isClaiming}
                                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm sm:text-base tracking-wide transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isClaiming ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                                            <span className="text-xs sm:text-sm font-bold">{claimStatusText || 'Processing...'}</span>
                                        </>
                                    ) : !isConnected ? (
                                        <>
                                            <span>Connect Wallet &amp; Claim</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Claim {rewardFormatted} $COFFY</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {errorMessage && (
                                <div className="flex items-center gap-1.5 text-xs text-red-400 mt-3 text-left">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{errorMessage}</span>
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
