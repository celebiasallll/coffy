import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { updateFlightPhysics, FlightState } from './FlightPhysics';
import { jetInputSystem } from './InputSystem';
import { jetCamera } from './CameraFollow';
import { audioManager } from '../../core/AudioManager';
import { composer, renderComposer, updateBloomForState } from '../../core/postprocessing';
// [CHANGED] updateABVFX removed — replaced with updateBloomForState
import { getHeight } from '../../world/terrain';
import { getPhysicsWorld } from '../../core/physics';
import { spawnBurst, spawnExplosion, spawnExhaustParticle } from '../particles';
// [CHANGED] spawnExplosion and spawnExhaustParticle added
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _rayOrigin = { x: 0, y: 0, z: 0 };
const _rayDir = { x: 0, y: -1, z: 0 };
const _cachedRay = new RAPIER.Ray(_rayOrigin, _rayDir);

const _q1 = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _euler = new THREE.Euler();

interface JetState {
    mesh: THREE.Group;
    rb: RAPIER.RigidBody;
    thrust: number;
    afterburner: boolean;
    speed: number;
    altitude: number;
    gForce: number;
    roll: number;
    pitch: number;
    gearFactor: number;
    gearMeshes: THREE.Object3D[];
    isOccupied: boolean;
    flameMesh: THREE.Object3D;
    exhaustLight: THREE.PointLight;
    state: FlightState;
    fuseColliderHandle: number;
    wheelColliderHandles: number[];
}

let jet: JetState | null = null;
let crashTriggered = false;
let jetStuckTimer = 0; // [NEW] Stuck detection timer for the jet

class JetAudio {
    private engine: THREE.Audio | null = null;
    private wind: THREE.Audio | null = null;
    private initialized = false;

    public update(throttle: number, speed: number, afterburner: boolean, isOccupied: boolean) {
        if (!isOccupied) {
            if (this.engine?.isPlaying) this.engine.stop();
            if (this.wind?.isPlaying) this.wind.stop();
            return;
        }
        if (!this.initialized) {
            this.engine = audioManager.createEngineSound('assets/sounds/engine_loop.mp3', 0);
            this.wind = audioManager.createAmbientSound('assets/sounds/ambient.mp3', 0);
            this.initialized = true;
        }
        if (this.engine && !this.engine.isPlaying) {
            try { this.engine.play(); } catch (e) { }
        }
        if (this.wind && !this.wind.isPlaying) {
            try { this.wind.play(); } catch (e) { }
        }
        if (this.engine) {
            const basePitch = 0.65 + throttle * 0.55;
            const abPitch = afterburner ? 0.15 : 0;
            this.engine.setPlaybackRate(basePitch + abPitch);
            this.engine.setVolume(0.14 + throttle * 0.16 + (afterburner ? 0.25 : 0));
        }
        if (this.wind) {
            const windVol = Math.min(speed / 400, 1.0) * 0.42;
            this.wind.setVolume(windVol);
            this.wind.setPlaybackRate(0.7 + (speed / 400) * 0.6);
        }
    }

    public stop() {
        this.engine?.stop();
        this.wind?.stop();
    }
}
const jetAudio = new JetAudio();

