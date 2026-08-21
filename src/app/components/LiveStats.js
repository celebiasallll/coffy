'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Users, Coins, ShieldCheck, Zap, ExternalLink } from 'lucide-react';
import { BASE_CONFIG } from '../config/baseConfig';

export default function LiveStats() {
    const [stats, setStats] = useState({
        totalSupply: 15000000000,
        communityPoolBalance: 5249989253,
        distributedTokens: 10747,
        holderCount: 6,
        targetHolders: 10000,
    });
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsClient(true);
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                if (res.ok) {
                    const json = await res.json();
                    if (json?.data) {
                        setStats(json.data);
                    }
                }
            } catch (err) {
                console.warn('Live stats fetch warning:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toLocaleString();
    };

    if (!isClient) return null;

    return (
        <section className="relative z-10 -mt-6 sm:-mt-8 mb-8">
            <motion.div
                initial={{ opacity: 0, y: -15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl mx-auto px-4 sm:px-6"
            >
                <div className="bg-[#180E09]/95 border border-amber-500/25 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden">
                    {/* Header: Verified On-Chain Network Bar */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-black/50 border-b border-amber-500/15">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                                Verified On-Chain Metrics
                            </span>
                        </div>
                        <a
                            href={`https://basescan.org/token/${BASE_CONFIG.CONTRACTS.CoffyCore}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors font-mono"
                        >
                            <span>BaseScan Verified</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-amber-500/10 py-1">
                        {/* Pioneer Holders */}
                        <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                <Users className="w-4 h-4" />
                            </div>
                            <span className="text-lg sm:text-xl font-black tracking-tight text-white font-mono">
                                {stats.holderCount} <span className="text-xs text-[#E8D5B5]/60 font-normal">/ {formatNumber(stats.targetHolders)}</span>
                            </span>
                            <span className="text-[10px] text-[#E8D5B5]/60 font-semibold uppercase tracking-wider">
                                Pioneer Holders
                            </span>
                        </div>

                        {/* Community Pool Remaining */}
                        <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                <Coins className="w-4 h-4" />
                            </div>
                            <span className="text-lg sm:text-xl font-black tracking-tight text-amber-400 font-mono">
                                {formatNumber(stats.communityPoolBalance)}
                            </span>
                            <span className="text-[10px] text-[#E8D5B5]/60 font-semibold uppercase tracking-wider">
                                Community Treasury
                            </span>
                        </div>

                        {/* Total Fixed Supply */}
                        <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-lg sm:text-xl font-black tracking-tight text-white font-mono">
                                {formatNumber(stats.totalSupply)}
                            </span>
                            <span className="text-[10px] text-[#E8D5B5]/60 font-semibold uppercase tracking-wider">
                                Fixed Total Supply
                            </span>
                        </div>

                        {/* Network Gas Efficiency */}
                        <div className="flex flex-col items-center gap-1 px-4 py-3 text-center">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                                <Zap className="w-4 h-4 text-yellow-400" />
                            </div>
                            <span className="text-lg sm:text-xl font-black tracking-tight text-emerald-400 font-mono">
                                $0.005
                            </span>
                            <span className="text-[10px] text-[#E8D5B5]/60 font-semibold uppercase tracking-wider">
                                Avg. L2 Gas Fee
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
