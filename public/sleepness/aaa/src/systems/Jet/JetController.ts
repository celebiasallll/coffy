import * as THREE from 'three';
// F-16 Controller with Crash Logic
import RAPIER from '@dimforge/rapier3d-compat';
import { updateFlightPhysics, FlightState } from './FlightPhysics';
import { jetInputSystem } from './InputSystem';
import { jetCamera } from './CameraFollow';
import { audioManager } from '../../core/AudioManager';
import { getHeight } from '../../world/terrain';
import { getPhysicsWorld } from '../../core/physics';
import { spawnBurst } from '../particles';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let jet: {
    mesh: THREE.Group;
    rb: RAPIER.RigidBody;
    state: FlightState;
    isOccupied: boolean;
    flameMesh: THREE.Object3D;
    exhaustLight: THREE.PointLight;
} | null = null;

// ─── Controller Public API ──────────────────────────────────────────────────
export function spawnJet(scene: THREE.Scene, world: RAPIER.World, pos: THREE.Vector3): void {
    const mesh = buildF16Mesh(scene);

    const rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
    const rb = world.createRigidBody(rbDesc);
    
    // ── Compound Collider (v14.2 - Corrected Half-Extents) ──
    // Visual length is 10.5, so half-length for Z is 5.25
    const fuseCol = RAPIER.ColliderDesc.cuboid(2.5, 0.8, 5.0).setMass(8500)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(fuseCol, rb);
    
    // 2. Landing Gear Spheres (Z offsets scaled by 0.7 from original 7.0 / 4.2)
    const wheelRadius = 1.0; 
    const wf = RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(0, -4.6, -5.0).setRestitution(0.1).setFriction(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const wl = RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(-5.2, -4.6, 3.0).setRestitution(0.1).setFriction(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const wr = RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(5.2, -4.6, 3.0).setRestitution(0.1).setFriction(0.5)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(wf, rb);
    world.createCollider(wl, rb);
    world.createCollider(wr, rb);

    const light = new THREE.PointLight(0xff6600, 0, 18);
    light.position.set(0, 0, 5.25);   // nozzle exit (world matched)
    mesh.add(light);

    jet = {
        mesh,
        rb,
        state: { throttle: 0, afterburner: false, speed: 0, altitude: 0, isCrashed: false, prevSpeed: 0 },
        isOccupied: false,
        flameMesh: mesh.getObjectByName('afterburner')!,
        exhaustLight: light,
    };

    initJetHUD();
}

export function updateJet(dt: number, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!jet) return;

    const input = jetInputSystem.update(dt);
    if (jet.isOccupied) {
        // --- SAFE RAYCAST GROUND DETECTION (v10.0 - No QueryFilter) ---
        const pos = jet.rb.translation();
        const physicsWorld = getPhysicsWorld();
        
        // Start ray 5.0m below center to avoid self-collision with fuselage/wings
        const rayOffset = 5.0;
        const rayOrigin = { x: pos.x, y: pos.y - rayOffset, z: pos.z };
        const rayDir = { x: 0, y: -1, z: 0 };
        const ray = new RAPIER.Ray(rayOrigin, rayDir);
        
        // maxToi=300, solid=true
        const hit = physicsWorld.castRay(ray, 300, true);
        
        let groundY = getHeight(pos.x, pos.z); // Terrain fallback
        if (hit) {
            // @ts-ignore
            const toi = (hit.timeOfImpact !== undefined) ? hit.timeOfImpact : (hit as any).toi;
            const rayHitY = (pos.y - rayOffset) - toi;
            // Use hit Y only if it's higher than terrain (e.g. building/bridge)
            if (rayHitY > groundY) groundY = rayHitY;
        }

        updateFlightPhysics(jet.rb, dt, jet.state, input, groundY);
        jetCamera.update(camera, jet.mesh, jet.state.speed, jet.state.afterburner, dt, input.roll);

        // v9.0: Camera Mode Cycle (V Key) - Güçlendirilmiş Latch (v9.1)
        if (jetInputSystem.isKeyPressed('KeyV')) {
            jetCamera.cycleMode();
        }

        const p = jet.rb.translation();
        const r = jet.rb.rotation();
        jet.mesh.position.set(p.x, p.y, p.z);
        jet.mesh.quaternion.set(r.x, r.y, r.z, r.w);

        updateFX(jet, dt);
        updateJetHUD(jet.state.speed, jet.state.altitude, jet.state.afterburner, jet.state.throttle);

        // --- v17.0: REINFORCED IMPACT DETECTION (G-Force & Raycast) ---
        if (jet && !jet.state.isCrashed && jet.state.speed > 20) { // v24.0: (40 -> 20)
            const physicsWorld = getPhysicsWorld();
            const pos = jet.rb.translation();
            const rot = jet.rb.rotation();
            const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
            const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);

            // 1. Forward-Looking Radar (Building/Hill Impact)
            // Nose is ~10.5m from center. v19.0: Sadece yere yakınken (alt < 40) aktif.
            const ray = new RAPIER.Ray(pos, { x: fwd.x, y: fwd.y, z: fwd.z });
            const hit = physicsWorld.castRay(ray, 15, true); 
            if (hit && (hit as any).toi < 12.0 && jet.state.speed > 25 && jet.state.altitude < 40) { // v24.0: (50 -> 25)
                jet.state.isCrashed = true;
                console.error(`[JET CRASH] Forward Radar Hit. Dist: ${(hit as any).toi.toFixed(2)}, Speed: ${jet.state.speed.toFixed(1)}`);
            }

            // 2. Abrupt Velocity Drop (G-Force Delta)
            // v19.0: Threshold 25'ten 45'e çıkarıldı + Alt < 50m koruması eklendi.
            const delta = jet.state.prevSpeed - jet.state.speed;
            if (!jet.state.isCrashed && delta > 22.5 && jet.state.altitude < 50) { // v24.0: (45 -> 22.5)
                jet.state.isCrashed = true;
                console.error(`[JET CRASH] Sudden Halt (G-Force). Delta: ${delta.toFixed(1)}`);
            }

            // 3. Contact Pair Fallback
            if (!jet.state.isCrashed) {
                for (let i = 0; i < jet.rb.numColliders(); i++) {
                    const collider = jet.rb.collider(i);
                    physicsWorld.contactPairsWith(collider, (other) => {
                        if (jet!.state.isCrashed) return;
                        const otherRB = other.parent();
                        if (otherRB && otherRB.handle === jet!.rb.handle) return;
                        const isStatic = !otherRB;
                        if (isStatic || (otherRB && otherRB.mass() > 20)) {
                            jet!.state.isCrashed = true;
                            console.error(`[JET CRASH] Physical Contact. IsStatic: ${isStatic}, Speed: ${jet!.state.speed.toFixed(1)}`);
                        }
                    });
                }
            }
        }

        // --- CRASH HANDLING ---
        if (jet.state.isCrashed) {
            handleJetCrash(jet, scene);
        }
    } else {
        const p = jet.rb.translation();
        updateFlightPhysics(
            jet.rb, dt, jet.state,
            { ...input, throttleUp: false, throttleDown: false, pitch: 0, roll: 0, yaw: 0, afterburner: false, descend: false },
            getHeight(p.x, p.z)
        );
        const r = jet.rb.rotation();
        jet.mesh.position.set(p.x, p.y, p.z);
        jet.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
}

// ── FX ───────────────────────────────────────────────────────────────────────
function updateFX(j: NonNullable<typeof jet>, dt: number): void {
    // 1. Exhaust point-light
    const targetIntensity = j.state.afterburner ? 130 : (j.state.throttle > 0.1 ? 25 : 0);
    j.exhaustLight.intensity = THREE.MathUtils.lerp(j.exhaustLight.intensity, targetIntensity, dt * 6.0);

    // 2. Layered afterburner flame
    if (j.state.afterburner) {
        j.flameMesh.visible = true;
        const t = Date.now();

        j.flameMesh.children.forEach((child, i) => {
            const phase = t * (0.025 + i * 0.006);
            const radialPulse = 1.0 + Math.sin(phase) * (0.05 + i * 0.03);
            const lengthPulse = 1.0 + Math.sin(phase * 0.7) * (0.12 + i * 0.04);
            child.scale.set(radialPulse, radialPulse, lengthPulse);

            if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = (0.92 - i * 0.22) * (0.9 + Math.sin(phase * 1.4) * 0.1);
            }
        });

        // Kırmızı boost alev efektleri kalsın, sarılar silindi
        if (Math.random() > 0.8) spawnBurst(j.mesh.position, 0xff3300, 3, 2);
    } else {
        j.flameMesh.visible = false;
    }
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function getJetAltitude(): number {
    return jet?.state.altitude || 0;
}

export function tryEnterJet(playerPos: THREE.Vector3): boolean {
    if (!jet || jet.isOccupied) return false;
    const p = jet.rb.translation();
    const dist = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    if (dist < 8) { jet.isOccupied = true; showJetHUD(true); return true; }
    return false;
}

export function exitJet(): THREE.Vector3 {
    if (jet) {
        jet.isOccupied = false;
        showJetHUD(false);
        const p = jet.rb.translation();
        return new THREE.Vector3(p.x + 5, p.y, p.z);
    }
    return new THREE.Vector3();
}

export function getJetNearInfo(playerPos: THREE.Vector3): { dist: number } | null {
    if (!jet || jet.isOccupied) return null;
    const p = jet.rb.translation();
    const dist = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    return dist < 15 ? { dist } : null;
}

export const getJetPosition = () => { if (!jet) return null; const p = jet.rb.translation(); return new THREE.Vector3(p.x, p.y, p.z); };
export const getJetMesh = () => jet?.mesh ?? null;
export const getJetRb = () => jet?.rb ?? null;
export const isJetOccupied = () => jet?.isOccupied ?? false;

// ═══════════════════════════════════════════════════════════════════════════
//  F-16 HIGH-DETAIL MESH BUILDER
//  Coordinate system:  +Z = nose,  –Z = tail/nozzle  (pre-scale)
//  Final group.scale = (2, 2, 2)
// ═══════════════════════════════════════════════════════════════════════════
function buildF16Mesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();

    // ── Materials ────────────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7e8e9e, metalness: 0.85, roughness: 0.18 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: 0.7, roughness: 0.35 });
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, metalness: 0.95, roughness: 0.08 });
    const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x1a2d44, metalness: 0.2, roughness: 0.1, opacity: 0.6, transparent: true,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.9, roughness: 0.2 });

    const bodyGeos: THREE.BufferGeometry[] = [];
    const darkGeos: THREE.BufferGeometry[] = [];

    // ── 1. FUSELAGE (Scaled Z by 0.7) ────────────────────────────────────
    const fuselagePoints = [
        new THREE.Vector2(0.04, -5.25), new THREE.Vector2(0.28, -4.62), new THREE.Vector2(0.52, -3.64),
        new THREE.Vector2(0.70, -2.45), new THREE.Vector2(0.78, -1.26), new THREE.Vector2(0.84, 0.0),
        new THREE.Vector2(0.82, 1.26), new THREE.Vector2(0.80, 2.24), new THREE.Vector2(0.72, 3.5),
        new THREE.Vector2(0.76, 4.34), new THREE.Vector2(0.68, 5.25),
    ];
    const fuselageGeo = new THREE.LatheGeometry(fuselagePoints, 12);
    fuselageGeo.rotateX(Math.PI / 2);
    bodyGeos.push(fuselageGeo);

    // ── 2. COCKPIT FRAME & SPINE (Dark) ──────────────────────────────────
    const frameGeo = new THREE.TorusGeometry(0.68, 0.045, 8, 24, Math.PI);
    frameGeo.rotateY(Math.PI / 2);
    frameGeo.translate(0, 0.68, -1.68); // -2.4 * 0.7
    darkGeos.push(frameGeo);

    const spineGeo = new THREE.BoxGeometry(0.06, 0.06, 1.68); // 2.4 * 0.7
    spineGeo.rotateX(0.12);
    spineGeo.translate(0, 0.95, -1.61); // -2.3 * 0.7
    darkGeos.push(spineGeo);

    // ── HELPER: Explicit quad panel ──────────────────────────────────────
    type P3 = [number, number, number];
    function getPanelGeo(p0: P3, p1: P3, p2: P3, p3: P3, thick: number): THREE.BufferGeometry {
        const t = thick / 2;
        const pos = new Float32Array([
            p0[0], p0[1] + t, p0[2], p1[0], p1[1] + t, p1[2], p2[0], p2[1] + t, p2[2], p3[0], p3[1] + t, p3[2],
            p0[0], p0[1] - t, p0[2], p1[0], p1[1] - t, p1[2], p2[0], p2[1] - t, p2[2], p3[0], p3[1] - t, p3[2],
        ]);
        const idx = [
            0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4,
        ];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const uvs = new Float32Array(8 * 2); // 8 vertices, 2 floats each
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    // ── 3. LEX / WINGS / STABILATORS (Body - Scaled Z by 0.7) ───────────
    bodyGeos.push(getPanelGeo([0.2, -0.12, -2.24], [1.6, -0.12, 0.21], [1.3, -0.12, 0.21], [0.2, -0.12, -2.06], 0.06));
    bodyGeos.push(getPanelGeo([-0.2, -0.12, -2.24], [-1.6, -0.12, 0.21], [-1.3, -0.12, 0.21], [-0.2, -0.12, -2.06], 0.06));
    bodyGeos.push(getPanelGeo([0.38, -0.28, -0.7], [4.98, -0.28, 0.14], [4.98, -0.28, 1.05], [0.78, -0.28, 1.96], 0.09));
    bodyGeos.push(getPanelGeo([-0.38, -0.28, -0.7], [-4.98, -0.28, 0.14], [-4.98, -0.28, 1.05], [-0.78, -0.28, 1.96], 0.09));
    bodyGeos.push(getPanelGeo([0.38, -0.18, 2.45], [2.68, -0.18, 3.08], [2.68, -0.18, 3.92], [0.38, -0.18, 4.27], 0.07));
    bodyGeos.push(getPanelGeo([-0.38, -0.18, 2.45], [-2.68, -0.18, 3.08], [-2.68, -0.18, 3.92], [-0.38, -0.18, 4.27], 0.07));

    // Tail Fin
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0); finShape.lineTo(-1.6, 2.2); finShape.lineTo(-1.4, 3.7);
    finShape.lineTo(0.6, 3.7); finShape.lineTo(1.6, 0); finShape.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.10, bevelEnabled: false });
    finGeo.rotateX(-Math.PI / 2); finGeo.rotateZ(Math.PI / 2); finGeo.translate(-0.05, -0.05, 1.68); // 2.4 * 0.7
    bodyGeos.push(finGeo);

    // Intake Lip
    const lipGeo = new THREE.TorusGeometry(0.36, 0.055, 10, 18, Math.PI);
    lipGeo.rotateY(Math.PI / 2); lipGeo.translate(0, -0.68, -2.17); // -3.1 * 0.7
    bodyGeos.push(lipGeo);

    // ── 4. AIR INTAKE / RAILS / NOZZLE INTERIOR (Dark) ───────────────────
    const intakeGeo = new THREE.BoxGeometry(0.92, 0.52, 2.66); // 3.8 * 0.7
    intakeGeo.translate(0, -0.68, -0.84); // -1.2 * 0.7
    darkGeos.push(intakeGeo);

    for (const side of [-1, 1]) {
        const rail = new THREE.CylinderGeometry(0.045, 0.045, 0.59, 8); // 0.85 * 0.7
        rail.rotateZ(Math.PI / 2); rail.translate(side * 4.8, -0.28, 0.56); // 0.8 * 0.7
        darkGeos.push(rail);

        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: side === 1 ? 0xff2200 : 0x22ff44 }));
        navLight.position.set(side * 5.0, -0.28, 0.63); // 0.9 * 0.7
        group.add(navLight);
    }

    const throatGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.35, 18); // 0.5 * 0.7
    throatGeo.rotateX(Math.PI / 2); throatGeo.translate(0, 0, 5.28); // 7.55 * 0.7
    darkGeos.push(throatGeo);

    // ── 5. MERGE & ADD ───────────────────────────────────────────────────
    const toNonIndexed = (geos: THREE.BufferGeometry[]) => {
        return geos.map(g => {
            const nonIndexed = g.index ? g.toNonIndexed() : g;
            // Ensure UV exists (v11.9 safety)
            if (!nonIndexed.getAttribute('uv')) {
                const uvs = new Float32Array((nonIndexed.getAttribute('position').count) * 2);
                nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }
            return nonIndexed;
        });
    };

    if (bodyGeos.length > 0) {
        const mergedBody = BufferGeometryUtils.mergeGeometries(toNonIndexed(bodyGeos));
        if (mergedBody) {
            const bodyMesh = new THREE.Mesh(mergedBody, bodyMat);
            bodyMesh.castShadow = bodyMesh.receiveShadow = true;
            group.add(bodyMesh);
        }
    }
    if (darkGeos.length > 0) {
        const mergedDark = BufferGeometryUtils.mergeGeometries(toNonIndexed(darkGeos));
        if (mergedDark) {
            const darkMesh = new THREE.Mesh(mergedDark, darkMat);
            darkMesh.castShadow = darkMesh.receiveShadow = true;
            group.add(darkMesh);
        }
    }

    // ── 6. DYNAMIC / SEPARATE PARTS ──────────────────────────────────────
    // 6a. Canopy (Scaled Z by 0.7)
    const canopyGeo = new THREE.SphereGeometry(0.66, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.scale.set(1.0, 0.62, 1.36); // 1.95 * 0.7
    canopy.position.set(0, 0.48, -1.61); // -2.3 * 0.7
    group.add(canopy);

    // 6b. Nozzle Housing & Petals (Exhaust Mat - Scaled Z by 0.7)
    const nozzleHousingGeo = new THREE.CylinderGeometry(0.72, 0.65, 0.98, 18); // 1.4 * 0.7
    const nozzleHousing = new THREE.Mesh(nozzleHousingGeo, exhaustMat);
    nozzleHousing.rotation.x = Math.PI / 2; nozzleHousing.position.set(0, 0, 4.9); // 7.0 * 0.7
    nozzleHousing.castShadow = true;
    group.add(nozzleHousing);

    const PETAL_COUNT = 12;
    for (let i = 0; i < PETAL_COUNT; i++) {
        const angle = (i / PETAL_COUNT) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.38), exhaustMat); // 0.55 * 0.7
        petal.position.set(Math.cos(angle) * 0.63, Math.sin(angle) * 0.63, 5.28); // 7.55 * 0.7
        petal.rotation.z = angle; petal.rotation.x = 0.12;
        petal.castShadow = true;
        group.add(petal);
    }

    // ── 9. AFTERBURNER FLAME (Scaled Z by 0.7) ──────────────────────────
    const flameGroup = new THREE.Group();
    flameGroup.name = 'afterburner';
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.24, 10), new THREE.MeshBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.92 })); // 3.2 * 0.7
    core.rotation.x = -Math.PI / 2; core.position.z = 0.56; // 0.8 * 0.7
    const midFlame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.36, 10), new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.70 })); // 4.8 * 0.7
    midFlame.rotation.x = -Math.PI / 2; midFlame.position.z = 0.7; // 1.0 * 0.7
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.60, 4.2, 10), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.40 })); // 6.0 * 0.7
    outerFlame.rotation.x = -Math.PI / 2; outerFlame.position.z = 0.84; // 1.2 * 0.7
    flameGroup.add(core, midFlame, outerFlame);

    for (let d = 0; d < 3; d++) {
        const diamond = new THREE.Mesh(new THREE.TorusGeometry(0.18 - d * 0.04, 0.05, 8, 12), new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.30 - d * 0.08 }));
        diamond.rotation.x = Math.PI / 2; diamond.position.z = 1.12 + d * 0.91; // 1.6*0.7, 1.3*0.7
        flameGroup.add(diamond);
    }
    flameGroup.position.set(0, 0, 5.46); // 7.8 * 0.7
    flameGroup.visible = false;
    group.add(flameGroup);

    // ── 10. LANDING GEAR (Scaled Z by 0.7) ─────────────────────────────
    const gearDefs = [{ pos: new THREE.Vector3(0, 0, -1.75) }, { pos: new THREE.Vector3(-1.3, 0, 1.05) }, { pos: new THREE.Vector3(1.3, 0, 1.05) }]; // -2.5*0.7, 1.5*0.7
    for (const def of gearDefs) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), strutMat);
        strut.position.set(def.pos.x, -0.75, def.pos.z);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.17, 14), wheelMat);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(def.pos.x, -1.18, def.pos.z);
        group.add(strut, wheel);
    }

    group.scale.set(2, 2, 2);
    group.traverse(obj => { if (obj instanceof THREE.Mesh) obj.frustumCulled = true; });
    scene.add(group);
    return group;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════════════════
