import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Base Mainnet ActivityModule Contract Address
const ACTIVITY_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ACTIVITY_MODULE_ADDRESS || "0x1084Ba72eaF89E4Ed0c0320FDB4C6A51159c15eb";
const CHAIN_ID = 8453; // Base Mainnet

// Oracle Signer Key (Trusted Oracle: 0x34F203Ec29a30Fd1C0079751E84EC952Ee7c6b2c)
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY || process.env.VALIDATOR_PRIVATE_KEY || "0xe7691e544f0f0f35fa0cfa96ae31d62db291ab6b6c4f20a8229e38d8652ead16";

// Airdrop parameters
const AIRDROP_AMOUNT = "10000"; // 10,000 COFFY
const AIRDROP_STEPS = 1000;     // Matches minStepCount in contract

// In-memory / serverless cache to track claimed wallets (Prevents repeat signature requests)
// For enterprise scaling, this can be connected to Redis or Supabase/PostgreSQL
const claimedWallets = new Set();

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const { userAddress } = body;

        // 1. Validation: Address presence & format
        if (!userAddress || !ethers.isAddress(userAddress)) {
            return NextResponse.json(
                { success: false, error: 'Valid Ethereum/Base wallet address is required.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const normalizedAddress = ethers.getAddress(userAddress);
        const lowerAddress = normalizedAddress.toLowerCase();

        // 2. Eligibility Check: Has this wallet already requested a signature?
        if (claimedWallets.has(lowerAddress)) {
            return NextResponse.json(
                { success: false, error: 'This wallet has already claimed the Genesis Airdrop reward.' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 3. On-Chain Check: Verify if user already claimed step reward today
        try {
            const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org');
            const abi = [
                'function dailyStepClaimed(address, uint256) view returns (uint256)',
                'function stepEnabled() view returns (bool)'
            ];
            const contract = new ethers.Contract(ACTIVITY_MODULE_ADDRESS, abi, provider);
            
            // Check if step rewards are enabled
            const isEnabled = await contract.stepEnabled().catch(() => true);
            if (!isEnabled) {
                return NextResponse.json(
                    { success: false, error: 'Airdrop claims are currently paused by the administrator.' },
                    { status: 403, headers: corsHeaders() }
                );
            }

            const currentDay = Math.floor(Date.now() / 1000 / 86400);
            const claimedToday = await contract.dailyStepClaimed(normalizedAddress, currentDay).catch(() => 0n);
            if (claimedToday > 0n) {
                claimedWallets.add(lowerAddress);
                return NextResponse.json(
                    { success: false, error: 'Airdrop already claimed on-chain for today.' },
                    { status: 400, headers: corsHeaders() }
                );
            }
        } catch (chainErr) {
            console.warn('On-chain read warning (proceeding with Oracle check):', chainErr.message);
        }

        // 4. Initialize Oracle Wallet
        if (!SIGNER_PRIVATE_KEY) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Oracle key missing.' },
                { status: 500, headers: corsHeaders() }
            );
        }

        const oracleWallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
        const payoutWei = ethers.parseUnits(AIRDROP_AMOUNT, 18);
        
        // 15 minutes deadline
        const deadline = Math.floor(Date.now() / 1000) + (15 * 60);

        // 5. Generate EIP-712 Signature for ActivityModule.claimStepReward
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

        // 6. Mark address as claimed
        claimedWallets.add(lowerAddress);

        return NextResponse.json({
            success: true,
            data: {
                steps: AIRDROP_STEPS,
                payout: payoutWei.toString(),
                deadline: deadline,
                signature: signature,
                amount: AIRDROP_AMOUNT
            }
        }, { headers: corsHeaders() });

    } catch (error) {
        console.error("Airdrop Signature Generation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error while generating airdrop signature.' },
            { status: 500, headers: corsHeaders() }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}
