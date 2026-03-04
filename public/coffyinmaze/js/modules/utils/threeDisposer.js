// threeDisposer: Three.js objelerini güvenli şekilde dispose eder
export function disposeObject(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => mat.dispose && mat.dispose());
    } else {
      obj.material.dispose && obj.material.dispose();
    }
  }
  if (obj.texture) obj.texture.dispose && obj.texture.dispose();
  if (obj.children) {
    obj.children.forEach(child => disposeObject(child));
  }
} 