import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getHeight } from '../world/terrain.js';
import { getPhysicsWorld, GROUP_VEHICLE } from '../core/physics.js';
import { VehicleController, VehicleConfig } from '../core/VehicleController.js';
import { audioManager } from '../core/AudioManager.js';
import { registerInteractable } from './InteractionSystem.js';
import { vehicleKeys } from '../main.js';

export type VehicleType = 'atv' | 'jeep';

export interface Vehicle {
    type: VehicleType;
    controller: VehicleController;
    isOccupied: boolean;
    enterRadius: number;
    fuel: number;
    maxFuel: number;
    fuelBurnRate: number;
    engineSoundA?: THREE.Audio;
    engineSoundB?: THREE.Audio;
    activeBuffer: 'A' | 'B';
    nextSwitchTime: number;
    engineTimer: number;
}

const vehicles: Vehicle[] = [];

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────
function createPart(geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return mesh;
}

function createRoundedBox(
    parent: THREE.Group, mat: THREE.Material,
    w: number, h: number, d: number, r: number,
    x: number, y: number, z: number,
    rx = 0, ry = 0, rz = 0
): void {
    const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const iw = w - rr * 2, ih = h - rr * 2, id = d - rr * 2;

    const geometries: THREE.BufferGeometry[] = [];

    const b1 = new THREE.BoxGeometry(w, ih, id);
    const b2 = new THREE.BoxGeometry(iw, h, id);
    const b3 = new THREE.BoxGeometry(iw, ih, d);
    geometries.push(b1, b2, b3);

    const hw = iw / 2, hh = ih / 2, hd = id / 2;
    const sphereGeo = new THREE.SphereGeometry(rr, 8, 6);

    for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
            for (const sz of [-1, 1]) {
                const s = sphereGeo.clone();
                s.translate(sx * hw, sy * hh, sz * hd);
                geometries.push(s);
            }
        }
    }

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    parent.add(mesh);
}

function createSXSPanel(shape: THREE.Shape, depth: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    const extrudeSettings = { depth: depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    return mesh;
}

function createTubePath(points: THREE.Vector3[], radius: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, 32, radius, 12, false);
    const mesh = new THREE.Mesh(tubeGeom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    return mesh;
}

// ─── TEKERLEK VE GÖVDE OLUŞTURMA ──────────────────────────────────────────────
function buildWheelMesh(
    parent: THREE.Group,
    x: number, y: number, z: number,
    radius: number, width: number,
    tireMat: THREE.Material, rimMat: THREE.Material
): THREE.Group {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);

    const rimR = radius * 0.68;
    const hubR = radius * 0.14;
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0.1 });

    const tireGeos: THREE.BufferGeometry[] = [];
    const rimGeos: THREE.BufferGeometry[] = [];
    const holeGeos: THREE.BufferGeometry[] = [];
    const valveGeos: THREE.BufferGeometry[] = [];

    // ── Tire ──
    const sidewallGeo = new THREE.CylinderGeometry(radius, radius, width, 32);
    sidewallGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    tireGeos.push(sidewallGeo);

    [-1, 1].forEach(side => {
        const capGeo = new THREE.RingGeometry(rimR, radius, 32, 1);
        capGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
        capGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(side * (width / 2), 0, 0));
        tireGeos.push(capGeo);
    });

    const treads = 20;
    for (let i = 0; i < treads; i++) {
        const angle = (i / treads) * Math.PI * 2;
        const treadGeo = new THREE.BoxGeometry(width * 0.94, radius * 0.05, radius * 0.10);
        treadGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(angle));
        treadGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, Math.cos(angle) * radius, Math.sin(angle) * radius));
        tireGeos.push(treadGeo);
    }

    // ── Rim ──
    const barrelGeo = new THREE.CylinderGeometry(rimR, rimR, width, 28);
    barrelGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    rimGeos.push(barrelGeo);

    const holeCount = 8;
    const holeR = radius * 0.07;
    const holeDist = rimR * 0.65;

    [-1, 1].forEach(side => {
        const faceX = side * (width * 0.505);
        const faceDiskGeo = new THREE.CircleGeometry(rimR, 32);
        faceDiskGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
        faceDiskGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(faceX, 0, 0));
        rimGeos.push(faceDiskGeo);

        for (let i = 0; i < holeCount; i++) {
            const angle = (i / holeCount) * Math.PI * 2;
            const hGeo = new THREE.CircleGeometry(holeR, 12);
            hGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
            hGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(faceX + side * 0.001, Math.cos(angle) * holeDist, Math.sin(angle) * holeDist));
            holeGeos.push(hGeo);
        }

        const hubCapGeo = new THREE.CircleGeometry(hubR * 1.3, 16);
        hubCapGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
        hubCapGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(faceX + side * 0.02, 0, 0));
        rimGeos.push(hubCapGeo);

        const centerHoleGeo = new THREE.CircleGeometry(radius * 0.105, 12);
        centerHoleGeo.applyMatrix4(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
        centerHoleGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(faceX + side * 0.022, 0, 0));
        holeGeos.push(centerHoleGeo);
    });

    const hubGeo = new THREE.CylinderGeometry(hubR, hubR, width * 0.95, 16);
    hubGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    rimGeos.push(hubGeo);

    // ── Valve ──
    const valveGeo = new THREE.CylinderGeometry(radius * 0.018, radius * 0.018, radius * 0.12, 6);
    valveGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    valveGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(-(width * 0.52 + radius * 0.06), radius * 0.72, 0));
    valveGeos.push(valveGeo);

    // ── Merging ──
    const mergedTire = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(tireGeos), tireMat);
    mergedTire.castShadow = true;
    wg.add(mergedTire);

    const mergedRim = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(rimGeos), rimMat);
    mergedRim.castShadow = true;
    wg.add(mergedRim);

    const mergedHoles = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(holeGeos), holeMat);
    wg.add(mergedHoles);

    const valveMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.4 });
    const mergedValve = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(valveGeos), valveMat);
    wg.add(mergedValve);

    parent.add(wg);
    return wg;
}

