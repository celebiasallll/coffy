'use client';

import { useState, useEffect } from 'react';
import { BASE_CONFIG } from '../config/baseConfig';
import { motion, AnimatePresence } from 'framer-motion';
import useWeb3Wallet from './useWeb3Wallet';

export default function Migration() {
  const { 
    connectWallet, 
    userAddress, 
    isConnected,
    checkMigrationEligibility,
    migrateTokens 
  } = useWeb3Wallet();

  const [migrationStatus, setMigrationStatus] = useState({
    canMigrate: false,
    oldBalance: '0',
    migrationEnabled: false,
    isLoading: true
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isConnected && userAddress) {
      checkMigrationData();
    } else {
      setMigrationStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [isConnected, userAddress]);

  const checkMigrationData = async () => {
    setMigrationStatus(prev => ({ ...prev, isLoading: true }));
    try {
      const status = await checkMigrationEligibility();
      setMigrationStatus({ ...status, isLoading: false });
    } catch (error) {
      console.error("Migration check failed:", error);
      setMigrationStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleMigration = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    if (!migrationStatus.canMigrate || parseFloat(migrationStatus.oldBalance) <= 0) {
      alert("No tokens available for migration");
      return;
    }

    setIsMigrating(true);
    try {
      const success = await migrateTokens();
      if (success) {
        await checkMigrationData(); // Refresh status
        alert(`✅ Successfully migrated ${migrationStatus.oldBalance} COFFY tokens!`);
      }
    } catch (error) {
      console.error("Migration failed:", error);
      if (
        (error?.reason && error.reason.includes("Already migrated")) ||
        (error?.message && error.message.includes("Already migrated"))
      ) {
        alert("You have already migrated your tokens.");
      } else {
        alert("❌ Migration failed: " + (error?.reason || error?.message || "Unknown error"));
      }
    } finally {
      setIsMigrating(false);
    }
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  // Don't show if no old tokens to migrate
  if (!migrationStatus.isLoading && 
      (!migrationStatus.canMigrate || parseFloat(migrationStatus.oldBalance) <= 0)) {
    return null;
  }

  return (
    <section id="migration" className="py-12 bg-gradient-to-b from-[#2A1810] to-[#1A0F0A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06] mb-4">
            Token Migration V1 → V2
          </h2>
          <p className="text-[#E8D5B5] text-sm opacity-90 max-w-2xl mx-auto">
            Migrate your old COFFY tokens to the new V2 contract with enhanced security and anti-Sybil protection
          </p>
        </motion.div>

        {/* Migration Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-[#2A1810] to-[#1A0F0A] rounded-2xl border border-[#D4A017]/20 p-6 shadow-xl"
        >
          
          {/* Loading State */}
          {migrationStatus.isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-[#E8D5B5] text-sm">Checking migration status...</p>
            </div>
          ) : (
            <>
              {/* Migration Visual */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* V1 Token */}
                <motion.div 
                  className="flex flex-col items-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <i className="fas fa-coins text-white text-xl"></i>
                  </div>
                  <p className="text-red-400 text-xs font-semibold">V1 Old</p>
                  <p className="text-white text-sm font-bold">{formatBalance(migrationStatus.oldBalance)}</p>
                </motion.div>

                {/* Arrow */}
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[#D4A017] text-2xl"
                >
                  <i className="fas fa-arrow-right"></i>
                </motion.div>

                {/* V2 Token */}
                <motion.div 
                  className="flex flex-col items-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#D4A017] to-[#A77B06] rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <i className="fas fa-shield-alt text-white text-xl"></i>
                  </div>
                  <p className="text-[#D4A017] text-xs font-semibold">V2 New</p>
                  <p className="text-white text-sm font-bold">Secure</p>
                </motion.div>
              </div>

              {/* Migration Button */}
              <div className="text-center mb-6">
                {!isConnected ? (
                  <motion.button
                    onClick={connectWallet}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-[#D4A017]/50 transition-all duration-300 flex items-center gap-3 mx-auto"
                  >
                    <i className="fas fa-wallet"></i>
                    Connect Wallet to Migrate
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleMigration}
                    disabled={isMigrating || !migrationStatus.canMigrate || parseFloat(migrationStatus.oldBalance) <= 0}
                    whileHover={{ scale: isMigrating ? 1 : 1.05 }}
                    whileTap={{ scale: isMigrating ? 1 : 0.95 }}
                    className={`font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 flex items-center gap-3 mx-auto ${
                      isMigrating 
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                        : migrationStatus.canMigrate && parseFloat(migrationStatus.oldBalance) > 0
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-green-500/50'
                          : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {isMigrating ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Migrating Tokens...
                      </>
                    ) : migrationStatus.canMigrate && parseFloat(migrationStatus.oldBalance) > 0 ? (
                      <>
                        <i className="fas fa-exchange-alt"></i>
                        Migrate {formatBalance(migrationStatus.oldBalance)} COFFY
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times-circle"></i>
                        No Tokens to Migrate
                      </>
                    )}
                  </motion.button>
                )}
              </div>

              {/* Details Toggle */}
              <div className="text-center">
                <motion.button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-[#D4A017] hover:text-[#A77B06] text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.05 }}
                >
                  <span>Migration Details</span>
                  <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'} transition-transform duration-300`}></i>
                </motion.button>
              </div>

              {/* Details Panel */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 space-y-4"
                  >
                    {/* Contract Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-[#1A0F0A]/50 rounded-lg p-4 border border-red-500/30">
                        <h4 className="text-red-400 font-semibold text-sm mb-2">Old V1 Contract</h4>
                        <p className="text-white text-xs font-mono break-all">{BASE_CONFIG.CONTRACTS.MigrationV1}</p>
                      </div>
                      <div className="bg-[#1A0F0A]/50 rounded-lg p-4 border border-green-500/30">
                        <h4 className="text-green-400 font-semibold text-sm mb-2">New V2 Contract</h4>
                        <p className="text-white text-xs font-mono break-all">{BASE_CONFIG.CONTRACTS.MigrationV2}</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-[#1A0F0A]/50 rounded-lg p-4 border border-[#D4A017]/30">
                      <h4 className="text-[#D4A017] font-semibold text-sm mb-3">V2 Contract Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-shield-alt text-green-400"></i>
                          <span className="text-[#E8D5B5]">Anti-Sybil Protection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-lock text-green-400"></i>
                          <span className="text-[#E8D5B5]">Enhanced Security</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-vote-yea text-green-400"></i>
                          <span className="text-[#E8D5B5]">DAO Governance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-clock text-green-400"></i>
                          <span className="text-[#E8D5B5]">Rate Limiting</span>
                        </div>
                      </div>
                    </div>

                    {/* Migration Info */}
                    <div className="bg-[#1A0F0A]/50 rounded-lg p-4 border border-blue-500/30">
                      <h4 className="text-blue-400 font-semibold text-sm mb-2">Migration Information</h4>
                      <div className="space-y-1 text-xs text-[#E8D5B5]">
                        <p>• Migration ratio: 1:1 (1 old COFFY = 1 new COFFY)</p>
                        <p>• Process is irreversible</p>
                        <p>• Gas fees apply for the transaction</p>
                        <p>• Migration contract: 0xfFe8666c1120Bbf58f6fD4A6B6F4d02A94C88AA3</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
} 