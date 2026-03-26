import { Vector3 } from 'three';

interface PlayerState {
  hp: number;
  hpMax: number;
  pos: Vector3;
  vel?: Vector3;
}

export function createHudBindings(): {
  updatePlayerUi: (player: PlayerState | null) => void;
  updateFps: () => void;
} {
  const posDom = document.getElementById('pos');
  const spdDom = document.getElementById('spd');
  const hpFill = document.getElementById('hp-fill');
  const hpText = document.getElementById('hp-text');
  const fpsDom = document.getElementById('fps');

  function updatePlayerUi(player: PlayerState | null): void {
    if (!player) return;
    const pct = Math.max(0, Math.min(1, player.hp / player.hpMax));
    if (hpFill) hpFill.style.width = `${(pct * 100).toFixed(1)}%`;
    if (hpText) hpText.textContent = `${Math.round(player.hp)} / ${player.hpMax}`;
    if (posDom) posDom.textContent = `pos: ${player.pos.x.toFixed(0)}, ${player.pos.z.toFixed(0)}`;

    const speedLen = player.vel && typeof player.vel.length === 'function' ? player.vel.length() : 0;
    if (spdDom) spdDom.textContent = `speed: ${speedLen.toFixed(1)}`;
  }

  const updateFps = (() => {
    let frames = 0;
    let lastTime = performance.now();
    return () => {
      frames++;
      const now = performance.now();
      if (now - lastTime > 700) {
        const fps = (frames * 1000) / (now - lastTime);
        if (fpsDom) fpsDom.textContent = `${fps.toFixed(0)} FPS`;
        frames = 0;
        lastTime = now;
      }
    };
  })();

  return { updatePlayerUi, updateFps };
}

