import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const GAME_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GAME_MODULE_ADDRESS || "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";
const SIGNER_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || process.env.SIGNER_PRIVATE_KEY || process.env.VALIDATOR_PRIVATE_KEY;
const CHAIN_ID = 8453; // Base Mainnet

export async function POST(req) {
    try {
        const body = await req.json();
        const { userAddress, amount, gameId } = body;

        // Validation
        if (!userAddress || !amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: userAddress, amount' },
                { status: 400 }
            );
        }

        // gameId zorunlu — rastgele ID üretmiyoruz artık
        if (!gameId) {
            return NextResponse.json(
                { success: false, error: 'Missing gameId. Start a game first via startGame().' },
                { status: 400 }
            );
        }

        if (!SIGNER_PRIVATE_KEY) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error: Signer key missing.' },
                { status: 500 }
            );
        }

        // Initialize Wallet
        const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
        console.log(`Backend Signer Wallet: ${wallet.address}`);

        // Format payout amount to Wei (18 decimals)
        const payout = ethers.parseUnits(amount.toString(), 18);

        // Zincirden gelen gerçek gameId'yi kullan
        const id = BigInt(gameId);

        // Deadline: 10 dakika
        const deadline = Math.floor(Date.now() / 1000) + (10 * 60);

        // EIP-712 Domain (kontratla birebir eşleşmeli)
        const domain = {
            name: "Coffy",
            version: "1",
            chainId: CHAIN_ID,
            verifyingContract: GAME_MODULE_ADDRESS
        };

        const types = {
            SingleWin: [
                { name: "id",       type: "uint256" },
                { name: "user",     type: "address" },
                { name: "payout",   type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const message = {
            id: id.toString(),
            user: userAddress,
            payout: payout.toString(),
            deadline: deadline
        };

        const signature = await wallet.signTypedData(domain, types, message);

        console.log("📝 Generated EIP-712 Signature:");
        console.log(`- GameID: ${id.toString()}`);
        console.log(`- User: ${userAddress}`);
        console.log(`- Payout: ${payout.toString()} Wei`);
        console.log(`- Deadline: ${deadline}`);
        console.log(`- Signer: ${wallet.address}`);

        return NextResponse.json({
            success: true,
            data: {
                id: id.toString(),
                payout: payout.toString(),
                deadline: deadline,
                signature: signature
            }
        });

    } catch (error) {
        console.error("Signature Generation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate signature" },
            { status: 500 }
        );
    }
}
