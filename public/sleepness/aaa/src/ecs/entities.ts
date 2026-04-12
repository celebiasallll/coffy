import { addEntity, addComponent, removeEntity, defineQuery } from 'bitecs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { world, entityMeshes, entityPhysicsBodies, entityColliders, colliderToEntity, entityMixers, entityActions, entityAnimationControllers } from './world.js';
import { npcLastAnim } from './systems/AnimationSystem.js';
import { Position, Rotation, PhysicsBody, PlayerTag, EnemyTag, InputState, Health, Velocity, AnimState, InputIntents, Weapon, WeaponState, WolfTag, ZombieTag, VehicleTag, VehicleInput, AIController, CoffyCoinTag, NPCTag, NPCInteraction } from './components.js';


import { getPhysicsWorld } from '../core/physics.js';
import { getHeight } from '../world/terrain.js';
import { EntityId } from './types.js';
import { AnimationController } from '../core/AnimationController.js';
import { audioManager } from '../core/AudioManager.js';
import { isSpaceOccupied, isNearLake } from '../world/environment.js';

const loader = new FBXLoader(); // Default Loading Manager (Critical)
export const bgManager = new THREE.LoadingManager();
const bgLoader = new FBXLoader(bgManager);
export const bgGltfLoader = new GLTFLoader(bgManager);

// --- Asset Caches (Promise based to prevent race conditions) ---
const zombieCacheP: {
    idle?: Promise<THREE.Group>;
    walk?: Promise<THREE.Group>;
    attack?: Promise<THREE.Group>;
    death?: Promise<THREE.Group>;
} = {};
const npcCacheP: {
    idle?: Promise<THREE.Group>;
    talk?: Promise<THREE.Group>;
    walk?: Promise<THREE.Group>;
} = {};
const npcFemaleCacheP: {
    idle?: Promise<THREE.Group>;
    talk?: Promise<THREE.Group>;
    walk?: Promise<THREE.Group>;
} = {};

let wolfCachedP: Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> | null = null;

function stripRootMotion(fbx: THREE.Group, stripY = false, fallbackY?: number) {
    fbx.animations.forEach(clip => {
        clip.tracks.forEach(track => {
            const lowName = track.name.toLowerCase();
            if ((lowName.includes('hips') || lowName.includes('root') || lowName.includes('armature')) &&
                track.name.endsWith('.position')) {
                const values = (track as any).values;
                if (values && values.length >= 3) {
                    // FORCE the height to fallback if we are stripping Y (Combat mode)
                    let targetY = (stripY && fallbackY !== undefined) ? fallbackY : values[1];

                    for (let i = 0; i < values.length; i += 3) {
                        values[i] = 0; // X
                        if (stripY) values[i+1] = targetY; // Locked Y
                        values[i + 2] = 0;   // Z
                    }
                }
            }
        });
    });
}

function cleanupTraverse(fbx: THREE.Group) {
    fbx.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
            (child as THREE.SkinnedMesh).normalizeSkinWeights();
        }
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat: any, idx) => {
                if ('shininess' in mat) {
                    const std = new THREE.MeshStandardMaterial({
                        color: (mat as any).color,
                        roughness: 0.8,
                        metalness: 0.0,
                        map: (mat as any).map ?? null,
                    });
                    if (Array.isArray(mesh.material)) mesh.material[idx] = std;
                    else mesh.material = std;
                }
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            });
        }
    });
}

/** Robust visibility and shadow settings for GLB/FBX models */
function applyModelSettings(root: THREE.Object3D) {
    root.traverse((obj) => {
        obj.visible = true;
        if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true; // [v11.6] Re-enabled for perf

            // Material fixes
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m: any) => {
                if (m) {
                    m.side = THREE.DoubleSide; // Avoid backface culling issues
                    if (m.opacity === 0) m.opacity = 1; // Safety for invisible materials
                    if (m.transparent === undefined) m.transparent = false;
                }
            });
        }
    });
}

