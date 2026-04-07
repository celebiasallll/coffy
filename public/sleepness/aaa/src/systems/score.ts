import { Health } from '../ecs/components.js';
import { EntityId } from '../ecs/types.js';
import { audioManager } from '../core/AudioManager';
import { useGameStore } from '../store/gameStore.js';

export let SCORE = 0;
export let XP = 0;
export let LEVEL = 1;
export let XP_NEXT = 15;
export let COMBO = 0;
export let COMBO_T = 0;
export let KILLS = 0;
export let COFFY_COINS = 0;
export let SAVED_VILLAGERS = 0;
let gameOver = false;

let scoreDom: HTMLElement | null = null;
let levelDom: HTMLElement | null = null;
let xpFill: HTMLElement | null = null;
let comboDom: HTMLElement | null = null;
let coinDom: HTMLElement | null = null;
let popupDom: HTMLElement | null = null;
let killFeedDom: HTMLElement | null = null;
let dmgFlashDom: HTMLElement | null = null;
let missionDescDom: HTMLElement | null = null;
let missionValDom: HTMLElement | null = null;
let missionScoreDom: HTMLElement | null = null;

let comboTO: ReturnType<typeof setTimeout> | null = null;
let popupTO: ReturnType<typeof setTimeout> | null = null;
let missionHudDom: HTMLElement | null = null;
let missionHudTO: ReturnType<typeof setTimeout> | null = null;

function showMissionHudTemporarily(): void {
  if (!missionHudDom) return;
  missionHudDom.style.opacity = '1';
  missionHudDom.classList.add('hud-pop');
  setTimeout(() => {
    if (missionHudDom) missionHudDom.classList.remove('hud-pop');
  }, 150);
  
  if (missionHudTO) clearTimeout(missionHudTO);
  missionHudTO = setTimeout(() => {
    if (missionHudDom) missionHudDom.style.opacity = '0';
  }, 5000);
}
export function initScoreSystem(): void {
  // Her init'te state sıfırla — restart sonrası eski değerler kalmasın
  SCORE = 0; XP = 0; LEVEL = 1; XP_NEXT = 15;
  COMBO = 0; COMBO_T = 3.0; KILLS = 0; COFFY_COINS = 0; SAVED_VILLAGERS = 0;
  gameOver = false;

  scoreDom = document.getElementById('score-num');
  levelDom = document.getElementById('level-txt');
  xpFill = document.getElementById('xp-fill');
  comboDom = document.getElementById('combo');
  coinDom = document.getElementById('coin-num');
  popupDom = document.getElementById('popup');
  killFeedDom = document.getElementById('kill-feed');
  dmgFlashDom = document.getElementById('dmg-flash');


  missionDescDom = document.getElementById('mission-desc');
  missionValDom = document.getElementById('mission-val');
  missionScoreDom = document.getElementById('mission-score');
  missionHudDom = document.getElementById('mission-hud');
  
  updateMissionProgress();
  
  // Show it once at the start to indicate existence
  showMissionHudTemporarily();
}

export function markKill(): void {
  KILLS += 1;
}

export function addScore(points: number, label: string | null, player: EntityId | null, opts: any = {}): void {
  if (gameOver) return;
  SCORE += points;
  XP += points;

  if (scoreDom) {
    scoreDom.textContent = SCORE.toString();
    scoreDom.style.transform = 'scale(1.12)';
    setTimeout(() => {
      if (scoreDom) scoreDom.style.transform = 'scale(1)';
    }, 200);
  }
  if (missionScoreDom) {
    missionScoreDom.textContent = SCORE.toString();
  }
  while (XP >= XP_NEXT) {
    XP -= XP_NEXT;
    LEVEL += 1;
    XP_NEXT = Math.floor(XP_NEXT * 1.6);
    showPopup(`⬆ LEVEL ${LEVEL}!`, '#ffd700');
    if (player !== null) {
      // ECS Health update on level up
      Health.current[player] = Math.min(Health.max[player], Health.current[player] + 30);
    }
  }

  if (xpFill) {
    xpFill.style.width = `${Math.max(0, Math.min(1, XP / XP_NEXT)) * 100}%`;
  }
  if (levelDom) {
    levelDom.textContent = `⚡ Level ${LEVEL}`;
  }

  COMBO += 1;
  COMBO_T = 3.0;
  if (COMBO > 1 && comboDom) {
    comboDom.textContent = (COMBO > 4 ? '🔥 ' : '') + 'x' + COMBO + ' COMBO!';
    comboDom.style.opacity = '1';
    comboDom.style.fontSize = COMBO > 6 ? '38px' : '28px';
    if (comboTO) clearTimeout(comboTO);
    comboTO = setTimeout(() => {
      if (comboDom) comboDom.style.opacity = '0';
    }, 2500);
  }

  if (label) showPopup(label, '#0fa');
  showMissionHudTemporarily();
}

