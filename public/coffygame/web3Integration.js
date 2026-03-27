import * as Const from './constants.js';
import * as Utils from './utils.js';
const { showNotification, checkClaimRateLimit, recordClaim } = Utils;

// BASE MAINNET KONTRAT ADRESLERİ
const NEW_TOKEN_ADDRESS = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41"; // CoffyCore
const MODULE_CONTRACT_ADDRESS = '0x1084Ba72eaF89E4Ed0c0320FDB4C6A51159c15eb'; // Coffy ActivityModule Base
const GAME_MODULE_ADDRESS = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea"; // Coffy GameModule Base

// --- SETTINGS ---
const BYPASS_3_DAY_WAIT = true;   
const BYPASS_2_MIN_SESSION = false; 

// ABIs
const NEW_TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function claimPendingRewards(uint256 amount) external",
    "function getStakeInfo(address user) external view returns (uint128 amount, uint64 startTime, uint64 lastClaim)",
    "function getPendingRewardsStatus(address user) external view returns (uint256 totalPending, uint256 gameRewards, uint256 stepRewards, uint256 snapRewards, bool canClaim, bool hasExpired)"
];

const GAME_MODULE_ABI = [
    "function startGame(uint64 gameType) external",
    "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external",
    "function purchaseCharacter(uint8 cid, uint128 amount) external",
    "function getUserCharacterBalance(address user, uint256 cid) external view returns (uint128)",
    "function getUserGameState(address user) external view returns (uint256, uint256, uint256)",
    "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)",
    "event SingleClaimed(uint256 indexed id, address indexed player, uint256 payout)"
];

/**
 * Web3 yönetimi için ana sınıf - Tek Gerçeklik Kaynağı (Single Source of Truth)
 */
