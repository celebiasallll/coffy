import * as THREE from 'three';
import { registerInteractable, unregisterInteractable, showInteractionMessage } from './InteractionSystem.js';
import { getQuestState, updateQuestState, incrementMemory } from './QuestSystem.js';
import { getHeight } from '../world/terrain.js';
import { triggerFlashback } from './FlashbackSystem.js';
import { spawnBurst } from './particles.js';

let sceneRef: THREE.Scene | null = null;

export function initQuestItems(scene: THREE.Scene): void {
  sceneRef = scene;

  // 1. The Well (Arthur's side)
  spawnWell(485, 475);

  // 2. The Old House Door
  spawnHouseDoor(420, 520);

  // 3. The Obsidian Shard (High Peak)
  spawnObsidianShard(200, 700);

  // 4. The Whispering Tree / Final Gate (North-East Boundary)
  spawnWhisperingTree(850, 850);

  // 5. The Jetpack (Secret Reward)
  spawnJetpack(605, 595);
}

function spawnJetpack(x: number, z: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1.0, roughness: 0.2 })
  );
  const light = new THREE.PointLight(0x00ffff, 4, 10);
  group.add(body, light);

  const h = getHeight(x, z);
  group.position.set(x, h + 0.5, z);
  if (sceneRef) sceneRef.add(group);

  registerInteractable({
    id: 'jetpack_pickup',
    position: group.position,
    radius: 4,
    label: 'Jetpack\'i Kuşan (V)',
    onInteract: () => {
      updateQuestState({ hasJetpack: true });
      showInteractionMessage("<span style='color:#00ffff;'>🚀 JETPACK KUŞANILDI!</span> Havalanmak için <b>'V'</b> tuşuna basılı tut.", 6000);
      if (sceneRef) sceneRef.remove(group);
      unregisterInteractable('jetpack_pickup');
      incrementMemory(2);
    }
  });
}

function spawnWell(x: number, z: number) {
  if (!sceneRef) return;
  const h = 5;
  registerInteractable({
    id: 'well_key',
    position: new THREE.Vector3(x, getHeight(x, z) + 0.5, z),
    radius: 5,
    label: 'Kuyuyu Ara',
    onInteract: () => {
      const qs = getQuestState();
      if (!qs.hasHouseKey) {
        updateQuestState({ hasHouseKey: true });
        showInteractionMessage("<span style='color:#ffd700;'>🗝 Anahtarı buldun!</span> Kuyunun dibinde paslı bir anahtar parlıyor.", 4000);
        incrementMemory(1);
      }
    }
  });
}

function spawnHouseDoor(x: number, z: number) {
  const h = getHeight(x, z);
  const s = 1.2;

  const group = new THREE.Group();

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(4 * s, 8 * s, 0.6 * s),
    new THREE.MeshStandardMaterial({ color: 0x552211, roughness: 0.8, metalness: 0.2 })
  );
  doorPanel.position.set(0, 4 * s, 0);
  group.add(doorPanel);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.3 * s, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 })
  );
  handle.position.set(1.2 * s, 4 * s, 0.4 * s);
  group.add(handle);

  group.position.set(x, h, z);
  group.rotation.y = Math.PI / 4;
  const forward = new THREE.Vector3(0, 0, 12 * s).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
  group.position.add(forward);

  if (sceneRef) sceneRef.add(group);

  registerInteractable({
    id: 'house_door',
    position: group.position.clone(),
    radius: 6,
    label: 'Eski Evi Aç',
    onInteract: () => {
      const qs = getQuestState();
      if (qs.hasHouseKey && !qs.houseUnlocked) {
        updateQuestState({ houseUnlocked: true });
        showInteractionMessage("<span style='color:#00ffcc;'>🏠 Kilit açıldı.</span> Evin içine adım attığın an zihnin sarsılıyor.", 4000);
        triggerFlashback("house");
        incrementMemory(1);
      } else if (!qs.hasHouseKey) {
        showInteractionMessage("Kapı kilitli. Bir anahtara ihtiyacın var.", 3000);
      }
    }
  });
}

