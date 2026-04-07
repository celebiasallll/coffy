import * as THREE from 'three';
import { threeToSoloNavMesh, NavMeshHelper } from '@recast-navigation/three';
import { init as initRecast, NavMeshQuery, Vector3 } from '@recast-navigation/core';

let navMeshFree: any = null;
let navMeshHelper: NavMeshHelper | null = null;
let navMeshQuery: NavMeshQuery | null = null;

export async function initNavMesh(scene: THREE.Scene, terrainMesh: THREE.Mesh) {
  await initRecast();

  // 1) Bake NavMesh from terrain geometry
  // Config for large open world terrain
  const config = {
    cs: 3.0,           // Further increased for 3000m terrain stability
    ch: 1.0,           // Further increased
    walkableSlopeAngle: 35,
    walkableHeight: 2,
    walkableClimb: 1.0,
    walkableRadius: 1,
    maxEdgeLen: 30,
    maxSimplificationError: 1.8,
    minRegionArea: 32,
    mergeRegionArea: 80,
    maxVertsPerPoly: 6,
    detailSampleDist: 15,
    detailSampleMaxError: 3,
  };

  try {
    const { navMesh } = threeToSoloNavMesh([terrainMesh], config);
    if (!navMesh) {
      console.error('❌ NavMesh baking returned undefined');
      return;
    }
    navMeshFree = navMesh;
    navMeshQuery = new NavMeshQuery(navMesh);

    // 2) Visualization (Dev Mode)
    navMeshHelper = new NavMeshHelper(navMesh);
    
    // Safety check for helper material
    const helper = navMeshHelper as any;
    const mat = helper.material || (helper.children && helper.children[0] && (helper.children[0] as any).material);

    if (mat) {
      mat.side = THREE.DoubleSide;
      mat.opacity = 0.4;
      mat.transparent = true;
    }
    
    // scene.add(navMeshHelper); // Debug görselleştirmesi kapatıldı
    console.log('✅ NavMesh baked and visualized');
  } catch (err) {
    console.error('❌ NavMesh baking failed:', err);
  }
}

export function findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] | null {
  if (!navMeshQuery) return null;
  
  try {
    const { path } = navMeshQuery.computePath(
      { x: start.x, y: start.y, z: start.z },
      { x: end.x, y: end.y, z: end.z }
    );
    
    return path.map(p => new THREE.Vector3(p.x, p.y, p.z));
  } catch (e) {
    return null;
  }
}

export function getNavMesh() {
  return navMeshFree;
}
