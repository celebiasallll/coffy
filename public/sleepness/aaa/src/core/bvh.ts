import * as THREE from 'three';
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast
} from 'three-mesh-bvh';

export function initBVH(): void {
  // @ts-ignore
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  // @ts-ignore
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
}

export function applyBVH(mesh: THREE.Mesh): void {
  if (mesh.geometry) {
    // @ts-ignore
    mesh.geometry.computeBoundsTree();
  }
}
