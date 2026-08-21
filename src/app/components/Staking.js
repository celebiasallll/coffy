'use client';

import { useState, useEffect } from 'react';
import { BASE_CONFIG, ACTIVITY_MODULE_ABI, COFFY_CORE_ABI } from '../config/baseConfig';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import useWeb3Wallet from './useWeb3Wallet';
import { FaWallet, FaLock, FaGift, FaChartLine, FaClock, FaCoins, FaPlus, FaMinus, FaInfoCircle, FaExclamationTriangle, FaUsers } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

console.log('Ethers library loaded in Staking:', typeof ethers !== 'undefined');

// Format helper
function formatNumberShort(val) {
  if (!val) return '0';
  let num = parseFloat(val.toString().replace(/[^\d.\-]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper function to extract numeric value from formatted strings like "8.1 COFFY"
function getNumericValue(val) {
  if (!val) return 0;
  const num = parseFloat(val.toString().replace(/[^\d.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Helper to format integer with thousands separator
function formatInteger(val) {
  if (!val) return '0';
  let num = parseFloat(val.toString().replace(/[^\d.\-]/g, ''));
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString();
}

// Helper to format balance for display: <1 ise küsuratlı, >=1 ise tam sayı ve binlik ayraçlı
function formatBalanceDisplay(val) {
  if (!val) return '0.00';
  let num = parseFloat(val.toString().replace(/[^\d.\-]/g, ''));
  if (isNaN(num)) return '0.00';
  if (num < 1 && num > 0) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to format percentage
function formatPercent(numerator, denominator) {
  if (!denominator || isNaN(denominator) || denominator === 0) return '';
  const percent = (parseFloat(numerator) / parseFloat(denominator)) * 100;
  if (isNaN(percent)) return '';
  return percent.toFixed(2) + '%';
}

// Yeni ABI (kısa, sadece staking ve balance için)
const STAKING_ABI = ACTIVITY_MODULE_ABI;
const STAKING_ADDRESS = BASE_CONFIG.CONTRACTS.ActivityModule;

// Sabit APY
const FIXED_APY = 5.00;

export default function Staking({ id }) {
  const { connectWallet, userAddress, tokenContract, isConnecting, connectionError } = useWeb3Wallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [status, setStatus] = useState('Please connect your wallet to stake');
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [stakedBalance, setStakedBalance] = useState('0.00');
  const [rewards, setRewards] = useState('0.00');
  const [totalStaked, setTotalStaked] = useState('0 COFFY');
  const [stakeStartTime, setStakeStartTime] = useState(null);
  const [canUnstake, setCanUnstake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalSupply, setTotalSupply] = useState('0 COFFY');
  const [stakeData, setStakeData] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [apy, setApy] = useState('0');

  // Add state for alert and confirm modals
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirmAction, setOnConfirmAction] = useState(null);

  // TODO: Replace window.confirm logic with ConfirmModal
  // TODO: Replace alert logic with AlertModal

  useEffect(() => {
    if (tokenContract && userAddress) {
      updateStakeInfo();
      // Auto-refresh every 30 seconds
      const interval = setInterval(updateStakeInfo, 30000);
      return () => clearInterval(interval);
    }
    if (connectionError) {
      setStatus(connectionError);
    }
  }, [tokenContract, userAddress, connectionError]);

  // --- Balance'ı periyodik güncelle (her 15 saniye) ---
  useEffect(() => {
    if (!tokenContract || !userAddress) return;
    const interval = setInterval(() => {
      updateStakeInfo();
    }, 15000); // 15 saniye
    return () => clearInterval(interval);
  }, [tokenContract, userAddress]);

  // Token contract fallback (her zaman güncel ABI ile oluştur)
  async function getStakingContract() {
    if (tokenContract && tokenContract.stake) return tokenContract;
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
    }
    return null;
  }

  const updateStakeInfo = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum || !userAddress) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);
      const coreTokenContract = new ethers.Contract(BASE_CONFIG.CONTRACTS.CoffyCore, COFFY_CORE_ABI, provider);

      // Fetch wallet balance directly from token contract
      const balance = await coreTokenContract.balanceOf(userAddress);
      setWalletBalance(ethers.formatUnits(balance, 18));

      // Fetch stake info and activity pending rewards
      const stakeInfo = await stakingContract.getStakeInfo(userAddress);
      let activityPending = 0n;
      try {
        activityPending = await stakingContract.getUserPending(userAddress);
      } catch (e) {
        console.warn("getUserPending not supported or failed", e);
      }

      const stakedAmountValue = stakeInfo[0] || 0n;
      const stakingRewardValue = stakeInfo[2] || 0n;
      const totalPendingReward = stakingRewardValue + activityPending;

      setStakedBalance(ethers.formatUnits(stakedAmountValue, 18));
      setRewards(ethers.formatUnits(totalPendingReward, 18));
      setStakeData(stakeInfo);

      // Fetch global stats
      let totalStakedAmount = 0n;
      let totalSupplyAmount = 0n;

      try {
        totalStakedAmount = await stakingContract.totalStaked();
      } catch (err) { console.error('Error fetching totalStaked:', err); }

      try {
        totalSupplyAmount = await coreTokenContract.totalSupply();
      } catch (err) { console.error('Error fetching totalSupply:', err); }

      setTotalSupply(`${ethers.formatUnits(totalSupplyAmount, 18)} COFFY`);
      setTotalStaked(`${ethers.formatUnits(totalStakedAmount, 18)} COFFY`);

      // Fetch Dynamic APY
      try {
        const apyRaw = await stakingContract.getStakingAPY(userAddress);
        const apyFormatted = (Number(apyRaw) / 100).toFixed(2);
        setApy(apyFormatted);
      } catch (err) { console.error('Error fetching APY:', err); }

      // Lock/unlock logic — use already-fetched stakeInfo values
      const stakedAmountNum = parseFloat(ethers.formatUnits(stakedAmountValue, 18));
      const startTime = stakeInfo[1] ? Number(stakeInfo[1]) : 0;
      if (stakedAmountNum > 0 && startTime > 0) {
        const currentTime = Math.floor(Date.now() / 1000);
        const lockPeriod = 7 * 24 * 60 * 60; // 7 days
        setStakeStartTime(startTime);
        setCanUnstake(currentTime >= startTime + lockPeriod);
      } else {
        setCanUnstake(false);
        setStakeStartTime(null);
      }

      setStatus('');
    } catch (error) {
      console.error('Error updating stake info:', error);
      setStatus('Error updating data from blockchain');
    }
  };

  // ✅ Helper function for time remaining
  const formatTimeRemaining = () => {
    if (!stakeData?.startTime) return '---';

    const currentTimeForDisplay = Math.floor(Date.now() / 1000);
    const stakeStartTime = Number(stakeData.startTime || 0);
    const lockPeriod = 7 * 24 * 60 * 60; // 7 days
    const unlockTime = stakeStartTime + lockPeriod;
    const timeRemaining = unlockTime - currentTimeForDisplay;

    if (timeRemaining <= 0) return 'Unlocked';

    const days = Math.floor(timeRemaining / (24 * 60 * 60));
    const hours = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  // ✅ Handle all transactions (stake, unstake, claim)
  const handleTransaction = async (action, amount = null) => {
    if (!tokenContract || !userAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    setError(null);

    if (action !== 'claim' && (!amount || isNaN(amount) || parseFloat(amount) <= 0)) {
      setError('Please enter a valid amount');
      setIsLoading(false);
      return false;
    }

    try {
      let tx;
      const contract = await getStakingContract();
      if (!contract) throw new Error('Staking contract not available');
      switch (action) {
        case 'stake':
          tx = await contract.stake(ethers.parseUnits(amount, 18));
          break;
        case 'unstake':
          const currentStakeInfo = await contract.getStakeInfo(userAddress);
          const currentStaked = currentStakeInfo[0] || 0n;
          const currentStartTime = Number(currentStakeInfo.startTime || currentStakeInfo[1] || 0);
          const nowTs = Math.floor(Date.now() / 1000);
          const lockDuration = 7 * 24 * 60 * 60; // 7 days
          const isEarly = nowTs < (currentStartTime + lockDuration);

          const unstakeAmountWei = ethers.parseUnits(amount, 18);

          if (isEarly) {
            const daysLeft = Math.ceil((currentStartTime + lockDuration - nowTs) / (24 * 60 * 60));
            return new Promise((resolve) => {
              setConfirmModal({
                open: true,
                message: `Early Unstake Notice\n\nYour tokens are locked for ${daysLeft} more days.\nEarly unstaking executes an emergency unstake on your entire balance with a 5% penalty.\n\nAre you sure you want to proceed?`,
                onConfirm: async () => {
                  setConfirmModal({ open: false, message: '', onConfirm: null });
                  try {
                    tx = await contract.emergencyUnstake();
                    await tx.wait();
                    await updateStakeInfo();
                    setStakeAmount('');
                    setIsLoading(false);
                    toast.success('Emergency unstake completed successfully!');
                    resolve(true);
                  } catch (error) {
                    console.error(`emergencyUnstake error:`, error);
                    setError(error.message || `emergency unstake failed`);
                    setIsLoading(false);
                    resolve(false);
                  }
                }
              });
            });
          }

          // If lock is passed:
          if (unstakeAmountWei >= currentStaked) {
            tx = await contract.unstake();
          } else {
            tx = await contract.partialUnstake(unstakeAmountWei);
          }
          break;

        case 'emergency_unstake':
          console.log('Emergency unstaking all tokens...');
          const userStakeData = await contract.stakes(userAddress);
          const totalUserStaked = userStakeData.amount || userStakeData[0] || 0n;

          if (!totalUserStaked || totalUserStaked.toString() === '0') {
            setError('No tokens staked for emergency unstake');
            throw new Error('No tokens staked for emergency unstake');
          }
          toast('Emergency Unstake: %5 penalty will be burned, remaining sent to your wallet.', { duration: 4000 });
          tx = await contract.emergencyUnstake();
          break;

        case 'claim':
          console.log('Claiming staking rewards...');
          tx = await contract.claimStakingReward();
          break;

        default:
          throw new Error('Invalid operation');
      }

      console.log('Transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Status update with transaction hash
      showTransactionStatus(tx.hash);

      // Refresh data after transaction
      await updateStakeInfo();
      setStakeAmount(''); // Clear input after successful transaction

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error(`${action} error:`, error);
      setError(error.message || `${action} failed`);
      setIsLoading(false);
      return false;
    }
  };

  // ✅ Stake tokens
  const stakeTokens = async () => {
    return await handleTransaction('stake', stakeAmount);
  };

  // ✅ Unstake tokens
  const unstakeTokens = async () => {
    if (!tokenContract || !userAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getStakingContract();
      console.log('DEBUG: contract instance:', contract);
      console.log('DEBUG: typeof contract.unstake:', typeof contract?.unstake);
      console.log('DEBUG: typeof contract.partialUnstake:', typeof contract?.partialUnstake);
      console.log('DEBUG: contract fonksiyonları:', Object.keys(contract || {}));
      if (!contract) throw new Error('Staking contract not available');
      let tx;
      // 7 gün dolmadan çekilirse emergencyUnstake
      if (!canUnstake) {
        const remainingDays = Math.ceil((stakeStartTime + 7 * 24 * 60 * 60 - Math.floor(Date.now() / 1000)) / (24 * 60 * 60));
        const inputAmount = parseFloat(stakedBalance); // Only allows total unstake early
        const netAmount = inputAmount * 0.95;

        setConfirmModal({
          open: true,
          message: `Early Unstake Notice\n\nYou are withdrawing before the 7-day lock period ends (${remainingDays} days remaining).\nEarly unstaking will result in a 5% penalty.\n\nStaked: ${inputAmount} COFFY\nNet Amount To Receive: ${netAmount.toFixed(6)} COFFY\n\nDo you want to continue?`,
          onConfirm: async () => {
            setConfirmModal({ open: false, message: '', onConfirm: null });
            toast('You are withdrawing before the 7-day lock period. A 5% penalty will be applied (Emergency Unstake).', { duration: 6000 });
            console.log('DEBUG: Calling contract.emergencyUnstake()');
            try {
              tx = await contract.emergencyUnstake();
              const receipt = await tx.wait();
              showTransactionStatus(tx.hash);
              await updateStakeInfo();
              setStakeAmount('');
              setIsLoading(false);
              return true;
            } catch (error) {
              setError(error.message || 'unstake failed');
              setIsLoading(false);
              console.error('DEBUG: unstakeTokens error:', error);
              return false;
            }
          }
        });
        setIsLoading(false);
        return;
      } else if (!stakeAmount || isNaN(stakeAmount) || parseFloat(stakeAmount) === 0) {
        // 7 gün dolduysa ve input boşsa: tümünü çek
        console.log('DEBUG: Calling contract.unstake()');
        tx = await contract.unstake();
      } else {
        // 7 gün dolduysa ve miktar girildiyse: kısmi çek
        console.log('DEBUG: Calling contract.partialUnstake with', stakeAmount);
        tx = await contract.partialUnstake(ethers.parseUnits(stakeAmount, 18));
      }
      const receipt = await tx.wait();
      showTransactionStatus(tx.hash);
      await updateStakeInfo();
      setStakeAmount('');
      setIsLoading(false);
      return true;
    } catch (error) {
      setError(error.message || 'unstake failed');
      setIsLoading(false);
      console.error('DEBUG: unstakeTokens error:', error);
      return false;
    }
  };

  // ✅ Claim rewards
  const claimRewards = async () => {
    if (!tokenContract || !userAddress) {
      toast.error('Please connect your wallet first');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getStakingContract();
      if (!contract) throw new Error('Staking contract not available');
      const tx = await contract.claimStakingReward();
      const receipt = await tx.wait();
      showTransactionStatus(tx.hash);
      await updateStakeInfo();
      setIsLoading(false);
      return true;
    } catch (error) {
      setError(error.message || 'claim failed');
      setIsLoading(false);
      return false;
    }
  };

  const showTransactionStatus = (hash) => {
    const explorerUrl = `https://basescan.org/tx/${hash}`;
    setStatus(
      <div className="transaction-status">
        Transaction confirmed!
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
          View on BaseScan
        </a>
      </div>
    );
    setTimeout(() => setStatus(''), 10000);
  };

  // Parse total supply and total staked as numbers for percentage calculation
  const totalSupplyNum = parseFloat((totalSupply || '').toString().replace(/[^\d.\-]/g, ''));
  const totalStakedNum = parseFloat((totalStaked || '').toString().replace(/[^\d.\-]/g, ''));
  const walletBalanceNum = parseFloat((walletBalance || '').toString().replace(/[^\d.\-]/g, '')) || 0;
  const stakedBalanceNum = parseFloat((stakedBalance || '').toString().replace(/[^\d.\-]/g, '')) || 0;
  const rewardsNum = parseFloat((rewards || '').toString().replace(/[^\d.\-]/g, '')) || 0;
  const totalCoffy = walletBalanceNum + stakedBalanceNum + rewardsNum;

  return (
    <section id={id} className="relative py-10 md:py-20 bg-gradient-to-b from-[#1A0F0A] to-[#3A2A1E] min-h-[60vh] scroll-mt-24 overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 0% 0%, rgba(212,160,23,0.15) 0%, transparent 70%)',
              'radial-gradient(circle at 100% 100%, rgba(212,160,23,0.15) 0%, transparent 70%)',
              'radial-gradient(circle at 0% 0%, rgba(212,160,23,0.15) 0%, transparent 70%)'
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-[url('/images/coffee-beans-pattern.png')] opacity-[0.08] animate-slide"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#3A2A1E]/60 via-transparent to-[#2A1810]/60"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] via-[#F4C430] to-[#D4A017]">
            Stake COFFY
          </h2>
          <p className="text-lg text-[#E8D5B5] max-w-2xl mx-auto">
            Stake your COFFY tokens and earn rewards. <b>Dynamic APY (based on total staked & character multiplier)</b> with enhanced security features.
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-[#D4A017] to-[#A77B06] mx-auto mt-4"></div>
        </motion.div>

        {/* Stake formu ve içerik */}
        <div className="max-w-5xl mx-auto relative">
          {/* Modalı burada, kartın üstünde ve local olarak render et */}
          <ConfirmModal
            open={confirmModal.open}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
            local={true}
          />
          <AlertModal open={alertOpen} message={alertMessage} onClose={() => setAlertOpen(false)} />
          <ConfirmModal open={confirmOpen} message={confirmMessage} onConfirm={() => { if (onConfirmAction) onConfirmAction(); setConfirmOpen(false); }} onCancel={() => setConfirmOpen(false)} />
          {!userAddress ? (
            // Wallet bağlı değilse Connect Wallet göster
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#3A2A1E] to-[#2A1810] p-8 rounded-2xl shadow-xl border border-[#BFA181]/40 backdrop-blur-sm text-center"
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-[#D4A017]/20 rounded-full flex items-center justify-center">
                  <FaWallet className="text-[#D4A017] text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-[#D4A017] mb-2">Connect Your Wallet</h3>
                <p className="text-[#E8D5B5] mb-6">
                  Connect your wallet to start staking COFFY tokens and earn dynamic APY rewards
                </p>
              </div>

              {/* Preview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20">
                  <FaChartLine className="text-[#D4A017] text-xl mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-1">APY</p>
                  <p className="text-lg font-bold text-white">Dynamic</p>
                </div>
                <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20">
                  <FaClock className="text-[#D4A017] text-xl mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-1">Lock Period</p>
                  <p className="text-lg font-bold text-white">7 Days</p>
                </div>
                <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20">
                  <FaCoins className="text-[#D4A017] text-xl mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-1">No Min Stake</p>
                  <p className="text-lg font-bold text-white">None</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(212,160,23,0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaWallet className="inline mr-2" />
                    Connect Wallet
                  </>
                )}
              </motion.button>

              {connectionError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm mt-4"
                >
                  {connectionError}
                </motion.p>
              )}
            </motion.div>
          ) : (
            // Wallet bağlıysa normal staking interface
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-[#3A2A1E] to-[#2A1810] p-6 rounded-2xl shadow-xl border border-[#BFA181]/40 backdrop-blur-sm"
                style={{ fontSize: '0.95rem' }}
              >
                {/* Total Staked Global Stats */}
                <div className="bg-[#3A2A1E]/60 rounded-xl p-4 border border-[#BFA181]/40 mb-4 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    initial={{ opacity: 0.12 }}
                    animate={{ opacity: [0.12, 0.22, 0.12] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ background: 'radial-gradient(circle at 70% 30%, #D4A017 0%, transparent 70%)' }}
                  />
                  <div className="flex items-center justify-center gap-2 mb-1 relative z-10">
                    <i className="fas fa-users text-[#D4A017] text-base"></i>
                    <span className="text-[#D4A017] text-xs font-semibold">Total Staked</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-0.5 relative z-10">{formatNumberShort(totalStaked)} COFFY</div>
                  <div className="text-xs text-gray-400 relative z-10">Locked in V2 staking</div>
                </div>

                {/* Yeni: Toplam Arz, Aylık APY, Wallet Adresi */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 place-items-center">
                  <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20 flex flex-col items-center w-full max-w-xs">
                    <FaCoins className="text-[#D4A017] text-xl mb-1" />
                    <span className="text-xs text-gray-400">Total Supply</span>
                    <span className="text-lg font-bold text-white">{totalSupply}</span>
                  </div>
                  <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20 flex flex-col items-center w-full max-w-xs">
                    <FaChartLine className="text-[#D4A017] text-xl mb-1" />
                    <span className="text-xs text-gray-400">Current APY</span>
                    <span className="text-lg font-bold text-white">{apy}%</span>
                  </div>
                  <div className="bg-[#2A1810]/60 p-4 rounded-lg border border-[#BFA181]/20 flex flex-col items-center w-full max-w-xs">
                    <FaWallet className="text-[#D4A017] text-xl mb-1" />
                    <span className="text-xs text-gray-400">Your Address</span>
                    <span className="text-lg font-bold text-white">{userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : '-'}</span>
                  </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  {/* Your Balance */}
                  <motion.div
                    whileHover={{ scale: 1.07, y: -4, boxShadow: `0 8px 32px rgba(212,160,23,0.18)` }}
                    className={`bg-[#3A2A1E]/80 p-2 rounded-lg border border-[#D4A017]/20 hover:border-[#D4A017]/50 transition-all duration-300 flex flex-col justify-center items-center min-h-[90px] h-full relative overflow-hidden`}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.18 }}
                      style={{ background: `radial-gradient(circle at 60% 20%, #D4A017 0%, transparent 70%)` }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="flex items-center gap-1 mb-1 justify-center z-10 relative">
                      <i className="fas fa-wallet text-[#D4A017] text-base"></i>
                      <p className="text-[#D4A017]/80 text-xs font-medium">Your Balance</p>
                    </div>
                    <p className="text-white font-bold text-base z-10 relative">
                      {Number(walletBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </motion.div>
                  {/* Your Staked */}
                  <motion.div
                    whileHover={{ scale: 1.07, y: -4, boxShadow: `0 8px 32px rgba(212,160,23,0.18)` }}
                    className={`bg-[#3A2A1E]/80 p-2 rounded-lg border border-[#D4A017]/20 hover:border-[#D4A017]/50 transition-all duration-300 flex flex-col justify-center items-center min-h-[90px] h-full relative overflow-hidden`}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.18 }}
                      style={{ background: `radial-gradient(circle at 60% 20%, #D4A017 0%, transparent 70%)` }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="flex items-center gap-1 mb-1 justify-center z-10 relative">
                      <i className="fas fa-lock text-[#D4A017] text-base"></i>
                      <p className="text-[#D4A017]/80 text-xs font-medium">Your Staked</p>
                    </div>
                    <p className="text-white font-bold text-base z-10 relative">
                      {Number(stakedBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    {/* Stake başlangıç zamanı küçük yazı */}
                    {stakeData && stakeData[1] ? (
                      <span className="text-[10px] text-gray-400 mt-1">Start: {new Date(Number(stakeData[1]) * 1000).toLocaleString()}</span>
                    ) : null}
                  </motion.div>
                  {/* Pending Rewards */}
                  <motion.div
                    whileHover={{ scale: 1.07, y: -4, boxShadow: `0 8px 32px rgba(212,160,23,0.18)` }}
                    className={`bg-[#3A2A1E]/80 p-2 rounded-lg border border-[#D4A017]/20 hover:border-[#D4A017]/50 transition-all duration-300 flex flex-col justify-center items-center min-h-[90px] h-full relative overflow-hidden`}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.18 }}
                      style={{ background: `radial-gradient(circle at 60% 20%, #D4A017 0%, transparent 70%)` }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="flex items-center gap-1 mb-1 justify-center z-10 relative">
                      <i className="fas fa-gift text-[#D4A017] text-base"></i>
                      <p className="text-[#D4A017]/80 text-xs font-medium">Pending Rewards</p>
                    </div>
                    <p className="text-white font-bold text-base z-10 relative">
                      {formatBalanceDisplay(rewards)}
                    </p>
                  </motion.div>
                  {/* Your Total */}
                  <motion.div
                    whileHover={{ scale: 1.07, y: -4, boxShadow: `0 8px 32px rgba(212,160,23,0.18)` }}
                    className={`bg-[#3A2A1E]/80 p-2 rounded-lg border border-[#D4A017]/20 hover:border-[#D4A017]/50 transition-all duration-300 flex flex-col justify-center items-center min-h-[90px] h-full relative overflow-hidden`}
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none rounded-lg"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.18 }}
                      style={{ background: `radial-gradient(circle at 60% 20%, #D4A017 0%, transparent 70%)` }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="flex items-center gap-1 mb-1 justify-center z-10 relative">
                      <i className="fas fa-coins text-[#D4A017] text-base"></i>
                      <p className="text-[#D4A017]/80 text-xs font-medium">Your Total</p>
                    </div>
                    <p className="text-white font-bold text-base z-10 relative">
                      {(parseFloat(walletBalance) + parseFloat(stakedBalance) + parseFloat(rewards)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </motion.div>
                </div>

                {/* Lock Period Warning */}
                {stakeStartTime && !canUnstake && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-lg p-3 mb-4"
                    style={{ fontSize: '0.92rem' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <i className="fas fa-clock text-orange-400 text-base"></i>
                      <span className="text-orange-300 font-semibold">
                        Lock Period: {formatTimeRemaining()} remaining
                      </span>
                    </div>
                    <p className="text-xs text-gray-300">7-day security lock prevents unstaking without penalty.</p>
                  </motion.div>
                )}

                {/* Enhanced Input Section with Quick Actions */}
                <div className="bg-[#3A2A1E]/60 rounded-xl p-4 mb-4 border border-[#BFA181]/40">
                  <label className="block text-[#D4A017] text-xs font-semibold mb-2">
                    <i className="fas fa-coins mr-1"></i>
                    Stake/Unstake Amount
                  </label>

                  {/* Manual Input */}
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="Enter COFFY amount"
                    className="w-full p-3 rounded-lg bg-[#2A1810] text-[#E8D5B5] text-base border border-[#BFA181]/40 focus:border-[#D4A017] focus:outline-none transition-all duration-200 mb-3"
                  />

                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Available: {formatNumberShort(walletBalance)}</span>
                  </div>
                  <div className="text-xs text-yellow-400 mb-2">
                    Leave the input empty or enter 0 to withdraw all staked tokens.
                  </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: "0 6px 18px rgba(212,160,23,0.25)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={stakeTokens}
                    disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                    className="py-3 px-4 rounded-lg bg-gradient-to-r from-[#BFA181] to-[#A77B06] text-white font-bold text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    <span>Stake {stakeAmount ? `${parseFloat(stakeAmount).toFixed(2)}` : ''} COFFY</span>
                  </motion.button>

                  {/* Unstake/Emergency Unstake butonu */}
                  {(!canUnstake) ? (
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 6px 18px rgba(212,160,23,0.25)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        setIsLoading(true);
                        setError(null);
                        try {
                          const contract = await getStakingContract();
                          if (!contract) throw new Error('Staking contract not available');
                          await contract.emergencyUnstake();
                          await updateStakeInfo();
                          setStakeAmount('');
                        } catch (error) {
                          setError(error.message || 'emergencyUnstake failed');
                        }
                        setIsLoading(false);
                      }}
                      disabled={isLoading}
                      className="py-3 px-4 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Emergency Unstake (Penalty)</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 6px 18px rgba(212,160,23,0.25)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        setIsLoading(true);
                        setError(null);
                        try {
                          const contract = await getStakingContract();
                          if (!contract) throw new Error('Staking contract not available');
                          if (!stakeAmount || isNaN(stakeAmount) || parseFloat(stakeAmount) === 0) {
                            // input boşsa tümünü unstake
                            await contract.unstake();
                          } else {
                            // input doluysa kısmi unstake
                            await contract.partialUnstake(ethers.parseUnits(stakeAmount, 18));
                          }
                          await updateStakeInfo();
                          setStakeAmount('');
                        } catch (error) {
                          setError(error.message || 'unstake failed');
                        }
                        setIsLoading(false);
                      }}
                      disabled={isLoading}
                      className="py-3 px-4 rounded-lg bg-gradient-to-r from-[#BFA181] to-[#A77B06] text-white font-bold text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-unlock"></i>
                      <span>Unstake</span>
                    </motion.button>
                  )}
                </div>

                {/* Additional Info */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-400">
                    <i className="fas fa-shield-alt mr-1"></i>
                    Dynamic APY (character multiplier) • 7-Day Lock Period • V2 Smart Contract
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isLoading && !confirmModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-16 h-16 border-4 border-[#D4A017] border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-gradient-to-r from-[#A77B06] to-[#8B6914] text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .animate-slide {
          animation: slide 60s linear infinite;
        }
        @keyframes slide {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-50%, -50%); }
        }
      `}</style>
    </section>
  );
}