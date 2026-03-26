/**
 * LoadingTracker.ts
 * Tracks named loading steps, updates the loading screen UI in real-time,
 * and fades out only when ALL steps are marked complete.
 */

interface Step {
  id:    string;   // DOM row id, e.g. 'lrow-physics'
  label: string;
  done:  boolean;
  weight: number;  // relative weight for progress calculation
}

const steps: Step[] = [
  { id: 'lrow-physics', label: 'Physics Engine',    done: false, weight: 10 },
  { id: 'lrow-terrain', label: 'Terrain & Water',   done: false, weight: 20 },
  { id: 'lrow-player',  label: 'Player Character',  done: false, weight: 30 },
  { id: 'lrow-npcs',    label: 'NPC Agents',        done: false, weight: 30 },
  { id: 'lrow-world',   label: 'World Objects',     done: false, weight: 10 },
];

const TIPS = [
  'Keep hunger and thirst above 20% to maintain stamina.',
  'Sprint depletes energy fast — use it wisely.',
  'Talk to survivors. Some know where food is hidden.',
  'Rain replenishes thirst if you stay in the open.',
  'Night is dangerous. Find shelter before dark.',
  'Completing quests rewards you with vital supplies.',
];

let currentProgress = 0;
let tipIndex = 0;
let tipInterval: ReturnType<typeof setInterval> | null = null;

// DOM refs
let barEl:  HTMLElement | null = null;
let pctEl:  HTMLElement | null = null;
let msgEl:  HTMLElement | null = null;
let tipEl:  HTMLElement | null = null;
let loadEl: HTMLElement | null = null;

export function initLoadingTracker(): void {
  barEl  = document.getElementById('load-bar');
  pctEl  = document.getElementById('load-pct');
  msgEl  = document.getElementById('load-msg');
  tipEl  = document.getElementById('load-tip-text');
  loadEl = document.getElementById('loading');

  setProgress(0);

  // Rotate tips every 4s
  tipInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % TIPS.length;
    if (tipEl) {
      tipEl.style.opacity = '0';
      setTimeout(() => {
        if (tipEl) { tipEl.textContent = TIPS[tipIndex]; tipEl.style.opacity = '1'; }
      }, 400);
    }
  }, 4000);

  if (tipEl) tipEl.style.transition = 'opacity 0.4s ease';
}

/** Mark a loading step as complete and update progress */
export function completeStep(stepId: 'physics' | 'terrain' | 'player' | 'npcs' | 'world'): void {
  const step = steps.find(s => s.id === `lrow-${stepId}`);
  if (!step || step.done) return;
  step.done = true;

  // Mark DOM row
  const row = document.getElementById(step.id);
  if (row) row.classList.add('done');

  // Recalculate progress
  const totalWeight = steps.reduce((a, s) => a + s.weight, 0);
  const doneWeight  = steps.filter(s => s.done).reduce((a, s) => a + s.weight, 0);
  setProgress(doneWeight / totalWeight);

  // Update message
  if (msgEl) msgEl.textContent = `${step.label} ready`;

  // All done → fade out
  if (steps.every(s => s.done)) {
    setTimeout(() => hideLoadingScreen(), 600);
  }
}

function setProgress(p: number): void {
  currentProgress = Math.max(currentProgress, Math.min(1, p));
  const pct = Math.round(currentProgress * 100);
  if (barEl) barEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function hideLoadingScreen(): void {
  if (tipInterval) clearInterval(tipInterval);
  if (!loadEl) return;
  loadEl.classList.add('fade-out');
  setTimeout(() => {
    if (loadEl) loadEl.style.display = 'none';
  }, 1500);
}

export function getLoadingElement(): HTMLElement | null { return loadEl; }