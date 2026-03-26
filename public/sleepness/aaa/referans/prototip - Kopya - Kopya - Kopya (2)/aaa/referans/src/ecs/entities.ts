import { addEntity, addComponent } from 'bitecs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { world, entityMeshes, entityPhysicsBodies, entityColliders, entityMixers, entityActions, entityAnimationControllers } from './world.js';
import { Position, Rotation, PhysicsBody, PlayerTag, InputState, Health, AnimState } from './components.js';
import { getPhysicsWorld, GROUP_PLAYER } from '../core/physics.js';
import { getHeight } from '../world/terrain.js';
import { EntityId } from './types.js';
import { AnimationController } from '../core/AnimationController.js';

const loader = new FBXLoader();

// Mixamo kemik ön eklerini ("mixamorig:") hem mesh hem animasyondan temizler
function stripBonePrefixes(obj: THREE.Object3D | THREE.AnimationClip) {
    if (obj instanceof THREE.Object3D) {
        obj.traverse(child => {
            if (child.name.includes(':')) {
                child.name = child.name.split(':').pop()!;
            }
        });
    } else if (obj instanceof THREE.AnimationClip) {
        obj.tracks.forEach(track => {
            if (track.name.includes(':')) {
                track.name = track.name.split(':').pop()!;
            }
        });
    }
}

function stripRootMotion(fbx: THREE.Group) {
    fbx.animations.forEach(clip => {
        clip.tracks = clip.tracks.filter(track => {
            const isRootPos =
                (track.name.toLowerCase().includes('hips') ||
                    track.name.toLowerCase().includes('root')) &&
                track.name.endsWith('.position');
            return !isRootPos;
        });
    });
}