export function spawnJet(scene: THREE.Scene, world: RAPIER.World, pos: THREE.Vector3): void {
    const mesh = buildF16Mesh(scene);
    const rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setCcdEnabled(true);
    const rb = world.createRigidBody(rbDesc);

    // [v80.2]: F-16 Collider Scaled to Match 2.0x Mesh (21m long, 20m wingspan)
    // Cuboid arguments are half-extents. 
    // Fuselage: 10.5m half-length, 1.5m half-width, 1.2m half-height.
    const fuseCol = RAPIER.ColliderDesc.cuboid(1.5, 1.2, 10.5).setMass(8500)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const fuseCollider = world.createCollider(fuseCol, rb);
    const fuseHandle = fuseCollider.handle;

    // Wing Colliders (To prevent clipping)
    const wingL = RAPIER.ColliderDesc.cuboid(4.5, 0.1, 1.5).setTranslation(-4.5, -0.55, 0.6)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const wingR = RAPIER.ColliderDesc.cuboid(4.5, 0.1, 1.5).setTranslation(4.5, -0.55, 0.6)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const cWL = world.createCollider(wingL, rb);
    const cWR = world.createCollider(wingR, rb);

    // Ön tekerlek (Takeoff Asistanı) - Sürtünme 0'a çekildi, 'takılma' engellendi
    const wheelRadius = 0.55;
    const wf = RAPIER.ColliderDesc.ball(wheelRadius * 1.3).setTranslation(0, -2.8, -3.5).setRestitution(0.0).setFriction(0.0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const wl = RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(-2.6, -2.4, 2.1).setRestitution(0.0).setFriction(0.01)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const wr = RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(2.6, -2.4, 2.1).setRestitution(0.0).setFriction(0.01)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const cf = world.createCollider(wf, rb);
    const cl = world.createCollider(wl, rb);
    const cr = world.createCollider(wr, rb);

    const light = new THREE.PointLight(0xff6600, 0, 18);
    light.position.set(0, 0, 5.25);
    mesh.add(light);

    const jetObj: JetState = {
        mesh,
        rb,
        thrust: 0,
        afterburner: false,
        speed: 0,
        altitude: pos.y,
        gForce: 1,
        roll: 0,
        pitch: 0,
        gearFactor: 1.0,
        gearMeshes: [],
        isOccupied: false,
        flameMesh: mesh.getObjectByName('afterburner')!,
        exhaustLight: light,
        state: {
            throttle: 0, afterburner: false, speed: 0, altitude: -9999,
            isCrashed: false, prevSpeed: 0, health: 100,
            stallFactor: 1.0, isStalling: false, gForce: 1.0
        },
        fuseColliderHandle: fuseHandle,
        wheelColliderHandles: [cf.handle, cl.handle, cr.handle, cWL.handle, cWR.handle]
    };

    mesh.traverse(obj => {
        if (obj.name.includes('GearPart')) jetObj.gearMeshes.push(obj);
    });

    jet = jetObj;
    crashTriggered = false;
    jetPrevVel.set(0, 0, 0);
    initJetHUD();
}

const jetPrevVel = new THREE.Vector3();

export function updateJet(dt: number, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (!jet) return;

    const input = jetInputSystem.update(dt);
    if (jet.isOccupied) {
        jet.state.prevSpeed = jet.state.speed;

        if (!jet.rb) return;
        const pos = jet.rb.translation();
        const physicsWorld = getPhysicsWorld();

        const rayOffset = 10.0;
        _rayOrigin.x = pos.x;
        _rayOrigin.y = pos.y + rayOffset; // [FIXED] Lazer artık uçağın 10m yukarısından başlıyor
        _rayOrigin.z = pos.z;
        _cachedRay.origin = _rayOrigin;

        const hit = physicsWorld.castRay(_cachedRay, 300, true);
        let groundY = getHeight(pos.x, pos.z);
        if (hit && hit.collider && hit.collider.parent()?.handle !== jet.rb.handle) {
            // @ts-ignore
            const toi = (hit.timeOfImpact !== undefined) ? hit.timeOfImpact : (hit as any).toi;
            if (toi > 0.01) {
                const rayHitY = (pos.y + rayOffset) - toi;
                if (rayHitY > groundY) groundY = rayHitY;
            }
        }

        if (!jet.rb) return;
        const lv = jet.rb.linvel();
        if (!jet.mesh.userData.linvel) {
            jet.mesh.userData.linvel = new THREE.Vector3();
        }
        (jet.mesh.userData.linvel as THREE.Vector3).set(lv.x, lv.y, lv.z);
        jet.mesh.userData.prevSpeed = jet.state.prevSpeed;

        const dv = _v1.set(lv.x - jetPrevVel.x, lv.y - jetPrevVel.y, lv.z - jetPrevVel.z);
        const acc = dv.length() / Math.max(dt, 0.001);
        const gForce = 1.0 + acc / 9.81;
        jetPrevVel.set(lv.x, lv.y, lv.z);

        _q1.copy(jet.mesh.quaternion);
        _fwd.set(0, 0, -1).applyQuaternion(_q1);

        if (!jet) return;
        updateFlightPhysics(jet.rb, dt, jet.state, input, groundY);
        jetAudio.update(jet.state.throttle, jet.state.speed, jet.state.afterburner, jet.isOccupied);

        // Gear retraction
        const LANDING_GEAR_THRESHOLD = 20.0;
        const targetGear = jet.state.altitude < LANDING_GEAR_THRESHOLD ? 1.0 : 0.0;
        jet.gearFactor = THREE.MathUtils.lerp(jet.gearFactor, targetGear, dt * 2.0);
        jet.gearMeshes.forEach(m => {
            m.scale.set(jet!.gearFactor, jet!.gearFactor, jet!.gearFactor);
            m.visible = jet!.gearFactor > 0.01;
        });

        // [2026] Sync mesh with physics body IMMEDIATELY before camera update to fix jitter
        if (!jet.rb) return;
        const p = jet.rb.translation();
        const r = jet.rb.rotation();
        jet.mesh.position.set(p.x, p.y, p.z);
        jet.mesh.quaternion.set(r.x, r.y, r.z, r.w);

        // [CHANGED] Pass gForce and stallFactor from FlightState to camera
        jetCamera.update(
            camera, jet.mesh, jet.state.speed, jet.state.afterburner, dt, input,
            scene,                 // [2026] Added scene for occlusion
            jet.state.gForce,      // [NEW] G-force for camera effects
            jet.state.stallFactor  // [NEW] Stall factor for stall warning
        );

        // [CHANGED] updateABVFX → updateBloomForState (not dead code anymore)
        updateBloomForState(jet.state.afterburner, jet.state.throttle);

        // Damage Smoke
        if (jet.state.health < 80) {
            const smokePos = _v1.copy(jet.mesh.position).add(_v2.copy(_fwd).multiplyScalar(-5.0));
            if (Math.random() > 0.88) spawnBurst(smokePos, 0x666666, 1, 1, 3.0);
            if (jet.state.health < 40 && Math.random() > 0.80) spawnBurst(smokePos, 0x111111, 2, 2, 5.0);
        }

        if (jetInputSystem.isKeyPressed('KeyC')) {
            jetInputSystem.clearKey('KeyC');
            jetCamera.cycleMode();
        }

        updateFX(jet, dt);

        // [STUCK DETECTION v10.9] - If thrusting but stationary (e.g. nose in wall)
        if (jet.isOccupied && !jet.state.isCrashed) {
            const isThrusting = jet.state.throttle > 0.4; // High throttle
            const isStationary = jet.state.speed < 4.0;  // Very low speed
            
            if (isThrusting && isStationary) {
                jetStuckTimer += dt;
            } else {
                jetStuckTimer = 0;
            }

            if (jetStuckTimer > 4.0) {
                jet.state.isCrashed = true;
                console.error(`[JET] Stuck detected (Throttle: ${jet.state.throttle.toFixed(1)}, Speed: ${jet.state.speed.toFixed(1)}). Triggering explosion.`);
            }
        }

        _q1.copy(jet.mesh.quaternion);
        _euler.setFromQuaternion(_q1, 'YXZ');
        updateJetHUD(jet.state.speed, jet.state.altitude, jet.state.afterburner, jet.state.throttle, jet.state.gForce, _euler.z, _euler.x);

        const maxRecentSpeed = Math.max(jet.state.speed, jet.state.prevSpeed);
        if (jet && !jet.state.isCrashed && maxRecentSpeed > 25) {
            let shouldCrash = false;
            let crashReason = '';

            const delta = (jet.state.prevSpeed - jet.state.speed) / Math.max(dt, 0.001);
            const isNoseUp = _fwd.y > 0.1;
            const isAtAlt = jet.state.altitude > 10.0;
            const deltaLimit = isAtAlt ? 8000 : (isNoseUp ? 4000 : 25000); // [RELAXED] Massive increase to avoid terrain bumps causing 'Sudden Halt' crashes

            // [FIXED]: Sadece Event-Driven kontrol bazen yüksek hızlı dikey çakılmaları kaçırabilir.
            // Bu yüzden "Penetration" ve "Nose Dive" gibi hafif matematiksel kontrolleri (O(1)) geri ekliyoruz.
            if (delta > deltaLimit) {
                shouldCrash = true;
                crashReason = `Sudden Halt (Delta: ${delta.toFixed(1)} / Limit: ${deltaLimit})`;
            }
            if (!shouldCrash && _fwd.y < -0.45 && jet.state.altitude < 1.0 && (delta > 600 || jet.state.altitude < -2.0)) {
                shouldCrash = true;
                crashReason = `Nose Dive Impact`;
            }
            if (!shouldCrash && jet.state.altitude < -2.5 && maxRecentSpeed > 40) {
                shouldCrash = true;
                crashReason = `Ground Penetration`;
            }
            if (!shouldCrash && _fwd.y < -0.45 && jet.state.altitude < 1.0 && (delta > 600 || jet.state.altitude < -2.0)) {
                shouldCrash = true;
                crashReason = `Nose Dive Impact`;
            }
            if (!shouldCrash && jet.state.altitude < -2.5 && maxRecentSpeed > 40) {
                shouldCrash = true;
                crashReason = `Ground Penetration`;
            }
        // [EVOLVED]: expensive contactPairsWith polling loop REMOVED.
        // Collision detection is now handled by handleJetCollisionEvent (Event-Driven).

            if (shouldCrash) {
                jet.state.isCrashed = true;
                console.error(`[JET CRASH] ${crashReason}`);
            }
        }

        if (jet.state.isCrashed) {
            handleJetCrash(jet, scene);
            return;
        }
    } else {
        if (!jet.rb) return;
        const p = jet.rb.translation();
        const groundY = getHeight(p.x, p.z);
        updateFlightPhysics(
            jet.rb, dt, jet.state,
            { throttleUp: false, throttleDown: false, pitch: 0, roll: 0, yaw: 0, afterburner: false, descend: false },
            groundY
        );
        jetAudio.update(0, jet.state.speed, false, false);
        const r = jet.rb.rotation();
        jet.mesh.position.set(p.x, p.y, p.z);
        jet.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
}

function updateFX(j: NonNullable<typeof jet>, dt: number): void {
    const targetIntensity = j.state.afterburner ? 130 : (j.state.throttle > 0.1 ? 25 : 0);
    j.exhaustLight.intensity = THREE.MathUtils.lerp(j.exhaustLight.intensity, targetIntensity, dt * 6.0);

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
    } else {
        j.flameMesh.visible = false;
    }
}

export function getJetAltitude(): number { return jet?.state.altitude || 0; }

export function tryEnterJet(playerPos: THREE.Vector3): boolean {
    if (!jet || jet.isOccupied) return false;
    const p = jet.rb.translation();
    const dist = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    if (dist < 8) { 
        jet.isOccupied = true; 
        jetCamera.needsImmediateSnap = true;
        showJetHUD(true); 
        return true; 
    }
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

export const getJetPosition = () => {
    if (!jet) return null;
    // If physics body is gone (crashed), fallback to mesh position
    try {
        const p = jet.rb.translation();
        return new THREE.Vector3(p.x, p.y, p.z);
    } catch (e) {
        return jet.mesh.position.clone();
    }
};
export const getJetMesh = () => jet?.mesh ?? null;
export const getJetRb = () => jet?.rb ?? null;
export const isJetOccupied = () => jet?.isOccupied ?? false;

// ── F-16 Mesh Builder (unchanged) ────────────────────────────────────────────
function buildF16Mesh(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();

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

    const fuselagePoints = [
        new THREE.Vector2(0.04, -5.25), new THREE.Vector2(0.28, -4.62), new THREE.Vector2(0.52, -3.64),
        new THREE.Vector2(0.70, -2.45), new THREE.Vector2(0.78, -1.26), new THREE.Vector2(0.84, 0.0),
        new THREE.Vector2(0.82, 1.26), new THREE.Vector2(0.80, 2.24), new THREE.Vector2(0.72, 3.5),
        new THREE.Vector2(0.76, 4.34), new THREE.Vector2(0.68, 5.25),
    ];
    const fuselageGeo = new THREE.LatheGeometry(fuselagePoints, 12);
    fuselageGeo.rotateX(Math.PI / 2);
    bodyGeos.push(fuselageGeo);

    const frameGeo = new THREE.TorusGeometry(0.68, 0.045, 8, 24, Math.PI);
    frameGeo.rotateY(Math.PI / 2);
    frameGeo.translate(0, 0.68, -1.68);
    darkGeos.push(frameGeo);

    const spineGeo = new THREE.BoxGeometry(0.06, 0.06, 1.68);
    spineGeo.rotateX(0.12);
    spineGeo.translate(0, 0.95, -1.61);
    darkGeos.push(spineGeo);

    type P3 = [number, number, number];
    function getPanelGeo(p0: P3, p1: P3, p2: P3, p3: P3, thick: number): THREE.BufferGeometry {
        const t = thick / 2;
        const pos = new Float32Array([
            p0[0], p0[1] + t, p0[2], p1[0], p1[1] + t, p1[2], p2[0], p2[1] + t, p2[2], p3[0], p3[1] + t, p3[2],
            p0[0], p0[1] - t, p0[2], p1[0], p1[1] - t, p1[2], p2[0], p2[1] - t, p2[2], p3[0], p3[1] - t, p3[2],
        ]);
        const idx = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 3, 6, 7, 3, 7, 0, 0, 7, 4];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const uvs = new Float32Array(8 * 2);
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    }

    bodyGeos.push(getPanelGeo([0.2, -0.12, -2.24], [1.6, -0.12, 0.21], [1.3, -0.12, 0.21], [0.2, -0.12, -2.06], 0.06));
    bodyGeos.push(getPanelGeo([-0.2, -0.12, -2.24], [-1.6, -0.12, 0.21], [-1.3, -0.12, 0.21], [-0.2, -0.12, -2.06], 0.06));
    bodyGeos.push(getPanelGeo([0.38, -0.28, -0.7], [4.98, -0.28, 0.14], [4.98, -0.28, 1.05], [0.78, -0.28, 1.96], 0.09));
    bodyGeos.push(getPanelGeo([-0.38, -0.28, -0.7], [-4.98, -0.28, 0.14], [-4.98, -0.28, 1.05], [-0.78, -0.28, 1.96], 0.09));
    bodyGeos.push(getPanelGeo([0.38, -0.18, 2.45], [2.68, -0.18, 3.08], [2.68, -0.18, 3.92], [0.38, -0.18, 4.27], 0.07));
    bodyGeos.push(getPanelGeo([-0.38, -0.18, 2.45], [-2.68, -0.18, 3.08], [-2.68, -0.18, 3.92], [-0.38, -0.18, 4.27], 0.07));

    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0); finShape.lineTo(-1.6, 2.2); finShape.lineTo(-1.4, 3.7);
    finShape.lineTo(0.6, 3.7); finShape.lineTo(1.6, 0); finShape.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.10, bevelEnabled: false });
    finGeo.rotateX(-Math.PI / 2); finGeo.rotateZ(Math.PI / 2); finGeo.translate(-0.05, -0.05, 1.68);
    bodyGeos.push(finGeo);

    // [REMOVED] intakeGeo and lipGeo originally under the chassis were removed per user request.

    for (const side of [-1, 1]) {
        const rail = new THREE.CylinderGeometry(0.045, 0.045, 0.59, 8);
        rail.rotateZ(Math.PI / 2); rail.translate(side * 4.8, -0.28, 0.56);
        darkGeos.push(rail);
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: side === 1 ? 0xff2200 : 0x22ff44 }));
        navLight.position.set(side * 5.0, -0.28, 0.63);
        group.add(navLight);
    }

    const throatGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.35, 18);
    throatGeo.rotateX(Math.PI / 2); throatGeo.translate(0, 0, 5.28);
    darkGeos.push(throatGeo);

    const toNonIndexed = (geos: THREE.BufferGeometry[]) =>
        geos.map(g => {
            const ni = g.index ? g.toNonIndexed() : g;
            if (!ni.getAttribute('uv')) {
                const uvs = new Float32Array(ni.getAttribute('position').count * 2);
                ni.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }
            return ni;
        });

    if (bodyGeos.length > 0) {
        const merged = BufferGeometryUtils.mergeGeometries(toNonIndexed(bodyGeos));
        if (merged) { const m = new THREE.Mesh(merged, bodyMat); m.castShadow = m.receiveShadow = true; group.add(m); }
    }
    if (darkGeos.length > 0) {
        const merged = BufferGeometryUtils.mergeGeometries(toNonIndexed(darkGeos));
        if (merged) { const m = new THREE.Mesh(merged, darkMat); m.castShadow = m.receiveShadow = true; group.add(m); }
    }

    const canopyGeo = new THREE.SphereGeometry(0.66, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.scale.set(1.0, 0.62, 1.36); canopy.position.set(0, 0.48, -1.61);
    group.add(canopy);

    const nozzleHousingGeo = new THREE.CylinderGeometry(0.72, 0.65, 0.98, 18);
    const nozzleHousing = new THREE.Mesh(nozzleHousingGeo, exhaustMat);
    nozzleHousing.rotation.x = Math.PI / 2; nozzleHousing.position.set(0, 0, 4.9); nozzleHousing.castShadow = true;
    group.add(nozzleHousing);

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.38), exhaustMat);
        petal.position.set(Math.cos(angle) * 0.63, Math.sin(angle) * 0.63, 5.28);
        petal.rotation.z = angle; petal.rotation.x = 0.12; petal.castShadow = true;
        group.add(petal);
    }

    const flameGroup = new THREE.Group();
    flameGroup.name = 'afterburner';
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.24, 10), new THREE.MeshBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.92 }));
    core.rotation.x = -Math.PI / 2; core.position.z = 0.56;
    const midFlame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.36, 10), new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.70 }));
    midFlame.rotation.x = -Math.PI / 2; midFlame.position.z = 0.7;
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.60, 4.2, 10), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.40 }));
    outerFlame.rotation.x = -Math.PI / 2; outerFlame.position.z = 0.84;
    flameGroup.add(core, midFlame, outerFlame);
    for (let d = 0; d < 3; d++) {
        const diamond = new THREE.Mesh(new THREE.TorusGeometry(0.18 - d * 0.04, 0.05, 8, 12), new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.30 - d * 0.08 }));
        diamond.rotation.x = Math.PI / 2; diamond.position.z = 1.12 + d * 0.91;
        flameGroup.add(diamond);
    }
    flameGroup.position.set(0, 0, 5.46); flameGroup.visible = false;
    group.add(flameGroup);

    const gearDefs = [{ pos: new THREE.Vector3(0, 0, -1.75) }, { pos: new THREE.Vector3(-1.3, 0, 1.05) }, { pos: new THREE.Vector3(1.3, 0, 1.05) }];
    for (let i = 0; i < gearDefs.length; i++) {
        const def = gearDefs[i];
        const isFront = i === 0;
        
        // Ön tekerlek %20 daha büyük ve uzun, böylece uçak pistte burnu havaya kalkık durur
        const scaleMul = isFront ? 1.2 : 1.0;
        const strutLength = 0.75 * scaleMul;
        const strutY = -strutLength; 

        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scaleMul, 0.045 * scaleMul, strutLength, 8), strutMat);
        strut.name = 'GearPart_Strut'; strut.position.set(def.pos.x, strutY, def.pos.z); strut.frustumCulled = false;
        
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * scaleMul, 0.27 * scaleMul, 0.17 * scaleMul, 14), wheelMat);
        wheel.name = 'GearPart_Wheel'; wheel.rotation.z = Math.PI / 2; wheel.position.set(def.pos.x, strutY - (strutLength / 2) - 0.05, def.pos.z); wheel.frustumCulled = false;
        
        group.add(strut, wheel);
    }

    group.scale.set(2, 2, 2);
    group.traverse(obj => { if (obj instanceof THREE.Mesh) obj.frustumCulled = true; });
    scene.add(group);
    return group;
}

