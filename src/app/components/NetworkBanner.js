'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkBanner() {
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setWrongNetwork(chainId !== '0x2105'); // Base Mainnet chainId
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
        params: [{ chainId: '0x2105' }], // Base Mainnet
      });
    } catch (switchError) {
      // Chain not added, try adding it
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
          className="fixed top-0 left-0 right-0 bg-[#0052FF] text-white py-2 px-4 text-center z-50 shadow-lg"
        >
          <p className="inline-block mr-4 font-semibold">⚠️ Please switch to Base Mainnet</p>
          <button
            onClick={switchToBase}
            className="bg-white text-[#0052FF] px-4 py-1 rounded-full text-sm font-bold hover:bg-opacity-90 transition"
          >
            Switch to Base
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
