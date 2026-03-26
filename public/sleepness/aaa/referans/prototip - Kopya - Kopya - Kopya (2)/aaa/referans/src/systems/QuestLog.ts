/**
 * QuestLog.ts
 * Manages the persistent HUD element for the current quest objective.
 */

let questLogEl: HTMLElement | null = null;
let currentObjective: string = "Sistem yükleniyor...";

export function initQuestLog(): void {
  questLogEl = document.getElementById('quest-log');
  if (!questLogEl) {
    questLogEl = document.createElement('div');
    questLogEl.id = 'quest-log';
    questLogEl.innerHTML = `
      <div id="quest-log-header">GÜNCEL HEDEF</div>
      <div id="quest-log-content">${currentObjective}</div>
    `;
    questLogEl.style.cssText = `
      position: fixed; top: 180px; left: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-left: 2px solid rgba(255, 204, 0, 0.5);
      padding: 6px 10px;
      color: rgba(255, 255, 255, 0.7);
      font-family: 'Rajdhani', sans-serif;
      pointer-events: none;
      z-index: 1000;
      backdrop-filter: blur(2px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 160px;
    `;
    
    // Header style
    const header = questLogEl.querySelector('#quest-log-header') as HTMLElement;
    if (header) {
      header.style.cssText = `
        font-size: 8px;
        color: #ffcc00;
        font-weight: 700;
        margin-bottom: 2px;
        opacity: 0.5;
      `;
    }
    
    // Content style
    const content = questLogEl.querySelector('#quest-log-content') as HTMLElement;
    if (content) {
      content.style.cssText = `
        font-size: 11px;
        font-weight: 500;
      `;
    }

    document.body.appendChild(questLogEl);
  }
}

export function setObjective(text: string): void {
  currentObjective = text;
  const content = document.getElementById('quest-log-content');
  if (content) {
    content.textContent = text;
    
    // Subtle flash animation to indicate update
    if (questLogEl) {
        questLogEl.style.borderLeftColor = '#fff';
        setTimeout(() => { if (questLogEl) questLogEl.style.borderLeftColor = '#ffcc00'; }, 300);
    }
  }
}

export function hideQuestHUD(): void {
    if (questLogEl) questLogEl.style.display = 'none';
}

export function showQuestHUD(): void {
    if (questLogEl) questLogEl.style.display = 'block';
}

export function getObjective(): string {
  return currentObjective;
}
