import { create } from 'zustand';

interface GameState {
  inJet: boolean;
  occupiedVehicle: any;
  playerDead: boolean;
  isGameOver: boolean;
  
  // Actions
  setInJet: (inJet: boolean) => void;
  setOccupiedVehicle: (vehicle: any) => void;
  setPlayerDead: (playerDead: boolean) => void;
  setGameOver: (isGameOver: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  inJet: false,
  occupiedVehicle: null,
  playerDead: false,
  isGameOver: false,

  setInJet: (inJet) => set({ inJet }),
  setOccupiedVehicle: (occupiedVehicle) => set({ occupiedVehicle }),
  setPlayerDead: (playerDead) => set({ playerDead }),
  setGameOver: (isGameOver) => set({ isGameOver }),
}));
