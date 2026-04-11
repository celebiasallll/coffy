/**
 * SurvivalSystem.ts
 * Manages player survival stats: health, energy (stamina), hunger, thirst, sleep.
 */
import { getTimeOfDay } from '../world/DayNightCycle.js';

export interface SurvivalState {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  sleep: number;
  maxSleep: number;
  coffeeCount: number;
}

// ── Config (Leva Ready) ───────────────────────────────────────────────────────
export const survivalConfig = {
  sleepDrainRateDay: 0.25,
  sleepDrainRateNight: 0.50,
  energyDrainRate: 10,
  energyRegenRate: 5,
};

// ── State ─────────────────────────────────────────────────────────────────────
const state: SurvivalState = {
  health: 90,
  maxHealth: 100,
  energy: 90,
  maxEnergy: 100,
  hunger: 90,
  maxHunger: 100,
  thirst: 90,
  maxThirst: 100,
  sleep: 100,
  maxSleep: 100,
  coffeeCount: 0,
};

// ── Sprint lock ───────────────────────────────────────────────────────────────
let _sprintLocked = false;

// ── Death ─────────────────────────────────────────────────────────────────────
let _deathCallback: ((cause: string) => void) | null = null;
let _isDead = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
let healthFill: HTMLElement | null = null;
let energyFill: HTMLElement | null = null;
let hungerFill: HTMLElement | null = null;
let thirstFill: HTMLElement | null = null;
let sleepFill: HTMLElement | null = null;
let healthVal: HTMLElement | null = null;
let energyVal: HTMLElement | null = null;
let hungerVal: HTMLElement | null = null;
let thirstVal: HTMLElement | null = null;

// ── Damage timer IDs ─────────────────────────────────────────────────────────────────
let _flashTimer: ReturnType<typeof setTimeout> | null = null;
let _shakeTimer: ReturnType<typeof setTimeout> | null = null;

// ── Warning timers ────────────────────────────────────────────────────────────
let hungerWarnCooldown = 0;
let thirstWarnCooldown = 0;
let warnTO: ReturnType<typeof setTimeout> | null = null;

// ── Throttling ────────────────────────────────────────────────────────────────
let _syncFrameCounter = 0;

// ── First sync flag ───────────────────────────────────────────────────────────
let _firstSync = true;

// ─────────────────────────────────────────────────────────────────────────────
export function initSurvival(): void {
  healthFill = document.getElementById('health-fill');
  energyFill = document.getElementById('energy-fill');
  hungerFill = document.getElementById('hunger-fill');
  thirstFill = document.getElementById('thirst-fill');
  sleepFill  = document.getElementById('sleep-fill');
  syncDOM();
}

export function onDeath(cb: (cause: string) => void): void {
  _deathCallback = cb;
}

// ── Death Logic ─────────────────────────────────────────────────────────────────
let _thirstDeathTimer = 10.0;

export function updateSurvival(dt: number, sprinting: boolean): SurvivalState {
  // ── Sleep drain: gece 2x hızlanır (22:00-06:00 = t<0.26 || t>0.78)
  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay < 0.26 || timeOfDay > 0.78;
  const sleepDrainRate = isNight ? survivalConfig.sleepDrainRateNight : survivalConfig.sleepDrainRateDay; 
  // Hunger/Thirst disabled — only energy and sleep remain active
  state.hunger = 100; // always full, no depletion
  state.thirst = 100; // always full, no depletion
  state.sleep  = Math.max(0, state.sleep  - dt * sleepDrainRate);

  if (sprinting && state.energy > 0) {
    state.energy = Math.max(0, state.energy - dt * survivalConfig.energyDrainRate);
    if (state.energy === 0) _sprintLocked = true;
  } else {
    state.energy = Math.min(state.maxEnergy, state.energy + dt * survivalConfig.energyRegenRate);
  }

  // No hunger/thirst death logic — only sleep-based death check remains in updateSleepEffects

  if (state.health <= 0 && !_isDead) {
    _isDead = true;
    if (_deathCallback) _deathCallback('combat');
  }

  _syncFrameCounter++;
  if (_syncFrameCounter % 8 === 0) {
    syncDOM();
  }
  updateDangerVignette();
  updateSleepEffects(dt, state.sleep, state.maxSleep);
  return state;
}

export function canSprint(): boolean {
  if (_sprintLocked) {
    if (state.energy >= state.maxEnergy * 0.2) {
      _sprintLocked = false;
    } else {
      return false;
    }
  }
  return state.energy > 0;
}

