// src/app/api/snap-verify/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/snap-verify
// Multipart body: { image: File, wallet: string }
//
// 1. Google Vision API ile fotoğrafı analiz et (coffee label kontrolü)
// 2. Validation geçerse: backend cüzdanıyla EIP-191 imzası oluştur
// 3. İmzayı client'a döndür — client bunu kontrata gönderir
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ── Config ──────────────────────────────────────────────────
const VALIDATOR_PRIVATE_KEY = process.env.VALIDATOR_PRIVATE_KEY; // env'den al
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

// Günde 1 snap — sunucu tarafı basit cache (prod'da Redis kullan)
const dailySnapCache = new Map(); // `${wallet}_${day}` → true

export async function POST(request) {
    try {
        // ── 1. Parse form data ───────────────────────────────────
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const wallet = formData.get('wallet');

        if (!imageFile || !wallet) {
            return NextResponse.json({ error: 'image ve wallet zorunlu' }, { status: 400 });
        }

        if (!ethers.isAddress(wallet)) {
            return NextResponse.json({ error: 'Geçersiz cüzdan adresi' }, { status: 400 });
        }

        // ── 2. Günlük limit kontrolü (sunucu tarafı) ─────────────
        const currentDay = Math.floor(Date.now() / 1000 / 86400);
        const cacheKey = `${wallet.toLowerCase()}_${currentDay}`;
        if (dailySnapCache.has(cacheKey)) {
            return NextResponse.json({ error: 'Bugün zaten snap ödülü aldın' }, { status: 429 });
        }

        // ── 3. Google Vision API kontrolü ────────────────────────
        if (GOOGLE_VISION_API_KEY) {
            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            const base64Image = imageBuffer.toString('base64');

            const visionRes = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requests: [{
                            image: { content: base64Image },
                            features: [
                                { type: 'LABEL_DETECTION', maxResults: 20 },
                                { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
                            ]
                        }]
                    })
                }
            );

            const visionData = await visionRes.json();
            const labels = visionData.responses?.[0]?.labelAnnotations || [];
            const objects = visionData.responses?.[0]?.localizedObjectAnnotations || [];

            // Coffee ile ilgili label veya obje var mı?
            const coffeeKeywords = ['coffee', 'espresso', 'cappuccino', 'latte', 'cafe', 'beverage', 'drink', 'cup', 'mug'];
            const allDetected = [
                ...labels.map(l => l.description.toLowerCase()),
                ...objects.map(o => o.name.toLowerCase())
            ];

            const isCoffee = allDetected.some(item =>
                coffeeKeywords.some(kw => item.includes(kw))
            );

            if (!isCoffee) {
                return NextResponse.json(
                    { error: 'Fotoğrafta kahve tespit edilemedi. Lütfen geçerli bir kahve fotoğrafı yükle.' },
                    { status: 400 }
                );
            }
        } else {
            // Dev mode: Google Vision API key yoksa skip et
            console.warn('⚠️  GOOGLE_VISION_API_KEY eksik — görüntü doğrulama atlandı (dev mode)');
        }

        // ── 4. EIP-191 İmzası Oluştur ────────────────────────────
        if (!VALIDATOR_PRIVATE_KEY) {
            return NextResponse.json({ error: 'Validator key yapılandırılmamış' }, { status: 500 });
        }

        const validatorWallet = new ethers.Wallet(VALIDATOR_PRIVATE_KEY);

        // Kontrat ile aynı hash: keccak256(abi.encodePacked(msg.sender, currentDay, "snap"))
        const messageHash = ethers.solidityPackedKeccak256(
            ['address', 'uint256', 'string'],
            [wallet, currentDay, 'snap']
        );

        // ethers.signMessage → EIP-191 prefix ekler (toEthSignedMessageHash eşdeğeri)
        const signature = await validatorWallet.signMessage(ethers.getBytes(messageHash));

        // ── 5. Cache'e kaydet ve döndür ───────────────────────────
        dailySnapCache.set(cacheKey, true);

        return NextResponse.json({ signature, message: 'Fotoğraf doğrulandı!' });

    } catch (error) {
        console.error('snap-verify error:', error);
        return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
    }
}
