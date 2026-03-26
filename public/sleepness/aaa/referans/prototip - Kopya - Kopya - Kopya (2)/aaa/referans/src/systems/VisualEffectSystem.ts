/**
 * VisualEffectSystem.ts
 * Manages world-level visual narrative changes:
 * - Glitch effects (Overlay)
 * - World desaturation / Color shifts based on story acts
 */

import * as THREE from 'three';
import { getQuestState } from './QuestSystem.js';

let _scene: THREE.Scene | null = null;
let _glitchOverlay: HTMLElement | null = null;

export function initVisualEffects(scene: THREE.Scene): void {
  _scene = scene;
  
  // Create a hidden glitch overlay
  _glitchOverlay = document.createElement('div');
  _glitchOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 2px);
    pointer-events: none; z-index: 99998; opacity: 0; transition: opacity 0.1s;
  `;
  document.body.appendChild(_glitchOverlay);

  // Expose triggers for narrative events
  (window as any).triggerEnding = (choice: 'escape' | 'sacrifice') => {
    showEnding(choice);
  };
}

/** 
 * Updates world visuals based on memory progression.
 */
export function updateVisualNarrative(): void {
  if (!_scene) return;
  const qs = getQuestState();
  
  // Custom logic can be added here to tint lights or fog based on qs.currentAct
}

export function triggerGlitch(duration = 500): void {
  if (!_glitchOverlay) return;
  _glitchOverlay.style.opacity = '1';
  setTimeout(() => {
    if (_glitchOverlay) _glitchOverlay.style.opacity = '0';
  }, duration);
}

export function showEnding(choice: 'escape' | 'sacrifice'): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: #000; color: #fff; display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 100000;
    font-family: 'Rajdhani', sans-serif; text-align: center;
    opacity: 0; transition: opacity 4s;
    backdrop-filter: blur(10px);
  `;
  
  const title = document.createElement('h1');
  title.textContent = choice === 'escape' ? "SYSTEM RESET INITIATED..." : "SYSTEM PURGE COMPLETE.";
  title.style.color = choice === 'escape' ? "#00ffcc" : "#ffffff";
  title.style.fontSize = "42px";
  title.style.letterSpacing = "4px";
  
  const desc = document.createElement('p');
  desc.textContent = choice === 'escape' 
    ? "You fled into the void. The village is deleted. Smith wakes up again. Thirsty. Always thirsty."
    : "You gave your fragments to the roots. The loop is broken. Sarah is free. Smith is finally at peace.";
    
  desc.style.maxWidth = "700px";
  desc.style.lineHeight = "1.8";
  desc.style.fontSize = "20px";
  desc.style.marginTop = "20px";

  const btn = document.createElement('button');
  btn.textContent = "NEW GAME+";
  btn.style.cssText = `
    margin-top: 40px; padding: 12px 30px; background: transparent; border: 1px solid rgba(255,255,255,0.3);
    color: #fff; cursor: pointer; font-family: inherit; font-size: 16px; letter-spacing: 2px;
    transition: all 0.3s;
  `;
  btn.onmouseover = () => { btn.style.background = "rgba(255,255,255,0.1)"; btn.style.borderColor = "#fff"; };
  btn.onmouseout = () => { btn.style.background = "transparent"; btn.style.borderColor = "rgba(255,255,255,0.3)"; };
  btn.onclick = () => window.location.reload();

  overlay.appendChild(title);
  overlay.appendChild(desc);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
  
  setTimeout(() => { overlay.style.opacity = '1'; }, 100);
}