export async function spawnPlayer(scene: THREE.Scene, x: number, _y: number, z: number, playerType: number = 1): Promise<EntityId> {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, Rotation, id);
    addComponent(world, PhysicsBody, id);
    addComponent(world, Velocity, id);
    addComponent(world, PlayerTag, id);
    addComponent(world, InputState, id);
    addComponent(world, Health, id);
    addComponent(world, AnimState, id);
    addComponent(world, InputIntents, id);
    addComponent(world, Weapon, id);
    addComponent(world, WeaponState, id);
    AnimState.current[id] = 0;
    AnimState.previous[id] = 0;

    const groundY = getHeight(x, z);
    const spawnY = groundY + 0.45;

    Position.x[id] = x;
    Position.y[id] = spawnY;
    Position.z[id] = z;
    Health.current[id] = 100;
    Health.max[id] = 100;

    const isP2 = playerType === 1;
    const idleFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Breathing Idle.fbx' : 'models/Standing Idle.fbx');
    const walkFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Walking (6).fbx' : 'models/Walking.fbx');
    const runFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Running (1).fbx' : 'models/Running.fbx');
    const jumpFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Jump (4).fbx' : 'models/Jumping.fbx');
    const runJumpFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Running Jump.fbx' : 'models/runningjump.fbx');
    const swimFbxPromise = loader.loadAsync(isP2 ? 'models/player2/Swimming (1).fbx' : 'models/Swimming.fbx');

    const shootIdlePromise = loader.loadAsync(isP2 ? 'models/player2/Shoot Rifle (1).fbx' : 'models/Shoot Rifle.fbx');
    const shootRunPromise = loader.loadAsync(isP2 ? 'models/player2/Gunplay (2).fbx' : 'models/Gunplay (1).fbx');

    const gltfLoader = new GLTFLoader();
    const criticalPromises = [
        loader.loadAsync(isP2 ? 'models/player2/Breathing Idle.fbx' : 'models/Standing Idle.fbx'),
        loader.loadAsync(isP2 ? 'models/player2/Walking (6).fbx' : 'models/Walking.fbx'),
        loader.loadAsync(isP2 ? 'models/player2/Running (1).fbx' : 'models/Running.fbx'),
        loader.loadAsync(isP2 ? 'models/player2/Jump (4).fbx' : 'models/Jumping.fbx'),
        gltfLoader.loadAsync('assets/low-poly_scar_16s.glb'),
        gltfLoader.loadAsync('assets/switch_knife.glb'),
        loader.loadAsync('models/Dying Backwards (6).fbx') // Death is helpful for unexpected kills
    ];

    const [
        idleFbx,
        walkFbx,
        runFbx,
        jumpFbx,
        scarGltf,
        knifeGltf,
        deathFbx
    ] = (await Promise.all(criticalPromises)) as [THREE.Group, THREE.Group, THREE.Group, THREE.Group, any, any, THREE.Group];

    // --- Phase 2 Loading (Background) ---
    const secondaryPromises = {
        'runningjump': loader.loadAsync(isP2 ? 'models/player2/Running Jump.fbx' : 'models/runningjump.fbx'),
        'swim': loader.loadAsync(isP2 ? 'models/player2/Swimming (1).fbx' : 'models/Swimming.fbx'),
        'shoot_idle': loader.loadAsync(isP2 ? 'models/player2/Gunplay (2).fbx' : 'models/Gunplay (1).fbx'),
        'shoot_run': loader.loadAsync(isP2 ? 'models/player2/Shoot Rifle (1).fbx' : 'models/Shoot Rifle.fbx'),
        'crouch_idle': loader.loadAsync(isP2 ? 'models/player2/Crouch To Stand.fbx' : 'models/Stand To Crouch.fbx'),
        'crouch_walk': loader.loadAsync(isP2 ? 'models/player2/Walk Crouching Forward.fbx' : 'models/Walk Crouching Forward Right.fbx'),
        'punch': loader.loadAsync(isP2 ? 'models/player2/Cross Punch.fbx' : 'models/Cross Punch.fbx'),
        'kick': loader.loadAsync(isP2 ? 'models/player2/Hurricane Kick.fbx' : 'models/Kicking.fbx'),
        'stab': loader.loadAsync(isP2 ? 'models/player2/Stabbing.fbx' : 'models/Stabbing.fbx'),
    };

    const baseScale = 0.01404;
    const scaleFactor = isP2 ? 0.00294 : baseScale;

    // MANDATORY Melee grounding logic uses Idle Hips
    let idleHipsY = 100; 
    const idleClip = idleFbx.animations[0];
    if (idleClip) {
        const hipTrack = idleClip.tracks.find(t => 
            (t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')) && 
            t.name.endsWith('.position')
        );
        if (hipTrack) idleHipsY = (hipTrack as any).values[1];
    }

    [idleFbx, walkFbx, runFbx, jumpFbx, deathFbx].forEach(fbx => {
        if (fbx) {
            fbx.scale.setScalar(scaleFactor);
            cleanupTraverse(fbx);
            stripRootMotion(fbx, false);
        }
    });

    const pivot = new THREE.Group();
    pivot.add(idleFbx);
    idleFbx.position.set(0, 0, 0);
    idleFbx.rotation.y = Math.PI;

    const mixer = new THREE.AnimationMixer(idleFbx);
    entityMixers.set(id, mixer);

    const actions: Record<string, THREE.AnimationAction> = {};
    entityActions.set(id, actions);

    const clipConfigs: { name: string, clip: THREE.AnimationClip | undefined, loop?: any }[] = [
        { name: 'idle', clip: idleFbx.animations[0] },
        { name: 'walk', clip: walkFbx.animations[0] },
        { name: 'run', clip: runFbx.animations[0] },
        { name: 'jump', clip: jumpFbx.animations[0], loop: THREE.LoopOnce },
        { name: 'death', clip: deathFbx.animations[0], loop: THREE.LoopOnce }
    ];

    clipConfigs.forEach(cfg => {
        if (cfg.clip) {
            const action = mixer.clipAction(cfg.clip);
            action.setLoop(cfg.loop ?? THREE.LoopRepeat, cfg.loop === THREE.LoopOnce ? 1 : Infinity);
            if (cfg.loop === THREE.LoopOnce) action.clampWhenFinished = true;
            actions[cfg.name] = action;
        }
    });

    // Background Loading Task
    (async () => {
        for (const [name, promise] of Object.entries(secondaryPromises)) {
            try {
                const fbx = await promise;
                fbx.scale.setScalar(scaleFactor);
                cleanupTraverse(fbx);
                
                const isMelee = (name === 'punch' || name === 'kick' || name === 'stab');
                stripRootMotion(fbx, isMelee, isMelee ? idleHipsY : undefined);

                if (fbx.animations[0]) {
                    const action = mixer.clipAction(fbx.animations[0]);
                    const isOnce = (isMelee || name === 'crouch_idle' || name === 'runningjump');
                    action.setLoop(isOnce ? THREE.LoopOnce : THREE.LoopRepeat, isOnce ? 1 : Infinity);
                    if (isOnce) action.clampWhenFinished = true;
                    actions[name] = action;
                }
            } catch (err) {
                console.warn(`[Phase2] Failed to load ${name}:`, err);
            }
        }
    })();

    const animController = new AnimationController(mixer, actions);
    entityAnimationControllers.set(id, animController);

    scene.add(pivot);
    entityMeshes.set(id, pivot);

    if (actions['idle']) {
        actions['idle'].play();
    }

    const weaponPivot = new THREE.Group();
    const modelPivot = new THREE.Group();
    weaponPivot.add(modelPivot);

    const scarModel = SkeletonUtils.clone(scarGltf.scene);
    const scarScale = (1.0 / scaleFactor) * 0.3;
    scarModel.scale.set(scarScale, scarScale, scarScale);
    scarModel.rotation.order = 'YXZ'; 
    scarModel.rotation.set(0, Math.PI, Math.PI / 2); 
    applyModelSettings(scarModel);
    modelPivot.add(scarModel);
    weaponPivot.name = 'weapon_rifle';

    // --- Knife Attachment ---
    const knifePivot = new THREE.Group();
    knifePivot.name = 'weapon_knife';
    const knifeModel = SkeletonUtils.clone(knifeGltf.scene);
    const knifeScale = (1.0 / scaleFactor) * 0.4;
    knifeModel.scale.set(knifeScale, knifeScale, knifeScale);
    knifeModel.rotation.order = 'YXZ'; 
    // Adjusted rotation for better grip in hand
    knifeModel.rotation.set(-Math.PI / 2, Math.PI, 0); 
    applyModelSettings(knifeModel);
    knifePivot.add(knifeModel);
    knifePivot.visible = false; 

    let handBone: THREE.Object3D | undefined;
    let leftHandBone: THREE.Object3D | undefined;

    // Kemik arama mantığını Smith ve Elric rig'leri için esnetiyoruz
    idleFbx.traverse((node: any) => {
        const rawName = node.name.toLowerCase();
        const cleanName = rawName.replace(/[:_ ]/g, ''); // mixamorig:righthand -> mixamorigrighthand, bip01 r hand -> bip01rhand
        
        const isRightHand =
            cleanName === 'mixamorigrighthand' ||
            cleanName === 'mixamorig9righthand' || 
            cleanName === 'mixamorig10righthand' ||
            cleanName === 'righthand' ||
            cleanName === 'handr' ||
            cleanName === 'bip01rhand' ||
            cleanName === 'right_hand' ||
            cleanName.includes('righthand');
        if (isRightHand && !handBone) handBone = node;

        const isLeftHand =
            cleanName === 'mixamoriglefthand' ||
            cleanName === 'mixamorig9lefthand' || 
            cleanName === 'mixamorig10lefthand' ||
            cleanName === 'lefthand' ||
            cleanName === 'handl' ||
            cleanName === 'bip01lhand' ||
            cleanName === 'left_hand' ||
            cleanName.includes('lefthand');
        if (isLeftHand && !leftHandBone) leftHandBone = node;
    });

    // Fallback: "hand" + "r/right" içeren, parmak olmayan herhangi bir kemik
    if (!handBone) {
        idleFbx.traverse((node: any) => {
            const name = node.name.toLowerCase();
            if (
                (name.includes('hand') && (name.includes('r') || name.includes('right'))) &&
                !name.includes('pinky') && !name.includes('index') &&
                !name.includes('middle') && !name.includes('ring') && !name.includes('thumb')
            ) {
                handBone = node;
            }
        });
    }
    if (!leftHandBone) {
        idleFbx.traverse((node: any) => {
            const name = node.name.toLowerCase();
            if (
                (name.includes('hand') && (name.includes('l') || name.includes('left'))) &&
                !name.includes('pinky') && !name.includes('index') &&
                !name.includes('middle') && !name.includes('ring') && !name.includes('thumb')
            ) {
                leftHandBone = node;
            }
        });
    }

    if (handBone) {
        // Rifle to Right Hand
        handBone.add(weaponPivot);
        weaponPivot.position.set(0, 0, 0);
        weaponPivot.rotation.set(0, 0, 0);
    } else {
        pivot.add(weaponPivot);
        weaponPivot.position.set(isP2 ? 0.3 : 0.35, 1.1, 0.4);
    }

    if (leftHandBone) {
        // FIXED: Bıçak lama animasyonu SOL el olduğu için bıçak sol ele alındı
        leftHandBone.add(knifePivot); 
        knifePivot.position.set(0, 0, 0);
        knifePivot.rotation.set(0, 0, 0);
    } else {
        pivot.add(knifePivot);
        knifePivot.position.set(isP2 ? -0.3 : -0.35, 1.1, 0.4);
    }

    const muzzleMarker = new THREE.Object3D();
    muzzleMarker.name = 'muzzle';
    // P2 ileri bakarken +0.7, P1 ters döndüğü için -0.7
    muzzleMarker.position.set(0, 0.1, 0.7);
    weaponPivot.add(muzzleMarker);

    const rapierWorld = getPhysicsWorld();
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x, spawnY, z)
        .setCanSleep(false);
    const rb = rapierWorld.createRigidBody(rbDesc);
    const collider = rapierWorld.createCollider(RAPIER.ColliderDesc.capsule(0.3, 0.65), rb);
    entityPhysicsBodies.set(id, rb);
    entityColliders.set(id, collider);
    colliderToEntity.set(collider.handle, id);

    InputIntents.shootRequest[id] = 0;
    InputIntents.reloadRequest[id] = 0;
    InputIntents.aimRequest[id] = 0;

    Weapon.type[id] = 0;
    Weapon.damage[id] = 20;
    Weapon.fireRate[id] = 2.5;
    Weapon.ammo[id] = 50;
    Weapon.maxAmmo[id] = 50;
    Weapon.range[id] = 100;

    WeaponState.state[id] = 0;

    return id;
}

