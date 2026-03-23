/**
 * DialogueSystem.ts
 * Premium UI overlay for NPC conversations, matching the reference project's aesthetic.
 */

export interface Exchange {
    s: string; // Smith
    n: string; // NPC (VILLAGER)
}

export interface DialoguePool {
    exchanges: Exchange[];
    conclusion: string;
}

export const DIALOGUES: Record<number, DialoguePool | DialoguePool[]> = {
    0: [
        {
            exchanges: [
                { s: "Where is this? Why is it so quiet?", n: "It's not quiet, Smith. Don't you hear the whispers? The sleeping sickness is destroying the city. If I sleep, I'll become one of those zombies." },
                { s: "I can get you out of here, but I need some fuel.", n: "Forget the fuel, kid. Give me something to keep me awake. Coffee beans... I can't live without them." },
                { s: "Okay, I'll bring you 1 Coffy Coin. Don't fall asleep.", n: "Hurry, Smith... My eyelids feel like tons. Without the black gold (☕), our end is near." }
            ],
            conclusion: "VILLAGER: The spark in his eyes returned. The smell of coffee beans gave him hope."
        },
        {
            exchanges: [
                { s: "Hey! Are you okay? The fog has thickened a lot.", n: "This fog... It doesn't just block the eyes, it closes the mind. If I don't drink a cup of something strong, I'll become part of this fog." },
                { s: "Are there others waiting to be saved?", n: "Too many, Traveler. But first, I need to stop these shaking hands. Can you find 1 coffee bean?" },
                { s: "Hold on, I'll take care of it and be back right away.", n: "Hurry... I'm being pulled into the dream world, it's very dark there." }
            ],
            conclusion: "GHOST CITY: The fog cleared for a moment, the villager began to come to his senses."
        }
    ],
    1: [
        {
            exchanges: [
                { s: "Hey! Are you okay?", n: "Don't sleep, Smith... Never sleep. The moment I close my eyes, I hear the growls of those monsters more closely. If I sleep, I'll become a zombie." },
                { s: "I can help you. What do I need to do?", n: "I stole some fresh beans from the merchant, but they're all lost. Can you find 1? Or it will be too late..." },
                { s: "Don't worry, I'll clear the city and find coffee for you.", n: "Thanks... But hurry up. The air is very heavy in this part of town. I'm already getting sleepy." }
            ],
            conclusion: "NARRATIVE: You've pulled another soul out of the darkness."
        },
        {
            exchanges: [
                { s: "Is anyone there? This place feels abandoned.", n: "I'm still here... But my soul is slowly leaving this body. Sleeplessness is like a curse that settled over us." },
                { s: "What happened to this town?", n: "I just need a sip of energy. I can stay awake in exchange for 1 Coffy Coin. Please, don't leave me in this nightmare." },
                { s: "I will save you, I promise.", n: "You must be fast... The shadows have started to move." }
            ],
            conclusion: "AMONG THE SHADOWS: A light of hope has been lit."
        }
    ],
    2: [
        {
            exchanges: [
                { s: "Can you hear me? Keep your eyes open!", n: "Not really, young man. Everything is getting blurry, like a dream." },
                { s: "Take this coffee, it'll help you stay awake.", n: "This smell... I'd recognize it anywhere. Finally, someone remembered us." },
                { s: "I'll save the others too. Leave here immediately.", n: "You're a savior, Smith. You're the one who will wake up this cursed city." }
            ],
            conclusion: "LIGHT OF HOPE: The villager returned to our world again."
        },
        {
            exchanges: [
                { s: "Hold on! If you sleep, you might not wake up again.", n: "It's so cold... and I'm so sleepy. I just wanted to rest a bit." },
                { s: "Wrong time to rest. Use this Coffy Coin.", n: "This warmth... it reaches my heart. It's like that heavy blanket over me has lifted." },
                { s: "Now go, get to safety.", n: "Thank you, Traveler... I will never forget you." }
            ],
            conclusion: "WINTER SLEEP: Another life saved from the clutches of sleep."
        }
    ],
    100: [
        {
            exchanges: [
                {
                    s: "You're safe now. The coffee beans will keep you awake for a while longer.",
                    n: "I'm grateful, Traveler. Find the other villagers. Most are trying to resist their sleep inside the fog."
                },
                {
                    s: "I'll do my best. We must wake this town up.",
                    n: "Be fast. Night is approaching and the whisper of the fog is getting stronger."
                }
            ],
            conclusion: "OPERATION SUCCESSFUL: The villager was saved from sleep and regained consciousness."
        },
        {
            exchanges: [
                {
                    s: "Take these, pull yourself together.",
                    n: "Ah... This smell! It's like I've been born again. Now those growls can't scare me."
                },
                {
                    s: "Now get away from here, I'll clear this place out.",
                    n: "May the light be with you, Traveler. You're the one who will wake this city from its sleep."
                }
            ],
            conclusion: "REBIRTH: The power of coffee connected the villager to life."
        }
    ]
};