function buildSuspensionVisual(
    parent: THREE.Group,
    chassisLocalPos: THREE.Vector3,
    wheelLocalPos: THREE.Vector3,
    metalMat: THREE.Material,
    springColor: number = 0xaaaaaa
): void {
    const springMat = new THREE.MeshStandardMaterial({
        color: springColor,
        roughness: 0.35,
        metalness: 0.82,
    });

    const dir = new THREE.Vector3().subVectors(wheelLocalPos, chassisLocalPos);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(chassisLocalPos, wheelLocalPos).multiplyScalar(0.5);

    const damperInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, length * 0.55, 8),
        metalMat
    );
    damperInner.position.copy(mid);
    damperInner.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
    );
    parent.add(damperInner);

    const damperOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.038, length * 0.38, 8),
        springMat
    );
    const outerPos = new THREE.Vector3().lerpVectors(chassisLocalPos, wheelLocalPos, 0.3);
    damperOuter.position.copy(outerPos);
    damperOuter.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
    );
    parent.add(damperOuter);

    const coils = 6;
    const springRadius = 0.055;
    const springPoints: THREE.Vector3[] = [];
    const steps = coils * 14;
    const springStart = new THREE.Vector3().lerpVectors(chassisLocalPos, wheelLocalPos, 0.18);
    const springEnd = new THREE.Vector3().lerpVectors(chassisLocalPos, wheelLocalPos, 0.82);

    const up = dir.clone().normalize();
    const arbitrary = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, arbitrary).normalize();
    const fwd = new THREE.Vector3().crossVectors(right, up).normalize();

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = t * coils * Math.PI * 2;
        const along = new THREE.Vector3().lerpVectors(springStart, springEnd, t);
        const rx = Math.cos(angle) * springRadius;
        const rz = Math.sin(angle) * springRadius;
        springPoints.push(
            along.clone().addScaledVector(right, rx).addScaledVector(fwd, rz)
        );
    }

    const springCurve = new THREE.CatmullRomCurve3(springPoints);
    const springTube = new THREE.TubeGeometry(springCurve, steps, 0.016, 6, false);
    parent.add(new THREE.Mesh(springTube, springMat));

    const armMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, length * 0.92, 8),
        metalMat
    );
    armMesh.position.copy(mid);
    armMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
    );
    parent.add(armMesh);
}

