/**
 * QuestSystem.ts
 * Manages game progression, quest states, and memory fragments.
 */

export interface QuestState {
  crystalsCollected: number;
  spokenToArthur: boolean;
  spokenToClara: boolean;
  hasHouseKey: boolean;
  houseUnlocked: boolean;
  hasObsidian: boolean;
  seraphinaFound: boolean;
  truthUncovered: boolean;
  pioneerCoinsGoal: number;
  memoryFragments: number;        // 0-10
  flashbacksUnlocked: string[];   // ["lake", "obsidian"]
  finalChoiceMade: boolean;
  hasJetpack: boolean;
  silasPurged: boolean;
  introInteractions: number;      // interactions before Arthur mission
  currentAct: 1 | 2 | 3;
}

const state: QuestState = {
  crystalsCollected: 0,
  spokenToArthur: false,
  spokenToClara: false,
  hasHouseKey: false,
  houseUnlocked: false,
  hasObsidian: false,
  seraphinaFound: false,
  truthUncovered: false,
  pioneerCoinsGoal: 500,
  memoryFragments: 0,
  flashbacksUnlocked: [],
  finalChoiceMade: false,
  hasJetpack: false,
  silasPurged: false,
  introInteractions: 0,
  currentAct: 1,
};

export function getQuestState(): QuestState {
  return state;
}

export function updateQuestState(updates: Partial<QuestState>): void {
  Object.assign(state, updates);
}

// ── Act Transition Callbacks ──────────────────────────────────────────────────
type ActTransitionHandler = (from: 1 | 2 | 3, to: 2 | 3) => void;
const _actListeners: ActTransitionHandler[] = [];

/** main.ts veya FlashbackSystem'dan act geçişini dinlemek için çağır */
export function onActTransition(handler: ActTransitionHandler): void {
  _actListeners.push(handler);
}

function _fireActTransition(from: 1 | 2 | 3, to: 2 | 3): void {
  state.currentAct = to;
  for (const fn of _actListeners) fn(from, to);
}

export function incrementMemory(amount = 1): void {
  state.memoryFragments = Math.min(10, state.memoryFragments + amount);
  if (state.memoryFragments >= 4 && state.currentAct === 1) _fireActTransition(1, 2);
  if (state.memoryFragments >= 8 && state.currentAct === 2) _fireActTransition(2, 3);
}

/** 
 * Returns a score based on progression 
 * (0.0 to 1.0) for the 'Memory Recovery' progress bar 
 */
export function getMemoryProgress(): number {
  let score = 0;
  if (state.crystalsCollected >= 5) score += 0.15;
  if (state.spokenToArthur) score += 0.1;
  if (state.hasHouseKey) score += 0.15;
  if (state.houseUnlocked) score += 0.15;
  if (state.hasObsidian) score += 0.15;
  if (state.seraphinaFound) score += 0.15;
  if (state.truthUncovered) score += 0.1;
  if (state.hasJetpack) score += 0.05;

  // Add memory fragments weight (4 fragments = 1 full act)
  score += (state.memoryFragments / 10) * 0.4; 

  return Math.min(1.0, score);
}