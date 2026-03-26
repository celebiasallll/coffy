import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getTerrainNormal, WATER_LEVEL, LAKE_CENTER_X, LAKE_CENTER_Z, LAKE_RADIUS, getHeight } from '../world/terrain.js';
import { CAMPFIRE_POSITIONS, isSpaceOccupied } from '../world/environment.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { getPhysicsWorld } from '../core/physics.js';
import { registerInteractable } from './InteractionSystem.js';
import { isSocialHostile } from './InteractionSystem.js';
import { audioManager } from '../core/AudioManager.js';
import { socialize, takeDamage } from './SurvivalSystem.js';

const FULL_DIST = 45;
const ANIM_DIST = 70;
const VISIBLE_DIST = 160;
const VILLAGE_SLEEP_DIST = 350; // Total world culling
const VILLAGE_CENTER = new THREE.Vector3(480, 0, 480);
const SOCIAL_RANGE = 7;
const WANDER_MAX = 40; 

type NPCAnimKey = 'idle' | 'walk' | 'talk' | 'punch' | 'plant' | 'death';
type BehaviourType = 'idle' | 'wander' | 'social' | 'planting';

const fbxLoader = new FBXLoader();

async function loadFBX(path: string, retries = 2): Promise<THREE.Group> {
  try {
    return await new Promise((res, rej) =>
      fbxLoader.load(path, res, undefined, rej)
    );
  } catch (err) {
    if (retries > 0) {
      console.warn(`⚠️ Retrying FBX load (${retries} left): ${path}`);
      return loadFBX(path, retries - 1);
    }
    console.error(`❌ FBX yüklenemedi: ${path}`, err);
    throw err;
  }
}

function stripRootMotion(fbx: THREE.Group): void {
  fbx.animations.forEach(clip => {
    clip.tracks = clip.tracks.filter(t => {
      const isRoot = (t.name.toLowerCase().includes('hips') || t.name.toLowerCase().includes('root')) && t.name.endsWith('.position');
      return !isRoot;
    });
  });
}

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

function prepareMaterials(fbx: THREE.Group): void {
  fbx.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = false;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat: any, i: number) => {
      if ('shininess' in mat || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial) {
        const std = new THREE.MeshStandardMaterial({ 
          color: mat.color ?? 0xffffff, 
          map: mat.map ?? null, 
          normalMap: mat.normalMap ?? null,
          roughness: 0.8, 
          metalness: 0.0 
        });

        // SSS Approximation for Skin
        const lowerName = mat.name.toLowerCase();
        if (lowerName.includes('skin') || lowerName.includes('body') || lowerName.includes('face')) {
          std.roughness = 0.6;
          std.onBeforeCompile = (shader) => {
             shader.uniforms.uSSSColor = { value: new THREE.Color(0xff4422) };
             shader.fragmentShader = shader.fragmentShader.replace(
               '#include <common>',
               `#include <common>
                uniform vec3 uSSSColor;`
             ).replace(
               '#include <lights_fragment_begin>',
               `#include <lights_fragment_begin>
                // Subtle SSS-like glow in shadows
                float sssWrap = 0.5;
                float sssDot = max(0.0, (dot(geometryNormal, directLight.direction) + sssWrap) / (1.0 + sssWrap));
                reflectedLight.directDiffuse += directLight.color * uSSSColor * (sssDot * 0.15);`
             );
          };
        }

        if (Array.isArray(m.material)) (m.material as any)[i] = std;
        else m.material = std;
      }
    });
  });
}

// ── Paylaşılan varlıklar ──────────────────────────────────────────────────────
interface NPCVariantAssets {
  idleClip: THREE.AnimationClip;
  walkClip: THREE.AnimationClip;
  talkClip: THREE.AnimationClip;
  punchClip: THREE.AnimationClip;
  plantClip: THREE.AnimationClip;
  deathClip: THREE.AnimationClip;
  baseFBX: THREE.Group;
}

interface AllNPCAssets {
  male: NPCVariantAssets;
  female: NPCVariantAssets | null;
  wizard: NPCVariantAssets | null;
}

let sharedAssets: AllNPCAssets | null = null;
let loadPromise: Promise<AllNPCAssets> | null = null;