let jetHudEl: HTMLElement | null = null;
let jetSpeedEl: HTMLElement | null = null;
let jetAltEl: HTMLElement | null = null;
let jetThrBar: HTMLElement | null = null;

export function initJetHUD(): void {
    if (document.getElementById('jet-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'jet-hud';
    hud.style.cssText = `
        position:fixed; top:65px; left:50%; transform:translateX(-50%);
        display:none; gap:20px; padding:10px 20px;
        background:rgba(0,10,20,0.82); border-radius:10px;
        color:#00e5ff; font-family:monospace; pointer-events:none; z-index:100;
    `;
    hud.innerHTML = `
        <div style="text-align:center">SPEED<br><span id="jet-speed" style="font-size:24px">0</span> <small>kts</small></div>
        <div style="text-align:center">ALT<br><span id="jet-alt" style="font-size:24px">0</span> <small>ft</small></div>
        <div style="text-align:center">THR<br>
            <div style="width:50px;height:10px;background:#222;border-radius:3px">
                <div id="jet-thr-bar" style="width:0%;height:100%;background:#00ff88;border-radius:3px;transition:width 0.1s"></div>
            </div>
        </div>
    `;
    document.body.appendChild(hud);
    jetHudEl = hud;
    jetSpeedEl = document.getElementById('jet-speed');
    jetAltEl = document.getElementById('jet-alt');
    jetThrBar = document.getElementById('jet-thr-bar');
}

export function showJetHUD(visible: boolean): void {
    if (jetHudEl) jetHudEl.style.display = visible ? 'flex' : 'none';
    const mobileJetPanel = document.getElementById('jet-controls-mobile');
    if (mobileJetPanel) mobileJetPanel.style.display = visible ? 'flex' : 'none';
    
    const mobileYawPanel = document.getElementById('jet-yaw-controls');
    if (mobileYawPanel) mobileYawPanel.style.display = visible ? 'flex' : 'none';

    const charActions = document.getElementById('char-actions');
    if (charActions) charActions.style.display = visible ? 'none' : 'flex';
}

function updateJetHUD(s: number, a: number, ab: boolean, thr: number): void {
    if (!jetSpeedEl) return;
    jetSpeedEl.textContent = Math.round(s * 1.944).toString();
    jetAltEl!.textContent = Math.round(a * 3.281).toString();
    jetThrBar!.style.width = Math.round(thr * 100) + '%';
    jetThrBar!.style.background = ab ? '#ff6600' : '#00ff88';
}

let crashTriggered = false;
function handleJetCrash(j: NonNullable<typeof jet>, scene: THREE.Scene): void {
    if (crashTriggered) return;
    crashTriggered = true;

    // 1. Physical Stop
    j.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    j.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // 2. Visual Explosion & Sound (v18.0 Cinematic Overhaul)
    const pos = new THREE.Vector3().copy(j.mesh.position);
    // Shift up slightly to ensure core is above ground
    pos.y += 2.5;

    // A. Massive Fireball (Central)
    spawnBurst(pos, 0xffbb00, 180, 25, 4.0); // Fast large fire
    spawnBurst(pos, 0xff4400, 120, 15, 3.5); // Secondary fire
    
    // B. Billowing Smoke
    spawnBurst(pos, 0x222222, 100, 8, 5.0);  // Dark dense smoke
    spawnBurst(pos, 0x555555, 100, 6, 6.5);  // Rising grey smoke
    
    // C. Debris
    spawnBurst(pos, 0x999999, 80, 12, 1.5);  // Small debris
    spawnBurst(pos, 0x444444, 40, 20, 2.0);  // Fast fragments

    // D. Cinematic Flash Sphere (Manual)
    const flashGeom = new THREE.SphereGeometry(1, 12, 12);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 1.0 });
    const flashSphere = new THREE.Mesh(flashGeom, flashMat);
    flashSphere.position.copy(pos);
    scene.add(flashSphere);

    // E. Dynamic Point Light (Vastly Buffed)
    const flash = new THREE.PointLight(0xffaa44, 800, 120);
    flash.position.copy(pos);
    scene.add(flash);

    // Animation Loop for Flash
    let flashTicks = 0;
    const animateFlash = () => {
        flashTicks++;
        const s = 1 + flashTicks * 8.5; // Massive expansion
        flashSphere.scale.set(s, s, s);
        flashMat.opacity *= 0.85; // Fast fade
        flash.intensity *= 0.92;
        
        if (flashTicks < 30) {
            requestAnimationFrame(animateFlash);
        } else {
            scene.remove(flashSphere);
            scene.remove(flash);
            flashGeom.dispose();
            flashMat.dispose();
        }
    };
    animateFlash();

    try {
        audioManager.playSFX('assets/sounds/explosion.mp3', 1.0);
    } catch (e) {}

    // 3. Hide Jet
    j.mesh.visible = false;

    // 4. Game Over Trigger
    import('../score.js').then(({ triggerGameOver }) => {
        setTimeout(() => triggerGameOver(), 1500);
    });
}
