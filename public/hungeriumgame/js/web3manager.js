class Web3Manager {
    constructor() {
        // Base Mainnet Contract Addresses
        this.tokenAddress = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";
        this.gameModuleAddress = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";
        
        this.gameModuleABI = [
            "function startGame(uint64 gameType) external",
            "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes calldata sig) external",
            "function expireSingleGame(uint256 id) external",
            "function getUserGameState(address user) external view returns (uint256, uint256, uint256)",
            "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)",
            "event SingleClaimed(uint256 indexed id, address indexed player, uint256 payout)",
            "event SingleExpired(uint256 indexed id, address indexed player, uint256 refund)"
        ];
        
        this.tokenABI = [
            "function balanceOf(address account) external view returns (uint256)",
            "function decimals() external view returns (uint8)"
        ];

        this.provider = null;
        this.signer = null;
        this.gameContract = null;
        this.tokenContract = null;
        this.currentAccount = null;
        this.balance = "0.00";
        this.activeGameId = null;
        this.activeSessionStartedAt = 0;
        this.connectionStatus = 'disconnected';
        this.txGuard = false;

        this.initialize();
    }

    async initialize() {
        if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            
            window.ethereum.on('accountsChanged', (accounts) => this.handleAccountsChanged(accounts));
            window.ethereum.on('chainChanged', () => window.location.reload());

            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) {
                    await this.handleAccountsChanged(accounts);
                }
            } catch (e) {
                console.warn("Metamask lookup failed:", e);
            }
        }
    }

    async handleAccountsChanged(accounts) {
        if (accounts.length > 0) {
            this.currentAccount = accounts[0];
            this.signer = this.provider.getSigner();
            this.gameContract = new ethers.Contract(this.gameModuleAddress, this.gameModuleABI, this.signer);
            this.tokenContract = new ethers.Contract(this.tokenAddress, this.tokenABI, this.signer);
            this.connectionStatus = 'connected';
            await this.fetchTokenBalance();
            await this.getActiveSession(); // Zombie Slayer Logic
        } else {
            this.currentAccount = null;
            this.connectionStatus = 'disconnected';
            this.activeGameId = null;
        }
        this.notifyUpdate();
    }

    async connectWallet() {
        if (!window.ethereum) return false;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await this.handleAccountsChanged(await this.provider.listAccounts());
            return true;
        } catch (error) {
            console.error("Connection failed:", error);
            return false;
        }
    }

    async fetchTokenBalance() {
        if (!this.tokenContract || !this.currentAccount) return;
        try {
            const bal = await this.tokenContract.balanceOf(this.currentAccount);
            const dec = await this.tokenContract.decimals();
            this.balance = ethers.utils.formatUnits(bal, dec);
        } catch (e) { console.error("Balance fetch error:", e); }
    }

    // --- ZOMBIE SLAYER LOGIC ---
    async getActiveSession() {
        if (!this.gameContract || !this.currentAccount) return null;
        try {
            // Priority 1: Check events for the most recent start
            const filter = this.gameContract.filters.SingleStarted(null, this.currentAccount);
            const events = await this.gameContract.queryFilter(filter, -10000); // Last 10k blocks
            
            if (events.length > 0) {
                const lastEvent = events[events.length - 1];
                const id = lastEvent.args.id.toString();
                
                // Check if this ID was already claimed or expired
                const claimedFilter = this.gameContract.filters.SingleClaimed(lastEvent.args.id);
                const claimedEvents = await this.gameContract.queryFilter(claimedFilter, lastEvent.blockNumber);
                
                const expiredFilter = this.gameContract.filters.SingleExpired(lastEvent.args.id);
                const expiredEvents = await this.gameContract.queryFilter(expiredFilter, lastEvent.blockNumber);

                if (claimedEvents.length === 0 && expiredEvents.length === 0) {
                    this.activeGameId = id;
                    const block = await lastEvent.getBlock();
                    this.activeSessionStartedAt = block.timestamp;
                    console.log("Active Hungerium Session Found:", id, "Started at:", this.activeSessionStartedAt);
                    return id;
                }
            }
            this.activeGameId = null;
            return null;
        } catch (e) {
            console.warn("Session lookup failed, falling back to contract state:", e);
            const state = await this.gameContract.getUserGameState(this.currentAccount);
            if (state[0].toString() !== "0") {
                this.activeGameId = state[0].toString();
                return this.activeGameId;
            }
        }
        return null;
    }

    async startGameOnContract() {
        if (this.txGuard) return false;
        try {
            this.txGuard = true;
            const tx = await this.gameContract.startGame(1);
            await tx.wait();
            await this.getActiveSession();
            await this.fetchTokenBalance();
            return true;
        } catch (e) {
            console.error("Start Game Failed:", e);
            return false;
        } finally {
            this.txGuard = false;
            this.notifyUpdate();
        }
    }

    async claimRewards(amount) {
        if (this.txGuard || !this.activeGameId) return false;
        
        // --- 2 MINUTE RULE CHECK ---
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - this.activeSessionStartedAt;
        const minDuration = 120; // 2 minutes
        
        if (elapsed < minDuration) {
            const wait = minDuration - elapsed;
            this.showNotification(`Please wait ${wait} more seconds to claim (Min 2 min game required).`, "warning");
            return false;
        }

        try {
            this.txGuard = true;
            const response = await fetch('/api/game-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: this.currentAccount,
                    amount: Math.floor(amount).toString(),
                    gameId: this.activeGameId
                })
            });
            const result = await response.json();
            const data = result.data || result;
            if (!response.ok) throw new Error(result.error || "Backend Signature Error");

            const tx = await this.gameContract.claimSingleWin(data.id, data.payout, data.deadline, data.signature);
            await tx.wait();
            
            this.activeGameId = null;
            this.saveRewards(0); // Clear local reward for this wallet
            await this.fetchTokenBalance();
            return true;
        } catch (e) {
            console.error("Claim failed:", e);
            alert("Claim Error: " + (e.reason || e.message));
            return false;
        } finally {
            this.txGuard = false;
            this.notifyUpdate();
        }
    }

    async forceResetStuckSession() {
        if (!this.activeGameId || this.txGuard) return;
        try {
            this.txGuard = true;
            const tx = await this.gameContract.expireSingleGame(this.activeGameId);
            await tx.wait();
            this.activeGameId = null;
            await this.getActiveSession();
        } catch (e) {
            console.error("Reset failed:", e);
            alert("Wait for 4 hours policy: " + (e.reason || e.message));
        } finally {
            this.txGuard = false;
            this.notifyUpdate();
        }
    }

    // --- REWARD PERSISTENCE (Wallet Isolated) ---
    getStoredRewards() {
        if (!this.currentAccount) return 0;
        const key = `hungeriumEarned_${this.currentAccount.toLowerCase()}`;
        return parseFloat(localStorage.getItem(key)) || 0;
    }

    saveRewards(amount) {
        if (!this.currentAccount) return;
        const key = `hungeriumEarned_${this.currentAccount.toLowerCase()}`;
        localStorage.setItem(key, amount.toString());
    }

    notifyUpdate() {
        document.dispatchEvent(new CustomEvent('wallet-update', {
            detail: {
                connected: !!this.currentAccount,
                account: this.currentAccount,
                balance: this.balance,
                activeGameId: this.activeGameId,
                rewards: this.getStoredRewards()
            }
        }));
    }

    getDisplayBalance() {
        return parseFloat(this.balance).toFixed(2);
    }

    showNotification(message, type = 'success', duration = 5000) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = type;
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, duration);
        } else {
            console.log(`Notification (${type}): ${message}`);
        }
    }
}
