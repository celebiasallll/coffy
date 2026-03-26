// ── Global konsol filtresi — FBX uyarı kirliliğini önle ──────────────────────
const _origWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  const msg = args.map(a => String(a ?? '')).join(' ');
  const filter = /ShininessExponent|skinning weights|Audio: Audio is already playing|using deprecated parameters|Rapier\.init|skipping texture|not supported in three\.js/i;
  if (filter.test(msg)) return;
  _origWarn(...args);
};

import * as THREE from 'three';
import { audioManager } from './core/AudioManager.js';
import { createRenderer, createSceneAndCamera, setupResize, setupLights, updateRendererQuality, QualityLevel } from './core/renderer.js';
import { createTerrain, getHeight } from './world/terrain.js';
import { populateEnvironment, updateEnvironment } from './world/environment.js';
import { initPhysics, getPhysicsWorld } from './core/physics.js';
import { world, initCharacterController } from './ecs/world.js';
import { spawnPlayer } from './ecs/entities.js';
import { inputSystem } from './ecs/systems/InputSystem.js';
import { physicsSystem } from './ecs/systems/PhysicsSystem.js';
import { renderSystem } from './ecs/systems/RenderSystem.js';
import { aiSystem } from './ecs/systems/AISystem.js';
import { animationSystem } from './ecs/systems/AnimationSystem.js';
import { updateParticles, initParticles } from './systems/particles.js';
import { initVehicleEffects, updateVehicleEffects } from './systems/VehicleEffects.js';
import { updateHUD, initScoreSystem, triggerGameOver } from './systems/score.js';
import { initMinimap, drawMinimap } from './systems/minimap.js';
import { spawnVehicles, updateVehicles, tryEnterVehicle, exitVehicle, Vehicle } from './systems/VehicleSystem.js';
import { entityMeshes, entityPhysicsBodies, entityColliders, entityMixers, entityActions, entityAnimationControllers } from './ecs/world.js';
import { InputState, Health } from './ecs/components.js';
import { EntityId } from './ecs/types.js';
import { initSky, updateClouds, skyMesh } from './core/sky.js';
import { initBVH } from './core/bvh.js';
import { createWater, updateWater, WATER_LEVEL, isInWater } from './world/water.js';
import { initPostprocessing, renderComposer, setQualityLevel, setIsUnderwater } from './core/postprocessing.js';
import { DebugPanel } from './core/DebugPanel.js';
import { WorldStreamer } from './core/WorldStreamer.js';

// ── Yeni sistemler ────────────────────────────────────────────────────────────
import {
  initDayNight,
  updateDayNight,
  getTimeString,
  getDayLabel,
} from './world/DayNightCycle.js';

import {
  initWeather,
  updateWeather,
  isRaining,
} from './world/WeatherSystem.js';

import { spawnNPCs, updateNPCs, getNearestNPC, killNPC, damageNPC } from './systems/NPCSystem.js';
import { initSurvival, updateSurvival, canSprint, onDeath, drink } from './systems/SurvivalSystem.js';
import { initCoinSystem } from './systems/CoinSystem.js';
import { initInteractionSystem, updateInteractionSystem, registerInteractable, unregisterInteractable, showInteractionMessage, getNearestInteractable } from './systems/InteractionSystem.js';
import { setObjective, initQuestLog, hideQuestHUD, showQuestHUD } from './systems/QuestLog.js';
import { initGatherables } from './systems/Gatherables.js';
import { updateCrystals } from './systems/crystals.js';
import { getQuestState, updateQuestState, incrementMemory } from './systems/QuestSystem.js';
import { initFlashbackSystem, triggerFlashback, triggerIntroSequence } from './systems/FlashbackSystem.js';
import { initVisualEffects, updateVisualNarrative } from './systems/VisualEffectSystem.js';
import { initQuestItems } from './systems/QuestItems.js';
import { initBuildingSystem, updateBuildingSystem } from './systems/BuildingSystem.js';
import { initJetpackSystem, updateJetpack } from './systems/JetpackSystem.js';
import { LAKE_CENTER_X, LAKE_CENTER_Z, LAKE_RADIUS } from './world/terrain.js';

// Physics crash control
let _physicsCrashed = false;