async function loadAssets(): Promise<AllNPCAssets> {
  if (sharedAssets) return sharedAssets;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // console.log('🔄 NPC Assets yükleniyor...');

    // ── MALE VARIANT ──
    const [mIdle, mWalk, mTalk, mPunch, mPlant, mDeath] = await Promise.all([
      loadFBX('/models/npc/Standing%20Idle.fbx'),
      loadFBX('/models/npc/Walking.fbx'),
      loadFBX('/models/npc/Talking.fbx'),
      loadFBX('/models/npc/Punching.fbx'),
      loadFBX('/models/npc/Plant%20A%20Plant%20(1).fbx'),
      loadFBX('/models/npc/death.fbx'),
    ]);

    [mIdle, mWalk, mTalk, mPunch, mPlant, mDeath].forEach(f => {
      stripBonePrefixes(f);
      f.animations.forEach(clip => stripBonePrefixes(clip));
      prepareMaterials(f);
      stripRootMotion(f);
      f.scale.set(1, 1, 1);
    });

    const male: NPCVariantAssets = {
      idleClip: mIdle.animations[0],
      walkClip: mWalk.animations[0],
      talkClip: mTalk.animations[0],
      punchClip: mPunch.animations[0],
      plantClip: mPlant.animations[0],
      deathClip: mDeath.animations[0],
      baseFBX: mIdle,
    };

    // ── FEMALE VARIANT ──
    let female: NPCVariantAssets | null = null;
    try {
      const [fIdle, fWalk, fTalk, fPunch, fPlant, fDeath] = await Promise.all([
        loadFBX('/models/npc_female/Standing%20W_Briefcase%20Idle.fbx'),
        loadFBX('/models/npc_female/Walking%20(2).fbx'),
        loadFBX('/models/npc_female/Talking%20(3).fbx'),
        loadFBX('/models/npc_female/Punching.fbx'),
        loadFBX('/models/npc_female/Plant%20A%20Plant.fbx'),
        loadFBX('/models/npc_female/death.fbx'),
      ]);

      [fIdle, fWalk, fTalk, fPunch, fPlant, fDeath].forEach(f => {
        stripBonePrefixes(f);
        f.animations.forEach(clip => stripBonePrefixes(clip));
        prepareMaterials(f);
        stripRootMotion(f);
        f.scale.set(1, 1, 1);
      });

      female = {
        idleClip: fIdle.animations[0],
        walkClip: fWalk.animations[0],
        talkClip: fTalk.animations[0],
        punchClip: fPunch.animations[0],
        plantClip: fPlant.animations[0],
        deathClip: fDeath.animations[0],
        baseFBX: fIdle,
      };
      // console.log('✅ Female NPC assets loaded successfully.');
    } catch (err) {
      console.warn('ℹ️ Female NPC assets skipping:', err);
    }

    // ── WIZARD VARIANT ──
    let wizard: NPCVariantAssets | null = null;
    try {
      const wIdle = await loadFBX('/models/wizard/Idle%20(1).fbx');
      [wIdle].forEach(f => {
        stripBonePrefixes(f);
        f.animations.forEach(clip => stripBonePrefixes(clip));
        prepareMaterials(f);
        stripRootMotion(f);
        f.scale.set(1, 1, 1);
      });
      wizard = {
        idleClip: wIdle.animations[0],
        walkClip: wIdle.animations[0], // Wizard stays idle or walks slowly
        talkClip: wIdle.animations[0],
        punchClip: wIdle.animations[0],
        plantClip: wIdle.animations[0],
        deathClip: wIdle.animations[0],
        baseFBX: wIdle,
      };
      // console.log('✅ Wizard NPC assets loaded.');
    } catch (err) {
      console.warn('ℹ️ Wizard NPC assets skipping:', err);
    }

    sharedAssets = { male, female, wizard };
    // console.log('✅ NPC Assets initialization complete.');
    return sharedAssets;
  })();

  return loadPromise;
}

// ── NPC tipi ──────────────────────────────────────────────────────────────────
export interface NPC {
  id: number;
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<NPCAnimKey, THREE.AnimationAction | null>;
  currentAnim: NPCAnimKey;
  behaviour: BehaviourType;
  homePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  yaw: number;
  stateTimer: number;
  socialPartnerId: number;
  interacting: boolean;
  mumbleSound: THREE.PositionalAudio | null;
  rigidBody?: RAPIER.RigidBody;
  collider?: RAPIER.Collider;
  role: 'villager' | 'harvester' | 'mystic' | 'enemy';
  gender: 'male' | 'female';
  health: number;
  isHostile: boolean;
  isDead: boolean;
  lastPunchTime: number;
  attackCooldown: number;      // Bir sonraki yumruğa kadar kalan süre (saniye)
  damagedThisSwing: boolean;   // Bu salınımda hasar verildi mi? (çift hasar önler)
}

export const npcs: NPC[] = [];
export const npcMap = new Map<number, NPC>();
let npcIdCounter = 0;
const MALE_NAMES = ["Arthur", "Marcus", "Julian", "Victor", "Thomas", "Robert", "David", "Oliver", "Silas", "Felix", "Caleb", "Gideon", "Aldric", "Edmund", "Cassius"];
const FEMALE_NAMES = ["Elena", "Sophia", "Isabella", "Clara", "Mia", "Luna", "Emma", "Ava", "Hazel", "Iris", "Aria", "Lyra", "Seraphina", "Vivienne", "Cordelia"];