// ── HUD ───────────────────────────────────────────────────────────────────────
let jetHudEl: HTMLElement | null = null;
let jetSpeedEl: HTMLElement | null = null;
let jetAltEl: HTMLElement | null = null;
let jetThrBar: HTMLElement | null = null;
let jetGEl: HTMLElement | null = null;
let jetHorizonEl: HTMLElement | null = null;

export function initJetHUD(): void {
    if (document.getElementById('jet-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'jet-hud';
    hud.style.cssText = `
        position:fixed;top:45px;left:50%;transform:translateX(-50%) scale(0.7);transform-origin:top center;
        display:none;gap:20px;padding:10px 20px;
        background:rgba(0,10,20,0.82);border-radius:10px;
        color:#00e5ff;font-family:monospace;pointer-events:none;z-index:100;opacity:0.7;
    `;
    hud.innerHTML = `
        <div style="text-align:center">SPEED<br><span id="jet-speed" style="font-size:24px">0</span> <small>kts</small></div>
        <div style="position:relative;width:120px;height:120px;border:2px solid rgba(255,255,255,0.2);border-radius:50%;overflow:hidden;background:rgba(0,100,200,0.2)">
            <div id="jet-horizon" style="position:absolute;top:50%;left:-50%;width:200%;height:200%;background:linear-gradient(to bottom,#4488ff 50%,#884422 50%);transform-origin:center;transition:transform 0.1s linear"></div>
            <div style="position:absolute;top:50%;left:50%;width:30px;height:2px;background:white;transform:translateX(-50%)"></div>
        </div>
        <div style="text-align:center">ALT<br><span id="jet-alt" style="font-size:24px">0</span> <small>ft</small></div>
        <div style="text-align:center">G<br><span id="jet-g" style="font-size:24px">1.0</span></div>
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
    jetGEl = document.getElementById('jet-g');
    jetHorizonEl = document.getElementById('jet-horizon');
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

function updateJetHUD(s: number, a: number, ab: boolean, thr: number, g: number, roll: number, pitch: number): void {
    if (!jetSpeedEl) return;
    jetSpeedEl.textContent = Math.round(s * 1.944).toString();
    jetAltEl!.textContent = Math.round(a * 3.281).toString();
    jetThrBar!.style.width = Math.round(thr * 100) + '%';
    jetThrBar!.style.background = ab ? '#ff6600' : '#00ff88';
    if (jetGEl) {
        jetGEl.textContent = g.toFixed(1);
        // G-force color: green < 3G, yellow 3-6G, red > 6G
        jetGEl.style.color = g > 6 ? '#ff3300' : g > 3 ? '#ffaa00' : '#00e5ff';
    }
    if (jetHorizonEl) {
        jetHorizonEl.style.transform = `rotate(${-roll}rad) translateY(${pitch * 45}px)`;
    }
}

export function handleJetCollisionEvent(h1: number, h2: number): void {
    if (!jet || jet.state.isCrashed) return;
    
    // RAPiER Collision Events provide COLLIDER handles, not RigidBody handles.
    const isFuselage = (h1 === jet.fuseColliderHandle || h2 === jet.fuseColliderHandle);
    const isWing = jet.wheelColliderHandles.slice(3).includes(h1) || jet.wheelColliderHandles.slice(3).includes(h2);
    const isWheel = jet.wheelColliderHandles.slice(0, 3).includes(h1) || jet.wheelColliderHandles.slice(0, 3).includes(h2);

    if (isFuselage || isWing) {
        const vel = jet.rb.linvel();
        const verticalVelocity = Math.abs(vel.y);
        const totalSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        
        // [CRASH v10.5] Crash on high speed landing/impact (> 70.0 total speed or > 30.0 vertical)
        if (verticalVelocity > 30.0 || totalSpeed > 70.0) {
            jet.state.isCrashed = true;
            console.error(`[JET CRASH] Critical Impact (Speed: ${totalSpeed.toFixed(1)}, Vert: ${verticalVelocity.toFixed(1)})`);
        } else {
            console.log(`[JET] Fuselage Scraping / Tail-Strike Detected`);
        }
    } else if (isWheel && jet.state.prevSpeed > 220) { 
        // [2026] Increased wheel impact threshold (220)
        jet.state.isCrashed = true;
        console.error(`[JET CRASH] Hard Landing / High Speed Wheel Impact`);
    }
}

function handleJetCrash(j: NonNullable<typeof jet>, scene: THREE.Scene): void {
    if (crashTriggered) return;
    crashTriggered = true;

    const pos = new THREE.Vector3().copy(j.mesh.position);
    pos.y += 4.0;

    console.log(`%c[VFX] Jet Crashed at ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`, 'color:#ff3300;font-weight:bold;font-size:14px;');

    if (j.rb) {
        const physicsWorld = getPhysicsWorld();
        // @ts-ignore
        if (physicsWorld && typeof physicsWorld.removeRigidBody === 'function') {
            physicsWorld.removeRigidBody(j.rb);
        } else {
            j.rb.setTranslation({ x: pos.x, y: -9000, z: pos.z }, true);
            j.rb.sleep();
        }
        // @ts-ignore
        j.rb = null; // Prevent further access
    }

    // [CHANGED] Use spawnExplosion instead of manual cloud meshes
    // This gives proper physics-based fire, smoke, debris, sparks, and dust ring
    spawnExplosion(pos, 1.8, true); // intensity 1.8, ground impact = true

    // Keep the dramatic point light flash
    // Reduced intensity to avoid full-screen washout (was 6000)
    const flash = new THREE.PointLight(0xfff5dd, 1500, 150, 2.0);
    flash.position.copy(pos);
    scene.add(flash);

    let flashTicks = 0;
    const animateFlash = () => {
        flashTicks++;
        flash.intensity *= 0.85;
        if (flashTicks < 45) {
            requestAnimationFrame(animateFlash);
        } else {
            scene.remove(flash);
        }
    };
    animateFlash();

    try {
        audioManager.playSFX('assets/sounds/explosion.mp3', 1.0);
    } catch (e) { }

    j.mesh.visible = false;

    import('../score.js').then(({ triggerGameOver }) => {
        setTimeout(() => triggerGameOver(), 3500);
    });
}