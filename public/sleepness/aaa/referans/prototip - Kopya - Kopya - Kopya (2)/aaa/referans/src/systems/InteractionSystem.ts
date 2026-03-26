import * as THREE from 'three';
import { npcs } from './NPCSystem.js';
import { socialize, getSurvivalState } from './SurvivalSystem.js';
import { updateQuestState, getQuestState } from './QuestSystem.js';
import { setObjective, showQuestHUD } from './QuestLog.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  label: string;
  onInteract: () => void;
  lookAt?: boolean;
}

interface QuestPool {
  tag: string;
  exchanges: Array<{ s: string; n: string }>;
  conclusion: string;
}

interface ConvState {
  lineIndex: number;
  phase: 'smith' | 'npc' | 'done';
  npcResponseTO: ReturnType<typeof setTimeout> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module state
// ─────────────────────────────────────────────────────────────────────────────
const interactables = new Map<string, Interactable>();
let currentNearest: Interactable | null = null;
let interactPromptEl: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let messageTO: ReturnType<typeof setTimeout> | null = null;
let displayTO: ReturnType<typeof setTimeout> | null = null;
let _interactFrameCounter = 0;

const convStates = new Map<number, ConvState>();
const cooldowns = new Map<number, number>(); // npcId → expiry timestamp ms

// Performance: O(1) lookup mapping npcId -> npc object
const npcsMap = new Map<number, any>();
function refreshNPCMap(): void {
  npcsMap.clear();
  npcs.forEach(n => npcsMap.set(n.id, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Social status helpers (Powered by SurvivalSystem unified state)
// ─────────────────────────────────────────────────────────────────────────────
export const HOSTILE_THRESH = 20;
export const FRIEND_THRESH = 72;

export function getSocialScore(): number { 
  return getSurvivalState().social; 
}

export function isSocialHostile(): boolean { 
  return getSurvivalState().social < HOSTILE_THRESH; 
}

export function isSocialFriendly(): boolean { 
  return getSurvivalState().social >= FRIEND_THRESH; 
}

export function addSocial(v: number): void {
  socialize(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// Quest pools — 8 unique threads.  NPC id % 8 determines which thread.
// 3–5 cryptic exchanges, each nudging a different in-world action.
// ─────────────────────────────────────────────────────────────────────────────
const QUEST_POOLS: QuestPool[] = [

  // 0 ── Lake / water ────────────────────────────────────────────────────────
  {
    tag: 'lake',
    exchanges: [
      {
        s: "Susadım. Ruhumun derinliklerinde bir kuraklık var.",
        n: "Güney... İki ölü meşe ağacının ötesine git. Su sana fısıldayacak."
      },
      {
        s: "Bu suyun tadı bir garip, sanki... geçmiş gibi.",
        n: "Alacakaranlıkta iç. Tadı değiştiğinde sen de değişeceksin, Smith."
      },
      {
        s: "Göl neden bu kadar önemli? Sadece bir su kütlesi değil mi?",
        n: "Burada susuzluktan ölmek, sadece nefesin kesilmesi değildir. Kendini unutmaktır."
      },
    ],
    conclusion: "⬇  Güneydeki ölü meşeleri geç. Gün batmadan gölden iç ve arın.",
  },

  // 1 ── Crystal harvest ─────────────────────────────────────────────────────
  {
    tag: 'crystals',
    exchanges: [
      {
        s: "Kayaların arasında bir parıltı var. Sanki beni izliyorlar.",
        n: "Kristaller... Onlara dokunanların rüyalarını çalarlar."
      },
      {
        s: "Onlardan korkmalı mıyım?",
        n: "Korku, yetersiz bir histir. Sadece onları başkasının bulmasına izin verme."
      },
      {
        s: "Bu parçalarla ne yapmam gerekiyor?",
        n: "Topla. Köy, itiraf ettiğinden çok daha fazlasına ihtiyaç duyuyor."
      },
      {
        s: "Yeterince topladığımı nasıl anlayacağım?",
        n: "Anlamayacaksın. Bu yolun sonu yok, Smith."
      },
    ],
    conclusion: "⬆  Kuzey sırtına git. Gözlerine değil, içindeki uğultuya güven. Hepsini topla.",
  },

  // 2 ── Coffy Coins ─────────────────────────────────────────────────────────
  {
    tag: 'coins',
    exchanges: [
      {
        s: "Bu Coffy Coin'ler... nedir bunlar? Sadece metal parçaları mı?",
        n: "Paradan fazlası, kurtuluştan azı. Onlar, sistemin kanıdır."
      },
      {
        s: "Değerlerini kim belirliyor? Neden bu kadar değerliler?",
        n: "Senin değerini belirleyen kişiyle aynı. Zaman, Smith, zaman."
      },
      {
        s: "Daha fazlasını nerede bulabilirim?",
        n: "Yarım kalanları tamamla. Toprak, sonuca erdirilmeyen her şeyi hatırlar."
      },
    ],
    conclusion: "◆  Coffy Coin'leri biriktir. Yarım kalan işleri bitir. Sınırlar sadece zenginlere açılır.",
  },

  // 3 ── Old house & Arthur ──────────────────────────────────────────────────
  {
    tag: 'old_house',
    exchanges: [
      {
        s: "O kapı... Sıcak ama açılmıyor. Sanki içerisi canlı.",
        n: "Onu sen inşa ettin. Anahtarı da sen sakladın, Smith."
      },
      {
        s: "Neden kendimden bir şeyi saklayayım?",
        n: "Belki de unutmak istedin. Ya da bir gün hatırlama umuduyla gömdün."
      },
      {
        s: "İçeride ne var? Ne beni bu kadar çekiyor?",
        n: "İlk resetlemeden önce yazdığın son kelimeler."
      },
      {
        s: "Resetleme mi? Ne diyorsun sen?",
        n: "Kuyunun başındaki Arthur'a git. Ona göklerin anahtarını sor. Jetpack gölün yanındaki kayalıkta unutuldu."
      },
    ],
    conclusion: "🏠  Arthur'u kuyu başında bul. Sana gökyüzünün sırrını (Jetpack) verebilir.",
  },

  // 4 ── The boundary mist ───────────────────────────────────────────────────
  {
    tag: 'boundary',
    exchanges: [
      {
        s: "Sisin içine adım attım ama beni geri itti. Sanki bir duvar gibi.",
         n: "Sis, henüz hazır olmayanı kusar. O bir engel değil, bir aynadır."
      },
      {
        s: "Nasıl geçebilirim? Geçmek zorunda olduğumu hissediyorum.",
        n: "Sis, kim olduğunla değil, ne yaptığınla ilgilenir."
      },
      {
        s: "Öteki tarafta ne var? Hiç dönen oldu mu?",
        n: "Bir keresinde bir ses duymuştum... Ama o sesin sahibi artık dünyamızda değil."
      },
    ],
    conclusion: "🌫  Sınır sadece layık olana açılır. Köyü güçlendir, Coin topla ve tekrar kuzeye yürü.",
  },

  // 5 ── Hunt a bird ─────────────────────────────────────────────────────────
  {
    tag: 'hunt',
    exchanges: [
      {
        s: "Kuşlar... Üzerimde dönüp duruyorlar. Beni tanıyorlar mı?",
        n: "Yeni gelenleri hep izlerler. Ama seni, Smith... Seni özellikle izliyorlar."
      },
      {
        s: "Neden ben? Ben sadece bir yabancıyım.",
        n: "Çünkü daha önce buradaydın. Ve kuşların hafızası, insanınkinden daha keskindir."
      },
      {
        s: "Ne yapmam lazım? Bu bakışlardan nasıl kurtulurum?",
        n: "Birini aşağı indir. Gün bitmeden bacağındaki banda bak. Sır orada gizli."
      },
      {
        s: "Yapabileceğimi sanmıyorum. Onlar özgür varlıklar.",
        n: "Sen daha zorlarını yaptın. Sadece henüz hatırlamıyorsun."
      },
    ],
    conclusion: "🐦  Kuzeydeki kuşlara ulaş. Bir bandı incele. Smith isminin sırrını çöz.",
  },

  // 6 ── Find a named stranger ───────────────────────────────────────────────
  {
    tag: 'find_seraphina',
    exchanges: [
      {
        s: "Seraphina... Bu ismi duyduğumda içim sızlıyor.",
        n: "O gerçek. O burada. Ve senden kaçıyor, Smith."
      },
      {
        s: "Neden benden kaçsın? Ona ne yaptım?",
        n: "Son konuşmanızda ona öyle bir şey söyledin ki... hatırlamaman onun için en büyük acı."
      },
      {
        s: "Onu nerede bulabilirim? Yüzleşmem lazım.",
        n: "Doğu... Eski kaya stelinin yanında. Yalnız kalmak istediğinde oraya gider."
      },
    ],
    conclusion: "🧭  Doğu kayalıklarında Seraphina'yı bul. Senin kim olduğunu o biliyor.",
  },

  // 7 ── Social warning ──────────────────────────────────────────────────────
  {
    tag: 'social',
    exchanges: [
      {
        s: "Başka bakıyorlar bana... Soğuk ve şüphe dolu.",
        n: "Çok sessiz kaldın, Smith. Sessizlik, bu köyde bir suçtur."
      },
      {
        s: "Eğer bendan nefret ederlerse ne olur?",
        n: "Bize ihtiyacı olmadığını sanan son gezgine sor..."
      },
      {
        s: "Durumu nasıl düzeltebilirim?",
        n: "Konuş. Yardım et. İyiliği hatırlarız... Ama kötülüğü asla unutmayız."
      },
    ],
    conclusion: "🤝  Saygınlığın eriyor. Köylülerle bağ kur. Çok geç olmadan sesini duyur.",
  },

  // 8 ── The Obsidian Shard ──────────────────────────────────────────────────
  {
    tag: 'obsidian',
    exchanges: [
      {
        s: "Işığı emen bir cam parçası buldum. Sanki içine bakınca zaman duruyor.",
        n: "Obsidiyen... O cam değil, ilk çöküşten kalan donmuş bir zamandır."
      },
      {
        s: "Neden sıcak? Avcumun içinde yanıyor gibi.",
        n: "Hala o büyük yangını söndüremediğin günün ateşiyle yanıyor."
      },
      {
        s: "Hangi yangın? Neden bahsediyorsun?",
        n: "Zirveye çık. Havanın en ince, toprağın en yanık olduğu yere. Kara aynayı ara."
      },
    ],
    conclusion: "🌋  Kuzeydeki en yüksek zirveye çık. Toprağın kırıldığı yerdeki Obsidiyen parçasını bul.",
  },

  // 9 ── The Whispering Tree ──────────────────────────────────────────────────
  {
    tag: 'whispers',
    exchanges: [
      {
        s: "Koruya yaklaştığımda rüzgar fısıltıya dönüşüyor. Sanki birileri adımı sesleniyor.",
        n: "Oradaki ağaçlar asla uyumaz. Resetlemeden önceki her sözü yankılarlar."
      },
      {
        s: "Eğer dinlersem hatırlayacak mıyım?",
        n: "Önce acıyı hatırlayacaksın. Huzurun geri gelmesi için ağacın sesine teslim ol."
      },
      {
        s: "Nerede o koru? Gitmem lazım.",
        n: "Doğu... Kuşların bile uçmaya korktuğu sırtın ardında. Gözlerin kapalıyken dinle."
      },
    ],
    conclusion: "🌳  Doğuya, sırtın ötesine git. Sessiz koruyu bul ve geçmişin fısıltılarına kulak ver.",
  },

  // 10 ── The Silas Purge (Assassination) ──────────────────────────────────────
  {
    tag: 'silas',
    exchanges: [
      {
        s: "Senin adın Silas, değil mi? Sistem seni bir hata olarak görüyor.",
        n: "Ben de bir gün senin durduğun yerde durdum. Sen neysen, ben de oyum."
      },
      {
        s: "Seni yok etmem söylendi. Gece çökünce her şey bitecek.",
        n: "Deneyebilirsin. Ama bir gölgeyi nasıl öldüreceğini biliyor musun?"
      },
    ],
    conclusion: "💀  Gece yarısı Silas'ı gizlice yok et. Bu sistemin temizlenmesi için tek yol.",
  },

  // 11 ── Mystic 1: The Observer (High Peaks) ────────────────────────────────────
  {
    tag: 'mystic_1',
    exchanges: [
      {
        s: "Neden bu kadar yüksekte duruyorsun?",
        n: "Aşağıdakiler sadece piksel görüyor. Ben ise kodu fısıltılar halinde duyuyorum."
      },
      {
        s: "Bu dünya... gerçek değil, değil mi?",
        n: "Gerçeklik, senin en çok inandığın yalandır. Smith, sen bir rüyanın içinde hapsolmuş bir devsin."
      },
    ],
    conclusion: "✨ Mistik bir fısıltı duydun: 'Kod sızıyor, anılar yaklaşıyor...'",
  },

  // 12 ── Harvester Spirtual Coffee ──────────────────────────────────────────────
  {
    tag: 'coffee_harvest',
    exchanges: [
      {
        s: "Hasat nasıl gidiyor? Bu çekirdekler neden bu kadar siyah?",
        n: "Bunlar sadece kahve değil, Smith. Bunlar sildiğin dertlerin küle dönmüş hali."
      },
      {
        s: "Onları içince ne oluyor?",
        n: "Siyah bir nehir gibi ruhundan geçerler. Acıyı hatırlatır ama uyanık tutarlar."
      },
      {
        s: "Bana biraz verebilir misin?",
        n: "Al bu Kutsal Çekirdekleri. Köydeki Kırmızı Market'e götür, onlar anıların değerini bilir."
      },
    ],
    conclusion: "☕ Kutsal Çekirdekleri aldın. Onları köydeki Kırmızı Market'e teslim et.",
  },

  // 13 ── Mystic 2: The Chronos (Edge of World) ──────────────────────────────────
  {
    tag: 'mystic_2',
    exchanges: [
      {
        s: "Sondan korkmuyor musun?",
        n: "Son dediğin, başlangıcın yorgun halidir. Coffy Coin bile zamanın akışını durduramaz."
      },
      {
        s: "Neden her şey tekrarlanıyor?",
        n: "Çünkü hala aynı hatayı yapıyorsun, Smith. Unutarak kurtulamazsın."
      },
    ],
    conclusion: "✨ Mistik sözler: 'Zaman bir dairedir ve sen hala merkezdesin.'",
  },

  // 14 ── Red Market (The Trade) ────────────────────────────────────────────────
  {
    tag: 'market',
    exchanges: [
      {
        s: "Elimde hasatçının bahsettiği o özel çekirdekler var.",
        n: "Ah... Saf kederin aroması. Çok nadir bulunur. Coffy Coin karşılığında hepsini alıyoruz."
      },
      {
        s: "Neden bu kadar değerliler?",
        n: "Çünkü bu dünyada gerçek olan tek şey acıdır. Hasat ettiğimiz şey de bu."
      },
    ],
    conclusion: "💰 Kahveyi teslim ettin. Anılar sistemden çekiliyor... Coffy Coin bakiyen güncellendi.",
  },

  /* 15 - Mystic 3: The Mirror */
  {
    tag: 'mystic_3',
    exchanges: [
      {
        s: "Aynada kendimi tanıyamıyorum artık.",
        n: "Simülasyon yüzünden değil, kendine yabancı olduğun için. Smith, o kız senden vazgeçmedi, sen her şeyden vazgeçtin."
      },
      {
        s: "Gördüğün her şey birer pikselden ibaret mi?",
        n: "Gerçeği mi arıyorsun? Yoksa sadece bu konforlu yalanı mı? Bu dünya bir rüya, Smith."
      },
    ],
    conclusion: "💔 Kalbinde bir sızı hissettin. Ayrılık anısı zihninde canlandı...",
  },
  /* 17 - Wizard (Mystic) */
  {
    tag: 'wizard',
    exchanges: [
      {
        s: "İçimde tarif edilemez bir boşluk var. Kimseyle bağ kuramıyorum.",
        n: "Sessizlik, ruhun kurumasına neden olur Smith. Sosyal bağlar bu dünyanın can suyudur."
      },
      {
        s: "Yalnızlık beni bitiriyor. Yeniden hissedebilir miyim?",
        n: "Gözlerini kapa. Mistik bir dokunuşla tüm kopan bağlarını onarıyorum. Artık bir bütünsün."
      },
    ],
    conclusion: "✨ Mistik bir enerjiyle sosyal bağların tamamen onarıldı.",
  },
  /* 18 - Confusion */
  {
    tag: 'confusion',
    exchanges: [
      {
        s: "Neredeyim ben? Hiçbir şey anlamıyorum.",
        n: "İsimleri hatırlamakta zorlanıyorsun değil mi Smith? Burası senin yuvan."
      },
      {
        s: "Sizi tanımıyorum... Bu insanlar kim?",
        n: "Kendini bile tanıyamıyorsun bazen. Git göl kenarında biraz dinlen."
      },
      {
        s: "Burası neden bu kadar... statik görünüyor?",
        n: "Zaman bazen burada durur. Arthur ile konuşursan belki taşlar yerine oturur."
      },
    ],
    conclusion: "🔍 Smith kafası karışık bir halde etrafa bakıyor. Hafızası hala karanlıkta.",
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
export function initInteractionSystem(): void {
  interactPromptEl = document.getElementById('interaction-prompt');
  if (!interactPromptEl) {
    interactPromptEl = document.createElement('div');
    interactPromptEl.id = 'interaction-prompt';
    interactPromptEl.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,70px)',
      'background:rgba(0,0,0,0.7)', 'color:#ffd700',
      'padding:10px 20px', 'border-radius:4px',
      "font-family:'Rajdhani',sans-serif", 'font-weight:700', 'font-size:20px',
      'pointer-events:none', 'display:none', 'z-index:999999',
      'border:1px solid rgba(255,215,0,0.3)',
      'backdrop-filter:blur(4px)',
      'text-transform:uppercase', 'letter-spacing:2px',
    ].join(';');
    document.body.appendChild(interactPromptEl);
  }

  messageEl = document.getElementById('interaction-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'interaction-message';
    messageEl.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:10%',
      'transform:translateX(-50%) translateY(30px)',
      'background:rgba(0,0,0,0.60)', 'color:rgba(255,255,255,0.92)',
      'padding:14px 36px', 'border-radius:4px',
      "font-family:'Rajdhani',sans-serif", 'font-size:18px', 'font-weight:500',
      'text-align:center', 'width:70%', 'max-width:720px',
      'pointer-events:none', 'display:none', 'z-index:1000000',
      'border:1px solid rgba(255,255,255,0.07)',
      'box-shadow:0 0 20px rgba(0,0,0,0.5)',
      'transition:opacity 0.5s ease,transform 0.5s ease',
      'opacity:0', 'backdrop-filter:blur(6px)',
      'line-height:1.5', 'text-shadow:1px 1px 3px rgba(0,0,0,0.9)',
    ].join(';');
    document.body.appendChild(messageEl);
  }

  // Social bar removed here — now integrated into Survival HUD
}

// Floating social bar logic removed - integrated into SurvivalSystem HUD

// ─────────────────────────────────────────────────────────────────────────────
// Register / unregister
// ─────────────────────────────────────────────────────────────────────────────
export function registerInteractable(interactable: Interactable): void {
  interactables.set(interactable.id, interactable);
}
export function unregisterInteractable(id: string): void {
  interactables.delete(id);
  if (currentNearest?.id === id) { currentNearest = null; updateUI(null); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main update — called every frame from main.ts
// Signature now requires dt for social decay
// ─────────────────────────────────────────────────────────────────────────────
export function updateInteractionSystem(
  playerPos: THREE.Vector3,
  interactPressed: boolean,
  dt: number,
  skipUI: boolean = false
): void {
  if (skipUI) {
    if (currentNearest) {
      currentNearest = null;
      updateUI(null);
    }
    return;
  }
  // Passive social decay removed - handled in SurvivalSystem.ts
  // socialScore = Math.max(0, socialScore - SOCIAL_DECAY_RATE * dt);
  // _renderSocialBar();

  // Find nearest interactable - Throttled to every 6 frames
  _interactFrameCounter++;
  if (_interactFrameCounter % 6 === 0) {
    let nearest: Interactable | null = null;
    let minDistSq = Infinity;
    for (const item of interactables.values()) {
        const dx = playerPos.x - item.position.x;
        const dy = playerPos.y - item.position.y;
        const dz = playerPos.z - item.position.z;
        const dSq = dx * dx + dy * dy + dz * dz;

        if (dSq < item.radius * item.radius && dSq < minDistSq) {
            minDistSq = dSq;
            nearest = item;
        }
    }
    if (nearest !== currentNearest) {
        currentNearest = nearest;
        updateUI(nearest);
    }
  }

  // Safe State Management: If player walks away, reset interaction state
  if (!currentNearest) {
    convStates.forEach((state, id) => {
      if (state.phase !== 'done') {
        const npc = npcsMap.get(id);
        if (npc) npc.interacting = false;
        if (state.npcResponseTO) clearTimeout(state.npcResponseTO);
        convStates.delete(id);
      }
    });
  }

  if (!currentNearest || !interactPressed) return;

  // ── Non-NPC interactable ───────────────────────────────────────────────────
  // market building is allowed to flow into conversation logic
  if (!currentNearest.id.startsWith('npc_') && currentNearest.id !== 'building_market') {
    currentNearest.onInteract();
    return;
  }

  // ── NPC interaction ────────────────────────────────────────────────────────
  refreshNPCMap(); // Ensure map is current
  const resolvedNpcId = parseInt(currentNearest.id.split('_')[1]);
  const npcObj = npcsMap.get(resolvedNpcId);
  let npcName = currentNearest.label.split(' ')[0];

  // 10 s cooldown gate
  const cdEnd = cooldowns.get(resolvedNpcId) ?? 0;
  if (Date.now() < cdEnd) {
    const secs = Math.ceil((cdEnd - Date.now()) / 1000);
    showMessage(
      `<span style="color:#777;font-style:italic;">${npcName} turns away quietly.</span>` +
      `&nbsp;<span style="color:#555;font-size:15px;">(${secs}s)</span>`,
      2200,
    );
    return;
  }

  // Hostile gate
  if (isSocialHostile()) {
    showMessage(
      `<span style="color:#ff4444;">${npcName} stares at you in silence.<br>` +
      `<span style="font-size:14px;color:#cc2222;">The village no longer trusts you.</span></span>`,
      3500,
    );
    return;
  }

  const qs = getQuestState();
  let pool = QUEST_POOLS[0]; // Default

  if (qs.introInteractions < 3 && npcName !== "Arthur") {
    // Fix: Targeted pool search for 'confusion' instead of implicit [0]
    pool = QUEST_POOLS.find(p => p.tag === 'confusion') || QUEST_POOLS[QUEST_POOLS.length - 1];
  } else if (currentNearest.id === 'building_market') {
    pool = QUEST_POOLS.find(p => p.tag === 'market') || QUEST_POOLS[0];
  } else {
    // Default pool by ID - fixed to support all pools
    pool = QUEST_POOLS[resolvedNpcId % QUEST_POOLS.length];

    // Character overrides
    if (npcName === "Arthur") pool = QUEST_POOLS.find(p => p.tag === 'old_house')!;
    else if (npcName === "Seraphina") pool = QUEST_POOLS.find(p => p.tag === 'find_seraphina')!;
    else if (npcName === "Clara") {
      pool = qs.spokenToArthur ? QUEST_POOLS.find(p => p.tag === 'whispers')! : QUEST_POOLS.find(p => p.tag === 'coins')!;
    }
    else if (npcName === "Silas") pool = QUEST_POOLS.find(p => p.tag === 'silas')!;
    else if (npcName === "Wizard") pool = QUEST_POOLS.find(p => p.tag === 'wizard')!;
  }

  // Get or create state; reset if previous convo is done
  let state = convStates.get(resolvedNpcId);
  if (!state || state.phase === 'done') {
    // Market does not give generic social boost unless it's an NPC
    if (!isNaN(resolvedNpcId)) addSocial(20); 
    
    state = { lineIndex: 0, phase: 'smith', npcResponseTO: null };
    convStates.set(resolvedNpcId, state);
    if (npcObj) {
      npcObj.interacting = true;
      updateUI(currentNearest);
    }
  }

  // Ignore extra E presses while NPC auto-response timer is pending
  if (state.phase !== 'smith') return;

  const ex = pool.exchanges[state.lineIndex];

  // Display Smith's line
  showMessage(
    `<span style="color:#ffd700;font-style:italic;">Smith</span>` +
    `&ensp;<span style="color:rgba(255,255,255,0.85);">${ex.s}</span>`,
    3000,
  );
  state.phase = 'npc';

  // NPC auto-response after 3 s
  if (state.npcResponseTO) clearTimeout(state.npcResponseTO);
  state.npcResponseTO = setTimeout(() => {
    const st = convStates.get(resolvedNpcId);
    if (!st || st.phase !== 'npc') return;

    const isLast = (st.lineIndex + 1) >= pool.exchanges.length;

    if (isLast) {
      // Final NPC line
      showMessage(
        `<span style="color:#00ffcc;">${npcName}</span>` +
        `&ensp;<em style="color:rgba(255,255,255,0.80);">${ex.n}</em>`,
        3500,
      );
      st.phase = 'done';
      st.npcResponseTO = null;

      // Quest conclusion card — appears after NPC line fades
      setTimeout(() => {
        // addSocial(20); // Moved to start of interaction
        cooldowns.set(resolvedNpcId, Date.now() + 10_000);
        
        // ── Link to QuestState flags ──
        switch(pool.tag) {
          case 'confusion': 
            const nextCount = getQuestState().introInteractions + 1;
            updateQuestState({ introInteractions: nextCount });
            if (nextCount === 3) {
                showQuestHUD();
                setObjective("Hafızanı geri kazanmak için Arthur'u bul.");
            }
            break;
          case 'lake': 
            // Drink handled in main.ts/drink(50)
            break;
          case 'old_house': updateQuestState({ spokenToArthur: true }); break;
          case 'find_seraphina': updateQuestState({ seraphinaFound: true }); break;
          case 'obsidian': updateQuestState({ truthUncovered: true }); break;
          case 'whispers': updateQuestState({ spokenToClara: true }); break;
          case 'wizard': addSocial(100); break; // Full social reset
        }

        setObjective(pool.conclusion);

        if (npcObj) {
          npcObj.interacting = false;
          updateUI(currentNearest);
        }
      }, 4000);

    } else {
      // More lines remain — advance, await next E
      st.lineIndex++;
      st.phase = 'smith';
      st.npcResponseTO = null;
      showMessage(
        `<span style="color:#00ffcc;">${npcName}</span>` +
        `&ensp;<em style="color:rgba(255,255,255,0.80);">${ex.n}</em>` +
        `<br><span style="font-size:13px;color:rgba(255,255,255,0.28);">[E]&nbsp;continue</span>`,
        4500,
      );
    }
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public message helper (used externally e.g. lake drink confirmation)
// ─────────────────────────────────────────────────────────────────────────────
export function showInteractionMessage(html: string, duration = 5500): void {
  showMessage(html, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function showMessage(html: string, duration = 5500): void {
  if (!messageEl) return;
  if (messageTO) clearTimeout(messageTO);
  if (displayTO) clearTimeout(displayTO);

  messageEl.innerHTML = html;
  messageEl.style.display = 'block';
  messageEl.offsetHeight; // force reflow
  messageEl.style.opacity = '1';
  messageEl.style.transform = 'translateX(-50%) translateY(0)';

  messageTO = setTimeout(() => {
    if (!messageEl) return;
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateX(-50%) translateY(10px)';
    displayTO = setTimeout(() => {
      if (messageEl?.style.opacity === '0') messageEl.style.display = 'none';
    }, 600);
  }, duration);
}

export function getNearestInteractable(): Interactable | null {
  return currentNearest;
}

function updateUI(item: Interactable | null): void {
  if (!interactPromptEl) return;

  // New logic: Hide if currently in a conversation with this NPC
  if (item && item.id.startsWith('npc_')) {
    const resolvedId = parseInt(item.id.split('_')[1]);
    const npc = npcsMap.get(resolvedId);
    if (npc && npc.interacting) {
      interactPromptEl.style.display = 'none';
      return;
    }
  }

  if (item) {
    interactPromptEl.innerHTML =
      `<span style="color:#fff;margin-right:8px;">[E]</span> ${item.label}`;
    interactPromptEl.style.display = 'block';
  } else {
    interactPromptEl.style.display = 'none';
  }
}