function spawnObsidianShard(x: number, z: number) {
  const group = new THREE.Group();
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 1.0, emissive: 0x110022 })
  );
  const light = new THREE.PointLight(0xaa00ff, 3, 15);
  group.add(shard);
  group.add(light);
  const h = getHeight(x, z);
  group.position.set(x, h + 1.5, z);
  if (sceneRef) sceneRef.add(group);

  registerInteractable({
    id: 'obsidian_shard',
    position: group.position,
    radius: 4,
    label: 'Obsidiyen Parçasını Al',
    onInteract: () => {
      const qs = getQuestState();
      if (!qs.hasObsidian) {
        updateQuestState({ hasObsidian: true });
        spawnBurst(group.position, 0xaa00ff, 25, 6);
        if (sceneRef) sceneRef.remove(group);
        unregisterInteractable('obsidian_shard');
        showInteractionMessage("<span style='color:#aa00ff;'>💎 Obsidiyen Parçası Alındı.</span> Soğuk taş parmaklarını yakıyor.", 4000);
        triggerFlashback("obsidian");
        incrementMemory(2);
      }
    }
  });
}

function spawnWhisperingTree(x: number, z: number) {
  // Visual Portal/Gate at the tree location
  const gateGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(5, 0.1, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.y = Math.PI / 4;
  
  const portalLight = new THREE.PointLight(0x00ffff, 10, 30);
  gateGroup.add(ring, portalLight);
  gateGroup.position.set(x, getHeight(x, z) + 0.5, z);
  
  if (sceneRef) sceneRef.add(gateGroup);

  // Animation for the ring
  const animatePortal = () => {
    ring.rotation.z += 0.02;
    ring.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.1);
    requestAnimationFrame(animatePortal);
  };
  animatePortal();

  // Interaction at the portal light center
  const interactionPos = new THREE.Vector3(x, getHeight(x, z) + 3, z);

  registerInteractable({
    id: 'whispering_tree',
    position: interactionPos,
    radius: 12,
    label: 'Mühürlü Kapı - Sınırı Geç',
    onInteract: () => {
      const qs = getQuestState();
      if (qs.currentAct === 3 && qs.memoryFragments >= 9 && qs.silasPurged) {
        showInteractionMessage("<span style='color:#fff;'>🌳 Zamanın Sınırı Çatlıyor.</span> Her şeyi hatırlıyorsun, Smith. Bu senin dünyandı ve onu sen resetledin. Şimdi geri dönüş zamanı.", 6000);
        triggerFlashback("seraphina");
        setTimeout(() => {
          updateQuestState({ finalChoiceMade: true });
          showInteractionMessage("<span style='color:#ffd700;'>HİS: Döngü Kırıldı.</span> Gerçekliğe uyanıyorsun...", 4000);
          setTimeout(() => {
            const cause = "Döngüden kaçtın ve gerçeği kabullendin. Simülasyon kapandı.";
            const goScore = document.getElementById('go-score');
            if (goScore) goScore.textContent = cause;
            const goLevel = document.getElementById('go-level');
            if (goLevel) goLevel.textContent = "Final Fragmanları Toplandı: 10/10";

            import('./score.js').then(m => m.triggerGameOver());
          }, 4500);
        }, 6500);
      } else if (qs.currentAct === 3 && !qs.silasPurged) {
        showInteractionMessage("<span style='color:#ff4444;'>MÜHÜR:</span> Sistemin vicdanı (Silas) hâlâ uyanık. Onu karanlıkta silmeden kapı açılmaz.", 5000);
      } else {
        showInteractionMessage("Ağaç sadece fısıldıyor... Henüz tüm parçalar sende değil (En az 9 parça required).", 3500);
      }
    }
  });
}