export async function spawnWolf(scene: THREE.Scene, x: number, z: number): Promise<EntityId> {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, Rotation, id);
    addComponent(world, PhysicsBody, id);
    addComponent(world, EnemyTag, id);
    addComponent(world, WolfTag, id);
    WolfTag.value[id] = 1;
    addComponent(world, Health, id);
    addComponent(world, InputState, id);
    addComponent(world, InputIntents, id);
    addComponent(world, AnimState, id);
    addComponent(world, AIController, id);

    const groundY = getHeight(x, z);
    Position.x[id] = x;
    Position.y[id] = groundY + 1.5;
    Position.z[id] = z;
    Health.current[id] = 60;
    Health.max[id] = 60;
    AIController.lastHealth[id] = 60;

    const gltfLoader = new GLTFLoader();
    try {
        if (!wolfCachedP) {
            wolfCachedP = bgGltfLoader.loadAsync('assets/low_poly_wolf.glb').then(gltf => {
                return { scene: gltf.scene, animations: gltf.animations };
            });
        }

        const res = await wolfCachedP;
        const model = SkeletonUtils.clone(res.scene);
        applyModelSettings(model);
        model.scale.setScalar(3.0);

        const wolfPivot = new THREE.Group();
        wolfPivot.add(model);
        scene.add(wolfPivot);
        entityMeshes.set(id, wolfPivot);

        if (res.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            entityMixers.set(id, mixer);
            const actions: Record<string, THREE.AnimationAction> = {};
            entityActions.set(id, actions);

            res.animations.forEach((clip, idx) => {
                const name = clip.name.toLowerCase();
                const action = mixer.clipAction(clip);

                // 1. Primary: Keyword based (Death first)
                if (name.includes('death') || name.includes('die') || name.includes('dead') || name.includes('fallen') || name.includes('fell')) {
                    actions['death'] = action;
                    action.setLoop(THREE.LoopOnce, 1);
                    action.clampWhenFinished = true;
                }
                else if (name.includes('idle') || name.includes('stand')) actions['idle'] = action;
                else if (name.includes('walk') || name.includes('gallop') || name.includes('run') || name.includes('trot') || name.includes('chase')) {
                    if (!actions['walk']) actions['walk'] = action;
                    if (!actions['run']) actions['run'] = action;
                }
                else if (name.includes('attack') || name.includes('bite') || name.includes('snap')) actions['attack'] = action;

                // 2. Secondary: Index based fallback
                const fallbackOrderIndex = ['idle', 'walk', 'run', 'attack', 'death'];
                if (idx < fallbackOrderIndex.length) {
                    const slot = fallbackOrderIndex[idx];
                    if (!actions[slot]) {
                        actions[slot] = action;
                        if (slot === 'death') {
                            action.setLoop(THREE.LoopOnce, 1);
                            action.clampWhenFinished = true;
                        }
                    }
                }
            });

            if (actions['idle']) {
                actions['idle'].setLoop(THREE.LoopRepeat, Infinity);
                actions['idle'].play();
            } else if (res.animations[0]) {
                const action = mixer.clipAction(res.animations[0]);
                action.setLoop(THREE.LoopRepeat, Infinity);
                actions['idle'] = action;
            }
        }

        const rapierWorld = getPhysicsWorld();
        const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, groundY + 1.5, z);
        const rb = rapierWorld.createRigidBody(rbDesc);
        const collider = rapierWorld.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.7, 1.1), rb);
        entityPhysicsBodies.set(id, rb);
        entityColliders.set(id, collider);
        colliderToEntity.set(collider.handle, id);

        // Positional Audio (Reduced distance: 4m ref, 50% volume)
        const wolfSound = audioManager.createPositionalAudio('assets/sounds/freesound_community-angry-dog-14473.mp3', 3, 0.16);
        wolfSound.setDistanceModel('linear');
        wolfSound.setMaxDistance(40);
        wolfPivot.add(wolfSound);
        // Store for cleanup if needed, but Three.js will handle most of it if we just stop it on death
        (wolfPivot as any)._audio = wolfSound;
    } catch (e) {
        console.error('❌ Wolf load error:', e);
    }
    return id;
}

