'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Users, Coins, Activity, TrendingUp } from 'lucide-react';

const BASE_STATS = {
    players: 4821,
    coffyDistributed: 8430000,
    activeSessions: 312,
    tokenPrice: 0.0041,
};

function useCounter(target, duration = 2000) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

function StatItem({ icon: Icon, label, value, suffix = '', delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="flex flex-col items-center gap-1.5 px-4 py-3 relative"
        >
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-white font-mono">
                {value}{suffix}
            </span>
            <span className="text-[11px] text-[#E8D5B5]/60 font-medium text-center uppercase tracking-wider">
                {label}
            </span>
        </motion.div>
    );
}

export default function LiveStats() {
    const players = useCounter(BASE_STATS.players);
    const coffy = useCounter(BASE_STATS.coffyDistributed);
    const sessions = useCounter(BASE_STATS.activeSessions);
    const [isClient, setIsClient] = useState(false);
    const [livePrice, setLivePrice] = useState(BASE_STATS.tokenPrice);

    useEffect(() => {
        setIsClient(true);
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data.tokenPrice) setLivePrice(data.tokenPrice);
                }
            } catch {
                // Fallback to BASE_STATS quietly
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatCoffy = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
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
                <div className="bg-[#180E09]/90 border border-amber-500/25 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-2 bg-black/40 border-b border-amber-500/15">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">Live Network Metrics</span>
                        </div>
                        <span className="text-[10px] text-[#E8D5B5]/40 font-mono">Base Mainnet (8453)</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-amber-500/10">
                        <StatItem
                            icon={Users}
                            label="Total Players"
                            value={players.toLocaleString()}
                            delay={0}
                        />
                        <StatItem
                            icon={Coins}
                            label="COFFY Distributed"
                            value={formatCoffy(coffy)}
                            suffix=" COFFY"
                            delay={0.1}
                        />
                        <StatItem
                            icon={Activity}
                            label="Active Sessions"
                            value={sessions.toLocaleString()}
                            delay={0.2}
                        />
                        <StatItem
                            icon={TrendingUp}
                            label="Token Index"
                            value={`$${livePrice}`}
                            delay={0.3}
                        />
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
