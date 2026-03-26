/**
 * DialogueSystem.ts
 * Premium UI overlay for NPC conversations, matching the reference project's aesthetic.
 */

export interface Exchange {
    s: string; // Smith
    n: string; // NPC (KÖYLÜ)
}

export interface DialoguePool {
    exchanges: Exchange[];
    conclusion: string;
}

export const DIALOGUES: Record<number, DialoguePool | DialoguePool[]> = {
    0: [
        {
            exchanges: [
                { s: "Burası neresi? Neden her yer bu kadar sessiz?", n: "Sessiz değil Smith. Fısıltıları duymuyor musun? Uyku hastalığı şehri bitiriyor. Eğer uyursam ben de o zombilerden biri olacağım." },
                { s: "Seni buradan çıkarabilirim ama biraz yakıta ihtiyacım var.", n: "Yakıtı boşver evlat. Bana uyanık kalmamı sağlayacak bir şeyler ver. Kahve çekirdekleri... Onlar olmadan yaşayamam." },
                { s: "Tamam, sana 1 Coffy Coin getireceğim. Sakın uyuma.", n: "Acele et Smith... Göz kapaklarım tonlarca ağırlıkta sanki. Siyah altın (☕) olmazsa sonumuz yakındır." }
            ],
            conclusion: "KÖYLÜ: Gözlerindeki fer geri geldi. Kahve çekirdeklerinin kokusu ona umut verdi."
        },
        {
            exchanges: [
                { s: "Hey! İyi misin? Sis çok yoğunlaşmış.", n: "Bu sis... Sadece gözleri değil, zihni de kapatıyor. Eğer bir fincan sert bir şeyler içmezsem bu sisin bir parçası olacağım." },
                { s: "Kurtarılmayı bekleyen başkaları da var mı?", n: "Çok fazlalar Gezgin. Ama önce benim şu titreyen ellerimi durdurmam lazım. 1 çekirdek bulabilir misin?" },
                { s: "Dayan, hemen halledip döneceğim.", n: "Çabuk ol... Rüyalar alemine çekiliyorum, orası çok karanlık." }
            ],
            conclusion: "HAYALET ŞEHİR: Sis bir anlığına dağıldı, köylü kendine gelmeye başladı."
        }
    ],
    1: [
        {
            exchanges: [
                { s: "Hey! Sen iyi misin?", n: "Uyuma Smith... Asla uyuma. Gözlerimi kapattığım an o canavarların hırıltısını daha yakından duyuyorum. Eğer uyursam zombi olacağım." },
                { s: "Sana yardım edebilirim. Ne yapmam gerekiyor?", n: "Tüccardan biraz taze çekirdek çalmıştım ama hepsi kayboldu. 1 tane bulabilir misin? Yoksa çok geç olacak..." },
                { s: "Merak etme, şehri temizleyeceğim ve sana kahve bulacağım.", n: "Teşekkürler... Ama çabuk ol. Şehrin bu kısmında hava çok ağır. Uykum gelmeye başladı bile." }
            ],
            conclusion: "NARRATIVE: Bir ruhu daha karanlıktan çekip aldın."
        },
        {
            exchanges: [
                { s: "Kimse var mı? Burası terk edilmiş gibi.", n: "Hala buradayım... Ama ruhum yavaş yavaş terk ediyor bu bedeni. Uykusuzluk bir lanet gibi çöktü üstümüze." },
                { s: "Bu kasabada neler oldu böyle?", n: "Sadece bir yudum enerjiye ihtiyacım var. 1 Coffy Coin karşılığında uyanık kalabilirim. Lütfen, beni bu kabusta bırakma." },
                { s: "Seni kurtaracağım, söz veriyorum.", n: "Hızlı olmalısın... Gölgeler hareket etmeye başladı." }
            ],
            conclusion: "GÖLGELERİN ARASINDA: Bir umut ışığı yandı."
        }
    ],
    2: [
        {
            exchanges: [
                { s: "Beni duyabiliyor musun? Gözlerini açık tut!", n: "Pek sayılmaz genç adam. Her şey sanki bir rüya gibi bulanıklaşıyor." },
                { s: "Al bu kahveyi, uyanık kalmana yardımcı olacak.", n: "Bu koku... Onu her yerde tanırım. Sonunda birisi bizi hatırladı." },
                { s: "Diğerlerini de kurtaracağım. Buradan hemen ayrıl.", n: "Sen bir kurtarıcısın Smith. Bu lanetli şehri uyandıracak olan sensin." }
            ],
            conclusion: "UMUT IŞIĞI: Köylü tekrar dünyamıza döndü."
        },
        {
            exchanges: [
                { s: "Dayan! Uyursan bir daha uyanamayabilirsin.", n: "Hava çok soğuk... Ve o kadar çok uykum var ki. Sadece biraz dinlenmek istemiştim." },
                { s: "Dinlenmek için yanlış zaman. Al şu Coffy Coin'i kullan.", n: "Bu sıcaklık... Kalbime kadar ulaşıyor. Sanki üzerimdeki o ağır örtü kalktı." },
                { s: "Şimdi git, güvenli yere ulaş.", n: "Teşekkür ederim Gezgin... Seni asla unutmayacağım." }
            ],
            conclusion: "KIŞ UYKUSU: Bir can daha uykunun pençesinden kurtarıldı."
        }
    ],
    100: [
        {
            exchanges: [
                {
                    s: "Artık güvendesin. Kahve çekirdekleri seni bir süre daha uyanık tutacak.",
                    n: "Minnettarım Gezgin. Diğer köylüleri de bul. Çoğu sisin içinde uykusuna direnmeye çalışıyor."
                },
                {
                    s: "Elimden geleni yapacağım. Bu kasabayı uyandırmalıyız.",
                    n: "Hızlı ol. Gece yaklaşıyor ve sisin fısıltısı giderek güçleniyor."
                }
            ],
            conclusion: "OPERASYON BAŞARILI: Köylü uykudan kurtarıldı ve bilinci yerine geldi."
        },
        {
            exchanges: [
                {
                    s: "Al şunları, kendine gel.",
                    n: "Ah... Bu koku! Sanki yeniden doğmuş gibiyim. Artık o hırıltılar beni korkutamıyor."
                },
                {
                    s: "Şimdi buradan uzaklaş, ben buraları temizleyeceğim.",
                    n: "Işık seninle olsun Gezgin. Şehri bu uykudan uyandıracak olan sensin."
                }
            ],
            conclusion: "YENİDEN DOĞUŞ: Kahvenin gücü köylüyü hayata bağladı."
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
        currentPool = (entry as DialoguePool) || { exchanges: [{s: "Hey, beni duyabiliyor musun?", n: "Zzz... Çok uykum var..."}], conclusion: "" };
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
        `<span style="color:#00ffcc; font-weight:700; letter-spacing:2px; margin-right:15px; font-size:14px; display:block; margin-bottom:4px;">KÖYLÜ</span>`;
        
    dialogueContent.innerHTML = `${speakerLabel} <span style="color:rgba(255,255,255,0.95);">${text}</span>
        <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-top:10px; letter-spacing:3px; font-weight:700;">[E] DEVAM ET</div>`;
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