export const coinInstancedMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8),
    new THREE.MeshStandardMaterial({
        color: 0x5D4037, // Coffee Brown
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x3E2723,
        emissiveIntensity: 0.5
    }),
    1000 // Max 1000 coins on screen
);
coinInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
coinInstancedMesh.frustumCulled = false; // [FIX] Prevents whole pool from disappearing when center is off-camera
coinInstancedMesh.castShadow = true;
coinInstancedMesh.receiveShadow = true;

export function spawnCoffyCoin(scene: THREE.Scene, x: number, z: number): EntityId {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, CoffyCoinTag, id);

    const groundY = getHeight(x, z);
    Position.x[id] = x;
    Position.y[id] = groundY + 1.2;
    Position.z[id] = z;

    return id;
}

export async function spawnZombie(scene: THREE.Scene, x: number, z: number): Promise<EntityId> {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, Rotation, id);
    addComponent(world, PhysicsBody, id);
    addComponent(world, EnemyTag, id);
    addComponent(world, ZombieTag, id);
    addComponent(world, Health, id);
    addComponent(world, InputState, id);
    addComponent(world, AnimState, id);
    addComponent(world, AIController, id);
    addComponent(world, InputIntents, id);

    const groundY = getHeight(x, z);
    Position.x[id] = x;
    Position.y[id] = groundY + 1.0;
    Position.z[id] = z;
    Health.current[id] = 100;
    Health.max[id] = 100;
    AIController.lastHealth[id] = 100;

    try {
        if (!zombieCacheP.idle) {
            zombieCacheP.idle = bgLoader.loadAsync('models/zombie/Zombie Idle.fbx').then(fbx => {
                fbx.scale.setScalar(0.026); cleanupTraverse(fbx); stripRootMotion(fbx); return fbx;
            });
            zombieCacheP.walk = bgLoader.loadAsync('models/zombie/Zombie Running.fbx').then(fbx => {
                fbx.scale.setScalar(0.026); cleanupTraverse(fbx); stripRootMotion(fbx); return fbx;
            });
            zombieCacheP.attack = bgLoader.loadAsync('models/zombie/Zombie Attack.fbx').then(fbx => {
                fbx.scale.setScalar(0.026); cleanupTraverse(fbx); stripRootMotion(fbx); return fbx;
            });
            zombieCacheP.death = bgLoader.loadAsync('models/Dying Backwards (6).fbx').then(fbx => {
                fbx.scale.setScalar(0.026);
                cleanupTraverse(fbx);
                // FULL STRIP for death to prevent "jumping" up
                fbx.animations.forEach(clip => {
                    clip.tracks.forEach(track => {
                        // FIX: Only target HIPS/ROOT to prevent freezing all bones
                        if ((track.name.toLowerCase().includes('hips') || track.name.toLowerCase().includes('root')) &&
                            track.name.endsWith('.position')) {
                            const values = (track as any).values;
                            if (values && values.length > 3) {
                                const startY = values[1];
                                for (let i = 0; i < values.length; i += 3) {
                                    values[i] = 0; // X
                                    values[i + 1] = 0; // ZERO Hips/Root Y to pin to pivot/ground
                                    values[i + 2] = 0; // Z
                                }
                            }
                        }
                    });
                });
                return fbx;
            });
        }

        const [idleRes, walkRes, attackRes, deathRes] = await Promise.all([
            zombieCacheP.idle!, zombieCacheP.walk!, zombieCacheP.attack!, zombieCacheP.death!
        ]);

        // Clone the cached models
        const idleFbx = SkeletonUtils.clone(idleRes);
        const walkFbx = SkeletonUtils.clone(walkRes);
        const attackFbx = SkeletonUtils.clone(attackRes);
        const deathFbx = SkeletonUtils.clone(deathRes);

        // --- VISIBILITY FIX: Apply model settings to ensure zombies are visible ---
        [idleFbx, walkFbx, attackFbx, deathFbx].forEach(fbx => applyModelSettings(fbx));

        const pivot = new THREE.Group();
        pivot.add(idleFbx);
        scene.add(pivot);
        entityMeshes.set(id, pivot);

        // Positional Audio (Reduced distance: 5m ref, 50% volume)
        const zombieSound = audioManager.createPositionalAudio('assets/sounds/freesound_community-zombie-sounds-95180.mp3', 4, 0.14);
        zombieSound.setDistanceModel('linear');
        zombieSound.setMaxDistance(45);
        pivot.add(zombieSound);
        // Store for cleanup in AISystem
        (pivot as any)._audio = zombieSound;

        const mixer = new THREE.AnimationMixer(idleFbx);
        entityMixers.set(id, mixer);
        const actions: Record<string, THREE.AnimationAction> = {};
        entityActions.set(id, actions);

        if (idleRes.animations.length > 0) {
            const act = mixer.clipAction(idleRes.animations[0]);
            act.setLoop(THREE.LoopRepeat, Infinity).play();
            actions['idle'] = act;
        }
        if (walkRes.animations.length > 0) {
            const act = mixer.clipAction(walkRes.animations[0]);
            act.setLoop(THREE.LoopRepeat, Infinity);
            actions['walk'] = act;
            actions['run'] = act;
        }
        if (attackRes.animations.length > 0) {
            const act = mixer.clipAction(attackRes.animations[0]);
            actions['attack'] = act;
        }
        if (deathRes.animations.length > 0) {
            const act = mixer.clipAction(deathRes.animations[0]);
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
            actions['death'] = act;
        }
        const rapierWorld = getPhysicsWorld();
        const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, groundY + 2.0, z);
        const rb = rapierWorld.createRigidBody(rbDesc);

        // DUAL-COLLIDER: MEGA-CYLINDER (Covers 0m to 2.8m ground height)
        const bodyDesc = RAPIER.ColliderDesc.capsule(1.2, 0.6).setTranslation(0, -0.8, 0);
        const headDesc = RAPIER.ColliderDesc.ball(0.6).setTranslation(0, 0.05, 0); // Ground + 2.05m (Head center)
        const cBody = rapierWorld.createCollider(bodyDesc, rb);
        const cHead = rapierWorld.createCollider(headDesc, rb);

        entityPhysicsBodies.set(id, rb);
        entityColliders.set(id, cBody); // Main collider reference
        colliderToEntity.set(cBody.handle, id);
        colliderToEntity.set(cHead.handle, id);

    } catch (e) {
        console.error('❌ Zombie load error:', e);
    }
    return id;
}