function stripXZRootMotion(fbx: THREE.Group) {
    fbx.animations.forEach(clip => {
        clip.tracks = clip.tracks.filter(track => {
            const isRootPos =
                (track.name.toLowerCase().includes('hips') ||
                    track.name.toLowerCase().includes('root')) &&
                track.name.endsWith('.position');
            
            if (isRootPos) {
                // Sadece X ve Z kanallarını temizle, Y (yükseklik) kalsın
                // THREE.KeyframeTrack.values [x, y, z, x, y, z, ...]
                const values = (track as any).values;
                if (values) {
                    for (let i = 0; i < values.length; i += 3) {
                        values[i] = 0;     // X = 0
                        values[i + 2] = 0; // Z = 0
                    }
                }
                // Track'i tamamen silmiyoruz, sadece değerlerini sıfırlayıp bırakıyoruz.
                // Eğer silseydik visual snap-back olmazdı ama dikey hareket de giderdi.
                return true; 
            }
            return true;
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

async function loadFBX(path: string, retries = 2): Promise<THREE.Group> {
    try {
        return await new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, reject);
        });
    } catch (err) {
        if (retries > 0) {
            console.warn(`⚠️ Retrying player model load (${retries} left): ${path}`);
            return loadFBX(path, retries - 1);
        }
        console.error(`❌ Player model load failed: ${path}`, err);
        throw err;
    }
}

export function spawnPlayer(scene: THREE.Scene, x: number, _y: number, z: number): EntityId {
    const id = addEntity(world) as EntityId;
    addComponent(world, Position, id);
    addComponent(world, Rotation, id);
    addComponent(world, PhysicsBody, id);
    addComponent(world, PlayerTag, id);
    addComponent(world, InputState, id);
    addComponent(world, Health, id);
    addComponent(world, AnimState, id);

    const groundY = getHeight(x, z);
    const spawnY = groundY + 0.45;

    Position.x[id] = x;
    Position.y[id] = spawnY;
    Position.z[id] = z;
    Health.current[id] = 100;
    Health.max[id] = 100;

    Promise.all([
        loadFBX('/models/Standing Idle.fbx'),
        loadFBX('/models/Walking.fbx'),
        loadFBX('/models/Running.fbx'),
        loadFBX('/models/Jumping.fbx'),
        loadFBX('/models/runningjump.fbx'),
        loadFBX('/models/Swimming.fbx'),
        loadFBX('/models/punching.fbx'),
        loadFBX('/models/death.fbx'),
    ]).then(([idleFbx, walkFbx, runFbx, jumpFbx, runJumpFbx, swimFbx, punchFbx, deathFbx]) => {
        
        [idleFbx, walkFbx, runFbx, jumpFbx, runJumpFbx, swimFbx, punchFbx, deathFbx].forEach(f => {
            stripBonePrefixes(f);
            f.animations.forEach(clip => stripBonePrefixes(clip));
        });

        idleFbx.scale.setScalar(0.013);
        idleFbx.rotation.y = Math.PI;
        cleanupTraverse(idleFbx);
        stripRootMotion(idleFbx);

        const pivot = new THREE.Group();
        pivot.add(idleFbx);
        idleFbx.position.set(0, 0, 0);

        // Mesh sahneye eklenmeden önce mixer ve idle action hazır olsun
        const mixer = new THREE.AnimationMixer(idleFbx);
        entityMixers.set(id, mixer);

        const actions: Record<string, THREE.AnimationAction> = {};
        entityActions.set(id, actions);

        // Idle action'ı ÖNCE kur ve play et — sahneye eklenmeden önce
        if (idleFbx.animations.length > 0) {
            const idleAction = mixer.clipAction(idleFbx.animations[0]);
            idleAction.setLoop(THREE.LoopRepeat, Infinity);
            idleAction.clampWhenFinished = false;
            idleAction.enabled = true;
            idleAction.setEffectiveWeight(1);
            idleAction.play();
            actions['idle'] = idleAction;
        }

        // AnimationController idle action hazır olduktan SONRA oluştur
        const animController = new AnimationController(mixer, actions);
        entityAnimationControllers.set(id, animController);

        // Şimdi sahneye ekle — ilk frame zaten idle'da
        scene.add(pivot);
        entityMeshes.set(id, pivot);

        // Walk
        cleanupTraverse(walkFbx);
        stripRootMotion(walkFbx);
        if (walkFbx.animations.length > 0) {
            const action = mixer.clipAction(walkFbx.animations[0]);
            action.setLoop(THREE.LoopRepeat, Infinity);
            actions['walk'] = action;
        }

        // Run
        cleanupTraverse(runFbx);
        stripRootMotion(runFbx);
        if (runFbx.animations.length > 0) {
            const action = mixer.clipAction(runFbx.animations[0]);
            action.setLoop(THREE.LoopRepeat, Infinity);
            actions['run'] = action;
        }

        // Jump
        cleanupTraverse(jumpFbx);
        stripXZRootMotion(jumpFbx); 
        if (jumpFbx.animations.length > 0) {
            const clip = jumpFbx.animations[0];

            // Hips/Root Y track'ini bul — en düşük noktadan en yüksek noktaya geçiş = zıplama anı
            const hipsYTrack = clip.tracks.find(t =>
                (t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')) &&
                t.name.endsWith('.position')
            );
            if (hipsYTrack) {
                const times = (hipsYTrack as THREE.KeyframeTrack).times;
                const values = (hipsYTrack as THREE.KeyframeTrack).values;
                let minVal = Infinity, minIdx = 0;
                for (let i = 0; i < values.length; i += 3) {
                    const y = values[i + 1];
                    if (y < minVal) { minVal = y; minIdx = i / 3; }
                }
            } 
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = false;
            actions['jump'] = action;
        }

        // Running Jump
        cleanupTraverse(runJumpFbx);
        stripXZRootMotion(runJumpFbx);
        if (runJumpFbx.animations.length > 0) {
            const action = mixer.clipAction(runJumpFbx.animations[0]);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = false;
            actions['runningjump'] = action;
        } else {
            console.error('❌ No animations found in runningjump.fbx');
        }

        // Swim
        cleanupTraverse(swimFbx);
        stripRootMotion(swimFbx);
        if (swimFbx.animations.length > 0) {
            const action = mixer.clipAction(swimFbx.animations[0]);
            action.setLoop(THREE.LoopRepeat, Infinity);
            actions['swim'] = action;
        }

        // Punch
        cleanupTraverse(punchFbx);
        stripRootMotion(punchFbx);
        if (punchFbx.animations.length > 0) {
            const action = mixer.clipAction(punchFbx.animations[0]);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            actions['punch'] = action;
        }

        // Death
        cleanupTraverse(deathFbx);
        stripRootMotion(deathFbx);
        if (deathFbx.animations.length > 0) {
            const action = mixer.clipAction(deathFbx.animations[0]);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.enabled = true; // Enable it so it can be reset/played later
            action.setEffectiveWeight(0); // Start at 0 weight
            actions['death'] = action;
        }

        (window as any)._playerReadyCallback?.();

    }).catch((e) => {
        console.error('FBX yükleme hatası:', e);
        (window as any)._playerReadyCallback?.();
    });

    // Fizik
    const rapierWorld = getPhysicsWorld();
    const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x, spawnY, z)
        .setCanSleep(false);
    const rb = rapierWorld.createRigidBody(rbDesc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.2, 0.25)
        .setCollisionGroups(GROUP_PLAYER | 0xFFFF0000);
    const collider = rapierWorld.createCollider(colliderDesc, rb);
    entityPhysicsBodies.set(id, rb);
    entityColliders.set(id, collider);

    return id;
}