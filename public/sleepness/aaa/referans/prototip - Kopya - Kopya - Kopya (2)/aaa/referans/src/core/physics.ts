import RAPIER from '@dimforge/rapier3d-compat';

function interactionGroups(membership: number, filter: number): number {
  return (membership & 0xFFFF) | ((filter & 0xFFFF) << 16);
}

// ── Collision Groups ─────────────────────────────────────────────────────────
export const GROUP_TERRAIN = 0x0001;
export const GROUP_VEHICLE = 0x0002;
export const GROUP_PLAYER = 0x0004;
export const GROUP_NPC = 0x0008;
export const GROUP_STATIC = 0x0010;

let world: RAPIER.World | null = null;

export async function initPhysics(): Promise<RAPIER.World> {
  if (world) return world;
  await RAPIER.init();
  world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 }); // This is correct for @dimforge/rapier3d-compat
  return world;
}

export function getPhysicsWorld(): RAPIER.World {
  if (!world) throw new Error('[Physics] initPhysics() henüz bitmedi!');
  return world;
}

/**
 * FIX (KRİTİK): Terrain için Rapier heightfield collider oluşturur.
 * Bu olmadan araçlar (dynamic RigidBody) çarpmak için zemin bulamaz ve düşer.
 *
 * @param heights  terrain.ts'den alınan yükseklik değerleri (row-major, nRows * nCols)
 * @param nRows    X eksenindeki örnek sayısı
 * @param nCols    Z eksenindeki örnek sayısı
 * @param scaleX   Terrain'in dünya-uzayı X boyutu
 * @param scaleZ   Terrain'in dünya-uzayı Z boyutu
 */
export function createTerrainCollider(
  heights: Float32Array,
  nRows: number,
  nCols: number,
  scaleX: number,
  scaleZ: number
): RAPIER.Collider {
  const w = getPhysicsWorld();
  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
  const groundBody = w.createRigidBody(groundBodyDesc);

  // Rapier heightfield scale is the size of ONE CELL.
  // Visual mesh size is scaleX, segments is nRows-1.
  const cellSizeX = scaleX / (nRows - 1);
  const cellSizeZ = scaleZ / (nCols - 1);

  const colliderDesc = RAPIER.ColliderDesc.heightfield(
    nRows - 1,
    nCols - 1,
    heights,
    { x: cellSizeX, y: 1.0, z: cellSizeZ }
  )
    .setFriction(0.8)
    .setRestitution(0.1)
    .setCollisionGroups(interactionGroups(GROUP_TERRAIN, 0xFFFF));

  // NO TRANSLATION NEEDED if scale is correct and visual is centered.
  // Rapier heightfield with N rows/cols and cell-size S will have total size (N-1)*S.
  // It is centered at (0,0,0) by default.

  return w.createCollider(colliderDesc, groundBody);
}