// ── Spawn ─────────────────────────────────────────────────────────────────────
export async function spawnNPCs(scene: THREE.Scene, count = 20): Promise<void> {
  let allAssets: AllNPCAssets;
  try {
    allAssets = await loadAssets();
  } catch {
    console.error('❌ NPC spawn iptal: FBX yüklenemedi.');
    return;
  }

  const CENTER_X = 480, CENTER_Z = 480;
  const RADIUS_MIN = 10;
  const RADIUS_MAX = 80; 
  let spawned = 0;

    for (let i = 0; i < count; i++) {
        let x = 480, z = 480, y = 0, att = 0;
        let role: 'villager' | 'harvester' | 'mystic' | 'enemy' = 'villager';
        
        // Distribution Logic
        if (i < 10) role = 'villager';
        else if (i < 20) role = 'harvester';
        else if (i < 25) role = 'mystic';
        else role = 'enemy';

        do {
            if (i === 0) { // Arthur: Near the Well
               x = 485 + (Math.random()-0.5)*5;
               z = 475 + (Math.random()-0.5)*5;
            } else if (i === 2) { // Seraphina: Eastern Rocks
               x = 800 + (Math.random()-0.5)*20;
               z = 480 + (Math.random()-0.5)*20;
            } else if (i === 8) { // Silas: Deep Wilderness
               x = -600 + (Math.random()-0.5)*50;
               z = 600 + (Math.random()-0.5)*50;
            } else if (role === 'villager') {
                // Village buildings are loosely in (250-750) range
                x = 250 + Math.random() * 500;
                z = 250 + Math.random() * 500;
            } else if (role === 'harvester') {
                // Scattered across the full terrain
                x = (Math.random() - 0.5) * 1700; // -850 to 850
                z = (Math.random() - 0.5) * 1700;
            } else if (role === 'mystic') {
                // Spawn near a random campfire
                const campfireIdx = i % CAMPFIRE_POSITIONS.length;
                const cp = CAMPFIRE_POSITIONS[campfireIdx];
                const angle = Math.random() * Math.PI * 2;
                const r = 6 + Math.random() * 4; // 6-10m away
                x = cp[0] + Math.cos(angle) * r;
                z = cp[1] + Math.sin(angle) * r;
            } else {
                // Hazardous perimeters
                const zones = [{x: 800, z: 800}, {x: -800, z: 800}, {x: 800, z: -800}, {x: 0, z: 850}, {x: -800, z: 0}];
                const s = zones[i % zones.length];
                x = s.x + (Math.random()-0.5)*120;
                z = s.z + (Math.random()-0.5)*120;
            }
            y = getHeight(x, z);
            const inLake = (x - LAKE_CENTER_X) ** 2 + (z - LAKE_CENTER_Z) ** 2 < (LAKE_RADIUS + 20) ** 2;
            if (y > WATER_LEVEL + 0.5 && !inLake && !isSpaceOccupied(x, z, 2.0)) break;
        } while (++att < 30);

    if (y <= WATER_LEVEL + 0.5) continue;

    try {
      const id = npcIdCounter++;
      let isFemale = false;
      let npcName = "";

      if (id === 0) { isFemale = false; npcName = "Arthur"; }
      else if (id === 1) { isFemale = true; npcName = "Clara"; }
      else if (id === 2) { isFemale = true; npcName = "Seraphina"; }
      else if (id === 8) { isFemale = false; npcName = "Silas"; }
      else if (role === 'mystic') { isFemale = false; npcName = "Wizard"; }
      else {
        isFemale = !!(allAssets.female && Math.random() < 0.5);
        if (isFemale) {
          npcName = FEMALE_NAMES[id % FEMALE_NAMES.length];
        } else {
          npcName = MALE_NAMES[id % MALE_NAMES.length];
        }
      }

      let variant = (isFemale && allAssets.female) ? allAssets.female : allAssets.male;
      if (role === 'mystic' && allAssets.wizard) variant = allAssets.wizard;
      const gender: 'male' | 'female' = isFemale ? 'female' : 'male';

      const TINTS = [
        new THREE.Color(1.0, 0.9, 0.8),
        new THREE.Color(0.9, 0.8, 0.7),
        new THREE.Color(0.8, 0.6, 0.5),
        new THREE.Color(1.0, 0.8, 0.6),
      ];
      const tint = TINTS[Math.floor(Math.random() * TINTS.length)];

      const pivot = new THREE.Group();
      pivot.name = npcName;
      pivot.position.set(x, y, z);
      pivot.rotation.y = Math.random() * Math.PI * 2;
      pivot.scale.setScalar(0.026 + Math.random() * 0.002);

      const mesh = skeletonClone(variant.baseFBX) as THREE.Group;

      mesh.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = false;
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mat: any) => {
              if (mat.color) {
                mat.color.setRGB(1, 1, 1);
                mat.color.multiply(tint);
              }
              if ('metalness' in mat) mat.metalness = 0;
              if ('roughness' in mat) mat.roughness = 0.9;
            });
          }
        }
      });

      pivot.add(mesh);
      scene.add(pivot);

      const mixer = new THREE.AnimationMixer(mesh);

      const idleAction = mixer.clipAction(variant.idleClip);
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.time = Math.random() * variant.idleClip.duration;
      idleAction.setEffectiveWeight(1).play();

      const walkAction = mixer.clipAction(variant.walkClip);
      walkAction.setLoop(THREE.LoopRepeat, Infinity);
      walkAction.setEffectiveWeight(0);
      walkAction.setEffectiveTimeScale(1.6);

      const talkAction = mixer.clipAction(variant.talkClip);
      talkAction.setLoop(THREE.LoopRepeat, Infinity);
      talkAction.setEffectiveWeight(0);

      const punchAction = mixer.clipAction(variant.punchClip);
      punchAction.setLoop(THREE.LoopOnce, 1);
      punchAction.clampWhenFinished = true;
      punchAction.setEffectiveWeight(0);

      const plantAction = mixer.clipAction(variant.plantClip);
      plantAction.setLoop(THREE.LoopRepeat, Infinity);
      plantAction.setEffectiveWeight(0);

      const deathAction = mixer.clipAction(variant.deathClip);
      deathAction.setLoop(THREE.LoopOnce, 1);
      deathAction.clampWhenFinished = true;
      deathAction.setEffectiveWeight(0);

      const physicsWorld = getPhysicsWorld();
      const rbDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x, y + 0.95, z)
        .setCanSleep(true);
      const rb = physicsWorld.createRigidBody(rbDesc);
      const colDesc = RAPIER.ColliderDesc.capsule(0.5, 0.45);
      const collider = physicsWorld.createCollider(colDesc, rb);

      npcs.push({
        id: id,
        mesh: pivot,
        mixer,
        actions: { 
          idle: idleAction, 
          walk: walkAction, 
          talk: talkAction, 
          punch: punchAction, 
          plant: plantAction,
          death: deathAction 
        },
        currentAnim: 'idle',
        behaviour: 'idle',
        homePos: pivot.position.clone(),
        targetPos: pivot.position.clone(),
        speed: 1.8 + Math.random() * 1.2,
        yaw: pivot.rotation.y,
        stateTimer: 1 + Math.random() * 4,
        socialPartnerId: -1,
        interacting: false,
        mumbleSound: null,
        rigidBody: rb,
        collider: collider,
        role,
        gender,
        health: role === 'enemy' ? 600 : 500,
        isHostile: role === 'enemy',
        isDead: false,
        lastPunchTime: 0,
        attackCooldown: 0,
        damagedThisSwing: false,
      });

      // Force initial update to prevent T-pose
      mixer.update(0);

      npcMap.set(id, npcs[npcs.length - 1]);

      const currentNpc = npcs[npcs.length - 1];
      pivot.name = npcName;
      
      if (id === 0) { currentNpc.role = "villager"; pivot.position.set(485, getHeight(485, 475), 475); }
      else if (id === 1) { currentNpc.role = "villager"; pivot.position.set(430, getHeight(430, 510), 510); }
      else if (id === 2) { currentNpc.role = "villager"; pivot.position.set(210, getHeight(210, 710), 710); }
      else if (id === 8) { currentNpc.role = "villager"; }

      if (rb) rb.setTranslation({ x: pivot.position.x, y: pivot.position.y + 0.95, z: pivot.position.z }, true);

      registerInteractable({
        id: `npc_${currentNpc.id}`,
        position: currentNpc.mesh.position,
        radius: 4.0,
        label: role === 'enemy' ? '???' : `${npcName} · Konuş`,
        onInteract: () => {
          if (currentNpc.isDead || currentNpc.role === 'enemy') return;
          if (!currentNpc.interacting) {
            socialize(20);
          }
          currentNpc.interacting = !currentNpc.interacting;
        }
      });

      const mumbleUrl = gender === 'female'
        ? '/assets/sounds/femalemumble.mp3'
        : '/assets/sounds/mumble.mp3';
      const mumble = new THREE.PositionalAudio(audioManager.getListener());
      mumble.setRefDistance(10);
      mumble.setVolume(0.022);
      mumble.setLoop(true);
      pivot.add(mumble);
      new THREE.AudioLoader().load(mumbleUrl, (buf) => {
        mumble.setBuffer(buf);
      }, undefined, (_err) => {
        new THREE.AudioLoader().load('/assets/sounds/ambient.mp3', (buf) => {
          mumble.setBuffer(buf);
          mumble.setVolume(0.08);
        }, undefined, () => { });
      });
      currentNpc.mumbleSound = mumble;

      spawned++;
    } catch (err) {
      console.error(`Error spawning NPC ${i}:`, err);
    }
  }

  if (spawned > 0) {
    console.log(`✅ NPCSystem: ${spawned} NPC başarıyla sahneye eklendi.`);
  }
}

