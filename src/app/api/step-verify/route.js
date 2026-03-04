// src/app/api/step-verify/route.js
// ─────────────────────────────────────────────────────────────
// POST /api/step-verify
// JSON body: { wallet: string, steps: number }
//
// 1. Adım sayısı geçerli mi kontrol et (1-20000)
// 2. Backend cüzdanıyla EIP-191 imzası oluştur
// 3. İmzayı client'a döndür — client bunu kontrata gönderir
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const VALIDATOR_PRIVATE_KEY = process.env.VALIDATOR_PRIVATE_KEY;

// Günlük adım cache — prod'da Redis kullan
// wallet → { day, totalSteps }
const dailyStepCache = new Map();

export async function POST(request) {
    try {
        const { wallet, steps } = await request.json();

        // ── Validasyon ───────────────────────────────────────────
        if (!wallet || !steps) {
            return NextResponse.json({ error: 'wallet ve steps zorunlu' }, { status: 400 });
        }
        if (!ethers.isAddress(wallet)) {
            return NextResponse.json({ error: 'Geçersiz cüzdan adresi' }, { status: 400 });
        }
        const stepsNum = parseInt(steps);
        if (isNaN(stepsNum) || stepsNum <= 0 || stepsNum > 20000) {
            return NextResponse.json({ error: 'Adım sayısı 1-20000 arasında olmalı' }, { status: 400 });
        }

        // ── Günlük limit ─────────────────────────────────────────
        const currentDay = Math.floor(Date.now() / 1000 / 86400);
        const walletLower = wallet.toLowerCase();
        const cached = dailyStepCache.get(walletLower);

        if (cached && cached.day === currentDay) {
            if (cached.totalSteps + stepsNum > 20000) {
                return NextResponse.json(
                    { error: `Günlük limit: ${20000 - cached.totalSteps} adım kaldı` },
                    { status: 429 }
                );
            }
        }

        // ── İmza Oluştur ─────────────────────────────────────────
        if (!VALIDATOR_PRIVATE_KEY) {
            return NextResponse.json({ error: 'Validator key yapılandırılmamış' }, { status: 500 });
        }

        const validatorWallet = new ethers.Wallet(VALIDATOR_PRIVATE_KEY);

        // Kontrat ile aynı hash:
        // keccak256(abi.encodePacked(msg.sender, currentDay, steps, "step"))
        const messageHash = ethers.solidityPackedKeccak256(
            ['address', 'uint256', 'uint256', 'string'],
            [wallet, currentDay, stepsNum, 'step']
        );

        const signature = await validatorWallet.signMessage(ethers.getBytes(messageHash));

        // ── Cache güncelle ────────────────────────────────────────
        if (cached && cached.day === currentDay) {
            cached.totalSteps += stepsNum;
        } else {
            dailyStepCache.set(walletLower, { day: currentDay, totalSteps: stepsNum });
        }

        return NextResponse.json({ signature, message: 'Adımlar doğrulandı!' });

    } catch (error) {
        console.error('step-verify error:', error);
        return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
    }
}
