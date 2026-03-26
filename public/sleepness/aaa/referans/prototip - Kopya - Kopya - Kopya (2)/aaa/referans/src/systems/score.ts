import { Health } from '../ecs/components.js';
import { EntityId } from '../ecs/types.js';

let SCORE = 0;
let XP = 0;
let LEVEL = 1;
let XP_NEXT = 15;
let COMBO = 0;
let COMBO_T = 0;
let KILLS = 0;
let gameOver = false;

let scoreDom: HTMLElement | null = null;
let levelDom: HTMLElement | null = null;
let xpFill: HTMLElement | null = null;
let comboDom: HTMLElement | null = null;
let popupDom: HTMLElement | null = null;
let killFeedDom: HTMLElement | null = null;
let dmgFlashDom: HTMLElement | null = null;

let comboTO: ReturnType<typeof setTimeout> | null = null;
let popupTO: ReturnType<typeof setTimeout> | null = null;

let _posDom: HTMLElement | null = null, _spdDom: HTMLElement | null = null, _fpsDom: HTMLElement | null = null;

export function initScoreSystem(): void {
  // Her init'te state sıfırla — restart sonrası eski değerler kalmasın
  SCORE = 0; XP = 0; LEVEL = 1; XP_NEXT = 15;
  COMBO = 0; COMBO_T = 3.0; KILLS = 0; gameOver = false;

  scoreDom = document.getElementById('score-num');
  levelDom = document.getElementById('level-txt');
  xpFill = document.getElementById('xp-fill');
  comboDom = document.getElementById('combo');
  popupDom = document.getElementById('popup');
  killFeedDom = document.getElementById('kill-feed');
  dmgFlashDom = document.getElementById('dmg-flash');

  _posDom = document.getElementById('pos');
  _spdDom = document.getElementById('spd');
  _fpsDom = document.getElementById('fps');
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

export function triggerGameOver(): void {
  if (gameOver) return;
  gameOver = true;
  const go = document.getElementById('gameover');
  const goScore = document.getElementById('go-score');
  const goLevel = document.getElementById('go-level');
  if (go) go.style.display = 'flex';
  if (goScore) goScore.textContent = `Score: ${SCORE}`;
  if (goLevel) goLevel.textContent = `Level: ${LEVEL} | ${KILLS} kills`;
}

export function updateHUD(dt: number, { pos, speed, fps }: { pos: { x: number, y: number, z: number }, speed: number, fps: number }): void {
  if (_posDom) _posDom.textContent = `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
  if (_spdDom) _spdDom.textContent = `speed: ${Math.round(speed)}`;
  if (_fpsDom) _fpsDom.textContent = `FPS: ${Math.round(fps || 0)}`;
  tickCombo(dt);
}