function playAnim(npc: NPC, key: NPCAnimKey, fadeSec = 0.35): void {
  const to = npc.actions[key];
  if (!to) return;
  if (npc.currentAnim === key && to.loop === THREE.LoopRepeat) return;
  const from = npc.actions[npc.currentAnim];
  if (to.loop === THREE.LoopOnce) to.stop();
  to.reset().setEffectiveWeight(1).fadeIn(fadeSec).play();
  if (from && from !== to) {
    from.fadeOut(fadeSec);
  }
  npc.currentAnim = key;
}

let _npcUpdateFrame = 0;

export function updateNPCs(dt: number, playerPos: THREE.Vector3): void {
  _npcUpdateFrame++;
  for (const npc of npcs) {
    if (npc.isDead) {
      npc.mixer.update(dt);
      continue;
    }
    const distSq = npc.mesh.position.distanceToSquared(playerPos);
    if (distSq > VISIBLE_DIST * VISIBLE_DIST) { 
        if (npc.mesh.visible) npc.mesh.visible = false; 
        if (npc.mumbleSound && npc.mumbleSound.isPlaying) npc.mumbleSound.stop();
        continue; 
    }
    if (npc.mesh.name === "Silas" || (npc.id % 15 === 8 && npc.gender === 'male' && npc.role === 'villager')) {
        const currentHr = (window as any)._gameTimeHours ?? 12;
        const isNight = currentHr >= 22 || currentHr < 4;
        if (!isNight) {
            if (npc.mesh.visible) npc.mesh.visible = false;
            if (npc.mumbleSound && npc.mumbleSound.isPlaying) npc.mumbleSound.stop();
            continue;
        }
    }
    if (!npc.mesh.visible) {
        npc.mesh.visible = true;
        npc.mixer.update(0); // Force initial pose to avoid T-pose
    }

    const dist = Math.sqrt(distSq);
    const interactionProximity = dist < 4.0;

    if (dist > 5.0 && npc.interacting) {
      npc.interacting = false;
    }

    const isVillager = npc.role === 'villager' || npc.role === 'harvester';
    const npcHostile = npc.isHostile || (isVillager && isSocialHostile());

    if (npcHostile && dist < 25.0) {
      if (npc.attackCooldown > 0) npc.attackCooldown -= dt;

      const dx2 = playerPos.x - npc.mesh.position.x;
      const dz2 = playerPos.z - npc.mesh.position.z;
      const targetYaw = Math.atan2(dx2, dz2);
      const dy2 = normalizeAngle(targetYaw - npc.yaw);
      npc.yaw += Math.sign(dy2) * Math.min(Math.abs(dy2), dt * 7.0);
      npc.mesh.rotation.y = npc.yaw;

      const punchAction = npc.actions['punch'];

      if (dist > 2.5) {
        if (npc.currentAnim === 'punch') {
          const pDur = punchAction?.getClip().duration ?? 1;
          const pTime = punchAction?.time ?? 0;
          if (pTime >= pDur * 0.95) {
            npc.damagedThisSwing = false;
            playAnim(npc, 'walk', 0.2);
          }
        } else {
          if (npc.currentAnim !== 'walk') playAnim(npc, 'walk', 0.2);
          const chaseSpeed = npc.role === 'mystic' ? 0 : npc.speed * 1.5;
          const nextX = npc.mesh.position.x + Math.sin(npc.yaw) * chaseSpeed * dt;
          const nextZ = npc.mesh.position.z + Math.cos(npc.yaw) * chaseSpeed * dt;
          
          if (!isSpaceOccupied(nextX, nextZ, 1.2)) {
            npc.mesh.position.x = nextX;
            npc.mesh.position.z = nextZ;
            npc.mesh.position.y = getHeight(npc.mesh.position.x, npc.mesh.position.z) + 0.07;
            npc.targetPos.copy(npc.mesh.position);
          } else {
            // Blocked while hostile: try to strafe or just stop
          }
        }
      } else {
        if (npc.currentAnim !== 'punch' && npc.attackCooldown <= 0) {
          npc.damagedThisSwing = false;
          playAnim(npc, 'punch', 0.15);
        }
      }

      if (punchAction && punchAction.enabled && npc.currentAnim === 'punch') {
        const time = punchAction.time;
        const dur = punchAction.getClip().duration;
        if (!npc.damagedThisSwing && time > dur * 0.35 && time < dur * 0.65 && dist < 3.0) {
          takeDamage(8);
          npc.damagedThisSwing = true;
          npc.lastPunchTime = Date.now();
        }
        if (time >= dur * 0.95) {
          npc.attackCooldown = 0.6;
          npc.damagedThisSwing = false;
          if (dist <= 2.5) {
            playAnim(npc, 'idle', 0.1);
          } else {
            playAnim(npc, 'walk', 0.2);
          }
        }
      }

      if (npc.rigidBody) {
        npc.rigidBody.setNextKinematicTranslation({
          x: npc.mesh.position.x,
          y: npc.mesh.position.y + 0.95,
          z: npc.mesh.position.z
        });
      }

      npc.mixer.update(dt);
      continue;
    }

    if (npc.isHostile && dist > 30) {
      npc.isHostile = false;
      npc.attackCooldown = 0;
      npc.damagedThisSwing = false;
    }

    if (npc.currentAnim === 'punch' && !npcHostile) {
      if (!npc.isDead) playAnim(npc, 'idle');
    }

    if (npc.role === 'harvester' && npc.behaviour === 'idle' && !npc.interacting && !interactionProximity) {
      if (Math.random() < 0.3) enterPlanting(npc);
    }

    if (npc.interacting || interactionProximity) {
      if (npc.currentAnim !== 'talk') playAnim(npc, 'talk');
      const dx = playerPos.x - npc.mesh.position.x;
      const dz = playerPos.z - npc.mesh.position.z;
      const targetYaw = Math.atan2(dx, dz);
      const dyaw = normalizeAngle(targetYaw - npc.yaw);
      npc.yaw += Math.sign(dyaw) * Math.min(Math.abs(dyaw), dt * 5.0);
      npc.mesh.rotation.y = npc.yaw;

      if (_npcUpdateFrame % 60 === 0 && npc.mumbleSound && !npc.mumbleSound.isPlaying) {
        if ((npc.mumbleSound as any).buffer) {
          try { npc.mumbleSound.play(); } catch (_) { }
        }
      }

      npc.mixer.update(dt);
      continue;
    }

    if (npc.mumbleSound && npc.mumbleSound.isPlaying) {
      npc.mumbleSound.stop();
    }

    if (npc.currentAnim === 'talk' && !npc.interacting && !interactionProximity && npc.behaviour !== 'social') {
      if (npc.behaviour === 'wander') playAnim(npc, 'walk');
      else if (npc.behaviour === 'planting') playAnim(npc, 'plant');
      else playAnim(npc, 'idle');
    }

    const isDistant = dist > 100;
    if (!isDistant || _npcUpdateFrame % 3 === 0) {
        if (!npcHostile) {
          updateBehaviour(npc, dt * (isDistant ? 3 : 1));
          moveNPC(npc, dt * (isDistant ? 3 : 1));
        }
        if (npc.rigidBody) {
            npc.rigidBody.setNextKinematicTranslation({
                x: npc.mesh.position.x,
                y: npc.mesh.position.y + 0.95,
                z: npc.mesh.position.z
            });
        }
    }

    if (dist < 150) {
        updateNPCGrounding(npc);
    }

    if (dist < 80) {
        npc.mixer.update(dt);
    } else if (_npcUpdateFrame % 10 === 0) {
        // Slow update for distant NPCs to keep them in pose
        npc.mixer.update(dt * 10);
    }
  }
}