let dialogueBox: HTMLElement | null = null;
let dialogueContent: HTMLElement | null = null;
let currentPool: DialoguePool | null = null;
let exchangeIndex = 0;
let isNPCPhase = false; // true if NPC is speaking

export function initDialogueUI() {
    if (dialogueBox) return;

    dialogueBox = document.createElement('div');
    dialogueBox.id = 'interaction-message';
    dialogueBox.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 15%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(10, 10, 10, 0.85);
        color: rgba(255, 255, 255, 0.95);
        padding: 12px 24px;
        border-radius: 2px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
        width: 50%;
        max-width: 500px;
        pointer-events: none;
        display: none;
        z-index: 2000;
        border-left: 4px solid #ffd700;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.8);
        transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        backdrop-filter: blur(12px);
        line-height: 1.5;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;

    dialogueContent = document.createElement('div');
    dialogueBox.appendChild(dialogueContent);

    document.body.appendChild(dialogueBox);
}

export function showDialogue(id: number) {
    if (!dialogueBox || !dialogueContent) return;
    
    const entry = DIALOGUES[id];
    if (Array.isArray(entry)) {
        currentPool = entry[Math.floor(Math.random() * entry.length)];
    } else {
        currentPool = (entry as DialoguePool) || { exchanges: [{s: "Hey, can you hear me?", n: "Zzz... So sleepy..."}], conclusion: "" };
    }
    
    exchangeIndex = 0;
    isNPCPhase = false;
    
    dialogueBox.style.display = 'block';
    dialogueBox.offsetHeight;
    dialogueBox.style.opacity = '1';
    dialogueBox.style.transform = 'translateX(-50%) translateY(0)';
    
    updateDialogueContent();
}

export function nextDialogue(): boolean {
    if (!dialogueBox || !currentPool) return true;
    
    if (!isNPCPhase) {
        // Toggle to NPC response
        isNPCPhase = true;
    } else {
        // Move to next exchange
        isNPCPhase = false;
        exchangeIndex++;
    }

    if (exchangeIndex >= currentPool.exchanges.length) {
        closeDialogue();
        return false;
    }
    
    updateDialogueContent();
    return true;
}

export function closeDialogue() {
    if (dialogueBox) {
        dialogueBox.style.opacity = '0';
        dialogueBox.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            if (dialogueBox?.style.opacity === '0') dialogueBox.style.display = 'none';
        }, 500);
    }
}

function updateDialogueContent() {
    if (!dialogueContent || !currentPool || exchangeIndex >= currentPool.exchanges.length) return;
    
    const exchange = currentPool.exchanges[exchangeIndex];
    const text = isNPCPhase ? exchange.n : exchange.s;
    
    const speakerLabel = !isNPCPhase ? 
        `<span style="color:#ffd700; font-weight:700; font-style:italic; letter-spacing:2px; margin-right:15px; font-size:14px; display:block; margin-bottom:4px;">SMITH</span>` :
        `<span style="color:#00ffcc; font-weight:700; letter-spacing:2px; margin-right:15px; font-size:14px; display:block; margin-bottom:4px;">VILLAGER</span>`;
        
    dialogueContent.innerHTML = `${speakerLabel} <span style="color:rgba(255,255,255,0.95);">${text}</span>
        <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:10px; letter-spacing:3px; font-weight:700;">[E] CONTINUE</div>`;
}

export function isDialogueOpen(): boolean {
    return dialogueBox?.style.display === 'block' && dialogueBox.style.opacity !== '0';
}

export function showMessage(text: string, duration: number) {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 45%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(20, 20, 20, 0.9);
        color: #ffd700;
        padding: 10px 24px;
        border-radius: 4px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        z-index: 2100;
        border: 1px solid rgba(255, 215, 0, 0.3);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: all 0.5s ease;
        pointer-events: none;
        letter-spacing: 1px;
    `;
    msg.innerText = text;
    document.body.appendChild(msg);

    msg.offsetHeight;
    msg.style.opacity = '1';
    msg.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        msg.style.opacity = '0';
        msg.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(() => msg.remove(), 600);
    }, duration);
}