export async function spawnNPC(scene: THREE.Scene, x: number, z: number, dialogueId: number = 0, requiredCoins: number = 1, gender: number = 0): Promise<EntityId> {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, Rotation, id);
    addComponent(world, NPCTag, id);
    addComponent(world, NPCInteraction, id);
    addComponent(world, AnimState, id);
    addComponent(world, AIController, id);
    addComponent(world, Velocity, id);
    addComponent(world, InputState, id);

    const groundY = getHeight(x, z);
    Position.x[id] = x;
    Position.y[id] = groundY;
    Position.z[id] = z;

    NPCInteraction.dialogueId[id] = dialogueId;
    NPCInteraction.requiredCoins[id] = requiredCoins;
    NPCInteraction.isSatisfied[id] = 0;

    AIController.state[id] = 0; // Idle
    AIController.timer[id] = 2 + Math.random() * 5;

    try {
        const currentCache = gender === 1 ? npcFemaleCacheP : npcCacheP;

        if (!currentCache.idle) {
            if (gender === 1) { // Female
                currentCache.idle = bgLoader.loadAsync('npc_female/Standing W_Briefcase Idle.fbx');
                currentCache.talk = bgLoader.loadAsync('npc_female/Talking (3).fbx');
                currentCache.walk = bgLoader.loadAsync('npc_female/Walking (2).fbx');
            } else { // Male
                currentCache.idle = bgLoader.loadAsync('npc/Standing Idle.fbx');
                currentCache.talk = bgLoader.loadAsync('npc/Talking.fbx');
                currentCache.walk = bgLoader.loadAsync('npc/Walking.fbx');
            }
        }

        const [idleBase, talkBase, walkBase] = await Promise.all([
            currentCache.idle!,
            currentCache.talk!,
            currentCache.walk!
        ]);

        const idleFbx = SkeletonUtils.clone(idleBase) as THREE.Group;
        const talkFbx = SkeletonUtils.clone(talkBase) as THREE.Group;
        const walkFbx = SkeletonUtils.clone(walkBase) as THREE.Group;

        const scale = 0.0324; // Reduced by 10% from 0.036
        [idleFbx, talkFbx, walkFbx].forEach(fbx => {
            fbx.scale.setScalar(scale);
            cleanupTraverse(fbx);
            stripRootMotion(fbx);
        });

        const pivot = new THREE.Group();
        pivot.add(idleFbx);
        pivot.position.set(x, groundY, z);
        scene.add(pivot);

        const mixer = new THREE.AnimationMixer(idleFbx);
        entityMixers.set(id, mixer);
        entityMeshes.set(id, pivot);

        const actions: Record<string, THREE.AnimationAction> = {};
        actions['idle'] = mixer.clipAction(idleFbx.animations[0]);
        actions['talk'] = mixer.clipAction(talkFbx.animations[0]);
        actions['walk'] = mixer.clipAction(walkFbx.animations[0]);
        entityActions.set(id, actions);

        actions['idle'].play();

    } catch (e) {
        console.error('❌ NPC load error:', e);
    }

    return id;
}

