'use client';

import { motion } from 'framer-motion';
import { BASE_CONFIG } from '../config/baseConfig';
import { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, PlusCircle } from 'lucide-react';
import useWeb3Wallet from './useWeb3Wallet';
import Image from 'next/image';

export default function ContractInfo() {
  const [copied, setCopied] = useState(false);
  const contractAddress = BASE_CONFIG.CONTRACTS.CoffyCore; // Base Mainnet
  const { addTokenToMetaMask } = useWeb3Wallet();

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <section className="py-14 bg-[#140C08]" id="contract-info">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-[#24150D]/80 p-6 md:p-8 rounded-2xl shadow-2xl border border-amber-500/25 backdrop-blur-md relative overflow-hidden"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 font-outfit tracking-tight">
              Official Contract Info
            </h2>
            <p className="text-[#E8D5B5]/70 text-xs md:text-sm mt-1">
              Verified ERC-20 Token on Base Mainnet Layer 2
            </p>
          </div>

          {/* Contract Address Box */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                CoffyCore Contract (Base)
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified
              </span>
            </div>

            <div className="flex items-center bg-[#100905] p-3 rounded-xl border border-amber-500/20 shadow-inner">
              <code className="text-[#E8D5B5] flex-1 font-mono text-xs sm:text-sm overflow-x-auto select-all pr-2">
                {contractAddress}
              </code>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => copyToClipboard(contractAddress)}
                className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* 1-Click Add to MetaMask with Logo */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addTokenToMetaMask}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-amber-950">
                <Image src="/images/coffy-logo.png" alt="COFFY" width={16} height={16} className="w-full h-full object-cover" />
              </div>
              <span>Add to Wallet</span>
            </motion.button>

            {/* View on BaseScan */}
            <motion.a
              href={`https://basescan.org/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 bg-[#180E09] hover:bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all"
            >
              <span>View on BaseScan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.a>

            {/* Trade on Uniswap */}
            <motion.a
              href={`https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=${contractAddress}&chain=base`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 bg-[#180E09] hover:bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all"
            >
              <span>Trade Uniswap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}