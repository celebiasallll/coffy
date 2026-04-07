import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getHeight } from '../world/terrain.js';
import { getPhysicsWorld } from '../core/physics.js';
import { VehicleController, VehicleConfig } from '../core/VehicleController.js';
import { audioManager } from '../core/AudioManager.js';
import { spawnBurst } from './particles.js';
import { isNearLake } from '../world/environment.js';

export type VehicleType = 'atv' | 'jeep' | 'drifter';

export interface Vehicle {
    type: VehicleType;
    controller: VehicleController;
    isOccupied: boolean;
    enterRadius: number;
    engineSound: THREE.Audio | null;
}

const vehicles: Vehicle[] = [];
// Vehicle audio state tracking
const vehicleAudioStates = new Map<Vehicle, { 
    lastThrottle: number, 
    popCooldown: number,
    loadFactor: number,
    terrainSound?: THREE.Audio,
    dustCooldown: number,   // [EKLENDİ] Partikül optimizasyonu için
    skidCooldown: number,   // [EKLENDİ]
    isFading: boolean       // [EKLENDİ] Fade-out spam engelleyici
}>();

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
    const rr = Math.min(r, w/2 - 0.001, h/2 - 0.001, d/2 - 0.001);
    const iw = w - rr*2, ih = h - rr*2, id = d - rr*2;
    
    const geometries: THREE.BufferGeometry[] = [];

    const b1 = new THREE.BoxGeometry(w, ih, id);
    const b2 = new THREE.BoxGeometry(iw, h, id);
    const b3 = new THREE.BoxGeometry(iw, ih, d);
    geometries.push(b1, b2, b3);

    const hw = iw/2, hh = ih/2, hd = id/2;
    const sphereGeo = new THREE.SphereGeometry(rr, 8, 6);
    
    for (const sx of [-1,1]) {
        for (const sy of [-1,1]) {
            for (const sz of [-1,1]) {
                const s = sphereGeo.clone();
                s.translate(sx*hw, sy*hh, sz*hd);
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

function createSXSPanel(shape: THREE.Shape, depth: number, mat: THREE.Material, x: number, y: number, z: number, rx=0, ry=0, rz=0): THREE.Mesh {
    const extrudeSettings = { depth: depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    return mesh;
}

function createTubePath(points: THREE.Vector3[], radius: number, mat: THREE.Material, x: number, y: number, z: number, rx=0, ry=0, rz=0): THREE.Mesh {
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

    const spokeCount = 5;
    const rimR       = radius * 0.68;  // jant dış yarıçap
    const hubR       = radius * 0.14;  // göbek yarıçap
    const spokeW     = radius * 0.11;  // spoke genişliği
    const spokeH     = radius * 0.085; // spoke kalınlığı

    // ── Lastik dış yüzey ──
    const sidewall = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, width, 32),
        tireMat
    );
    sidewall.rotation.z = Math.PI / 2;
    sidewall.castShadow = true;
    wg.add(sidewall);

    // ── Lastik yan duvarları (lastik + jant arasındaki halka) ──
    [-1, 1].forEach(side => {
        const cap = new THREE.Mesh(
            new THREE.RingGeometry(rimR, radius, 32, 1),
            tireMat
        );
        cap.rotation.y = Math.PI / 2;
        cap.position.x = side * (width / 2);
        wg.add(cap);
    });

    // ── Lastik diş deseni ──
    const treads = 20;
    for (let i = 0; i < treads; i++) {
        const angle = (i / treads) * Math.PI * 2;
        const tread = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.94, radius * 0.05, radius * 0.10),
            tireMat
        );
        tread.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
        tread.rotation.x = angle;
        wg.add(tread);
    }

    // ── Jant davul (barrel) — lastik içi silindir ──
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(rimR, rimR, width, 28),
        rimMat
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.castShadow = true;
    wg.add(barrel);

    // ── Tekerlek Yüzü (Delikli jant diski) ──────────────────────────────────────
    const holeCount = 8;
    const holeR     = radius * 0.07;   // delik yarıçapı
    const holeDist  = rimR * 0.65;     // deliklerin merkezden uzaklığı
    const holeMat   = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0.1 });

    [-1, 1].forEach(side => {
        const faceX = side * (width * 0.505);

        // Ana Jant Diski
        const faceDisk = new THREE.Mesh(
            new THREE.CircleGeometry(rimR, 32),
            rimMat
        );
        faceDisk.rotation.y = side * Math.PI / 2;
        faceDisk.position.x = faceX;
        wg.add(faceDisk);

        // Delikler (siyah daireler)
        for (let i = 0; i < holeCount; i++) {
            const angle = (i / holeCount) * Math.PI * 2;
            const hole = new THREE.Mesh(
                new THREE.CircleGeometry(holeR, 12),
                holeMat
            );
            // Hafifçe dışa doğru (geometrinin normali yönünde) kaydırıyoruz
            hole.position.set(faceX + side * 0.001, Math.cos(angle) * holeDist, Math.sin(angle) * holeDist);
            hole.rotation.y = side * Math.PI / 2;
            wg.add(hole);
        }

        // Hub kapağı
        const hubCap = new THREE.Mesh(
            new THREE.CircleGeometry(hubR * 1.3, 16),
            rimMat
        );
        hubCap.rotation.y = side * Math.PI / 2;
        hubCap.position.x = faceX + side * 0.02;
        wg.add(hubCap);

        // Merkezdeki küçük siyah delik - 3x büyütüldü
        const centerHole = new THREE.Mesh(
            new THREE.CircleGeometry(radius * 0.105, 12),
            holeMat
        );
        centerHole.rotation.y = side * Math.PI / 2;
        centerHole.position.set(faceX + side * 0.022, 0, 0);
        wg.add(centerHole);
    });

    // ── Merkez göbek silindiri — Kapakların altında kalacak şekilde kısaltıldı ──
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(hubR, hubR, width * 0.95, 16),
        rimMat
    );
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);

    // ── Sibop ──
    const valve = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.018, radius * 0.018, radius * 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.4 })
    );
    valve.rotation.z = Math.PI / 2;
    valve.position.set(-(width * 0.52 + radius * 0.06), radius * 0.72, 0);
    wg.add(valve);

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
    const springEnd   = new THREE.Vector3().lerpVectors(chassisLocalPos, wheelLocalPos, 0.82);

    const up = dir.clone().normalize();
    const arbitrary = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, arbitrary).normalize();
    const fwd   = new THREE.Vector3().crossVectors(right, up).normalize();

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
    const springTube  = new THREE.TubeGeometry(springCurve, steps, 0.016, 6, false);
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

