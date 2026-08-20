import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Base Mainnet ActivityModule Contract Address
const ACTIVITY_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ACTIVITY_MODULE_ADDRESS || "0x1084Ba72eaF89E4Ed0c0320FDB4C6A51159c15eb";
const CHAIN_ID = 8453; // Base Mainnet

// Campaign parameters
const AIRDROP_AMOUNT = process.env.AIRDROP_AMOUNT || "10000"; // 10,000 COFFY
const AIRDROP_STEPS = 1000; // Matches minStepCount in contract
const SIGNATURE_TTL_SECONDS = 900; // 15 minutes TTL

// In-memory fallbacks for local dev
const localPermanentClaimed = new Set();
const localPendingReservations = new Map(); // address -> expiresAt

// Allowed Origins for CORS
const ALLOWED_ORIGINS = [
    'https://coffycoin.xyz',
    'https://www.coffycoin.xyz',
    'http://localhost:3000',
    'http://localhost:3001'
];

function getCorsHeaders(req) {
    const origin = req.headers.get('origin') || '';
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app');
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'https://coffycoin.xyz',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// Helper: Check if wallet is permanently claimed (Redis or Memory)
async function isWalletPermanentlyClaimed(walletLower) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
        try {
            const res = await fetch(`${redisUrl}/get/airdrop_claimed:${walletLower}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store'
            });
            const data = await res.json();
            return data.result !== null;
        } catch (err) {
            console.error('Redis check claimed error:', err);
        }
    }
    return localPermanentClaimed.has(walletLower);
}

// Helper: Check if wallet has an active pending reservation
async function isWalletPendingReservation(walletLower) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
        try {
            const res = await fetch(`${redisUrl}/get/airdrop_pending:${walletLower}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store'
            });
            const data = await res.json();
            return data.result !== null;
        } catch (err) {
            console.error('Redis check pending error:', err);
        }
    }

    const exp = localPendingReservations.get(walletLower);
    if (exp && exp > Date.now()) return true;
    return false;
}