function updateBehaviour(npc: NPC, dt: number): void {
  npc.stateTimer -= dt;
  switch (npc.behaviour) {
    case 'idle': {
      if (npc.stateTimer > 0) break;
      const partner = findSocialPartner(npc);
      if (partner) { linkSocial(npc, partner); break; }
      const isHarvester = npc.role === 'harvester';
      const isMystic = npc.role === 'mystic';
      if (isMystic) { npc.stateTimer = 5 + Math.random() * 10; break; }
      if (Math.random() < (isHarvester ? 0.7 : 0.15)) enterPlanting(npc);
      else if (Math.random() < 0.55) enterWander(npc);
      else npc.stateTimer = 2 + Math.random() * 5;
      break;
    }
    case 'wander': {
      const dx = npc.targetPos.x - npc.mesh.position.x;
      const dz = npc.targetPos.z - npc.mesh.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.2 || npc.stateTimer <= 0) enterIdle(npc);
      break;
    }
    case 'planting': {
      if (npc.stateTimer <= 0) {
        enterIdle(npc);
      }
      break;
    }
    case 'social': {
      if (npc.stateTimer <= 0) {
        const partner = npcs.find(n => n.id === npc.socialPartnerId);
        if (partner) { partner.socialPartnerId = -1; enterIdle(partner); }
        npc.socialPartnerId = -1; enterIdle(npc); break;
      }
      const partner = npcs.find(n => n.id === npc.socialPartnerId);
      if (partner) {
        const dx = partner.mesh.position.x - npc.mesh.position.x;
        const dz = partner.mesh.position.z - npc.mesh.position.z;
        npc.yaw = Math.atan2(dx, dz);
        npc.mesh.rotation.y = npc.yaw;
      }
      break;
    }
  }
}

