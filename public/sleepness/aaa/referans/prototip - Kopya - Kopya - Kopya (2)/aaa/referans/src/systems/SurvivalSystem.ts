/**
 * SurvivalSystem.ts
 * Manages player survival stats: health, energy (stamina), hunger, thirst.
 */

export interface SurvivalState {
  health: number; maxHealth: number;
  energy: number; maxEnergy: number;
  hunger: number; maxHunger: number;
  thirst: number; maxThirst: number;
  social: number; maxSocial: number;
}

// ── State ─────────────────────────────────────────────────────────────────────
const state: SurvivalState = {
  health: 100, maxHealth: 100,
  energy: 100, maxEnergy: 100,
  hunger: 100, maxHunger: 100,
  thirst: 100, maxThirst: 100,
  social: 50, maxSocial: 100,
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
let socialFill: HTMLElement | null = null;
let healthVal: HTMLElement | null = null;
let energyVal: HTMLElement | null = null;
let hungerVal: HTMLElement | null = null;
let thirstVal: HTMLElement | null = null;
let socialVal: HTMLElement | null = null;

// ── Warning timers ────────────────────────────────────────────────────────────
let hungerWarnCooldown = 0;
let thirstWarnCooldown = 0;
let warnTO: ReturnType<typeof setTimeout> | null = null;

// ── Throttling ────────────────────────────────────────────────────────────────
let _syncFrameCounter = 0;
let _lastSyncedPct = { health: -1, energy: -1, hunger: -1, thirst: -1, social: -1 };

// ── First sync flag ───────────────────────────────────────────────────────────
let _firstSync = true;

// ─────────────────────────────────────────────────────────────────────────────
export function initSurvival(): void {
  healthFill = document.getElementById('health-fill');
  energyFill = document.getElementById('energy-fill');
  hungerFill = document.getElementById('hunger-fill');
  thirstFill = document.getElementById('thirst-fill');
  socialFill = document.getElementById('social-fill');
  healthVal = document.getElementById('health-val');
  energyVal = document.getElementById('energy-val');
  hungerVal = document.getElementById('hunger-val');
  thirstVal = document.getElementById('thirst-val');
  socialVal = document.getElementById('social-val');
  syncDOM();
}

export function onDeath(cb: (cause: string) => void): void {
  _deathCallback = cb;
}

// ── Death Logic ─────────────────────────────────────────────────────────────
let _thirstDeathTimer = 10.0;

export function updateSurvival(dt: number, sprinting: boolean): SurvivalState {
  state.hunger = Math.max(0, state.hunger - dt * 0.48);
  state.thirst = Math.max(0, state.thirst - dt * 0.83);
  state.social = Math.max(0, state.social - dt * 0.08);

  if (sprinting && state.energy > 0) {
    state.energy = Math.max(0, state.energy - dt * 10);
    if (state.energy === 0) _sprintLocked = true;
  } else {
    const regenRate = state.hunger > 20 ? 5 : 1.5;
    state.energy = Math.min(state.maxEnergy, state.energy + dt * regenRate);
  }

  // Hunger: Immediate death
  if (state.hunger <= 0) {
    state.health = 0;
  }

  // Thirst: 10s countdown before death
  if (state.thirst <= 0) {
    _thirstDeathTimer -= dt;
    if (_thirstDeathTimer <= 0) {
      state.health = 0;
    } else {
      // Every second update warning
      if (_syncFrameCounter % 60 === 0) {
        showSurvivalWarning(`💧 Susuzluktan ölmek üzeresin! (${Math.ceil(_thirstDeathTimer)}s)`, '#ff0000');
      }
    }
  } else {
    _thirstDeathTimer = 10.0; // Reset if they drink
  }

  // Passive health drain if extremely low (optional fallback, but user wants triggers)
  // if (state.hunger <= 0) state.health = Math.max(0, state.health - dt * 3.0); 

  if (state.health <= 0 && !_isDead) {
    _isDead = true;
    const cause = state.thirst <= 0 ? 'dehydration'
      : state.hunger <= 0 ? 'starvation'
        : 'unknown';
    if (_deathCallback) _deathCallback(cause);
  }

  hungerWarnCooldown = Math.max(0, hungerWarnCooldown - dt);
  thirstWarnCooldown = Math.max(0, thirstWarnCooldown - dt);
  if (state.hunger < 20 && state.hunger > 0 && hungerWarnCooldown <= 0) {
    showSurvivalWarning('🍖 Açlık seviyen kritik!', '#ff8800');
    hungerWarnCooldown = 12;
  }
  if (state.thirst < 20 && state.thirst > 0 && thirstWarnCooldown <= 0) {
    showSurvivalWarning('💧 Susuzluk seviyen kritik!', '#44aaff');
    thirstWarnCooldown = 12;
  }

  _syncFrameCounter++;
  if (_syncFrameCounter % 8 === 0) {
    syncDOM();
  }
  updateDangerVignette();
  return state;
}

export function canSprint(): boolean {
  if (_sprintLocked) {
    if (state.energy >= state.maxEnergy * 0.20) {
      _sprintLocked = false;
    } else {
      return false;
    }
  }
  return state.energy > 0;
}

export function getSurvivalState(): SurvivalState { return state; }

export function eat(amount: number): void {
  state.hunger = Math.min(state.maxHunger, state.hunger + amount);
  syncDOM(); 
}

export function drink(amount: number): void {
  state.thirst = Math.min(state.maxThirst, state.thirst + amount);
  syncDOM(); 
}

export function socialize(amount: number): void {
  state.social = Math.min(state.maxSocial, state.social + amount);
  syncDOM();
}

export function heal(amount: number): void {
  state.health = Math.min(state.maxHealth, state.health + amount);
  syncDOM(); 
}

export function takeDamage(amount: number): number {
  state.health = Math.max(0, state.health - amount);
  syncDOM(); 

  // Damage feedback (Flash & Shake)
  const overlay = document.getElementById('damage-overlay');
  if (overlay) {
    overlay.classList.remove('damage-pulse');
    void (overlay as any).offsetWidth; // Trigger reflow
    overlay.classList.add('damage-pulse');
  }
  
  document.body.classList.remove('shake');
  void (document.body as any).offsetWidth; // Trigger reflow
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 400);

  return state.health;
}

