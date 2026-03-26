import * as THREE from 'three';

let ctx: CanvasRenderingContext2D | null = null;

export function initMinimap(): void {
  const canvas = document.getElementById('mmCanvas') as HTMLCanvasElement;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
}

interface MinimapTarget {
  pos: THREE.Vector3;
  yaw: number;
}

interface EnemyWithGroup {
  group: THREE.Group;
}

interface CrystalWithGroup {
  group: THREE.Group;
  alive: boolean;
}

export function drawMinimap(
  player: MinimapTarget,
  enemies: EnemyWithGroup[] | null,
  chests: THREE.Group[] | null,
  crystals: CrystalWithGroup[] | null
): void {
  if (!ctx) return;
  const w = 140;
  const h = 140;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,6,16,0.85)';
  ctx.fillRect(0, 0, w, h);

  const scale = 0.32;
  const PAD = 6;
  const inBounds = (mx: number, my: number) => mx > PAD && mx < w - PAD && my > PAD && my < h - PAD;
  const wx = (x: number) => w / 2 + (x - player.pos.x) * scale;
  const wy = (z: number) => h / 2 + (z - player.pos.z) * scale;

  if (enemies) {
    enemies.forEach((en) => {
      const mx = wx(en.group.position.x);
      const my = wy(en.group.position.z);
      if (!inBounds(mx, my)) return;
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f64';
      ctx.fill();
    });
  }

  if (chests) {
    chests.forEach((ch) => {
      if (ch.userData.opened) return;
      const mx = wx(ch.position.x);
      const my = wy(ch.position.z);
      if (!inBounds(mx, my)) return;
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    });
  }

  if (crystals) {
    crystals.forEach((c) => {
      if (!c.alive) return;
      const mx = wx(c.group.position.x);
      const my = wy(c.group.position.z);
      if (!inBounds(mx, my)) return;
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#0ff';
      ctx.fill();
    });
  }

  // player
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-player.yaw);
  ctx.fillStyle = '#0fa';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

