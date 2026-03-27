/**
 * Web3Manager for Bee Adventure - CONTRAT-ALIGNED VERSION
 * Zincirle tam uyumlu, 4 saat kuralı ve event-log tabanlı çalışma
 */

const COFFY_TOKEN_ADDRESS = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";
const GAME_MODULE_ADDRESS = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";

const COFFY_TOKEN_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

const GAME_MODULE_ABI = [
    "function startGame(uint64 gameType) external",
    "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external",
    "function expireSingleGame(uint256 id) external",
    "function getUserGameState(address user) external view returns (uint256 activeSingleGameId, uint256 dailyBetsPlaced, uint256 lastBattleTime)",
    "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)",
    "event SingleClaimed(uint256 indexed id, address indexed player, uint256 payout)",
    "event SingleExpired(uint256 indexed id, address indexed player)"
];

class Web3Manager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.tokenContract = null;
        this.gameContract = null;
        this.walletAddress = null;
        this.connected = false;
        this.isProcessingTx = false;
        this.activeGameId = null;
        this.eventListeners = {};
        this.initializationPromise = this.init();
    }

    async init() {
        if (typeof window.ethers === 'undefined') return;
        if (!window.ethereum) return;
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        window.ethereum.on('accountsChanged', (a) => this.handleAccountsChanged(a));
        window.ethereum.on('chainChanged', () => window.location.reload());
        try {
            const accounts = await this.provider.listAccounts();
            if (accounts.length > 0) await this.setupWallet(accounts[0]);
        } catch (e) {}
    }

    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) this.disconnect();
        else await this.setupWallet(accounts[0]);
    }

    async setupWallet(address) {
        this.walletAddress = address;
        this.signer = this.provider.getSigner();
        this.tokenContract = new ethers.Contract(COFFY_TOKEN_ADDRESS, COFFY_TOKEN_ABI, this.signer);
        this.gameContract = new ethers.Contract(GAME_MODULE_ADDRESS, GAME_MODULE_ABI, this.signer);
        this.connected = true;
        this.triggerEvent('wallet-update', { connected: true, address: this.walletAddress });
    }

    disconnect() {
        this.walletAddress = null;
        this.signer = null;
        this.connected = false;
        this.triggerEvent('wallet-update', { connected: false });
    }

    async connectWallet() {
        if (this.isProcessingTx) return false;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await this.provider.listAccounts();
            if (accounts.length > 0) { await this.setupWallet(accounts[0]); return true; }
        } catch (e) { this.showNotification("Bağlantı başarısız", "error"); }
        return false;
    }

    on(event, cb) {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(cb);
    }

    triggerEvent(event, data) {
        (this.eventListeners[event] || []).forEach(cb => cb(data));
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    async txGuard(callback) {
        if (this.isProcessingTx) {
            this.showNotification("İşlem devam ediyor...", "warning");
            return null;
        }
        this.isProcessingTx = true;
        document.dispatchEvent(new CustomEvent('tx-start'));
        try { return await callback(); }
        catch (error) {
            const msg = error?.reason || error?.message || "İşlem başarısız";
            this.showNotification(msg.includes("rejected") ? "İptal edildi." : msg.slice(0, 80), 'error');
            return null;
        } finally {
            this.isProcessingTx = false;
            document.dispatchEvent(new CustomEvent('tx-end'));
        }
    }

    async getActiveSession() {
        if (!this.connected) return null;
        try {
            const state = await this.gameContract.getUserGameState(this.walletAddress);
            const activeId = (state.activeSingleGameId || state[0]).toString();

            if (activeId === "0") {
                this.activeGameId = null;
                this._clearSessionCache();
                return null;
            }

            this.activeGameId = activeId;
            const cacheKey = `bee_game_start_${activeId}_${this.walletAddress}`;
            let startedAt = localStorage.getItem(cacheKey);

            if (!startedAt || startedAt === "UNKNOWN") {
                startedAt = await this._fetchStartTimeFromChain(activeId);
                if (startedAt) localStorage.setItem(cacheKey, startedAt);
            }

            if (!startedAt) {
                return { id: activeId, startedAt: null, duration: null,
                         isReadyToClaim: false, isExpired: false, unknownTime: true };
            }

            const startTimeNum = parseInt(startedAt);
            const now = Math.floor(Date.now() / 1000);
            const duration = now - startTimeNum;
            const SINGLE_TIMEOUT = 4 * 3600; 
            const MIN_DURATION   = 120;       

            return {
                id: activeId,
                startedAt: startTimeNum,
                duration,
                isReadyToClaim: duration >= MIN_DURATION && duration < SINGLE_TIMEOUT,
                isExpired: duration >= SINGLE_TIMEOUT,
                secondsUntilExpire: Math.max(0, SINGLE_TIMEOUT - duration),
                secondsUntilClaim: Math.max(0, MIN_DURATION - duration),
                unknownTime: false
            };
        } catch (e) {
            console.error("getActiveSession:", e);
            return null;
        }
    }

    async _fetchStartTimeFromChain(gameId) {
        try {
            const filter = this.gameContract.filters.SingleStarted(null, this.walletAddress);
            const logs = await this.gameContract.queryFilter(filter, -50000);
            const log = logs.find(l => l.args.id.toString() === gameId);
            if (!log) return null;
            const block = await this.provider.getBlock(log.blockNumber);
            return block.timestamp.toString();
        } catch (e) {
            console.warn("_fetchStartTimeFromChain failed:", e);
            return null;
        }
    }

    _clearSessionCache() {
        Object.keys(localStorage)
            .filter(k => k.startsWith(`bee_game_start_`) && k.endsWith(this.walletAddress))
            .forEach(k => localStorage.removeItem(k));
    }

    async startGameOnContract(gameType = 3) {
        return this.txGuard(async () => {
            const session = await this.getActiveSession();
            if (session) {
                if (session.isExpired) {
                    this.showNotification("Önceki oturum süresi dolmuş, önce sıfırlayın.", "warning");
                    return false;
                }
                return "RESUMED";
            }

            this.showNotification("Bee Adventure başlatılıyor...", "info");
            const tx = await this.gameContract.startGame(gameType);
            const receipt = await tx.wait();

            try {
                const iface = new ethers.utils.Interface(GAME_MODULE_ABI);
                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed?.name === "SingleStarted") {
                            const newId = parsed.args.id.toString();
                            const cacheKey = `bee_game_start_${newId}_${this.walletAddress}`;
                            localStorage.setItem(cacheKey, Math.floor(Date.now() / 1000).toString());
                            this.activeGameId = newId;
                            break;
                        }
                    } catch (_) {}
                }
            } catch (e) {}

            return "STARTED";
        });
    }

    async forceResetStuckSession() {
        if (!this.connected) return false;
        const session = await this.getActiveSession();
        if (!session) return true;

        if (!session.isExpired && !session.unknownTime) {
            const hours = Math.floor(session.secondsUntilExpire / 3600);
            const mins  = Math.floor((session.secondsUntilExpire % 3600) / 60);
            this.showNotification(
                `Oturum sıfırlamak için ${hours}s ${mins}dk bekleyin.`, "warning"
            );
            return false;
        }

        return this.txGuard(async () => {
            this.showNotification(`Oturum #${session.id} temizleniyor...`, "info");
            const tx = await this.gameContract.expireSingleGame(session.id);
            await tx.wait();

            this._clearSessionCache();
            this.showNotification("Sıfırlandı! Yeni oyun başlatabilirsiniz. ✅", "success");
            return true;
        });
    }

    async claimGameRewards(amount) {
        return this.txGuard(async () => {
            const session = await this.getActiveSession();
            if (!session) throw new Error("Aktif oturum bulunamadı.");

            if (session.isExpired)
                throw new Error("Oturum süresi doldu (4 saat). Önce 'Sıfırla' butonuna basın.");

            if (!session.isReadyToClaim && !session.unknownTime)
                throw new Error(`${session.secondsUntilClaim} saniye daha bekleyin.`);

            const response = await fetch("/api/game-claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userAddress: this.walletAddress,
                    amount,
                    gameId: session.id,
                    gameType: 3
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Backend hatası");

            const { id, payout, deadline, signature } = result.data;
            const tx = await this.gameContract.claimSingleWin(id, payout, deadline, signature);
            await tx.wait();

            this._clearSessionCache();
            this.showNotification("Ödüller alındı! 🎉", "success");
            return true;
        });
    }

    showNotification(msg, type = 'info') {
        if (window.showNotification) window.showNotification(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
}

window.web3Manager = new Web3Manager();