function createBody(x: number, y: number, z: number, hx: number, hy: number, hz: number, mass: number): RAPIER.RigidBody {
    const world = getPhysicsWorld();

    const rb = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setCanSleep(false)
            .setAdditionalMass(mass)
            .setLinearDamping(0.10)   // İvme momentumu için sönümleme azaltıldı (coasting artar)
            .setAngularDamping(1.2)   // dönüş sönümleme artırıldı (drift azalır, kontrol artar)
    );

    world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, hy, hz)
            .setFriction(0.7)         // zemin tutuşu artırıldı
            .setRestitution(0.05)     // zıplama azaltıldı
            .setTranslation(0, -hy * 0.5, 0) // ağırlık merkezi daha aşağıda
            .setCollisionGroups(GROUP_VEHICLE | 0xFFFF0000),
        rb
    );

    return rb;
}

// ─── SPAWN VE GÜNCELLEME ──────────────────────────────────────────────────────
export function spawnVehicles(scene: THREE.Scene): void {
    const world = getPhysicsWorld();

    // ATV
    const atvGroup = new THREE.Group();
    const atvSpawnX = 490, atvSpawnZ = 490;
    const atvStartY = getHeight(atvSpawnX, atvSpawnZ) + 2;
    const atvRB = createBody(atvSpawnX, atvStartY, atvSpawnZ, 2.1, 1.2, 3.6, 13500);
    atvGroup.position.set(atvSpawnX, atvStartY, atvSpawnZ);
    const atvConfig: VehicleConfig = {
        mass: 13500,
        maxSpeed: 55,           // hedef tepe hız — soft limit ile yumuşak ulaşılır
        acceleration: 77000,    // Tork %30 daha düşürüldü (110k -> 77k) - Daha ağır kalkış
        brakeForce: 320000,     // yüksek hızla orantılı fren
        steerSpeed: 2.5,        // Azaltıldı (3.5 -> 2.5): Daha ağır ve pürüzsüz dönüş
        suspensionStiffness: 900000,
        suspensionDamping: 108000,
        suspensionRestLength: 1.3,
        wheelRadius: 1.05,
        antiRoll: 220000,       // yüksek hızda devrilme riskine karşı artırıldı
    };
    const atv = new VehicleController(atvGroup, atvRB, world, atvConfig);

    // ── ATV Malzemeleri ────────────────────────────────────────────────────────
    const bodyMatATV = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.50, metalness: 0.35 });
    const plasticATV = new THREE.MeshStandardMaterial({ color: 0x881400, roughness: 0.72, metalness: 0.10 });
    const darkATV = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.85, metalness: 0.20 });
    const metalATV = new THREE.MeshStandardMaterial({ color: 0xb2b2b2, roughness: 0.28, metalness: 0.90 });
    const rubberATV = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1.00, metalness: 0.00 });
    // Mat siyah jant (ATV)
    const rimATV = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0 });
    const atvLensMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.05 });
    const atvTailMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 4.5, roughness: 0.05 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.92 });

    // ── Şasi / Ana çerçeve ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.38, 0.09, 0.92), darkATV, 0, 0.10, 0.00));
    // ── Motor bloğu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.36, 0.28, 0.40), darkATV, 0, 0.24, 0.04));
    // ── Gövde orta üst panel ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.60, 0.13, 0.64), bodyMatATV, 0, 0.37, 0.00));
    // ── Yakıt deposu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.34, 0.14, 0.30), bodyMatATV, 0, 0.47, 0.03));
    // ── Ön burun / kaput ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.22, 0.28), plasticATV, 0, 0.28, -0.60, -0.20, 0, 0));
    // ── Ön far yuvası ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.34, 0.11, 0.06), darkATV, 0, 0.38, -0.73));
    // ── Far lensi ve Işık ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.27, 0.07, 0.04), atvLensMat, 0, 0.38, -0.76));
    const atvLight = new THREE.PointLight(0xffffff, 8, 14);
    atvLight.position.set(0, 0.38, -0.85);
    atvGroup.add(atvLight);
    // ── Arka panel ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.50, 0.19, 0.24), plasticATV, 0, 0.27, 0.60, 0.18, 0, 0));
    // ── Stop lambaları ──
    [-0.18, 0.18].forEach(sx => atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.06, 0.04), atvTailMat, sx, 0.31, 0.73)));
    // ── Koltuk oturma yüzeyi ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.08, 0.52), darkATV, 0, 0.52, 0.12));
    atvGroup.add(createPart(new THREE.BoxGeometry(0.23, 0.04, 0.46), seatMat, 0, 0.56, 0.12));
    // ── Ön çamurluklar (sol/sağ) ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createPart(new THREE.BoxGeometry(0.20, 0.09, 0.38), plasticATV, sx * 0.41, 0.34, -0.44));
        atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.15, 0.34), plasticATV, sx * 0.47, 0.25, -0.44));
    });
    // ── Arka çamurluklar ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createPart(new THREE.BoxGeometry(0.20, 0.09, 0.36), plasticATV, sx * 0.41, 0.30, 0.52));
        atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.14, 0.32), plasticATV, sx * 0.47, 0.22, 0.52));
    });
    // ── Gidon sapı ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8), metalATV, 0, 0.54, -0.51));
    // ── Gidon çubuğu ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.020, 0.020, 0.72, 8), metalATV, 0, 0.65, -0.51, 0, 0, Math.PI / 2));
    // ── Gaz/fren tutacakları ──
    [-0.32, 0.32].forEach(sx => atvGroup.add(createPart(new THREE.CylinderGeometry(0.028, 0.028, 0.10, 8), darkATV, sx, 0.65, -0.51, 0, 0, Math.PI / 2)));
    // ── Basamaklar ──
    [-1, 1].forEach(sx => atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.03, 0.22), metalATV, sx * 0.46, 0.08, 0.10)));
    // ── Ön bagaj rafı ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.20), metalATV, 0, 0.39, -0.65));
    // ── Arka bagaj rafı ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.22), metalATV, 0, 0.38, 0.67));
    // ── Skid plakası ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.82), metalATV, 0, 0.04, 0.00));
    // ── Egzoz borusu ──
    atvGroup.add(createTubePath([
        new THREE.Vector3(0.20, 0.16, 0.08),
        new THREE.Vector3(0.30, 0.10, 0.34),
        new THREE.Vector3(0.32, 0.08, 0.60),
        new THREE.Vector3(0.29, 0.12, 0.74),
    ], 0.024, metalATV, 0, 0, 0));

    // ── Ön A-çerçeve tüpleri ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createTubePath([
            new THREE.Vector3(sx * 0.18, 0.12, -0.10),
            new THREE.Vector3(sx * 0.50, 0.05, -0.58),
            new THREE.Vector3(sx * 0.72, 0.00, -0.86),
        ], 0.018, metalATV, 0, 0, 0));
    });
    // ── Arka A-çerçeve tüpleri ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createTubePath([
            new THREE.Vector3(sx * 0.18, 0.12, 0.10),
            new THREE.Vector3(sx * 0.50, 0.05, 0.58),
            new THREE.Vector3(sx * 0.72, 0.00, 0.86),
        ], 0.018, metalATV, 0, 0, 0));
    });
    // ── Ön diferansiyel kutusu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.10, 0.12), darkATV, 0, 0.02, -0.60));
    // ── Arka diferansiyel kutusu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.10, 0.12), darkATV, 0, 0.02, 0.60));
    // ── Merkez tahrik mili ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.022, 0.022, 1.18, 8), metalATV, 0, 0.02, 0.00, 0, 0, Math.PI / 2));

    atvGroup.scale.set(2.5, 2.5, 2.5);

    const ATV_WR = 0.32 * 2.5;
    const ATV_WW = 0.26 * 2.5;
    // const atvBaseY  = getHeight(atvSpawnX, atvSpawnZ) + 2; // Artık kullanılmıyor

    const atvWheelOffsets: [number, number, number, number, boolean][] = [
        [-0.80, 0, -0.90, 0, true],
        [0.80, 0, -0.90, Math.PI, true],
        [-0.80, 0, 0.90, 0, false],
        [0.80, 0, 0.90, Math.PI, false],
    ];

    atvWheelOffsets.forEach(([mx, _my, mz, wr, isFront]) => {
        const wx = mx * 2.5, wz = mz * 2.5;
        const initY = getHeight(atvSpawnX + wx, atvSpawnZ + wz) + ATV_WR;

        const wmg = new THREE.Group();
        wmg.position.set(atvSpawnX + wx, initY, atvSpawnZ + wz);

        buildWheelMesh(wmg, 0, 0, 0, ATV_WR, ATV_WW, rubberATV, rimATV).rotation.y = wr;
        scene.add(wmg);

        atv.addWheel(wmg, new THREE.Vector3(wx, 0, wz), true, isFront);
    });
    scene.add(atvGroup);

    // Engine sounds (Dual for crossfading)
    const atvSoundA = audioManager.createEngineSound('/assets/sounds/engine_sound.mp3', 0);
    const atvSoundB = audioManager.createEngineSound('/assets/sounds/engine_sound.mp3', 0);
    atvGroup.add(atvSoundA);
    atvGroup.add(atvSoundB);

    vehicles.push({ 
        type: 'atv', controller: atv, isOccupied: false, enterRadius: 12, fuel: 100, maxFuel: 100, fuelBurnRate: 1, 
        engineSoundA: atvSoundA, engineSoundB: atvSoundB, activeBuffer: 'A', nextSwitchTime: 0, engineTimer: 0 
    });

    // Register as interactable
    registerInteractable({
        id: `vehicle_atv`,
        position: atvGroup.position,
        radius: 12,
        label: 'ATV · Enter',
        onInteract: () => { /* Logic is in main.ts loop for now */ }
    });

    // ─── JEEP ─────────────────────────────────────────────────────────────────
    const jeepGroup = new THREE.Group();
    // Minimal offset — just clears wheel tops
    const jeepVisualOffsetGroup = new THREE.Group();
    jeepVisualOffsetGroup.position.set(0, 0.05, 0);
    jeepGroup.add(jeepVisualOffsetGroup);

    const jeepSpawnX = 510, jeepSpawnZ = 500;
    const jeepStartY = getHeight(jeepSpawnX, jeepSpawnZ) + 3.1; // radius(1.5) + restLength(1.6)
    const jeepRB = createBody(jeepSpawnX, jeepStartY, jeepSpawnZ, 2.2, 1.8, 6.0, 40500);
    jeepGroup.position.set(jeepSpawnX, jeepStartY, jeepSpawnZ);
    const jeepConfig: VehicleConfig = {
        mass: 40500,
        maxSpeed: 55,           // hedef tepe hız — ağır araç soft limit ile ulaşır
        acceleration: 101500,   // Tork %30 daha düşürüldü (145k -> 101k)
        brakeForce: 600000,     // yüksek hızla orantılı güçlü fren
        steerSpeed: 1.8,        // Ağır araç, daha yavaş steer (2.8 -> 1.8)
        suspensionStiffness: 1620000,
        suspensionDamping: 216000,
        suspensionRestLength: 1.6,
        wheelRadius: 1.5,
        antiRoll: 1100000,      // yüksek hız + ağır araç → güçlü anti-roll şart
    };
    const jeep = new VehicleController(jeepGroup, jeepRB, world, jeepConfig);

    // ── Jeep Malzemeleri — sarı/siyah mat iki renk ──────────────────────────────
    const jBody = new THREE.MeshStandardMaterial({ color: 0xe8b800, roughness: 0.90, metalness: 0.04 }); // mat sarı (alt gövde)
    const jCabin = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.04 }); // mat siyah (kabin üstü)
    const jDark = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.90, metalness: 0.10 });
    const jMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.15 }); // siyahımsı metal
    const jGlass = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.10, transparent: true, opacity: 0.55 });
    const jLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.05 });
    const jStop = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 4.2, roughness: 0.05 });
    const jRubber = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1.00, metalness: 0.00 });
    const jRim = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0 }); // mat beyaz jant

    // ── Şasi alt plakası ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.74, 0.13, 3.84), jDark, 0, -0.22, 0.00));
    // ── Kasa alt gövde ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.58, 2.50), jBody, 0, 0.10, 0.14));
    // ── Ön kaput ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.64, 0.13, 1.14), jBody, 0, 0.30, -1.18, -0.07, 0, 0));
    // ── Kabin gövdesi — MAT SİYAH ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.62, 0.60, 1.84), jCabin, 0, 0.69, 0.28));
    // ── Çatı — MAT SİYAH ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.56, 0.08, 1.78), jCabin, 0, 1.01, 0.28));
    // ── Ön cam — Biraz daha büyük ve önde ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.58, 0.58, 0.06), jGlass, 0, 0.74, -0.66, -0.15, 0, 0));
    // ── Arka cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.52, 0.46, 0.06), jGlass, 0, 0.74, 1.18));
    // ── Sol yan cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.06, 0.40, 0.72), jGlass, -0.86, 0.75, 0.28));
    // ── Sağ yan cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.06, 0.40, 0.72), jGlass, 0.86, 0.75, 0.28));
    // ── Ön ızgara paneli ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.42, 0.55, 0.09), jDark, 0, 0.06, -1.74));
    // ── Izgara yatay dişleri ──
    for (let g = 0; g < 4; g++) {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.30, 0.05, 0.06), jDark, 0, (0.20 - g * 0.14), -1.78));
    }
    // ── Ön tampon ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.22, 0.20), jMetal, 0, -0.12, -1.90));
    // ── Arka tampon ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.18, 0.16), jMetal, 0, -0.10, 1.90));
    // ── Yan kapı panelleri — MAT SİYAH ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.08, 0.50, 0.80), jCabin, sx * 0.90, 0.10, 0.22));
    });
    // ── Yan basamak ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.10, 0.06, 1.60), jMetal, sx * 0.93, -0.22, 0.14));
    });
    // ── Far yuvaları + lensler + Işık ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.30, 0.22, 0.12), jDark, sx * 0.66, 0.12, -1.73));
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.22, 0.15, 0.06), jLight, sx * 0.66, 0.12, -1.77));
        const jHeadlight = new THREE.PointLight(0xffffff, 9, 18);
        jHeadlight.position.set(sx * 0.66, 0.12, -1.85);
        jeepVisualOffsetGroup.add(jHeadlight);
    });
    // ── Stop lambaları ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.26, 0.18, 0.10), jDark, sx * 0.66, 0.18, 1.92));
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.18, 0.11, 0.05), jStop, sx * 0.66, 0.18, 1.95));
    });
    // ── Takla kafesi ──
    const jCageL = [
        new THREE.Vector3(-0.74, 0.40, -0.56),
        new THREE.Vector3(-0.76, 1.03, -0.26),
        new THREE.Vector3(-0.76, 1.03, 1.18),
        new THREE.Vector3(-0.74, 0.40, 1.36),
    ];
    jeepVisualOffsetGroup.add(createTubePath(jCageL, 0.042, jMetal, 0, 0, 0));
    const jCageR = jCageL.map(p => new THREE.Vector3(-p.x, p.y, p.z));
    jeepVisualOffsetGroup.add(createTubePath(jCageR, 0.042, jMetal, 0, 0, 0));
    // ── Kafes üst crossbar ──
    [[-0.26], [1.18]].forEach(([pz]) => {
        const pts = [new THREE.Vector3(-0.76, 1.03, pz), new THREE.Vector3(0.76, 1.03, pz)];
        const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 4, 0.036, 10, false);
        jeepVisualOffsetGroup.add(new THREE.Mesh(tg, jMetal));
    });
    // ── Rezerv tekerlek ──
    const spareG = new THREE.Group();
    spareG.position.set(0, 0.28, 2.02);
    const spareTire = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.12, 10, 22), jRubber);
    spareTire.rotation.x = 0;
    spareG.add(spareTire);
    const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.20, 14), jRim);
    spareRim.rotation.x = Math.PI / 2;
    spareG.add(spareRim);
    const spareBracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.60, 0.60), jMetal);
    spareBracket.position.set(0, 0, -0.12);
    spareG.add(spareBracket);
    jeepVisualOffsetGroup.add(spareG);
    // ── Egzoz ──
    jeepVisualOffsetGroup.add(createTubePath([
        new THREE.Vector3(0.82, -0.25, 0.40),
        new THREE.Vector3(0.90, -0.22, 1.10),
        new THREE.Vector3(0.92, -0.16, 1.68),
        new THREE.Vector3(0.88, -0.08, 1.96),
    ], 0.038, jMetal, 0, 0, 0));
    // ── Ön aks tüpü ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.048, 0.048, 1.84, 12), jMetal, 0, -0.10, -1.25, 0, 0, Math.PI / 2));
    // ── Arka aks tüpü ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.048, 0.048, 1.84, 12), jMetal, 0, -0.10, 1.25, 0, 0, Math.PI / 2));
    // ── Ön diferansiyel ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.22, 0.22), jDark, 0, -0.08, -1.25));
    // ── Arka diferansiyel ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.22, 0.22), jDark, 0, -0.08, 1.25));
    // ── Direksiyon rot kolu ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.022, 0.022, 1.60, 8), jMetal, 0, -0.04, -1.25, 0, 0, Math.PI / 2));
    // ── Kardan mili ──
    jeepVisualOffsetGroup.add(createTubePath([
        new THREE.Vector3(0, -0.14, -0.60),
        new THREE.Vector3(0, -0.16, 0.00),
        new THREE.Vector3(0, -0.14, 0.60),
        new THREE.Vector3(0, -0.12, 1.10),
    ], 0.032, jMetal, 0, 0, 0));
    // ── Ön çekme kolu ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createTubePath([
            new THREE.Vector3(sx * 0.72, -0.06, -0.44),
            new THREE.Vector3(sx * 0.88, -0.10, -1.25),
        ], 0.026, jMetal, 0, 0, 0));
    });
    // ── Arka çekme kolu ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createTubePath([
            new THREE.Vector3(sx * 0.72, -0.06, 0.44),
            new THREE.Vector3(sx * 0.88, -0.10, 1.25),
        ], 0.026, jMetal, 0, 0, 0));
    });

    jeepGroup.scale.set(2.5, 2.5, 2.5);

    // ── Jeep Tekerlekleri ──────────────────────────────────────────────────────
    const JEEP_WR = 0.50 * 2.5;
    const JEEP_WW = 0.36 * 2.5;
    // const jeepBaseY  = getHeight(jeepSpawnX, jeepSpawnZ) + 2; // Artık kullanılmıyor

    const jeepWheelOffsets: [number, number, number, number, boolean][] = [
        [-0.96, 0, -1.25, 0, true],
        [0.96, 0, -1.25, Math.PI, true],
        [-0.96, 0, 1.25, 0, false],
        [0.96, 0, 1.25, Math.PI, false],
    ];

    jeepWheelOffsets.forEach(([mx, _my, mz, wr, isFront]) => {
        const wx = mx * 2.5, wz = mz * 2.5;
        const initY = getHeight(jeepSpawnX + wx, jeepSpawnZ + wz) + JEEP_WR;

        const wmg = new THREE.Group();
        wmg.position.set(jeepSpawnX + wx, initY, jeepSpawnZ + wz);

        buildWheelMesh(wmg, 0, 0, 0, JEEP_WR, JEEP_WW, jRubber, jRim).rotation.y = wr;
        scene.add(wmg);

        jeep.addWheel(wmg, new THREE.Vector3(wx, 0, wz), true, isFront);
    });

    scene.add(jeepGroup);

    // Engine sounds (Dual for crossfading)
    const jeepSoundA = audioManager.createEngineSound('/assets/sounds/engine_sound_1.mp3', 0);
    const jeepSoundB = audioManager.createEngineSound('/assets/sounds/engine_sound_1.mp3', 0);
    jeepGroup.add(jeepSoundA);
    jeepGroup.add(jeepSoundB);

    vehicles.push({ 
        type: 'jeep', controller: jeep, isOccupied: false, enterRadius: 15, fuel: 100, maxFuel: 100, fuelBurnRate: 1.5, 
        engineSoundA: jeepSoundA, engineSoundB: jeepSoundB, activeBuffer: 'A', nextSwitchTime: 0, engineTimer: 0 
    });

    // Register as interactable
    registerInteractable({
        id: `vehicle_jeep`,
        position: jeepGroup.position,
        radius: 15,
        label: 'Jeep · Enter',
        onInteract: () => { /* Logic is in main.ts loop for now */ }
    });
}