// ── Inline loading tracker ────────────────────────────────────────────────────
const LOAD_STEPS = ['physics', 'terrain', 'world', 'player', 'npcs'] as const;
type LoadStep = typeof LOAD_STEPS[number];
const _done = new Set<LoadStep>();
function completeStep(s: LoadStep) {
  _done.add(s);
  const row = document.getElementById(`lrow-${s}`);
  if (row) row.classList.add('done');
  const pct = Math.round((_done.size / LOAD_STEPS.length) * 100);
  const bar = document.getElementById('load-bar');
  const pctEl = document.getElementById('load-pct');
  const msg = document.getElementById('load-msg');
  if (bar) bar.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (msg) msg.textContent = `${s.charAt(0).toUpperCase() + s.slice(1)} ready`;
  if (_done.size === LOAD_STEPS.length) {
    setTimeout(() => {
      const el = document.getElementById('loading');
      if (el) { el.classList.add('fade-out'); setTimeout(() => { el.style.display = 'none'; }, 1400); }
    }, 600);
  }
}

// ── Kamera sabitleri ──────────────────────────────────────────────────────────

const CAM_DIST_MIN = 4;
const CAM_DIST_MAX = 60;
let camDist = 14;
const CAM_HEIGHT = 3.5;
const CAM_LERP = 0.10;
const PITCH_MIN = -1.1;
const PITCH_MAX = 0.72;

// ── i18n & Sound Listeners ──────────────────────────────────────────────────
function initUIListeners() {
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      const isMuted = audioManager.toggleMute();
      soundToggle.classList.toggle('muted', isMuted);
      soundToggle.textContent = isMuted ? '🔇' : '🔊';
    });
  }
}
const CAM_GROUND_MARGIN = 1.2;

window.addEventListener('wheel', (e) => {
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.02));
}, { passive: true });

export const vehicleKeys: Record<string, boolean> = {};
window.addEventListener('keydown', (e) => {
  vehicleKeys[e.code] = true;
  audioManager.resume();
});
window.addEventListener('keyup', (e) => { vehicleKeys[e.code] = false; });

let introStarted = false;
function startIntro() {
  if (introStarted) return;
  introStarted = true;
  audioManager.resume();
  
  // Trigger Cinematic Intro — flashback and damage applied AFTER cinematic finishes
  triggerIntroSequence(() => {
    console.log('🎬 Cinematic Intro Finished');
    audioManager.playBGM();
    // Start with 40% health — applied after intro so player sees it in context
    import('./systems/SurvivalSystem.js').then(m => m.takeDamage(60));
    // Lake flashback tied to intro conclusion
    setTimeout(() => triggerFlashback('lake'), 800);
  });
}

document.addEventListener('click', startIntro, { once: true });
window.addEventListener('keydown', startIntro, { once: true });

// ── Yardımcı: HUD zaman/hava etiketi ─────────────────────────────────────────

const DAY_LABEL_EN: Record<string, string> = {
  'Gece': 'Night', 'Gece Yarısı': 'Midnight', 'Sabah': 'Morning',
  'Öğle': 'Noon', 'Öğleden Sonra': 'Afternoon', 'Akşam': 'Evening',
  'Gündüz': 'Daytime', 'İkindi': 'Late Afternoon', 'Alacakaranlık': 'Dusk',
  'Şafak': 'Dawn',
};

function updateTimeHUD(): void {
  let el = document.getElementById('time-label');
  if (!el) {
    el = document.createElement('div');
    el.id = 'time-label';
    el.style.cssText = [
      'position:fixed', 'top:14px', 'right:16px',
      'color:rgba(255,255,255,0.8)', 'font-size:12px',
      'font-family:Rajdhani,sans-serif', 'font-weight:600',
      'letter-spacing:1px',
      'text-shadow:1px 1px 4px rgba(0,0,0,0.8)',
      'pointer-events:none',
      'background:rgba(0,0,0,0.3)', 'padding:5px 12px',
      'border-radius:20px',
      'border:1px solid rgba(255,255,255,0.1)',
      'backdrop-filter:blur(6px)',
      'z-index:100',
    ].join(';');
    document.body.appendChild(el);
  }
  const rawLabel = getDayLabel();
  const label = DAY_LABEL_EN[rawLabel] ?? rawLabel;
  const rain = isRaining() ? ' 🌧' : '';
  el.textContent = `${getTimeString()}  ·  ${label}${rain}`;
}


let lastDrinkTime = 0;
const DRINK_COOLDOWN = 15000;