function moveNPC(npc: NPC, dt: number): void {
  if (npc.role === 'mystic') return;
  if (npc.behaviour !== 'wander') return;
  const dx = npc.targetPos.x - npc.mesh.position.x;
  const dz = npc.targetPos.z - npc.mesh.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.3) return;
  const targetYaw = Math.atan2(dx, dz);
  const dyaw = normalizeAngle(targetYaw - npc.yaw);
  npc.yaw += Math.sign(dyaw) * Math.min(Math.abs(dyaw), dt * 3.5);
  
  const nextX = npc.mesh.position.x + Math.sin(npc.yaw) * npc.speed * dt;
  const nextZ = npc.mesh.position.z + Math.cos(npc.yaw) * npc.speed * dt;
  
  if (!isSpaceOccupied(nextX, nextZ, 1.2)) {
    npc.mesh.position.x = nextX;
    npc.mesh.position.z = nextZ;
    npc.mesh.position.y = getHeight(npc.mesh.position.x, npc.mesh.position.z) + 0.05;
  } else {
    // Blocked: force wander reset
    npc.stateTimer = 0;
  }
  npc.mesh.rotation.y = npc.yaw;
}

function enterIdle(npc: NPC): void {
  npc.behaviour = 'idle';
  npc.stateTimer = 2 + Math.random() * 5;
  playAnim(npc, 'idle');
}