export function updateVehicles(dt: number, input: { forward: boolean; back: boolean; left: boolean; right: boolean; brake: boolean; shift: boolean }): void {
    const cdt = Math.min(dt, 0.033);
    for (const v of vehicles) {
        const c = v.controller as VehicleController;
        const throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
        const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
        c.update(cdt, { throttle: v.isOccupied ? throttle : 0, steer: v.isOccupied ? steer : 0, brake: v.isOccupied ? input.brake : false });

        // Dynamic Engine Sound (Gapless Dual-Buffer Crossfading)
        const soundA = v.engineSoundA;
        const soundB = v.engineSoundB;

        if (soundA && soundB) {
            v.engineTimer += dt;
            const vel = v.controller.getVelocity();
            const speed = vel.length();
            const maxSpeed = v.controller.config.maxSpeed;

            if (v.isOccupied) {
                // Ensure sounds are loaded before logic
                const hasA = (soundA as any).buffer;
                const hasB = (soundB as any).buffer;

                if (hasA && hasB) {
                    const duration = (soundA as any).buffer.duration;
                    const playbackRate = soundA.playbackRate;
                    const fadeTime = 0.3; // 300ms overlap

                    // Initialize first sound
                    if (!soundA.isPlaying && !soundB.isPlaying) {
                        soundA.play();
                        v.activeBuffer = 'A';
                        v.nextSwitchTime = 0; // use as elapsed buffer time
                    }

                    // Automatic Switching Logic (adjusted for real-time speed)
                    v.nextSwitchTime += dt * playbackRate; // nextSwitchTime acts as elapsedBufferTime
                    
                    const triggerTime = duration - (fadeTime * playbackRate);
                    if (v.nextSwitchTime >= triggerTime) {
                        // Switch buffers
                        if (v.activeBuffer === 'A') {
                            soundB.play();
                            v.activeBuffer = 'B';
                        } else {
                            soundA.play();
                            v.activeBuffer = 'A';
                        }
                        v.nextSwitchTime = 0; // reset elapsed buffer time
                    }

                    // Volume modulation + Crossfading
                    const osc = Math.sin(v.engineTimer * 4.0);
                    const idleInfluence = Math.max(0, 1.0 - (speed / 10));
                    const baseVol = 0.09;
                    const speedVol = (speed / maxSpeed) * 0.15;
                    const oscVol = osc * 0.005 * idleInfluence;
                    const targetVolume = baseVol + speedVol + oscVol;

                    // Apply volume with crossfade
                    if (v.activeBuffer === 'A') {
                        soundA.setVolume(THREE.MathUtils.lerp(soundA.getVolume(), targetVolume, 0.2));
                        soundB.setVolume(THREE.MathUtils.lerp(soundB.getVolume(), 0, 0.2)); // fade out
                    } else {
                        soundB.setVolume(THREE.MathUtils.lerp(soundB.getVolume(), targetVolume, 0.2));
                        soundA.setVolume(THREE.MathUtils.lerp(soundA.getVolume(), 0, 0.2)); // fade out
                    }

                    // Pitch modulation (Synced for both to avoid phasing issues)
                    const basePitch = 0.85;
                    const speedPitch = (speed / maxSpeed) * 1.3;
                    const oscPitch = osc * 0.015 * idleInfluence;
                    const targetPitch = basePitch + speedPitch + oscPitch;
                    
                    soundA.setPlaybackRate(THREE.MathUtils.lerp(soundA.playbackRate, targetPitch, 0.2));
                    soundB.setPlaybackRate(THREE.MathUtils.lerp(soundB.playbackRate, targetPitch, 0.2));
                }
            } else {
                // Stop everything if not occupied
                if (soundA.isPlaying) soundA.stop();
                if (soundB.isPlaying) soundB.stop();
                v.nextSwitchTime = 0;
            }
        }
    }
}

export function tryEnterVehicle(playerPos: THREE.Vector3): Vehicle | null {
    for (const v of vehicles) {
        if (v.isOccupied) continue;
        const p = v.controller.rigidBody.translation();
        if ((p.x - playerPos.x) ** 2 + (p.z - playerPos.z) ** 2 < v.enterRadius ** 2) {
            v.isOccupied = true;
            return v;
        }
    }
    return null;
}

export function exitVehicle(v: Vehicle): THREE.Vector3 {
    v.isOccupied = false;
    const p = v.controller.rigidBody.translation();
    return new THREE.Vector3(p.x + 3, p.y + 1, p.z);
}

export function getVehicles(): Vehicle[] { return vehicles; }

export function getNearestVehicleInfo(playerPos: THREE.Vector3): { dist: number; type: VehicleType } | null {
    let nearest: Vehicle | null = null;
    let best = Infinity;
    for (const v of vehicles) {
        if (v.isOccupied) continue;
        const p = v.controller.rigidBody.translation();
        const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        if (d < best) { best = d; nearest = v; }
    }
    if (nearest && best < nearest.enterRadius * 1.6) return { dist: best, type: nearest.type };
    return null;
}