// ── Lake Drink Logic ────────────────────────────────────────────────────────
function registerLakeInteraction(pos: THREE.Vector3): void {
  registerInteractable({
    id: 'lake_drink',
    position: pos.clone(),
    radius: 4,
    label: 'Su İç',
    onInteract: () => {
      const now = Date.now();
      if (now - lastDrinkTime < DRINK_COOLDOWN) return;

      drink(50);
      lastDrinkTime = now;
      unregisterInteractable('lake_drink'); // Immediate hide after drinking
      const qs = getQuestState();
      if (qs.currentAct === 1 && !qs.flashbacksUnlocked.includes('lake')) {
        updateQuestState({ flashbacksUnlocked: [...qs.flashbacksUnlocked, 'lake'] });
        incrementMemory(1);
        triggerFlashback('lake');
      }
      showInteractionMessage(
        '<span style="color:#44ddff;">💧</span>&ensp;<span style="color:rgba(255,255,255,0.9);">Gölden su içtin. <span style="color:#44ddff;">+50%</span></span>',
        3000
      );
    }
  });
}

// ── Başlatma ──────────────────────────────────────────────────────────────────

const debugPanel = new DebugPanel();
let worldStreamer: WorldStreamer;

async function init() {
  // console.log('🚀 Final Init Phase 0: System Start');
  let playerId: EntityId;
  let occupiedVehicle: Vehicle | null = null;

  initBVH();
  await initPhysics();
  initCharacterController(getPhysicsWorld());
  completeStep('physics');

  const renderer = createRenderer();
  const { scene, camera } = createSceneAndCamera();
  setupResize(renderer, camera);
  audioManager.init(camera);

  const { sun: sunPos } = initSky(scene);
  // Fog management is now handled by DayNightCycle.ts

  initScoreSystem();
  initSurvival();
  initQuestLog();
  hideQuestHUD();
  initCoinSystem();
  initInteractionSystem();
  initVisualEffects(scene);
  initQuestItems(scene);

  onDeath((cause) => {
    InputState.sprint[playerId] = 0;
    InputState.moveX[playerId] = 0;
    InputState.moveZ[playerId] = 0;
    InputState.jump[playerId] = 0;
    InputState.interact[playerId] = 0;

    // Explicitly lock animation system by setting Health to 0 (already done in SurvivalSystem)
    // AnimationSystem.ts line 18 will already skip updates for dead players.

    const overlay = document.getElementById('death-overlay');
    if (overlay) overlay.classList.add('active');

    const actions = entityActions.get(playerId);
    const mixer = entityMixers.get(playerId);
    const deathAction = actions?.['death'];

    if (deathAction && mixer) {
      // Smooth transition to death
      mixer.stopAllAction();
      deathAction.reset();
      deathAction.setLoop(THREE.LoopOnce, 1);
      deathAction.clampWhenFinished = true;
      deathAction.enabled = true;
      deathAction.setEffectiveWeight(1);
      deathAction.play();
    }

    // Give time for death animation and fade before showing GO screen
    setTimeout(() => showGameOver(cause), 3500);
  });

  function showGameOver(cause: string): void {
    const goScore = document.getElementById('go-score');
    const goLevel = document.getElementById('go-level');
    if (goScore) goScore.textContent = cause === 'dehydration'
      ? '💧 Died of dehydration'
      : cause === 'starvation'
        ? '🍖 Died of starvation'
        : '☠️ You did not survive';
    if (goLevel) goLevel.textContent = '';
    triggerGameOver();
  }

  initParticles(scene);
  initVehicleEffects(scene);
  initMinimap();
  initUIListeners();

  const { sun, hemi, ambient } = setupLights(scene);
  sun.position.copy(sunPos).multiplyScalar(100);

  initDayNight(scene, 0.30);
  initWeather(scene);

  initPostprocessing(scene, camera, renderer);
  createTerrain(scene);
  createWater(scene);
  completeStep('terrain');

  initBuildingSystem(scene);
  initJetpackSystem();
  // console.log('🚀 Final Init Phase 1: Environments');
  initGatherables(scene);
  // registerLakeInteraction(); // Now handled dynamically in loop

  worldStreamer = new WorldStreamer(scene);
  populateEnvironment(scene);
  completeStep('world');

  // console.log('🚀 Final Init Phase 2: Entities');
  (window as any)._playerReadyCallback = () => completeStep('player');

  playerId = spawnPlayer(scene, 440, 0, 430) as EntityId;

  spawnVehicles(scene);
  await spawnNPCs(scene, 30);
  completeStep('npcs');

  // Triggering intro now handled by startIntro via user interaction

  // console.log('🚀 Final Init Phase 3: Loop Start');

  const camTarget = new THREE.Vector3();
  const clock = new THREE.Clock();
  let isUnderwater = false;
  let underwaterSound: any = null;
  let splashCooldown = 0;
  let footstepDistCounter = 0;
  let frameCounter = 0;
  let lastPlayerAttackTime = 0;
  let fpsHistory: number[] = [];
  let qualityCheckTimer = 0;
  let currentQuality: QualityLevel = 'LOW';

  const smoothedCamLookAt = new THREE.Vector3();
  const _lookAtPos = new THREE.Vector3();
  const _camFallback = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);

    // Safety check for physics state
    if (_physicsCrashed) {
      try { renderComposer(0.016, renderer, scene, camera); } catch (e) { }
      return;
    }

    const dt = Math.min(clock.getDelta(), 0.05);

    // ── Act-Based Environment Reactivity ──
    const qs = getQuestState();
    // Fog management is now handled by DayNightCycle.ts
    world.dt = dt;

    inputSystem(world);
    aiSystem(world);

    if (!canSprint()) InputState.sprint[playerId] = 0;

    // Unified interaction logic
    if (InputState.interact[playerId] === 1) {
      const nearest = getNearestInteractable();

      if (occupiedVehicle) {
        // Exit is absolute
        const exitPos = exitVehicle(occupiedVehicle);
        const rb = entityPhysicsBodies.get(playerId);
        const collider = entityColliders.get(playerId);

        if (rb && collider) {
          try {
            collider.setSensor(false);
            rb.setTranslation({ x: exitPos.x, y: exitPos.y, z: exitPos.z }, true);
            rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          } catch (e) { _physicsCrashed = true; }
        }
        InputState.isDriving[playerId] = 0;
        const mesh = entityMeshes.get(playerId);
        if (mesh) mesh.visible = true;
        occupiedVehicle = null;
        InputState.interact[playerId] = 0;
      }
      else if (nearest && nearest.id.startsWith('npc_')) {
        // Allow NPC talk even if a vehicle is nearby
        // Handled by updateInteractionSystem below
      }
      else if (nearest && nearest.id.startsWith('vehicle_')) {
        const playerMesh = entityMeshes.get(playerId);
        if (playerMesh) {
          const entered = tryEnterVehicle(playerMesh.position);
          if (entered) {
            occupiedVehicle = entered;
            InputState.isDriving[playerId] = 1;
            const rb = entityPhysicsBodies.get(playerId);
            const collider = entityColliders.get(playerId);

            if (rb && collider) {
              try {
                collider.setSensor(true);
                rb.setTranslation(entered.controller.mesh.position, true);
                rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
              } catch (e) { _physicsCrashed = true; }
            }
            const mesh = entityMeshes.get(playerId);
            if (mesh) mesh.visible = false;
            InputState.interact[playerId] = 0;
          }
        }
      }
    }

    const vInput = occupiedVehicle ? {
      forward: InputState.moveZ[playerId] < -0.1,
      back: InputState.moveZ[playerId] > 0.1,
      left: InputState.moveX[playerId] < -0.1,
      right: InputState.moveX[playerId] > 0.1,
      brake: !!vehicleKeys['Space'],
      shift: !!vehicleKeys['ShiftLeft'] || !!vehicleKeys['ShiftRight'],
    } : { forward: false, back: false, left: false, right: false, brake: false, shift: false };

    const camFollowPos = occupiedVehicle
      ? occupiedVehicle.controller.mesh.position
      : (entityMeshes.get(playerId)?.position ?? _camFallback);

    updateNPCs(dt, camFollowPos);

    const playerBody = entityPhysicsBodies.get(playerId);
    const playerMesh = entityMeshes.get(playerId);
    if (playerBody && playerMesh) {
      updateJetpack(playerBody, playerMesh, dt);
    }

    // ── Survival system ────────────────────────────────────────────────────
    const isSprinting = !!(InputState.sprint[playerId]) && !occupiedVehicle;
    const survState = updateSurvival(dt, isSprinting);
    Health.current[playerId] = survState.health;

    updateVehicles(dt, vInput);
    {
      const vPos = occupiedVehicle ? occupiedVehicle.controller.mesh.position : null;
      let vSpeed = 0;
      try {
        const linvel = occupiedVehicle ? occupiedVehicle.controller.rigidBody.linvel() : null;
        vSpeed = linvel ? Math.hypot(linvel.x, linvel.z) : 0;
      } catch (e) { }
      const wPos = (occupiedVehicle && 'getWheelWorldPositions' in occupiedVehicle.controller)
        ? (occupiedVehicle.controller as any).getWheelWorldPositions()
        : [];
      const vYaw = occupiedVehicle
        ? occupiedVehicle.controller.mesh.rotation.y
        : (InputState.yaw[playerId] ?? 0);

      updateVehicleEffects(dt, vPos, vSpeed, wPos, vYaw);
    }

    try {
      physicsSystem(world);
    } catch (e) { _physicsCrashed = true; }

    animationSystem(world);
    renderSystem(world);

    // ── Interaction System ────────────────────────────────────────────────────
    const interactPressed = InputState.interact[playerId] === 1;
    updateInteractionSystem(camFollowPos, interactPressed, dt, !!occupiedVehicle);

    if (interactPressed) {
      InputState.interact[playerId] = 0;
    }

    // ── Combat/Assassination Logic ────────────────────────────────────────────
    if (InputState.attack[playerId] === 1 && !occupiedVehicle) {
      const now = Date.now();
      if (now - lastPlayerAttackTime > 600) {
        audioManager.playSFX('/assets/sounds/damage.wav', 0.015, 0.5); // Attack sound (85% reduction)
        const nearestNPC = getNearestNPC(camFollowPos, 4.0);
        if (nearestNPC) {
          // Interrupt interaction immediately upon hit
          nearestNPC.interacting = false;

          damageNPC(nearestNPC.id, 25);
          lastPlayerAttackTime = now;

          // Silas specific quest update - check if just killed or about to die
          if (nearestNPC.health <= 0) {
            if (nearestNPC.mesh.name === "Silas" || (nearestNPC.id % 15 === 8 && nearestNPC.gender === 'male')) {
              const currentHr = (window as any)._gameTimeHours ?? 12;
              const isNight = currentHr > 19 || currentHr < 5;
              if (isNight) {
                updateQuestState({ silasPurged: true });
                showInteractionMessage("<span style='color:#ff4444;'>💀 HATA AYIKLANDI:</span> Silas sistemden silindi. Doğuya, fısıltılara dön.", 5000);
              }
            }
          }
        }
      }
      InputState.attack[playerId] = 0; // Consume attack input
    }

    const newSunDir = updateDayNight(dt, sun, hemi, ambient, renderer, scene, camFollowPos);
    sun.target.position.copy(camFollowPos);
    sun.target.updateMatrixWorld();

    updateWeather(dt, camFollowPos);
    updateVisualNarrative();

    updateCrystals(dt, camFollowPos, () => {
      incrementMemory(0.2); // Small boost from crystals
      const qs = getQuestState();
      updateQuestState({ crystalsCollected: qs.crystalsCollected + 1 });
      if (qs.crystalsCollected % 3 === 0) {
        showInteractionMessage("<span style='color:#00ffff;'>✨ KRİSTAL REZONANSI:</span> Hafıza parçaları yavaşça onarılıyor...", 3000);
      }
    });

    // ── Dynamic Lake Interaction (Water/Shore + Cooldown) ──
    const distToLakeCenter = Math.hypot(camFollowPos.x - LAKE_CENTER_X, camFollowPos.z - LAKE_CENTER_Z);
    const characterInWater = isInWater(camFollowPos.y, camFollowPos.x, camFollowPos.z);
    const inWaterZone = characterInWater || (distToLakeCenter < (LAKE_RADIUS + 2.0));
    const drinkReady = (Date.now() - lastDrinkTime) > DRINK_COOLDOWN;

    if (inWaterZone && drinkReady && !occupiedVehicle) {
      registerLakeInteraction(camFollowPos);
    } else {
      const nearest = getNearestInteractable();
      if (nearest?.id === 'lake_drink') {
        unregisterInteractable('lake_drink');
      }
    }

    debugPanel.update(renderer, getPhysicsWorld());

    if (frameCounter % 3 === 0) {
      updateClouds(dt * 3);
      updateWater(dt * 3, newSunDir);
      updateEnvironment(dt * 3, clock.getElapsedTime(), camFollowPos);
      updateBuildingSystem(camFollowPos, camera);
      worldStreamer.update(camFollowPos);
    }

    fpsHistory.push(dt > 0 ? 1 / dt : 60);
    if (fpsHistory.length > 300) fpsHistory.shift(); // Longer 5s history window (300 frames @ 60fps)

    qualityCheckTimer += dt;
    if (qualityCheckTimer > 4.0) { // Check every 4 seconds for stability
      const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

      let targetQuality: QualityLevel = 'LOW';
      if (avgFps > 90) targetQuality = 'ULTRA';
      else if (avgFps >= 55) targetQuality = 'HIGH';
      else targetQuality = 'LOW';

      if (targetQuality !== currentQuality) {
        currentQuality = targetQuality;
        setQualityLevel(currentQuality);
        updateRendererQuality(renderer, currentQuality);
      }
      qualityCheckTimer = 0;
    }

    if (frameCounter % 6 === 0) {
      updateTimeHUD();
      let hSpeed = 0;
      try {
        hSpeed = occupiedVehicle ? Math.hypot(occupiedVehicle.controller.rigidBody.linvel().x, occupiedVehicle.controller.rigidBody.linvel().z) : (entityPhysicsBodies.get(playerId)?.linvel() ? Math.hypot(entityPhysicsBodies.get(playerId)!.linvel().x, entityPhysicsBodies.get(playerId)!.linvel().z) : 0);
      } catch (e) { }

      updateHUD(dt * 6, {
        pos: camFollowPos,
        speed: hSpeed,
        fps: dt > 0 ? Math.round(1 / dt) : 60
      });
      drawMinimap({ pos: camFollowPos, yaw: InputState.yaw[playerId] ?? 0 }, [], [], []);
      updateParticles(dt * 6);
    }

    frameCounter++;

    const yaw = InputState.yaw[playerId] ?? 0;
    const pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, InputState.pitch[playerId] ?? 0.25));
    const cosPitch = Math.cos(pitch);

    const desiredX = camFollowPos.x + Math.sin(yaw) * cosPitch * camDist;
    const desiredZ = camFollowPos.z + Math.cos(yaw) * cosPitch * camDist;
    const desiredY = camFollowPos.y + Math.sin(pitch) * camDist + CAM_HEIGHT;
    const clampedY = Math.max(desiredY, getHeight(desiredX, desiredZ) + CAM_GROUND_MARGIN);

    camTarget.set(desiredX, clampedY, desiredZ);
    camera.position.lerp(camTarget, CAM_LERP);

    // Smooth the look-at target to prevent micro-jitter
    _lookAtPos.set(camFollowPos.x, camFollowPos.y + 1.5, camFollowPos.z);
    smoothedCamLookAt.lerp(_lookAtPos, 0.15);
    camera.lookAt(smoothedCamLookAt);

    if (skyMesh) skyMesh.position.copy(camera.position);

    const cameraUnderwater = camera.position.y < WATER_LEVEL - 0.3;

    if (!underwaterSound) {
      underwaterSound = audioManager.createAmbientSound('/assets/sounds/splash1.wav', 0.6);
    }
    if (cameraUnderwater && !isUnderwater) {
      isUnderwater = true;
      setIsUnderwater(true);
      if (!underwaterSound.isPlaying) underwaterSound.play();
      renderer.setClearColor(0x005577, 1);
      hemi.color.set(0x003344);
    } else if (!cameraUnderwater && isUnderwater) {
      isUnderwater = false;
      setIsUnderwater(false);
      if (underwaterSound.isPlaying) underwaterSound.stop();
    }

    if (characterInWater) {
      splashCooldown -= dt;
      if (splashCooldown <= 0) {
        audioManager.playSFX('/assets/sounds/splash1.wav', 0.04);
        splashCooldown = 4.0;
      }
    } else {
      splashCooldown = 0;
    }

    let pVel: any = null;
    try { pVel = occupiedVehicle ? null : (entityPhysicsBodies.get(playerId)?.linvel()); } catch (e) { }
    const Speed2D = pVel ? Math.hypot(pVel.x, pVel.z) : 0;
    const onGround = pVel ? Math.abs(pVel.y) < 0.8 : false;

    if (Speed2D > 0.5 && onGround && !characterInWater) {
      const stepDist = (Speed2D > 6) ? 1.4 : 0.75;
      footstepDistCounter += Speed2D * dt;

      if (footstepDistCounter >= stepDist) {
        audioManager.playSFX('/assets/sounds/footstep.mp3', 0.06, 0.08);
        footstepDistCounter = 0;
      }
    } else {
      footstepDistCounter = 0;
    }

    const hp = Health.current[playerId] ?? 100;
    const hpMax = Health.max[playerId] ?? 100;
    const hpFill = document.getElementById('health-fill');
    if (hpFill) hpFill.style.width = `${Math.max(0, (hp / hpMax) * 100).toFixed(1)}%`;

    try {
      renderComposer(dt, renderer, scene, camera);
    } catch (e) { renderer.render(scene, camera); }
  }

  animate();
}

init();