function createBody(x: number, y: number, z: number, hx: number, hy: number, hz: number, mass: number, gravityScale = 1.0): RAPIER.RigidBody {
    const world = getPhysicsWorld();

    const rb = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setCanSleep(false)
            .setLinearDamping(0.2)
            .setAngularDamping(0.5)
    );
    rb.setGravityScale(gravityScale, true);
    rb.enableCcd(true); 

    const colDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
    // [v82]: Set mass explicitly on the collider to override volume-based defaults
    colDesc.setMass(mass);
    
    world.createCollider(colDesc, rb);

    return rb;
}

// ─── SPAWN VE GÜNCELLEME ──────────────────────────────────────────────────────
export function spawnVehicles(scene: THREE.Scene): void {
    const world = getPhysicsWorld();
    
    // ATV
    const atvGroup = new THREE.Group();
    const atvSpawnX = 450, atvSpawnZ = 520;
    const atvStartY = getHeight(atvSpawnX, atvSpawnZ) + 2.3;
    const atvRB = createBody(atvSpawnX, atvStartY, atvSpawnZ, 1.4, 0.9, 2.6, 6000); 
    atvGroup.position.set(atvSpawnX, atvStartY, atvSpawnZ);
    const atvConfig: VehicleConfig = {
        mass: 6000,
        maxSpeed: 65,
        acceleration: 45000,
        brakeForce: 60000,
        steerSpeed: 2.2, // [FIXED] Heavier steering
        suspensionStiffness: 45000, // [FIXED] Softer for sag
        suspensionDamping: 2800,
        suspensionRestLength: 1.3,
        wheelRadius: 0.96,
        antiRoll: 35000
    };
    const atv = new VehicleController(atvGroup, atvRB, world, atvConfig);
    
    // ── ATV Malzemeleri ────────────────────────────────────────────────────────
    const bodyMatATV  = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.50, metalness: 0.35 });
    const plasticATV  = new THREE.MeshStandardMaterial({ color: 0x881400, roughness: 0.72, metalness: 0.10 });
    const darkATV     = new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.85, metalness: 0.20 });
    const metalATV    = new THREE.MeshStandardMaterial({ color: 0xb2b2b2, roughness: 0.28, metalness: 0.90 });
    const rubberATV   = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1.00, metalness: 0.00 });
    // Mat siyah jant (ATV)
    const rimATV      = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0 });
    // Modern Cool LED White
    const atvLensMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xebf2ff, emissiveIntensity: 1.6, roughness: 0.05 });
    const atvTailMat  = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 1.8, roughness: 0.05 });
    const seatMat     = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.92 });

    // ── Şasi / Ana çerçeve ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.38, 0.09, 0.92), darkATV,    0,  0.10,  0.00));
    // ── Motor bloğu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.36, 0.28, 0.40), darkATV,    0,  0.24,  0.04));
    // ── Gövde orta üst panel ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.60, 0.13, 0.64), bodyMatATV, 0,  0.37,  0.00));
    // ── Yakıt deposu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.34, 0.14, 0.30), bodyMatATV, 0,  0.47,  0.03));
    // ── Ön burun / kaput ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.22, 0.28), plasticATV, 0,  0.28, -0.60, -0.20, 0, 0));
    // ── Ön far yuvası ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.34, 0.11, 0.06), darkATV,    0,  0.38, -0.73));
    // ── Far lensi ve Işık ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.27, 0.07, 0.04), atvLensMat, 0,  0.38, -0.76));
    
    // [DIMMED] Gerçekçi Spot Işığı (Intensity reduced from 100 to 40)
    const atvLight = new THREE.SpotLight(0xebf2ff, 40, 70, Math.PI / 5.5, 0.6, 1.0);
    atvLight.position.set(0, 0.38, -0.85);
    const atvTarget = new THREE.Object3D();
    atvTarget.position.set(0, 0.1, -6.0); // İleriye ve çok hafif aşağıya bakış
    atvGroup.add(atvTarget);
    atvLight.target = atvTarget;
    atvGroup.add(atvLight);
    // ── Arka panel ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.50, 0.19, 0.24), plasticATV, 0,  0.27,  0.60,  0.18, 0, 0));
    // ── Stop lambaları ──
    [-0.18, 0.18].forEach(sx => atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.06, 0.04), atvTailMat, sx,  0.31, 0.73)));
    // ── Koltuk oturma yüzeyi ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.08, 0.52), darkATV,   0,  0.52, 0.12));
    atvGroup.add(createPart(new THREE.BoxGeometry(0.23, 0.04, 0.46), seatMat,   0,  0.56, 0.12));
    // ── Ön çamurluklar (sol/sağ) ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createPart(new THREE.BoxGeometry(0.20, 0.09, 0.38), plasticATV, sx * 0.41,  0.34, -0.44));
        atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.15, 0.34), plasticATV, sx * 0.47,  0.25, -0.44));
    });
    // ── Arka çamurluklar ──
    [-1, 1].forEach(sx => {
        atvGroup.add(createPart(new THREE.BoxGeometry(0.20, 0.09, 0.36), plasticATV, sx * 0.41,  0.30,  0.52));
        atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.14, 0.32), plasticATV, sx * 0.47,  0.22,  0.52));
    });
    // ── Gidon sapı ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8), metalATV, 0,  0.54, -0.51));
    // ── Gidon çubuğu ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.020, 0.020, 0.72, 8), metalATV, 0,  0.65, -0.51, 0, 0, Math.PI / 2));
    // ── Gaz/fren tutacakları ──
    [-0.32, 0.32].forEach(sx => atvGroup.add(createPart(new THREE.CylinderGeometry(0.028, 0.028, 0.10, 8), darkATV, sx,  0.65, -0.51, 0, 0, Math.PI / 2)));
    // ── Basamaklar ──
    [-1, 1].forEach(sx => atvGroup.add(createPart(new THREE.BoxGeometry(0.07, 0.03, 0.22), metalATV, sx * 0.46, 0.08, 0.10)));
    // ── Ön bagaj rafı ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.20), metalATV, 0, 0.39, -0.65));
    // ── Arka bagaj rafı ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.22), metalATV, 0, 0.38,  0.67));
    // ── Skid plakası ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.48, 0.04, 0.82), metalATV, 0, 0.04,  0.00));
    // ── Egzoz borusu ──
    atvGroup.add(createTubePath([
        new THREE.Vector3( 0.20,  0.16, 0.08),
        new THREE.Vector3( 0.30,  0.10, 0.34),
        new THREE.Vector3( 0.32,  0.08, 0.60),
        new THREE.Vector3( 0.29,  0.12, 0.74),
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
            new THREE.Vector3(sx * 0.18, 0.12,  0.10),
            new THREE.Vector3(sx * 0.50, 0.05,  0.58),
            new THREE.Vector3(sx * 0.72, 0.00,  0.86),
        ], 0.018, metalATV, 0, 0, 0));
    });
    // ── Ön diferansiyel kutusu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.10, 0.12), darkATV,  0, 0.02, -0.60));
    // ── Arka diferansiyel kutusu ──
    atvGroup.add(createPart(new THREE.BoxGeometry(0.52, 0.10, 0.12), darkATV,  0, 0.02,  0.60));
    // ── Merkez tahrik mili ──
    atvGroup.add(createPart(new THREE.CylinderGeometry(0.022, 0.022, 1.18, 8), metalATV, 0, 0.02, 0.00, 0, 0, Math.PI / 2));

    atvGroup.scale.set(3, 3, 3);

    const ATV_WR  = 0.32 * 3;
    const ATV_WW  = 0.26 * 3;
    // const atvBaseY  = getHeight(atvSpawnX, atvSpawnZ) + 2; // Artık kullanılmıyor

    const atvWheelOffsets: [number, number, number, number, boolean][] = [
        [-0.80, 0, -0.90, 0,        true  ],
        [ 0.80, 0, -0.90, Math.PI,  true  ],
        [-0.80, 0,  0.90, 0,        false ],
        [ 0.80, 0,  0.90, Math.PI,  false ],
    ];

    atvWheelOffsets.forEach(([mx, _my, mz, wr, isFront]) => {
        const wx = mx * 3, wz = mz * 3;
        const initY = getHeight(atvSpawnX + wx, atvSpawnZ + wz) + ATV_WR;

        const wmg = new THREE.Group();
        wmg.position.set(atvSpawnX + wx, initY, atvSpawnZ + wz);

        buildWheelMesh(wmg, 0, 0, 0, ATV_WR, ATV_WW, rubberATV, rimATV).rotation.y = wr;
        scene.add(wmg);

        atv.addWheel(wmg, new THREE.Vector3(wx, 0, wz), true, isFront);
    });
    scene.add(atvGroup);
    const atvEngine = audioManager.createEngineSound('assets/sounds/engine_sound.mp3', 0);
    vehicles.push({ type: 'atv', controller: atv, isOccupied: false, enterRadius: 10, engineSound: atvEngine });

    // ─── JEEP ─────────────────────────────────────────────────────────────────
    const jeepGroup = new THREE.Group();
    // Minimal offset — just clears wheel tops
    const jeepVisualOffsetGroup = new THREE.Group();
    jeepVisualOffsetGroup.position.set(0, 0.05, 0);
    jeepGroup.add(jeepVisualOffsetGroup);

    const jeepSpawnX = 490, jeepSpawnZ = 530;
    const jeepStartY = getHeight(jeepSpawnX, jeepSpawnZ) + 3.1; // radius(1.5) + restLength(1.6)
    const jeepRB = createBody(jeepSpawnX, jeepStartY, jeepSpawnZ, 3.2, 1.8, 6.2, 32000);
    jeepGroup.position.set(jeepSpawnX, jeepStartY, jeepSpawnZ);
    const jeepConfig: VehicleConfig = {
        mass: 32000,
        maxSpeed: 55,
        acceleration: 180000,
        brakeForce: 450000,
        steerSpeed: 1.6, // [FIXED] Heavier steering
        suspensionStiffness: 220000, // [FIXED] Softer for sag
        suspensionDamping: 15000,
        suspensionRestLength: 1.6,
        wheelRadius: 1.5,
        antiRoll: 120000
    };
    const jeep = new VehicleController(jeepGroup, jeepRB, world, jeepConfig);

    // ── Jeep Malzemeleri — sarı/siyah mat iki renk ──────────────────────────────
    const jBody   = new THREE.MeshStandardMaterial({ color: 0xe8b800, roughness: 0.90, metalness: 0.04 }); // mat sarı (alt gövde)
    const jCabin  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.92, metalness: 0.04 }); // mat siyah (kabin üstü)
    const jDark   = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.90, metalness: 0.10 });
    const jMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.15 }); // siyahımsı metal
    const jGlass  = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.10, transparent: true, opacity: 0.55 });
    // [DIMMED] intensities (Reduced by 60% per user request)
    const jLight  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xebf2ff, emissiveIntensity: 1.6, roughness: 0.05 });
    const jStop   = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 1.68, roughness: 0.05 });
    const jRubber = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1.00, metalness: 0.00 });
    const jRim    = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0 }); // mat beyaz jant

    // ── Şasi alt plakası ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.74, 0.13, 3.84), jDark,  0, -0.22,  0.00));
    // ── Kasa alt gövde ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.58, 2.50), jBody,  0,  0.10,  0.14));
    // ── Ön kaput ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.64, 0.13, 1.14), jBody,  0,  0.30, -1.18, -0.07, 0, 0));
    // ── Kabin gövdesi — MAT SİYAH ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.62, 0.60, 1.84), jCabin,  0,  0.69,  0.28));
    // ── Çatı — MAT SİYAH ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.56, 0.08, 1.78), jCabin, 0,  1.01,  0.28));
    // ── Ön cam — Biraz daha büyük ve önde ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.58, 0.58, 0.06), jGlass, 0,  0.74, -0.66, -0.15, 0, 0));
    // ── Arka cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.52, 0.46, 0.06), jGlass, 0,  0.74,  1.18));
    // ── Sol yan cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.06, 0.40, 0.72), jGlass, -0.86, 0.75, 0.28));
    // ── Sağ yan cam ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.06, 0.40, 0.72), jGlass,  0.86, 0.75, 0.28));
    // ── Ön ızgara paneli ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.42, 0.55, 0.09), jDark,  0,  0.06, -1.74));
    // ── Izgara yatay dişleri ──
    for (let g = 0; g < 4; g++) {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.30, 0.05, 0.06), jDark, 0, (0.20 - g * 0.14), -1.78));
    }
    // ── Ön tampon ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.22, 0.20), jMetal, 0, -0.12, -1.90));
    // ── Arka tampon ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(1.78, 0.18, 0.16), jMetal, 0, -0.10,  1.90));
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
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.30, 0.22, 0.12), jDark,  sx * 0.66,  0.12, -1.73));
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.22, 0.15, 0.06), jLight, sx * 0.66,  0.12, -1.77));
        
        // [DIMMED] Gerçekçi Çift Spot Işığı (Intensity reduced from 120 to 48)
        const jHeadlight = new THREE.SpotLight(0xebf2ff, 48, 90, Math.PI / 5.0, 0.7, 1.0);
        jHeadlight.position.set(sx * 0.66, 0.12, -1.85);
        const jTarget = new THREE.Object3D();
        jTarget.position.set(sx * 0.66, -0.2, -8.0);
        jeepVisualOffsetGroup.add(jTarget);
        jHeadlight.target = jTarget;
        jeepVisualOffsetGroup.add(jHeadlight);
    });
    // ── Stop lambaları ──
    [-1, 1].forEach(sx => {
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.26, 0.18, 0.10), jDark,  sx * 0.66,  0.18,  1.92));
        jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.18, 0.11, 0.05), jStop,  sx * 0.66,  0.18,  1.95));
    });
    // ── Takla kafesi ──
    const jCageL = [
        new THREE.Vector3(-0.74,  0.40, -0.56),
        new THREE.Vector3(-0.76,  1.03, -0.26),
        new THREE.Vector3(-0.76,  1.03,  1.18),
        new THREE.Vector3(-0.74,  0.40,  1.36),
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
        new THREE.Vector3( 0.82, -0.25,  0.40),
        new THREE.Vector3( 0.90, -0.22,  1.10),
        new THREE.Vector3( 0.92, -0.16,  1.68),
        new THREE.Vector3( 0.88, -0.08,  1.96),
    ], 0.038, jMetal, 0, 0, 0));
    // ── Ön aks tüpü ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.048, 0.048, 1.84, 12), jMetal, 0, -0.10, -1.25, 0, 0, Math.PI / 2));
    // ── Arka aks tüpü ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.048, 0.048, 1.84, 12), jMetal, 0, -0.10,  1.25, 0, 0, Math.PI / 2));
    // ── Ön diferansiyel ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.22, 0.22), jDark,  0, -0.08, -1.25));
    // ── Arka diferansiyel ──
    jeepVisualOffsetGroup.add(createPart(new THREE.BoxGeometry(0.28, 0.22, 0.22), jDark,  0, -0.08,  1.25));
    // ── Direksiyon rot kolu ──
    jeepVisualOffsetGroup.add(createPart(new THREE.CylinderGeometry(0.022, 0.022, 1.60, 8), jMetal, 0, -0.04, -1.25, 0, 0, Math.PI / 2));
    // ── Kardan mili ──
    jeepVisualOffsetGroup.add(createTubePath([
        new THREE.Vector3(0, -0.14, -0.60),
        new THREE.Vector3(0, -0.16,  0.00),
        new THREE.Vector3(0, -0.14,  0.60),
        new THREE.Vector3(0, -0.12,  1.10),
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
            new THREE.Vector3(sx * 0.72, -0.06,  0.44),
            new THREE.Vector3(sx * 0.88, -0.10,  1.25),
        ], 0.026, jMetal, 0, 0, 0));
    });

    jeepGroup.scale.set(3, 3, 3);

    // ── Jeep Tekerlekleri ──────────────────────────────────────────────────────
    const JEEP_WR  = 0.50 * 3;
    const JEEP_WW  = 0.36 * 3;
    // const jeepBaseY  = getHeight(jeepSpawnX, jeepSpawnZ) + 2; // Artık kullanılmıyor

    const jeepWheelOffsets: [number, number, number, number, boolean][] = [
        [-0.96, 0, -1.25, 0,        true  ],
        [ 0.96, 0, -1.25, Math.PI,  true  ],
        [-0.96, 0,  1.25, 0,        false ],
        [ 0.96, 0,  1.25, Math.PI,  false ],
    ];

    jeepWheelOffsets.forEach(([mx, _my, mz, wr, isFront]) => {
        const wx = mx * 3, wz = mz * 3;
        const initY = getHeight(jeepSpawnX + wx, jeepSpawnZ + wz) + JEEP_WR;

        const wmg = new THREE.Group();
        wmg.position.set(jeepSpawnX + wx, initY, jeepSpawnZ + wz);

        buildWheelMesh(wmg, 0, 0, 0, JEEP_WR, JEEP_WW, jRubber, jRim).rotation.y = wr;
        scene.add(wmg);

        jeep.addWheel(wmg, new THREE.Vector3(wx, 0, wz), true, isFront);
    });

    scene.add(jeepGroup);
    const jeepEngine = audioManager.createEngineSound('assets/sounds/engine_sound.mp3', 0);
    vehicles.push({ type: 'jeep', controller: jeep, isOccupied: false, enterRadius: 25, engineSound: jeepEngine });

    // ─── DRIFTER TRUCK (GLB) ───
    // Silindi.
}