export function getSurvivalState(): SurvivalState {
  return state;
}

export function eat(amount: number): void {
  state.hunger = Math.min(state.maxHunger, state.hunger + amount);
  syncDOM();
}

export function drink(amount: number): void {
  state.thirst = Math.min(state.maxThirst, state.thirst + amount);
  syncDOM();
}


export function heal(amount: number): void {
  state.health = Math.min(state.maxHealth, state.health + amount);
  syncDOM();
}

/** Uyku barını belirtilen miktarda doldurur (max: maxSleep). Bulmaca kazanıldığında çağrılır. */
export function fillSleep(amount: number): void {
  state.sleep = Math.min(state.maxSleep, state.sleep + amount);
  syncDOM();
}

export function takeDamage(amount: number): number {
  state.health = Math.max(0, state.health - amount);
  syncDOM();

  // Damage feedback (Flash & Shake)
  const flash = document.getElementById('dmg-flash');
  if (flash) {
    flash.classList.remove('active');
    void (flash as any).offsetWidth; // Trigger reflow
    flash.classList.add('active');
    if (_flashTimer) clearTimeout(_flashTimer);
    _flashTimer = setTimeout(() => flash.classList.remove('active'), 400);
  }

  const hpIcons = document.getElementById('hp-icons');
  if (hpIcons && hpIcons.parentElement) {
    hpIcons.parentElement.classList.remove('hp-damaged');
    void (hpIcons.parentElement as any).offsetWidth; // Trigger reflow
    hpIcons.parentElement.classList.add('hp-damaged');
  }

  document.body.classList.remove('shake');
  void (document.body as any).offsetWidth; // Trigger reflow
  document.body.classList.add('shake');
  if (_shakeTimer) clearTimeout(_shakeTimer);
  _shakeTimer = setTimeout(() => document.body.classList.remove('shake'), 450);

  return state.health;
}

export function setSurvivalHealth(hp: number): void {
  state.health = Math.max(0, Math.min(state.maxHealth, hp));
  syncDOM();
}

// ── Internal ──────────────────────────────────────────────────────────────────
function syncDOM(): void {
  const hpPct  = Math.min(100, Math.max(0, (state.health / state.maxHealth) * 100));
  const tPct   = Math.min(100, Math.max(0, (state.thirst / state.maxThirst) * 100));
  const ePct   = Math.min(100, Math.max(0, (state.energy / state.maxEnergy) * 100));
  const huPct  = Math.min(100, Math.max(0, (state.hunger / state.maxHunger) * 100));
  const sPct   = Math.min(100, Math.max(0, (state.sleep  / state.maxSleep)  * 100));

  if (healthFill) {
    (healthFill as HTMLElement).style.clipPath = `inset(${100 - hpPct}% 0 0 0)`;
    healthFill.parentElement?.classList.toggle('critical', hpPct < 25);
  }
  if (thirstFill) {
    (thirstFill as HTMLElement).style.clipPath = `inset(${100 - tPct}% 0 0 0)`;
    thirstFill.parentElement?.classList.toggle('critical', tPct < 25);
  }
  if (energyFill) {
    (energyFill as HTMLElement).style.clipPath = `inset(${100 - ePct}% 0 0 0)`;
    energyFill.parentElement?.classList.toggle('critical', ePct < 25);
  }
  if (hungerFill) {
    (hungerFill as HTMLElement).style.clipPath = `inset(${100 - huPct}% 0 0 0)`;
    hungerFill.parentElement?.classList.toggle('critical', huPct < 25);
  }
  if (sleepFill) {
    (sleepFill as HTMLElement).style.clipPath = `inset(${100 - sPct}% 0 0 0)`;
    sleepFill.parentElement?.classList.toggle('critical-pulse', sPct < 15);
  }

  // Health Liquid Sync (Single Heart)
  const hpFill = document.getElementById('hp-icons');
  if (hpFill) {
    hpFill.style.clipPath = `inset(${100 - hpPct}% 0 0 0)`;
    // Update color based on health remaining
    if (hpPct > 35) {
      hpFill.style.background = 'linear-gradient(to top, #c0392b, #e74c3c)';
    } else {
      hpFill.style.background = 'linear-gradient(to top, #8b0000, #c0392b)';
    }
    hpFill.parentElement?.classList.toggle('critical', hpPct < 25);
  }
}

