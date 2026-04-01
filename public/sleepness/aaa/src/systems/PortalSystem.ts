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
    light: THREE.PointLight;
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

    // Thin rotating ring bands — cheap
    float swirl   = theta + uTime * 1.8 + r * 4.0;
    float bands   = sin(swirl * 5.0) * 0.5 + 0.5;

    // Rim glow
    float rim     = smoothstep(1.0, 0.6, r) * smoothstep(0.4, 0.8, r);
    // Core fade
    float core    = smoothstep(0.0, 0.35, r);
    float mask    = smoothstep(1.05, 0.85, r);

    vec3 col = uColor * (bands * rim * 0.7 + rim * 0.4);
    col += vec3(0.6, 1.0, 1.0) * pow(rim, 3.0) * 1.5;

    // Reduced opacity to 50% max (mask * core * 0.5)
    float alpha = mask * core * 0.5;
    gl_FragColor = vec4(col, alpha);
}`;

// ── Reuse geometry across all portals ────────────────────────────────────────
let _diskGeo: THREE.CircleGeometry    | null = null;
let _ringGeo: THREE.TorusGeometry     | null = null;

function getDiskGeo()  { return (_diskGeo ??= new THREE.CircleGeometry(4.8, 32));         }
function getRingGeo()  { return (_ringGeo ??= new THREE.TorusGeometry(5.04, 0.12, 4, 32)); }

// ════════════════════════════════════════════════════════════════════════════
export class PortalSystem {
    private portals: Portal[] = [];
    private scene:   THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createPortal(id: string, x: number, z: number, destination = 'puzzle', color = 0x00d4ff): Portal {
        const y        = getHeight(x, z);
        const position = new THREE.Vector3(x, y + 4.0, z); // Floating higher for 2x size

        const group = new THREE.Group();
        group.position.copy(position);

        // ── Vortex disc (single draw call, shared geometry) ──────────────────
        const vortexMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime:  { value: 0 },
                uColor: { value: new THREE.Color(color) },
            },
            vertexShader:   VERT,
            fragmentShader: FRAG,
            transparent:    true,
            depthWrite:     false,
            side:           THREE.FrontSide, // FrontSide only to halve fragment work
        });
        const disk = new THREE.Mesh(getDiskGeo(), vortexMat);
        group.add(disk);

        // ── Thin frame ring (shared geometry, minimal poly) ──────────────────
        const frameMat = new THREE.MeshBasicMaterial({
            color:       color,
            transparent: true,
            opacity:     0.5,
        });
        const ring = new THREE.Mesh(getRingGeo(), frameMat);
        group.add(ring);

        // ── Single low-range point light ─────────────────────────────────────
        const light = new THREE.PointLight(color, 9, 18); // Reduced range/intensity for FPS
        light.position.set(0, 0, 0.5);
        light.castShadow = false; // Ensure no shadow casting for portal lights
        group.add(light);

        // ── Floating label sprite ─────────────────────────────────────────────
        const label = this._makeLabel('ENIGMA', color);
        label.position.set(0, 6.4, 0); // Label higher up for 2x size
        group.add(label);

        this.scene.add(group);

        const portal: Portal = { 
            id, 
            position, 
            mesh: group, 
            radius: 7.0, 
            destination,
            vortexMat,
            light
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

    update(dt: number, time: number) {
        for (const portal of this.portals) {
            // Gentle bob
            portal.mesh.position.y = portal.position.y + Math.sin(time * 1.4) * 0.08;

            // Direct material and light update (no traverse/find needed)
            portal.vortexMat.uniforms.uTime.value = time;
            portal.mesh.children.forEach(child => {
                if (child instanceof THREE.Mesh && child.geometry === getRingGeo()) {
                    child.rotation.z += dt * 0.35;
                }
            });

            // Pulse light directly via cached ref
            portal.light.intensity = 7 + Math.sin(time * 3.5) * 2;
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