function enterWander(npc: NPC): void {
  npc.behaviour = 'wander'; npc.stateTimer = 8 + Math.random() * 8; playAnim(npc, 'walk');
  let att = 0;
  while (att++ < 20) {
    const a = Math.random() * Math.PI * 2, d = 5 + Math.random() * WANDER_MAX;
    const tx = npc.homePos.x + Math.cos(a) * d, tz = npc.homePos.z + Math.sin(a) * d;
    const ty = getHeight(tx, tz);
    const inLake = (tx - LAKE_CENTER_X) ** 2 + (tz - LAKE_CENTER_Z) ** 2 < (LAKE_RADIUS + 15) ** 2;
    if (ty > WATER_LEVEL + 0.5 && !inLake && !isSpaceOccupied(tx, tz, 2.0)) { 
      npc.targetPos.set(tx, ty, tz); 
      return; 
    }
  }
  enterIdle(npc);
}

function enterPlanting(npc: NPC): void {
  const normal = getTerrainNormal(npc.mesh.position.x, npc.mesh.position.z);
  if (normal.y < 0.99) {
    enterWander(npc);
    return;
  }
  npc.behaviour = 'planting';
  npc.stateTimer = 10 + Math.random() * 10;
  playAnim(npc, 'plant');
  const scene = npc.mesh.parent as THREE.Scene;
  createSoilAt(npc.mesh.position, npc.mesh.rotation.y, scene);
}

const soilGeo = new THREE.PlaneGeometry(8.0, 8.0);

function createTilledTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a2f1b';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#2d1c10';
  ctx.lineWidth = 12;
  for (let i = 0; i < size; i += 24) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.fillStyle = '#3d2515';
    for (let j = 0; j < size; j += 10) {
      if (Math.random() < 0.2) {
        ctx.fillRect(j, i + Math.random() * 10, 4, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

const tilledMat = new THREE.MeshStandardMaterial({
  map: createTilledTexture(),
  roughness: 1.0,
  metalness: 0.0
});

function updateNPCGrounding(npc: NPC): void {
  const h = getHeight(npc.mesh.position.x, npc.mesh.position.z);
  let offset = 0.07;
  if (npc.behaviour === 'planting') offset = -1.3;
  if (npc.isDead) offset = -1.5; // GÜNCEL: Zemine tam oturması için -1.5
  npc.mesh.position.y = h + offset;
}

function createSoilAt(pos: THREE.Vector3, yaw: number, scene: THREE.Scene): void {
  if (!scene) return;
  const soil = new THREE.Mesh(soilGeo, tilledMat);
  const offsetDist = 0.8;
  const sx = pos.x + Math.sin(yaw) * offsetDist;
  const sz = pos.z + Math.cos(yaw) * offsetDist;
  const sy = getHeight(sx, sz) + 0.05;
  soil.position.set(sx, sy, sz);
  soil.rotation.x = -Math.PI / 2;
  soil.rotation.z = yaw;
  soil.receiveShadow = true;
  scene.add(soil);
  setTimeout(() => {
    scene.remove(soil);
  }, 30_000);
}

function linkSocial(a: NPC, b: NPC): void {
  a.socialPartnerId = b.id; b.socialPartnerId = a.id;
  const dur = 6 + Math.random() * 8;
  a.behaviour = 'social'; a.stateTimer = dur; playAnim(a, 'talk');
  b.behaviour = 'social'; b.stateTimer = dur; playAnim(b, 'talk');
}

function findSocialPartner(npc: NPC): NPC | null {
  if (npc.role === 'mystic') return null;
  for (const other of npcs) {
    if (other.id === npc.id || other.socialPartnerId !== -1 || other.behaviour !== 'idle') continue;
    const dx = npc.mesh.position.x - other.mesh.position.x;
    const dz = npc.mesh.position.z - other.mesh.position.z;
    if (dx * dx + dz * dz < SOCIAL_RANGE * SOCIAL_RANGE) return other;
  }
  return null;
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function getNearestNPC(pos: THREE.Vector3, maxDist = 4): NPC | null {
  let nearest: NPC | null = null;
  let minDist = maxDist;
  for (const npc of npcs) {
    if (npc.isDead) continue;
    const d = npc.mesh.position.distanceTo(pos);
    if (d < minDist) {
      minDist = d;
      nearest = npc;
    }
  }
  return nearest;
}

export function damageNPC(id: number, amount: number): void {
  const npc = npcMap.get(id);
  if (!npc || npc.isDead) return;

  npc.health -= amount;
  audioManager.playSFX('/assets/sounds/damage.wav', 0.04, 0.2); // ~85% reduction from 0.25

  if (npc.health <= 0) {
    killNPC(id);
    return;
  }

  // Provoke
  if (!npc.isHostile) {
    npc.isHostile = true;
    npc.behaviour = 'idle';
    npc.stateTimer = 0;
    
    // Break social partner
    if (npc.socialPartnerId !== -1) {
      const partner = npcMap.get(npc.socialPartnerId);
      if (partner) {
        partner.isHostile = true;
        partner.socialPartnerId = -1;
        partner.behaviour = 'idle';
        partner.stateTimer = 1 + Math.random() * 2;
        playAnim(partner, 'idle');
      }
      npc.socialPartnerId = -1;
    }
  }

  // Alert nearby NPCs
  const alertRadiusSq = 15 * 15;
  for (const other of npcs) {
    if (other.id === id || other.isDead || other.isHostile) continue;
    const dSq = other.mesh.position.distanceToSquared(npc.mesh.position);
    if (dSq < alertRadiusSq) {
      if (other.socialPartnerId !== -1) {
        const otherPartner = npcMap.get(other.socialPartnerId);
        if (otherPartner) {
          otherPartner.socialPartnerId = -1;
          otherPartner.behaviour = 'idle';
          playAnim(otherPartner, 'idle');
        }
        other.socialPartnerId = -1;
      }
      other.isHostile = true;
      other.interacting = false;
      other.behaviour = 'idle';
      other.attackCooldown = 0;
      other.damagedThisSwing = false;
    }
  }

  if (npc.health <= 0) {
    killNPC(id);
  } else {
    npc.isHostile = true;
    npc.interacting = false;
    npc.behaviour = 'idle';
    npc.attackCooldown = 0;
    npc.damagedThisSwing = false;
    playAnim(npc, 'punch', 0.1);
  }
}

export function killNPC(id: number): void {
  const npc = npcMap.get(id);
  if (!npc || npc.isDead) return;

  npc.isDead = true;
  npc.interacting = false;
  npc.isHostile = false;
  
  const deathAction = npc.actions['death'];
  if (deathAction) {
    Object.values(npc.actions).forEach(a => {
      if (a && a !== deathAction) {
          a.fadeOut(0.1);
          a.stop();
      }
    });
    deathAction.reset().setEffectiveWeight(1).fadeIn(0.1).play();
  }
  
  if (npc.collider) {
    try { npc.collider.setSensor(true); } catch(_) {}
  }
}
