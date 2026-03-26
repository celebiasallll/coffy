/**
 * SurvivalSystem.ts
 * Manages player survival stats: health, energy (stamina), hunger, thirst.
 */

export interface SurvivalState {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  social: number;
  maxSocial: number;
}

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
  social: 50,
  maxSocial: 100,
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

// ── First sync flag ───────────────────────────────────────────────────────────
let _firstSync = true;

// ─────────────────────────────────────────────────────────────────────────────
export function initSurvival(): void {
  healthFill = document.getElementById('health-fill');
  energyFill = document.getElementById('energy-fill');
  hungerFill = document.getElementById('hunger-fill');
  thirstFill = document.getElementById('thirst-fill');
  socialFill = document.getElementById('social-fill');
  syncDOM();
}

export function onDeath(cb: (cause: string) => void): void {
  _deathCallback = cb;
}

// ── Death Logic ─────────────────────────────────────────────────────────────────
let _thirstDeathTimer = 10.0;

export function updateSurvival(dt: number, sprinting: boolean): SurvivalState {
  state.hunger = Math.max(0, state.hunger - dt * 0.12);
  state.thirst = Math.max(0, state.thirst - dt * 0.35);
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
        showSurvivalWarning('💧 Bilincin bulanıyor... Suya ihtiyacın var.', '#ff2222');
      }
    }
  } else {
    _thirstDeathTimer = 10.0; // Reset if they drink
  }

  if (state.health <= 0 && !_isDead) {
    _isDead = true;
    const cause =
      state.thirst <= 0 ? 'dehydration' :
      state.hunger <= 0 ? 'starvation' :
      'unknown';
    if (_deathCallback) _deathCallback(cause);
  }

  hungerWarnCooldown = Math.max(0, hungerWarnCooldown - dt);
  thirstWarnCooldown = Math.max(0, thirstWarnCooldown - dt);
  if (state.hunger < 20 && state.hunger > 0 && hungerWarnCooldown <= 0) {
    showSurvivalWarning('🍖 Karnında keskin bir ağrı var. Boşluk hissi büyüyor.', '#ff8800');
    hungerWarnCooldown = 15;
  }
  if (state.thirst < 20 && state.thirst > 0 && thirstWarnCooldown <= 0) {
    showSurvivalWarning('💧 Dilin damağına yapışıyor. Her nefes alışında boğazın yanıyor.', '#44aaff');
    thirstWarnCooldown = 15;
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

  // Damage feedback (Flash & Shake) - overlay elements may not exist in this project.
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
  const hFill = document.getElementById('health-fill');
  const tFill = document.getElementById('thirst-fill');
  const eFill = document.getElementById('energy-fill');
  const huFill = document.getElementById('hunger-fill');

  const hpPct = Math.min(100, Math.max(0, (state.health / state.maxHealth) * 100));
  const tPct = Math.min(100, Math.max(0, (state.thirst / state.maxThirst) * 100));
  const ePct = Math.min(100, Math.max(0, (state.energy / state.maxEnergy) * 100));
  const huPct = Math.min(100, Math.max(0, (state.hunger / state.maxHunger) * 100));

  if (hFill) {
    (hFill as HTMLElement).style.clipPath = `inset(${100 - hpPct}% 0 0 0)`;
    hFill.parentElement?.classList.toggle('critical', hpPct < 25);
  }
  if (tFill) {
    (tFill as HTMLElement).style.clipPath = `inset(${100 - tPct}% 0 0 0)`;
    tFill.parentElement?.classList.toggle('critical', tPct < 25);
  }
  if (eFill) {
    (eFill as HTMLElement).style.clipPath = `inset(${100 - ePct}% 0 0 0)`;
    eFill.parentElement?.classList.toggle('critical', ePct < 25);
  }
  if (huFill) {
    (huFill as HTMLElement).style.clipPath = `inset(${100 - huPct}% 0 0 0)`;
    huFill.parentElement?.classList.toggle('critical', huPct < 25);
  }

  _ensureSocialBar();
  const sFill = document.getElementById('social-fill');
  const sPct = Math.min(100, Math.max(0, (state.social / state.maxSocial) * 100));
  if (sFill) {
    (sFill as HTMLElement).style.clipPath = `inset(${100 - sPct}% 0 0 0)`;
    sFill.parentElement?.classList.toggle('critical', sPct < 20);
  }
}

let _socialBarCreated = false;
function _ensureSocialBar(): void {
  if (_socialBarCreated || document.getElementById('social-fill')) return;
  _socialBarCreated = true;

  const box = document.getElementById('survival-box');
  if (!box) return;

  const container = document.createElement('div');
  container.className = 'core-container';
  container.innerHTML = `
    <div id="social-fill" class="core-liquid" style="background:linear-gradient(to top,#4a0080,#b060ff);"></div>
    <div class="core-icon" style="font-size:16px">👁</div>
  `;
  box.appendChild(container);
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