export function tickCombo(dt: number): void {
  if (COMBO_T > 0) {
    COMBO_T -= dt;
    if (COMBO_T <= 0 && comboDom) {
      COMBO = 0;
      comboDom.style.opacity = '0';
    }
  }
}

export function showPopup(msg: string, color: string): void {
  if (!popupDom) return;
  if (popupTO) clearTimeout(popupTO);
  popupDom.textContent = msg;
  popupDom.style.color = color || '#fff';
  popupDom.style.opacity = '1';
  popupDom.style.transform = 'translateX(-50%) scale(1.1)';
  setTimeout(() => {
    if (popupDom) popupDom.style.transform = 'translateX(-50%) scale(1)';
  }, 150);
  popupTO = setTimeout(() => {
    if (popupDom) popupDom.style.opacity = '0';
  }, 2000);
}

export function addKillFeed(msg: string): void {
  if (!killFeedDom) return;
  const el = document.createElement('div');
  el.textContent = msg;
  killFeedDom.prepend(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3500);
  while (killFeedDom.children.length > 5) {
    killFeedDom.removeChild(killFeedDom.lastChild as Node);
  }
}

export function flashDamage(amount: number): void {
  if (!dmgFlashDom) return;
  dmgFlashDom.style.background = 'rgba(255,0,0,0.35)';
  setTimeout(() => {
    if (dmgFlashDom) dmgFlashDom.style.background = 'rgba(255,0,0,0)';
  }, 120);
  showPopup(`💢 -${amount}`, '#ff4444');
}

export function addCoffyCoin(amount: number): void {
    COFFY_COINS += amount;
    if (coinDom) {
        coinDom.textContent = COFFY_COINS.toString();
        coinDom.style.transform = 'scale(1.3)';
        setTimeout(() => {
            if (coinDom) coinDom.style.transform = 'scale(1)';
        }, 200);
    }
    showPopup(`☕ +${amount} COFFY COIN`, '#a0aab2');
    showMissionHudTemporarily();
}

export function addSavedVillager(): void {
    SAVED_VILLAGERS += 1;
    showPopup(`👨‍👩‍👧‍👦 A VILLAGER HAS BEEN SAVED!`, '#a0aab2');
    updateMissionProgress();
    showMissionHudTemporarily();
}

export function updateMissionProgress(): void {
    const target = SAVED_VILLAGERS < 10 ? 10 : 50;
    
    if (missionDescDom) {
        if (SAVED_VILLAGERS < 10) {
            missionDescDom.textContent = "Collect coffee and deliver it to villagers to save 10 of them from turning into zombies!";
        } else {
            missionDescDom.textContent = "Operation expanding! Save 50 villagers from becoming zombies!";
        }
    }

    if (missionValDom) {
        missionValDom.textContent = `${SAVED_VILLAGERS} / ${target}`;
    }

    if (SAVED_VILLAGERS === 10) {
        showPopup("🔥 SUMMER MISSION COMPLETE! NEW TARGET: 50", "#0fa");
    }
}

export function triggerGameOver(): void {
  if (gameOver) return;
  gameOver = true;
  console.log("%c [GAME OVER] Triggered ", "background: #f00; color: #fff; font-weight: bold;");

  useGameStore.getState().setGameOver(true);
  
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  
  audioManager.stopAll();
  
  const go = document.getElementById('gameover');
  if (go) {
    go.style.display = 'flex';
    go.style.opacity = '0';
    // Small delay to allow CSS transitions if any
    requestAnimationFrame(() => {
        go.style.opacity = '1';
    });
  } else {
    console.warn("Game Over element not found!");
  }

  const stats = {
    score: document.getElementById('go-score-val'),
    level: document.getElementById('go-level-val'),
    kills: document.getElementById('go-kills-val'),
    coins: document.getElementById('go-coins-val')
  };

  if (stats.score) stats.score.textContent = SCORE.toString();
  if (stats.level) stats.level.textContent = LEVEL.toString();
  if (stats.kills) stats.kills.textContent = KILLS.toString();
  if (stats.coins) stats.coins.textContent = COFFY_COINS.toString();
}

export function isGameOver(): boolean {
  return gameOver;
}

export function updateHUD(dt: number, { pos, speed, fps, quality }: { pos: { x: number, y: number, z: number }, speed: number, fps: number, quality?: string }): void {
  tickCombo(dt);
}

