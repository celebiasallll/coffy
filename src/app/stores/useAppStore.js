import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set, get) => ({
      // Portfolio state
      portfolio: {
        balance: 0,
        stakedAmount: 0,
        ownedCharacters: [],
        nftCount: 0,
        totalValue: 0,
        rewards: 0
      },

      // Wallet state
      wallet: {
        address: null,
        isConnected: false,
        chainId: null,
        networkName: null
      },

      // UI state
      ui: {
        theme: 'dark',
        notifications: [],
        confetti: false,
        loading: false,
        sidebarOpen: false
      },

      // Game stats
      gameStats: {
        gamesPlayed: 0,
        highScore: 0,
        totalRewards: 0,
        charactersUnlocked: 0
      },

      // Actions
      updatePortfolio: (updates) => set((state) => ({
        portfolio: { ...state.portfolio, ...updates }
      })),

      updateWalletConnection: (walletData) => set((state) => ({
        wallet: { ...state.wallet, ...walletData }
      })),

      updateOwnedCharacters: (characters) => set((state) => ({
        portfolio: { 
          ...state.portfolio, 
          ownedCharacters: characters,
          nftCount: characters.length 
        }
      })),

      updateGameStats: (stats) => set((state) => ({
        gameStats: { ...state.gameStats, ...stats }
      })),

      // Notification system
      addNotification: (notification) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              id: Date.now() + Math.random(),
              timestamp: Date.now(),
              ...notification
            }
          ]
        }
      })),

      removeNotification: (id) => set((state) => ({
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== id)
        }
      })),

      clearNotifications: () => set((state) => ({
        ui: { ...state.ui, notifications: [] }
      })),

      // Confetti control
      triggerConfetti: () => set((state) => ({
        ui: { ...state.ui, confetti: true }
      })),

      stopConfetti: () => set((state) => ({
        ui: { ...state.ui, confetti: false }
      })),

      // Loading states
      setLoading: (loading) => set((state) => ({
        ui: { ...state.ui, loading }
      })),

      // Theme control
      toggleTheme: () => set((state) => ({
        ui: { 
          ...state.ui, 
          theme: state.ui.theme === 'dark' ? 'light' : 'dark' 
        }
      })),

      // Sidebar control
      toggleSidebar: () => set((state) => ({
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
      })),

      // Reset functions
      resetPortfolio: () => set((state) => ({
        portfolio: {
          balance: 0,
          stakedAmount: 0,
          ownedCharacters: [],
          nftCount: 0,
          totalValue: 0,
          rewards: 0
        }
      })),

      resetGameStats: () => set((state) => ({
        gameStats: {
          gamesPlayed: 0,
          highScore: 0,
          totalRewards: 0,
          charactersUnlocked: 0
        }
      })),

      // Computed getters
      getTotalPortfolioValue: () => {
        const state = get();
        return state.portfolio.balance + state.portfolio.stakedAmount + state.portfolio.totalValue;
      },

      getNotificationCount: () => {
        const state = get();
        return state.ui.notifications.length;
      },

      getOwnedCharacterCount: () => {
        const state = get();
        return state.portfolio.ownedCharacters.length;
      },

      // Utility functions
      formatBalance: (amount) => {
        if (amount >= 1000000) {
          return (amount / 1000000).toFixed(2) + 'M';
        } else if (amount >= 1000) {
          return (amount / 1000).toFixed(2) + 'K';
        }
        return amount.toFixed(2);
      },

      formatAddress: (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
      },

      // Bulk updates
      updateUserData: (userData) => set((state) => ({
        portfolio: { ...state.portfolio, ...userData.portfolio },
        wallet: { ...state.wallet, ...userData.wallet },
        gameStats: { ...state.gameStats, ...userData.gameStats }
      })),

      // Character management
      addCharacter: (characterId) => set((state) => {
        const newCharacters = [...state.portfolio.ownedCharacters, characterId];
        return {
          portfolio: {
            ...state.portfolio,
            ownedCharacters: newCharacters,
            nftCount: newCharacters.length
          }
        };
      }),

      removeCharacter: (characterId) => set((state) => {
        const newCharacters = state.portfolio.ownedCharacters.filter(id => id !== characterId);
        return {
          portfolio: {
            ...state.portfolio,
            ownedCharacters: newCharacters,
            nftCount: newCharacters.length
          }
        };
      }),

      // Staking functions
      stake: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          balance: state.portfolio.balance - amount,
          stakedAmount: state.portfolio.stakedAmount + amount
        }
      })),

      unstake: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          balance: state.portfolio.balance + amount,
          stakedAmount: state.portfolio.stakedAmount - amount
        }
      })),

      // Rewards functions
      addRewards: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          rewards: state.portfolio.rewards + amount,
          balance: state.portfolio.balance + amount
        }
      })),

      claimRewards: () => set((state) => ({
        portfolio: {
          ...state.portfolio,
          balance: state.portfolio.balance + state.portfolio.rewards,
          rewards: 0
        }
      }))
    }),
    {
      name: 'coffy-app-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Fallback for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        };
      }),
      partialize: (state) => ({
        portfolio: state.portfolio,
        wallet: {
          address: state.wallet.address,
          isConnected: state.wallet.isConnected
        },
        gameStats: state.gameStats,
        ui: {
          theme: state.ui.theme
        }
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.ui && !Array.isArray(state.ui.notifications)) {
          state.ui.notifications = [];
        }
      }
    }
  )
);

export default useAppStore; 