import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';

export interface Portal {
    id: string;
    position: THREE.Vector3;
    mesh: THREE.Group;
    radius: number;
    destination: string;
    // Cached refs for performance
    vortexMat: THREE.ShaderMaterial;
    rotatingMeshes: THREE.Mesh[];
}

// ── Lightweight shader ───────────────────────────────────────────────────────
const VERT = /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec3  uColor;
varying vec2  vUv;
void main() {
    vec2  uv    = vUv * 2.0 - 1.0;
    float r     = length(uv);
    float theta = atan(uv.y, uv.x);

    // Optimized swirl (single sin call, no pow/exp)
    float swirl = theta + uTime * 1.5;
    float bands = sin(swirl * 3.0) * 0.5 + 0.5;

    // Rim glow & mask
    float rim   = smoothstep(1.0, 0.5, r) * smoothstep(0.4, 0.9, r);
    float alpha = rim * 0.45;

    vec3 col = uColor * (bands * 0.35 + 0.65);
    col += vec3(0.5, 0.9, 1.0) * rim * 0.4;
    
    gl_FragColor = vec4(col, alpha);
}`;

// ── Reuse geometry across all portals ────────────────────────────────────────
let _circleGeo: THREE.CircleGeometry | null = null;
let _glowTex:  THREE.CanvasTexture | null = null;

function getCircleGeo() { return (_circleGeo ??= new THREE.CircleGeometry(0.5, 64)); }
function getGlowTex() {
    if (_glowTex) return _glowTex;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0,   "rgba(255, 255, 255, 1)");
    grd.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
    grd.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
    grd.addColorStop(1,   "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
    return (_glowTex = new THREE.CanvasTexture(canvas));
}

// ════════════════════════════════════════════════════════════════════════════
export class PortalSystem {
    private portals: Portal[] = [];
    private scene:   THREE.Scene;
    private sharedUniforms = { uTime: { value: 0 } }; // Global uniform for GPU upload optimization

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createPortal(id: string, x: number, z: number, destination = 'puzzle', color = 0x8a95a5): Portal {
        const y        = getHeight(x, z);
        const position = new THREE.Vector3(x, y + 4.0, z); // Floating higher for 2x size

        const group = new THREE.Group();
        group.position.copy(position);

        // ── Vortex disc (single draw call, 2 triangles only) ──────────────────
        const vortexMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime:  this.sharedUniforms.uTime, // Shared uTime object
                uColor: { value: new THREE.Color(color) },
            },
            vertexShader:   VERT,
            fragmentShader: FRAG,
            transparent:    true,
            depthWrite:     false,
            side:           THREE.FrontSide, 
        });
        const disk = new THREE.Mesh(getCircleGeo(), vortexMat);
        disk.scale.set(10.0, 10.0, 1); // Double radius equivalent (4.8 -> 10.0 scale)
        group.add(disk);

        // ── Thin frame ring (shared geometry, 2 triangles only) ──────────────
        const frameMat = new THREE.MeshBasicMaterial({
            color:       color,
            transparent: true,
            opacity:     0.25, // Lower opacity: only for wireframe feel
        });
        const ring = new THREE.Mesh(getCircleGeo(), frameMat);
        ring.scale.set(10.5, 10.5, 1);
        group.add(ring);

        // ── High Performance Fake Light (Glow Sprite) ────────────────────────
        const glowMat = new THREE.SpriteMaterial({
            map: getGlowTex(),
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.6,
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(24, 24, 1); // Large aura
        glow.position.z = -0.5; // Slightly behind
        group.add(glow);

        // ── Floating label sprite ─────────────────────────────────────────────
        const label = this._makeLabel('ENIGMA', color);
        label.position.set(0, 6.4, 0); // Label higher up for 2x size
        group.add(label);

        this.scene.add(group);

        // Cache children for fast update
        const rotatingMeshes = group.children.filter(c => 
            c instanceof THREE.Mesh && c.geometry === getCircleGeo() && c !== disk
        ) as THREE.Mesh[];

        const portal: Portal = { 
            id, 
            position, 
            mesh: group, 
            radius: 7.0, 
            destination,
            vortexMat,
            rotatingMeshes
        };
        this.portals.push(portal);
        return portal;
    }

    // ── Label sprite (canvas texture, created once per portal) ───────────────
    private _makeLabel(text: string, color: number): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width  = 512; // High-res for 2x size
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, 512, 128);
        ctx.font         = 'bold 44px "Bebas Neue", monospace';
        ctx.letterSpacing = '12px';
        ctx.fillStyle    = '#' + new THREE.Color(color).getHexString();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha  = 0.5; // 50% Transparent label
        ctx.fillText(text, 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const spr = new THREE.Sprite(mat);
        spr.scale.set(5.6, 1.4, 1); // Double label scale
        return spr;
    }

    update(dt: number, time: number, playerPos: THREE.Vector3) {
        this.sharedUniforms.uTime.value = time; // Single uniform upload for all materials

        for (const portal of this.portals) {
            // -- Distance Culling --
            const distSq = playerPos.distanceToSquared(portal.position);
            if (distSq > 200 * 200) {
               if (portal.mesh.visible) {
                   portal.mesh.visible = false;
                   portal.vortexMat.uniforms.uTime.value = 0; // Stop shader when out of range
               }
               continue;
            }
            portal.mesh.visible = true;

            // Gentle bob
            portal.mesh.position.y = portal.position.y + Math.sin(time * 1.4) * 0.08;

            // Direct rotation (fast loop, no checks)
            for (const rMesh of portal.rotatingMeshes) {
                rMesh.rotation.z += dt * 0.35;
                rMesh.rotation.x += dt * 0.15; // Give it a mystic wobble
                rMesh.rotation.y += dt * 0.2;
            }
            // Make the portal disc always face the player for a true 3D vortex illusion
            portal.mesh.lookAt(playerPos.x, portal.mesh.position.y, playerPos.z);
        }
    }

    checkProximity(playerPos: THREE.Vector3): Portal | null {
        for (const portal of this.portals) {
            if (playerPos.distanceTo(portal.position) < portal.radius) return portal;
        }
        return null;
    }

    getPortals(): Portal[] { return this.portals; }

    dispose() {
        for (const portal of this.portals) {
            this.scene.remove(portal.mesh);
            portal.mesh.traverse(obj => {
                if (obj instanceof THREE.Mesh) {
                    (obj.material as THREE.Material).dispose();
                }
                if (obj instanceof THREE.Sprite) {
                    (obj.material as THREE.SpriteMaterial).map?.dispose();
                    (obj.material as THREE.Material).dispose();
                }
            });
        }
        this.portals = [];
    }
}