export function setSurvivalHealth(hp: number): void {
  state.health = Math.max(0, Math.min(state.maxHealth, hp));
  syncDOM();
}

// ── Internal ──────────────────────────────────────────────────────────────────
function syncDOM(): void {
  if (!thirstFill) {
    energyFill = document.getElementById('energy-fill');
    hungerFill = document.getElementById('hunger-fill');
    thirstFill = document.getElementById('thirst-fill');
    socialFill = document.getElementById('social-fill');
    energyVal = document.getElementById('energy-val');
    hungerVal = document.getElementById('hunger-val');
    thirstVal = document.getElementById('thirst-val');
    socialVal = document.getElementById('social-val');
  }

  const hpPct = Math.round((state.health / state.maxHealth) * 100);
  const ePct = (state.energy / state.maxEnergy) * 100;
  const hPct = Math.round((state.hunger / state.maxHunger) * 100);
  const tPct = Math.round((state.thirst / state.maxThirst) * 100);
  const sPct = Math.round((state.social / state.maxSocial) * 100);

  if (!_firstSync && 
      hpPct === _lastSyncedPct.health &&
      ePct === _lastSyncedPct.energy && 
      hPct === _lastSyncedPct.hunger && 
      tPct === _lastSyncedPct.thirst && 
      sPct === _lastSyncedPct.social) return;

  _lastSyncedPct = { health: hpPct, energy: ePct, hunger: hPct, thirst: tPct, social: sPct };
  const trans = _firstSync ? 'none' : '';
  _firstSync = false;

  if (healthFill) {
    healthFill.style.transition = trans;
    healthFill.style.width = `${hpPct}%`;
  }
  if (healthVal) healthVal.textContent = ''; // Or `${hpPct}%` if icons and labels are not enough

  if (energyFill) {
    energyFill.style.transition = trans;
    energyFill.style.width = `${ePct}%`;
  }
  if (energyVal) energyVal.textContent = '';

  if (hungerFill) {
    hungerFill.style.transition = trans;
    hungerFill.style.width = `${hPct}%`;
  }
  if (hungerVal) hungerVal.textContent = '';

  if (thirstFill) {
    thirstFill.style.transition = trans;
    thirstFill.style.width = `${tPct}%`;
  }
  if (thirstVal) thirstVal.textContent = '';

  if (socialFill) {
    socialFill.style.transition = trans;
    socialFill.style.width = `${sPct}%`;
  }
  if (socialVal) socialVal.textContent = '';
}

function updateDangerVignette(): void {
  const flash = document.getElementById('dmg-flash');
  if (!flash) return;
  const hp = state.health / state.maxHealth;
  const danger = hp < 0.40 ? (0.40 - hp) / 0.40 : 0;
  if (danger > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 600);
    flash.style.background = `rgba(180,0,0,${(danger * pulse * 0.35).toFixed(3)})`;
  } else {
    flash.style.background = 'rgba(255,0,0,0)';
  }
}

function showSurvivalWarning(msg: string, color: string): void {
  const el = document.getElementById('survival-warning');
  if (!el) return;
  if (warnTO) clearTimeout(warnTO);
  el.textContent = msg;
  el.style.color = color;
  el.style.opacity = '1';
  warnTO = setTimeout(() => { if (el) el.style.opacity = '0'; }, 3000);
}