// Helper: Set temporary reservation with TTL (Prevents race conditions, auto-unlocks on reject)
async function setPendingReservation(walletLower, ttlSeconds) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
        try {
            // SET airdrop_pending:0x... "pending" NX EX ttlSeconds
            const res = await fetch(`${redisUrl}/set/airdrop_pending:${walletLower}/pending?nx=true&ex=${ttlSeconds}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store'
            });
            const data = await res.json();
            return data.result === 'OK';
        } catch (err) {
            console.error('Redis set pending error:', err);
        }
    }

    const exp = localPendingReservations.get(walletLower);
    if (exp && exp > Date.now()) return false;
    localPendingReservations.set(walletLower, Date.now() + (ttlSeconds * 1000));
    return true;
}

// Helper: Confirm On-Chain Claim Permanently
async function setPermanentClaim(walletLower) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (redisUrl && redisToken) {
        try {
            // 1. Mark permanently claimed (no expiration)
            await fetch(`${redisUrl}/set/airdrop_claimed:${walletLower}/claimed`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store'
            });
            // 2. Remove pending reservation key
            await fetch(`${redisUrl}/del/airdrop_pending:${walletLower}`, {
                headers: { Authorization: `Bearer ${redisToken}` },
                cache: 'no-store'
            });
            return true;
        } catch (err) {
            console.error('Redis set permanent claim error:', err);
        }
    }

    localPermanentClaimed.add(walletLower);
    localPendingReservations.delete(walletLower);
    return true;
}

export async function GET(req) {
    const headers = getCorsHeaders(req);
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get('address');

        let isClaimed = false;
        if (address && ethers.isAddress(address)) {
            const lower = address.toLowerCase();
            isClaimed = await isWalletPermanentlyClaimed(lower);
        }

        return NextResponse.json({
            success: true,
            data: {
                amount: AIRDROP_AMOUNT,
                formattedAmount: Number(AIRDROP_AMOUNT).toLocaleString('en-US'),
                steps: AIRDROP_STEPS,
                hasClaimed: isClaimed,
                isActive: true
            }
        }, { headers });
    } catch (err) {
        return NextResponse.json({
            success: false,
            error: 'Failed to retrieve airdrop configuration.'
        }, { status: 500, headers });
    }
}

export async function POST(req) {
    const headers = getCorsHeaders(req);
    try {
        const body = await req.json().catch(() => ({}));
        const { userAddress, txHash, action } = body;

        // 1. Validation
        if (!userAddress || !ethers.isAddress(userAddress)) {
            return NextResponse.json(
                { success: false, error: 'Valid Ethereum/Base wallet address is required.' },
                { status: 400, headers }
            );
        }

        const normalizedAddress = ethers.getAddress(userAddress);
        const lowerAddress = normalizedAddress.toLowerCase();

        // ─────────────────────────────────────────────────────────────
        // ACTION A: CONFIRM ON-CHAIN TRANSACTION RECEIPT
        // ─────────────────────────────────────────────────────────────
        if (action === 'confirm') {
            if (!txHash || !txHash.startsWith('0x')) {
                return NextResponse.json(
                    { success: false, error: 'Valid transaction hash is required for confirmation.' },
                    { status: 400, headers }
                );
            }

            // Verify transaction on Base Mainnet RPC
            try {
                const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org');
                const receipt = await provider.getTransactionReceipt(txHash);

                if (!receipt) {
                    return NextResponse.json(
                        { success: false, error: 'Transaction is still pending on Base network. Please retry in a few seconds.' },
                        { status: 400, headers }
                    );
                }

                if (receipt.status !== 1) {
                    return NextResponse.json(
                        { success: false, error: 'Transaction reverted on-chain. Claim not confirmed.' },
                        { status: 400, headers }
                    );
                }

                // Verify recipient is ActivityModule
                if (receipt.to.toLowerCase() !== ACTIVITY_MODULE_ADDRESS.toLowerCase()) {
                    return NextResponse.json(
                        { success: false, error: 'Transaction was not sent to Coffy ActivityModule.' },
                        { status: 400, headers }
                    );
                }

                // Permanently lock wallet in database
                await setPermanentClaim(lowerAddress);

                return NextResponse.json({
                    success: true,
                    message: 'Airdrop claim successfully confirmed on Base Mainnet.'
                }, { headers });

            } catch (txErr) {
                console.error('Confirmation RPC error:', txErr);
                return NextResponse.json(
                    { success: false, error: 'Failed to verify transaction receipt on Base RPC.' },
                    { status: 500, headers }
                );
            }
        }

        // ─────────────────────────────────────────────────────────────
        // ACTION B: GENERATE EIP-712 SIGNATURE WITH TTL RESERVATION
        // ─────────────────────────────────────────────────────────────
        
        // 2. Check if already claimed permanently on-chain
        const alreadyClaimed = await isWalletPermanentlyClaimed(lowerAddress);
        if (alreadyClaimed) {
            return NextResponse.json(
                { success: false, error: 'This wallet has already claimed the Genesis Airdrop reward.' },
                { status: 400, headers }
            );
        }

        // 3. Verify Server Oracle Key
        const SIGNER_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || process.env.SIGNER_PRIVATE_KEY || process.env.VALIDATOR_PRIVATE_KEY;
        if (!SIGNER_PRIVATE_KEY) {
            console.error('CRITICAL: ORACLE_PRIVATE_KEY environment variable is not configured on the server.');
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Oracle signer key is not configured.' },
                { status: 500, headers }
            );
        }

        // 4. Set temporary reservation (TTL = 15 mins). If user rejects or aborts, it auto-unlocks!
        await setPendingReservation(lowerAddress, SIGNATURE_TTL_SECONDS);

        // 5. Initialize Server-side Oracle Wallet
        const oracleWallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
        const payoutWei = ethers.parseUnits(AIRDROP_AMOUNT, 18);
        const deadline = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS;

        // 6. Generate EIP-712 Cryptographic Signature
        const domain = {
            name: "Coffy",
            version: "1",
            chainId: CHAIN_ID,
            verifyingContract: ACTIVITY_MODULE_ADDRESS
        };

        const types = {
            StepReward: [
                { name: "user",     type: "address" },
                { name: "steps",    type: "uint256" },
                { name: "payout",   type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const value = {
            user: normalizedAddress,
            steps: AIRDROP_STEPS,
            payout: payoutWei.toString(),
            deadline: deadline
        };

        const signature = await oracleWallet.signTypedData(domain, types, value);

        return NextResponse.json({
            success: true,
            data: {
                steps: AIRDROP_STEPS,
                payout: payoutWei.toString(),
                deadline: deadline,
                signature: signature,
                amount: AIRDROP_AMOUNT,
                formattedAmount: Number(AIRDROP_AMOUNT).toLocaleString('en-US')
            }
        }, { headers });

    } catch (error) {
        console.error("Airdrop Signature Generation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error while generating signature.' },
            { status: 500, headers }
        );
    }
}

export async function OPTIONS(req) {
    return NextResponse.json({}, { headers: getCorsHeaders(req) });
}