export function despawnNPC(id: EntityId, scene: THREE.Scene) {
    // 1. Remove Mesh
    const mesh = entityMeshes.get(id);
    if (mesh) {
        scene.remove(mesh);
        entityMeshes.delete(id);
    }

    npcLastAnim.delete(id);

    // 2. Remove Animations
    const mixer = entityMixers.get(id);
    if (mixer) {
        mixer.stopAllAction();
        entityMixers.delete(id);
    }
    entityActions.delete(id);

    // 3. Remove from physics and world
    removeEntity(world, id);
    console.log(`🧹 Despawned NPC ${id}`);
}

// Module-level query — her spawnRandomNPC çağrısında yeniden register edilmez
const _npcSpawnQuery = defineQuery([NPCTag, Position]);

export async function spawnRandomNPC(scene: THREE.Scene, playerX: number, playerZ: number, maxDist: number = -1, forceGender: number = -1) {
    let rx = 0, rz = 0;
    let attempts = 0;

    const npcQuery = _npcSpawnQuery;

    do {
        if (maxDist > 0) {
            // Local distribution around player
            const angle = Math.random() * Math.PI * 2;
            const r = 30 + Math.random() * (maxDist - 30);
            rx = playerX + Math.cos(angle) * r;
            rz = playerZ + Math.sin(angle) * r;
        } else {
            // Global map distribution (-850 to 850 range for 1800m terrain)
            rx = (Math.random() - 0.5) * 1700;
            rz = (Math.random() - 0.5) * 1700;
        }

        attempts++;

        // Collision checks: avoid water, houses, trees
        const occupied = isSpaceOccupied(rx, rz, 5.0);
        const nearLake = isNearLake(rx, rz, 15.0);

        // NPC-to-NPC overlap check: 100 meter threshold (100^2 = 10000)
        let tooCloseToOtherNPC = false;
        const existingNPCs = npcQuery(world);
        for (const nid of existingNPCs) {
            const dx = Position.x[nid] - rx;
            const dz = Position.z[nid] - rz;
            if (dx * dx + dz * dz < 10000) {
                tooCloseToOtherNPC = true;
                break;
            }
        }

        if (!occupied && !nearLake && !tooCloseToOtherNPC) break;

    } while (attempts < 100);

    const dialogueId = Math.floor(Math.random() * 3);
    // Log removed to reduce console spam
    const gender = forceGender !== -1 ? forceGender : (Math.random() > 0.5 ? 1 : 0);
    await spawnNPC(scene, rx, rz, dialogueId, 1, gender);
}
