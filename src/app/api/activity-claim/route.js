import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Base Mainnet ActivityModule Contract Address
const ACTIVITY_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ACTIVITY_MODULE_ADDRESS || "0x1084Ba72eaF89E4Ed0c0320FDB4C6A51159c15eb";

// Signer private key with environment fallbacks
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY || process.env.VALIDATOR_PRIVATE_KEY || "0xe7691e544f0f0f35fa0cfa96ae31d62db291ab6b6c4f20a8229e38d8652ead16";

export async function POST(req) {
    try {
        const body = await req.json();
        const { userAddress, amount, activityType } = body;

        if (!SIGNER_PRIVATE_KEY) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Signer key missing.' },
                { status: 500 }
            );
        }

        // Validation
        if (!userAddress || !amount || !activityType) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: userAddress, amount, activityType (step or snap)' },
                { status: 400 }
            );
        }

        if (activityType !== 'step' && activityType !== 'snap') {
            return NextResponse.json(
                { success: false, error: 'activityType must be either "step" or "snap"' },
                { status: 400 }
            );
        }

        // Initialize Wallet
        const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
        console.log(`ActivityModule Signer Wallet: ${wallet.address}`);

        // Format payout amount to Wei (assuming 18 decimals)
        const payout = ethers.parseUnits(amount.toString(), 18);

        // Generate parameters based on activityType
        const deadline = Math.floor(Date.now() / 1000) + (10 * 60);

        // EIP-712 Domain matching ActivityModule V14
        const domain = {
            name: "Coffy",
            version: "1",
            chainId: 8453,
            verifyingContract: ACTIVITY_MODULE_ADDRESS
        };

        let signature;
        let responseData = {};

        if (activityType === 'snap') {
            const snapId = ethers.hexlify(ethers.randomBytes(32)); // bytes32
            const types = {
                SnapReward: [
                    { name: "snapId", type: "bytes32" },
                    { name: "user", type: "address" },
                    { name: "payout", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };
            const value = {
                snapId: snapId,
                user: userAddress,
                payout: payout.toString(),
                deadline: deadline
            };
            signature = await wallet.signTypedData(domain, types, value);
            responseData = {
                snapId: snapId,
                payout: payout.toString(),
                deadline: deadline,
                signature: signature
            };
        } else {
            // Step reward: steps must be >= 1000 (minStepCount in contract)
            const rawSteps = body.steps ? parseInt(body.steps) : 1000;
            const steps = Math.max(1000, rawSteps);
            const types = {
                StepReward: [
                    { name: "user", type: "address" },
                    { name: "steps", type: "uint256" },
                    { name: "payout", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };
            const value = {
                user: userAddress,
                steps: steps,
                payout: payout.toString(),
                deadline: deadline
            };
            signature = await wallet.signTypedData(domain, types, value);
            responseData = {
                steps: steps,
                payout: payout.toString(),
                deadline: deadline,
                signature: signature
            };
        }

        console.log(`📝 Generated EIP-712 ${activityType.toUpperCase()} Signature:`, responseData);

        return NextResponse.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Activity Signature Generation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate signature" },
            { status: 500 }
        );
    }
}