class Web3Manager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.tokenContract = null;
        this.gameModuleContract = null;
        this.connected = false;
        this.walletAddress = null;
        this.eventListeners = {};
        this.isProcessingTx = false;
        this.activeGameId = null;

        this.initializationPromise = this.init();
    }

    async init() {
        if (!window.ethereum) return;

        // Ethers'ın yüklenmesini bekle (CDN'den gelen)
        if (typeof window.ethers === 'undefined') {
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (typeof window.ethers !== 'undefined') {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
                setTimeout(() => { clearInterval(check); resolve(); }, 5000);
            });
        }

        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                this.connectWallet(); 
            } else {
                this.disconnect();
            }
        });

        window.ethereum.on('chainChanged', () => window.location.reload());

        return this.autoConnect();
    }

    async autoConnect() {
        if (!window.ethereum) return;
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                return this.connectWallet();
            }
        } catch (e) { console.warn("AutoConnect error:", e); }
    }

    async connectWallet() {
        if (!window.ethereum || typeof window.ethers === 'undefined') return false;

        try {
            this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const accounts = await this.provider.send("eth_requestAccounts", []);
            this.signer = this.provider.getSigner();
            this.walletAddress = accounts[0];
            
            // Network check (Base Mainnet)
            const network = await this.provider.getNetwork();
            if (network.chainId !== 8453) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }],
                    });
                } catch (err) {
                    if (err.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base Mainnet',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org']
                            }],
                        });
                    }
                }
                // Re-init provider after switch
                this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                this.signer = this.provider.getSigner();
            }

            this.tokenContract = new ethers.Contract(NEW_TOKEN_ADDRESS, NEW_TOKEN_ABI, this.signer);
            this.gameModuleContract = new ethers.Contract(GAME_MODULE_ADDRESS, GAME_MODULE_ABI, this.signer);
            this.connected = true;

            console.log("Web3Manager: Connected as", this.walletAddress);
            this.triggerEvent('wallet-update', { connected: true, address: this.walletAddress });
            this.triggerEvent('connected', { address: this.walletAddress });
            return true;
        } catch (error) {
            console.error("Connection failed:", error);
            return false;
        }
    }

    disconnect() {
        this.connected = false;
        this.walletAddress = null;
        this.signer = null;
        this.tokenContract = null;
        this.gameModuleContract = null;
        this.triggerEvent('wallet-update', { connected: false });
        this.triggerEvent('disconnected', {});
    }

    isConnected() {
        return this.connected && this.walletAddress !== null;
    }

    /**
     * İşlem Koruması (Tx Guard)
     */
    async txGuard(callback) {
        if (this.isProcessingTx) {
            showNotification("A transaction is already in progress. Please wait.", 'warning');
            return null;
        }
        this.isProcessingTx = true;
        try {
            return await callback();
        } catch (error) {
            console.error("Transaction Error:", error);
            const msg = error.message || "Transaction failed";
            if (msg.includes("user rejected")) showNotification("Transaction cancelled.", 'info');
            else showNotification(msg.substring(0, 100), 'error');
            return null;
        } finally {
            this.isProcessingTx = false;
        }
    }

    /**
     * Aktif oyun oturumu bilgilerini getirir
     */
    async getActiveSession() {
        if (!this.isConnected()) return null;
        try {
            const userGameState = await this.gameModuleContract.getUserGameState(this.walletAddress);
            const activeId = userGameState[0].toString();
            
            if (activeId === "0") {
                this.activeGameId = null;
                return null;
            }
            
            this.activeGameId = activeId;
            let startedAt = parseInt(localStorage.getItem(`coffy_game_start_${activeId}`));
            
            if (!startedAt) {
                console.log("Oturum zamanı yerelde bulunamadı, loglar taranıyor...");
                try {
                    const filter = this.gameModuleContract.filters.SingleStarted(null, this.walletAddress);
                    const logs = await this.gameModuleContract.queryFilter(filter, -5000); 
                    const userLog = logs.find(l => l.args.id.toString() === activeId);
                    
                    if (userLog) {
                        const block = await userLog.getBlock();
                        startedAt = block.timestamp;
                        localStorage.setItem(`coffy_game_start_${activeId}`, startedAt.toString());
                    }
                } catch (e) {}
            }
            
            if (!startedAt) return { id: activeId, unknownTime: true };

            const now = Math.floor(Date.now() / 1000);
            const duration = now - startedAt;
            
            return {
                id: activeId,
                startedAt: startedAt,
                duration: duration,
                isReadyToClaim: duration >= 120 
            };
        } catch (e) { return null; }
    }

    /**
     * Akıllı Oyun Başlatma (Decision Mechanism)
     */
    async startGameOnContract(gameType = 1) {
        return this.txGuard(async () => {
            if (!this.isConnected()) return false;

            const session = await this.getActiveSession();
            if (session) {
                // Non-blocking resume: always allow resuming if session exists
                return "RESUMED";
            }

            console.log("Starting new game on contract...");
            const tx = await this.gameModuleContract.startGame(gameType);
            const receipt = await tx.wait();
            
            try {
                const iface = new ethers.utils.Interface(["event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)"]);
                for (const log of receipt.logs) {
                    const parsed = iface.parseLog(log);
                    if (parsed && parsed.name === "SingleStarted") {
                        const newId = parsed.args.id.toString();
                        this.activeGameId = newId;
                        localStorage.setItem(`coffy_game_start_${newId}`, Math.floor(Date.now() / 1000).toString());
                        break;
                    }
                }
            } catch (e) {}

            localStorage.setItem('coffy_human_verification_ts', Date.now().toString());
            return "STARTED";
        });
    }

    /**
     * Ödül Talep Etme (Backend Signature Enforced)
     */
    async claimGameRewards(amount) {
        return this.txGuard(async () => {
            if (!this.isConnected()) return false;

            // 1. Check if session exists on-chain
            const session = await this.getActiveSession();
            if (!session) {
                showNotification("No active game session found.", "warning");
                return false;
            }

            showNotification("Requesting verification from ministry...", 'info');

            // 2. Fetch signature from backend
            const response = await fetch('/api/game-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: this.walletAddress,
                    amount: amount,
                    gameId: session.id
                })
            });

            const result = await response.json();
            if (!result.success) {
                showNotification("Verification failed: " + result.error, "error");
                return false;
            }

            const { id, payout, deadline, signature } = result.data;
            showNotification("Verification approved! Confirm with your wallet.", 'success');

            // 3. Submit to contract
            const tx = await this.gameModuleContract.claimSingleWin(id, payout, deadline, signature);
            await tx.wait();

            this.activeGameId = null;
            showNotification("Rewards claimed successfully!", 'success');
            this.triggerEvent('rewardsClaimed', { amount: amount, txHash: tx.hash });
            return true;
        });
    }

    /**
     * Karakter Satın Alma
     */
    async buyCharacter(characterId, price) {
        return this.txGuard(async () => {
            if (!this.isConnected()) return false;

            const priceWei = ethers.utils.parseUnits(price.toString(), 18);
            const balance = await this.tokenContract.balanceOf(this.walletAddress);

            if (balance.lt(priceWei)) {
                showNotification(`Insufficient COFFY! Need ${price} COFFY.`, 'warning');
                return false;
            }

            console.log(`Purchasing character ${characterId} for ${price} COFFY...`);
            const tx = await this.gameModuleContract.purchaseCharacter(characterId, priceWei);
            await tx.wait();

            showNotification("Character purchased successfully!", 'success');
            this.triggerEvent('characterPurchased', { characterId, txHash: tx.hash });
            return true;
        });
    }

    /**
     * Skill Upgrade
     */
    async upgradeSkill(skillKey, cost) {
        return this.txGuard(async () => {
            if (!this.isConnected()) return false;

            const costWei = ethers.utils.parseUnits(cost.toString(), 18);
            const balance = await this.tokenContract.balanceOf(this.walletAddress);

            if (balance.lt(costWei)) {
                showNotification(`Need ${cost} COFFY for upgrade.`, 'warning');
                return false;
            }

            // Placeholder: Replace with actual contract call if one exists for skills
            console.log(`Upgrading ${skillKey} for ${cost} COFFY...`);
            // const tx = await this.gameModuleContract.upgradeSkill(skillKey, costWei);
            // await tx.wait();
            
            showNotification(`${skillKey} upgraded!`, 'success');
            return true;
        });
    }

    // --- Core Methods ---
    on(event, callback) {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(callback);
    }

    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
        // Also dispatch to DOM for vanilla JS compatibility
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}

// Global instance
window.web3Manager = new Web3Manager();

/**
 * Global Helpers
 */
export function startGameSession() {
    localStorage.setItem('coffy_game_session_start', Date.now().toString());
}
window.startGameSession = startGameSession;

export function checkGameSessionDuration() {
    const start = localStorage.getItem('coffy_game_session_start');
    if (!start) return { hasStarted: false, duration: 0, canClaim: false };
    const dur = (Date.now() - Number(start)) / 1000 / 60;
    return { hasStarted: true, duration: dur, canClaim: dur >= 2 };
}
window.checkGameSessionDuration = checkGameSessionDuration;

export default window.web3Manager;
