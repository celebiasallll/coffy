'use client';

import { useState, useEffect } from 'react';
import { BASE_CONFIG, COFFY_CORE_ABI } from '../config/baseConfig';
import { toast } from 'react-hot-toast';
import useAppStore from '../stores/useAppStore';

export default function useWeb3Wallet() {
  const [userAddress, setUserAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenContract, setTokenContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [network, setNetwork] = useState(null);

  // Zustand store integration
  const { updateWalletConnection, addNotification, updatePortfolio } = useAppStore();

  // Token configuration - BASE MAINNET
  const TOKEN_CONFIG = {
    address: BASE_CONFIG.CONTRACTS.CoffyCore,
    decimals: 18,
    symbol: 'COFFY',
    name: 'Coffy Coin'
  };

  // Güncel COFFY Token ABI
  const COFFY_TOKEN_ABI = COFFY_CORE_ABI;

  // Format balance
  const formatBalance = (value) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  // Check connection on load and set up global listeners
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.log('Connection check failed:', error);
        }
      }
    };

    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length > 0) {
          const address = accounts[0];
          setUserAddress(address);
          setIsConnected(true);

          try {
            // Sync new network
            const networkInfo = await getNetwork();
            setNetwork(networkInfo);

            // Sync new balance
            const tokenBalance = await getTokenBalance(address);
            setBalance(tokenBalance);

            // Setup new contract instance with updated signer
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(TOKEN_CONFIG.address, COFFY_TOKEN_ABI, signer);
            setTokenContract(contract);

            // Update Zustand store
            updateWalletConnection({
              address: address,
              isConnected: true,
              chainId: networkInfo?.chainId
            });

            updatePortfolio({
              balance: parseFloat(tokenBalance)
            });
          } catch (err) {
            console.error('Error syncing switched account:', err);
          }
        } else {
          // Clean up state if disconnected
          setUserAddress(null);
          setIsConnected(false);
          setTokenContract(null);
          setBalance('0');
          setNetwork(null);
          updateWalletConnection({
            address: null,
            isConnected: false,
            chainId: null
          });
          updatePortfolio({
            balance: 0
          });
        }
      };

      const handleChainChanged = () => {
        console.log('Chain changed, reloading...');
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Get network info - BASE MAINNET
  const getNetwork = async () => {
    if (!window.ethereum) return null;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const networks = {
        '0x2105': { name: 'Base Mainnet', chainId: 8453 },
        '0x1': { name: 'Ethereum', chainId: 1 }
      };
      return networks[chainId] || { name: 'Unknown', chainId: parseInt(chainId, 16) };
    } catch (error) {
      console.log('Network detection failed:', error);
      return null;
    }
  };

  // Get token balance
  const getTokenBalance = async (address) => {
    if (!window.ethereum || !address) return '0';

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);

      const tokenABI = [
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "event Transfer(address indexed from, address indexed to, uint256 value)"
      ];

      const contract = new ethers.Contract(TOKEN_CONFIG.address, tokenABI, provider);
      const balance = await contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.log('Balance check failed:', error);
      return '0';
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      const errorMessage = 'MetaMask not detected. Please install MetaMask.';
      addNotification({
        type: 'error',
        title: 'Wallet Not Found',
        message: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }

    setIsLoading(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setUserAddress(address);
        setIsConnected(true);

        // Get network info
        const networkInfo = await getNetwork();
        setNetwork(networkInfo);

        // Get token balance
        const tokenBalance = await getTokenBalance(address);
        setBalance(tokenBalance);

        // Setup contract
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Use the full ABI provided by the user for all staking and balance functions
        const contract = new ethers.Contract(TOKEN_CONFIG.address, COFFY_TOKEN_ABI, signer);
        setTokenContract(contract);

        // Update store
        updateWalletConnection({
          address: address,
          isConnected: true,
          chainId: networkInfo?.chainId
        });

        updatePortfolio({
          balance: parseFloat(tokenBalance)
        });

        // Success notification
        addNotification({
          type: 'success',
          title: 'Wallet Connected',
          message: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`
        });

        return true;
      }
    } catch (error) {
      console.log('Connection failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setUserAddress(null);
    setIsConnected(false);
    setTokenContract(null);
    setBalance('0');
    setNetwork(null);
    updateWalletConnection({
      address: null,
      isConnected: false,
      chainId: null
    });
    updatePortfolio({
      balance: 0
    });
    addNotification({
      type: 'success',
      title: 'Wallet Disconnected',
      message: 'You have been disconnected from your wallet.'
    });
  };

  // Switch to Base function
  const switchToBase = async () => {
    if (!window.ethereum) {
      const errorMessage = 'MetaMask not detected. Please install MetaMask.';
      addNotification({
        type: 'error',
        title: 'Wallet Not Found',
        message: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }

    setIsLoading(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setUserAddress(address);
        setIsConnected(true);

        // Get network info
        const networkInfo = await getNetwork();
        setNetwork(networkInfo);

        // Get token balance
        const tokenBalance = await getTokenBalance(address);
        setBalance(tokenBalance);

        // Setup contract
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Use the full ABI provided by the user for all staking and balance functions
        const contract = new ethers.Contract(TOKEN_CONFIG.address, COFFY_TOKEN_ABI, signer);
        setTokenContract(contract);

        // Update store
        updateWalletConnection({
          address: address,
          isConnected: true,
          chainId: networkInfo?.chainId
        });

        updatePortfolio({
          balance: parseFloat(tokenBalance)
        });

        // Success notification
        addNotification({
          type: 'success',
          title: 'Wallet Connected',
          message: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`
        });

        return true;
      }
    } catch (error) {
      console.log('Connection failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh balance function
  const refreshBalance = async () => {
    if (!userAddress) return;

    try {
      const tokenBalance = await getTokenBalance(userAddress);
      setBalance(tokenBalance);
      updatePortfolio({
        balance: parseFloat(tokenBalance)
      });
    } catch (error) {
      console.log('Balance refresh failed:', error);
    }
  };

  return {
    userAddress,
    isConnected,
    isLoading,
    tokenContract,
    balance: formatBalance(balance),
    rawBalance: balance,
    network,
    connectWallet,
    disconnectWallet,
    switchToBase,
    refreshBalance,
    TOKEN_CONFIG
  };
}