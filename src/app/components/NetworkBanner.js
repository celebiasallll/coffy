'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function NetworkBanner() {
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setWrongNetwork(chainId !== '0x2105' && chainId !== '0x2105n');
        } catch {
          // ignore
        }
      }
    };

    checkNetwork();
    window.ethereum?.on('chainChanged', checkNetwork);

    return () => {
      window.ethereum?.removeListener('chainChanged', checkNetwork);
    };
  }, []);

  const switchToBase = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org/']
            }]
          });
        } catch (addError) {
          console.error('Failed to add Base network:', addError);
        }
      } else {
        console.error('Failed to switch network:', switchError);
      }
    }
  };

  return (
    <AnimatePresence>
      {wrongNetwork && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 left-0 right-0 bg-[#0052FF] text-white py-2.5 px-4 text-center z-[100] shadow-xl flex items-center justify-center gap-3 text-xs sm:text-sm font-medium"
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Please switch your wallet network to Base Mainnet</span>
          </div>
          <button
            onClick={switchToBase}
            className="inline-flex items-center gap-1 bg-white text-[#0052FF] px-3.5 py-1 rounded-full text-xs font-bold hover:bg-white/90 transition shadow-sm"
          >
            <span>Switch Network</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
