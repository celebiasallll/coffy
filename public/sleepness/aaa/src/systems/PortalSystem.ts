import * as THREE from 'three';
import { getHeight } from '../world/terrain.js';

export interface Portal {
    id: string;
    position: THREE.Vector3;
    mesh: THREE.Group;
    radius: number;
    destination: string; // "puzzle", "shooting", etc.
}

export class PortalSystem {
    private portals: Portal[] = [];
    private scene: THREE.Scene;
    private clock: THREE.Clock = new THREE.Clock();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createPortal(id: string, x: number, z: number, destination: string = 'puzzle'): Portal {
        const y = getHeight(x, z);
        const position = new THREE.Vector3(x, y + 1.5, z);
        
        const group = new THREE.Group();
        group.position.copy(position);

        // -- Portal Visuals: [v55.0] Swirling Vortex (Raw Performance Shader) --
        const vortexGeo = new THREE.CircleGeometry(3.0, 32);
        const vortexMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x00e5ff) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv * 2.0 - 1.0;
                    float r = length(uv);
                    float angle = atan(uv.y, uv.x);
                    
                    // Swirling Motion (Polar Coordinates)
                    float swirl = angle + uTime * 2.5 + (1.0 / (r + 0.15)) * 1.5;
                    float pattern = sin(swirl * 6.0) * 0.5 + 0.5;
                    
                    // Edge Fade & Outer Glow
                    float mask = smoothstep(1.0, 0.2, r);
                    float edge = smoothstep(0.75, 0.95, r);
                    
                    // Central "Black Hole" effect
                    float core = smoothstep(0.25, 0.0, r);
                    
                    vec3 col = uColor * (pattern * mask + edge * 2.0);
                    col += vec3(0.5, 0.9, 1.0) * edge * 3.0; // Outer white-blue edge
                    
                    gl_FragColor = vec4(col * (1.0 - core), mask + edge);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const vortex = new THREE.Mesh(vortexGeo, vortexMat);
        group.add(vortex);

        // Vortex Frame (High Glow)
        const frameGeo = new THREE.TorusGeometry(3.1, 0.1, 8, 32);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 8,
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        group.add(frame);

        // Light
        const light = new THREE.PointLight(0x00e5ff, 15, 20);
        light.position.set(0, 0, 1.5);
        group.add(light);

        this.scene.add(group);

        const portal: Portal = {
            id,
            position,
            mesh: group,
            radius: 4.0,
            destination
        };

        this.portals.push(portal);
        return portal;
    }

    update(dt: number, time: number) {
        this.portals.forEach(portal => {
            // Update Shader Uniforms and Animate Frame
            portal.mesh.children.forEach((child: any) => {
                if (child.isMesh) {
                    if (child.material instanceof THREE.ShaderMaterial) {
                        child.material.uniforms.uTime.value = time;
                    } else if (child.geometry.type === 'TorusGeometry') {
                        child.rotation.z += dt * 0.4;
                        child.rotation.y += dt * 0.2;
                    }
                }
            });

            // Pulse the point light for "living" effect
            const light = portal.mesh.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight;
            if (light) {
                light.intensity = 12 + Math.sin(time * 4) * 4;
            }

            // Gentle float effect
            portal.mesh.position.y = portal.position.y + Math.sin(time * 2) * 0.1;
        });
    }

    checkProximity(playerPos: THREE.Vector3): Portal | null {
        for (const portal of this.portals) {
            const dist = playerPos.distanceTo(portal.position);
            if (dist < portal.radius) {
                return portal;
            }
        }
        return null;
    }

    getPortals(): Portal[] {
        return this.portals;
    }
}