export function updateVehicles(dt: number, input: { throttle: number; steer: number; brake: boolean }): void {
    const occupiedVehicle = vehicles.find(v => v.isOccupied);
    if (!occupiedVehicle) return;

    const { throttle, steer } = input;
    occupiedVehicle.controller.update(dt, input);

    for (const v of vehicles) {
        if (v.engineSound) {
            let aState = vehicleAudioStates.get(v);
            if (!aState) {
                // State başlangıç ataması
                aState = { lastThrottle: 0, popCooldown: 0, loadFactor: 0, dustCooldown: 0, skidCooldown: 0, isFading: false };
                vehicleAudioStates.set(v, aState);
            }

            aState.dustCooldown -= dt;
            aState.skidCooldown -= dt;

            if (v.isOccupied) {
                aState.isFading = false; // Bindiğimiz an fade-out kilidini aç
                if (!v.engineSound.isPlaying) v.engineSound.play();
                
                const rb = v.controller.rigidBody;
                const vel = rb.linvel();
                const speed = Math.hypot(vel.x, vel.z);
                const maxSpd = v.controller.config.maxSpeed;
                
                const targetLoad = Math.abs(throttle) > 0.1 ? 1.0 : 0.0;
                aState.loadFactor = THREE.MathUtils.lerp(aState.loadFactor, targetLoad, 4.0 * dt);

                const rpm = speed / maxSpd;
                const basePitch = v.type === 'atv' ? 0.85 : 0.75;
                const pitchShift = rpm * 0.9 + aState.loadFactor * 0.15;
                
                v.engineSound.setPlaybackRate(basePitch + pitchShift);
                v.engineSound.setVolume(0.15 + rpm * 0.1 + aState.loadFactor * 0.08);

                aState.popCooldown -= dt;
                if (aState.lastThrottle > 0.5 && throttle < 0.1 && aState.popCooldown <= 0 && speed > 5) {
                    audioManager.playSFX('assets/sounds/impact.mp3', 0.15, 0.4, 2.0); 
                    aState.popCooldown = 1.2 + Math.random() * 2.0;
                }
                aState.lastThrottle = throttle;

                if (speed > 2) {
                    const pos = v.controller.mesh.position;
                    const isWet = isNearLake(pos.x, pos.z); // [DÜZELTİLDİ: İmkansız matematik (speed < 0) silindi]
                    
                    if (!aState.terrainSound) {
                        aState.terrainSound = audioManager.createAmbientSound('assets/sounds/footstep.mp3', 0);
                        aState.terrainSound.play();
                    }
                    const tireVol = Math.min(0.15, speed * 0.008);
                    aState.terrainSound.setVolume(tireVol);
                    aState.terrainSound.setPlaybackRate(0.5 + speed * 0.05);

                    const isDrifting = Math.abs(steer) > 0.5 && speed > 10;
                    const isBraking = input.brake && speed > 5;

                    // [DÜZELTİLDİ: FPS optimizasyonu için partiküllere cooldown eklendi]
                    // --- OPTIMIZATION (v10.1): Removed Car Dust/Skid Particles ---
                    /*
                    if ((isDrifting || isBraking) && aState.dustCooldown <= 0) {
                        const dustPos = pos.clone(); dustPos.y += 0.2;
                        spawnBurst(dustPos, isWet ? 0x443322 : 0xbb9977, 4, 0.5);
                        aState.dustCooldown = 0.08; 
                    }

                    if ((isDrifting || isBraking) && aState.skidCooldown <= 0) {
                        const skidPos = pos.clone(); skidPos.y = getHeight(pos.x, pos.z) + 0.05;
                        spawnBurst(skidPos, 0x111111, 1, 0.1);
                        aState.skidCooldown = 0.15;
                    }
                    */
                } else if (aState.terrainSound) {
                    aState.terrainSound.setVolume(0);
                }

            } else {
                // [DÜZELTİLDİ: Fade-out işlemi sadece 1 kere tetiklenecek, spam önlendi]
                if (v.engineSound.isPlaying && !aState.isFading) {
                    audioManager.fadeOutAndStop(v.engineSound, 1.2);
                    aState.isFading = true; 
                }
                if (aState.terrainSound) aState.terrainSound.setVolume(0);
                aState.lastThrottle = 0;
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
    const exitX = p.x + 3.5;
    const exitZ = p.z;
    const groundH = getHeight(exitX, exitZ);
    // Always exit at least 1m above ground and above water level
    const exitY = Math.max(p.y + 1, groundH + 1, 1.2); 
    return new THREE.Vector3(exitX, exitY, exitZ);
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
    if (nearest && best < 5.0) return { dist: best, type: nearest.type };
    return null;
}
