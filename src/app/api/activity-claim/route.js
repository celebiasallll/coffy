import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Base Mainnet ActivityModule Contract Address
const ACTIVITY_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ACTIVITY_MODULE_ADDRESS || "0x1084Ba72eaF89E4Ed0c0320FDB4C6A51159c15eb";

// The private key must be kept secret in production, ALWAYS use environment variables
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;

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

        // Generate a random ID (steps for step, snapId for snap)
        const randomBytes = ethers.randomBytes(32);
        const deadline = Math.floor(Date.now() / 1000) + (10 * 60);

        // EIP-712 Data
        const domain = {
            name: "Coffy",
            version: "1",
            chainId: 8453,
            verifyingContract: ACTIVITY_MODULE_ADDRESS
        };

        let signature;
        let id;

        if (activityType === 'snap') {
            id = ethers.hexlify(randomBytes); // bytes32
            const types = {
                SnapReward: [
                    { name: "snapId", type: "bytes32" },
                    { name: "user", type: "address" },
                    { name: "payout", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ]
            };
            const value = {
                snapId: id,
                user: userAddress,
                payout: payout,
                deadline: deadline
            };
            signature = await wallet.signTypedData(domain, types, value);
        } else {
            // Step reward
            id = ethers.toBigInt(randomBytes).toString(); // uint256
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
                steps: id, // Mapping 'steps' to our generated ID for this claim
                payout: payout,
                deadline: deadline
            };
            signature = await wallet.signTypedData(domain, types, value);
        }

        console.log(`📝 Generated EIP-712 ${activityType.toUpperCase()} Signature:`);
        console.log(`- ID: ${id}`);
        console.log(`- Payout: ${payout.toString()} Wei`);
        console.log(`- Deadline: ${deadline}`);
        console.log(`- Signature: ${signature}`);

        return NextResponse.json({
            success: true,
            data: {
                id: id,
                payout: payout.toString(),
                deadline: deadline,
                signature: signature
            }
        });

    } catch (error) {
        console.error("Activity Signature Generation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate signature" },
            { status: 500 }
        );
    }
}