function updateDangerVignette(): void {
  const flash = document.getElementById('dmg-flash');
  if (!flash) return;

  const hp = state.health / state.maxHealth;
  const danger = hp < 0.40 ? (0.40 - hp) / 0.40 : 0;
  if (danger > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 600);
    (flash as HTMLElement).style.background = `rgba(180,0,0,${(danger * pulse * 0.35).toFixed(3)})`;
  } else {
    (flash as HTMLElement).style.background = 'rgba(255,0,0,0)';
  }
}

function showSurvivalWarning(msg: string, color: string): void {
  let el = document.getElementById('survival-warning');
  if (!el) {
    el = document.createElement('div');
    el.id = 'survival-warning';
    el.style.cssText =
      'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);font-family:Outfit,sans-serif;' +
      'font-size:14px;pointer-events:none;z-index:9000;transition:opacity 0.5s;opacity:0;' +
      'text-shadow:1px 1px 4px rgba(0,0,0,0.8);text-align:center;';
    document.body.appendChild(el);
  }
  if (warnTO) clearTimeout(warnTO);
  el.textContent = msg;
  el.style.color = color;
  el.style.opacity = '1';
  warnTO = setTimeout(() => {
    const checkEl = document.getElementById('survival-warning');
    if (checkEl) (checkEl as HTMLElement).style.opacity = '0';
  }, 3000);
}

// ── Sleep Effects (Hallucination + Micro-sleep) ──────────────────────────────
let _hallucinationCooldown = 0;
let _microSleepTimer = 0;       // countdown when a micro-sleep is active
let _microSleepCooldown = 0;    // prevent back-to-back blackouts
/** Returns true if the player's input should be blocked (e.g. during micro-sleep) */
export function isInputBlocked(): boolean {
  return _microSleepTimer > 0;
}

function updateSleepEffects(dt: number, sleep: number, maxSleep: number): void {
  const pct = sleep / maxSleep;
  _hallucinationCooldown = Math.max(0, _hallucinationCooldown - dt);
  _microSleepCooldown    = Math.max(0, _microSleepCooldown - dt);

  // ── Hallucination (sleep < 30%) ────────────────────────────────────────────
  if (pct < 0.30 && pct > 0 && _hallucinationCooldown <= 0) {
    _hallucinationCooldown = 12 + Math.random() * 10;

    // CSS shake — costs nothing
    document.body.classList.remove('sleep-shake');
    void (document.body as any).offsetWidth;
    document.body.classList.add('sleep-shake');
    setTimeout(() => document.body.classList.remove('sleep-shake'), 600);

    // Warning message
    const msgs = [
      '👁 How much longer can you hold on?',
      '👁 The darkness is calling you...',
      '👁 Your eyelids are made of lead.',
      '👁 Is that real? Or are you dreaming?',
    ];
    showSurvivalWarning(msgs[Math.floor(Math.random() * msgs.length)], '#cc44ff');
  }

  // ── Micro-sleep (sleep < 15%) ──────────────────────────────────────────────
  if (_microSleepTimer > 0) {
    _microSleepTimer -= dt;
    if (_microSleepTimer <= 0) {
      // Fade screen back in
      const overlay = _getMicroSleepOverlay();
      overlay.style.opacity = '0';
      _microSleepCooldown = 20 + Math.random() * 15;
    }
    return; // block further triggers while blacked out
  }

  if (pct < 0.15 && pct > 0 && _microSleepCooldown <= 0) {
    const duration = 1.0 + Math.random() * 1.0; // 1-2 seconds
    _microSleepTimer = duration;

    const overlay = _getMicroSleepOverlay();
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.style.opacity = '1';

    // Input blocking is now handled in main.ts via isInputBlocked()

    showSurvivalWarning('💤 You blacked out for a moment...', '#cc44ff');
  }

  // ── Sleep bar pulse when critical (pct < 15%) ──────────────────────────────
  const sleepBar = document.querySelector('#sleep-bar') as HTMLElement | null;
  if (sleepBar) {
    sleepBar.classList.toggle('critical-pulse', pct < 0.15);
  }
}

function _getMicroSleepOverlay(): HTMLElement {
  let el = document.getElementById('micro-sleep-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'micro-sleep-overlay';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'background:#000',
      'opacity:0', 'pointer-events:none', 'z-index:9999',
      'transition:opacity 0.3s ease',
    ].join(';');
    document.body.appendChild(el);
  }
  return el;
}
