/**
 * CoffyInMaze Web3 Manager - Professional "Zombie Slayer" Architecture
 * Standardized for event-driven session tracking and wallet-isolated rewards.
 */
class Web3Manager {
    constructor() {
        this.contractAddress = '0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea';
        this.tokenAddress = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41'; 
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.gameContract = null;
        this.tokenContract = null;
        this.isConnecting = false;
        
        // Maze specific
        this.gameType = 2; 
        this.storageKey = 'coffymazeEarned'; // Will be suffixed with _address
        this.maxSessionDuration = 4 * 60 * 60 * 1000; // 4 hours
        this.minGameDuration = 2 * 60 * 1000; // 2 minutes
    }

    async init() {
        if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await this.provider.listAccounts();
            if (accounts.length > 0) {
                await this.connect();
            }
        }
    }

    async connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.signer = this.provider.getSigner();
            this.address = await this.signer.getAddress();
            
            const abi = [
                "function startGame(uint64 gameType) external",
                "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external",
                "function expireSingleGame(uint256 id) external",
                "function getUserGameState(address user) external view returns (uint256, uint256, uint256)",
                "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)"
            ];
            
            const tokenAbi = [
                "function balanceOf(address account) external view returns (uint256)",
                "function transfer(address to, uint256 amount) external returns (bool)"
            ];

            this.gameContract = new ethers.Contract(this.contractAddress, abi, this.signer);
            this.tokenContract = new ethers.Contract(this.tokenAddress, tokenAbi, this.signer);

            console.log("Web3 Connected:", this.address);
            
            // Sync rewards for this specific wallet
            if (window.updateRewardsUI) window.updateRewardsUI();
            
            return true;
        } catch (error) {
            console.error("Connection failed:", error);
            return false;
        } finally {
            this.isConnecting = false;
        }
    }

    getRewardKey() {
        return this.address ? `${this.storageKey}_${this.address.toLowerCase()}` : null;
    }

    getEarnedRewards() {
        const key = this.getRewardKey();
        if (!key) return 0;
        return parseInt(localStorage.getItem(key)) || 0;
    }

    saveRewards(amount) {
        const key = this.getRewardKey();
        if (!key) return;
        localStorage.setItem(key, amount);
    }

    async getActiveSession() {
        if (!this.address) return null;
        try {
            const state = await this.gameContract.getUserGameState(this.address);
            const activeId = state[0].toString();
            
            if (activeId === "0") return null;

            // Fetch start time from logs (Zombie Slayer approach)
            const filter = this.gameContract.filters.SingleStarted(activeId, this.address);
            const logs = await this.gameContract.queryFilter(filter, -10000); // Look back ~1.5 days of blocks
            
            if (logs.length > 0) {
                const block = await logs[0].getBlock();
                const startTime = block.timestamp * 1000;
                return { id: activeId, startTime };
            }
            return null;
        } catch (error) {
            console.error("Session check failed:", error);
            return null;
        }
    }

    async startGame() {
        if (!this.address) await this.connect();
        try {
            const tx = await this.gameContract.startGame(this.gameType);
            const receipt = await tx.wait();
            
            const event = receipt.events?.find(e => e.event === 'SingleStarted');
            return event ? event.args.id.toString() : null;
        } catch (error) {
            console.error("Start game failed:", error);
            throw error;
        }
    }

    async claimRewards(amount, gameId) {
        if (!this.address) await this.connect();
        
        // 2-minute check
        const session = await this.getActiveSession();
        if (session) {
            const elapsed = Date.now() - session.startTime;
            if (elapsed < this.minGameDuration) {
                const wait = Math.ceil((this.minGameDuration - elapsed) / 1000);
                this.showNotification(`You must wait ${wait}s more to claim. Minimum 2 mins required.`, 'warning');
                return false;
            }
        }

        try {
            const response = await fetch('/api/game-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: this.address,
                    amount: amount.toString(),
                    gameId: gameId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Claim signature failed');

            const tx = await this.gameContract.claimSingleWin(
                data.id,
                data.payout,
                data.deadline,
                data.signature
            );
            await tx.wait();
            
            // Clear local rewards upon success
            this.saveRewards(0);
            if (window.updateRewardsUI) window.updateRewardsUI();
            
            return true;
        } catch (error) {
            console.error("Claim failed:", error);
            throw error;
        }
    }

    async forceResetStuckSession() {
        if (!this.address) return;
        const session = await this.getActiveSession();
        if (!session) return;

        try {
            const tx = await this.gameContract.expireSingleGame(session.id);
            await tx.wait();
            this.showNotification("Session reset successfully!", "success");
            return true;
        } catch (error) {
            console.error("Reset failed:", error);
            this.showNotification("Reset failed. Try again later.", "error");
            return false;
        }
    }

    showNotification(message, type = 'info') {
        if (window.ui && typeof window.ui.showNotification === 'function') {
            const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : 'ℹ️');
            window.ui.showNotification(message, icon, 3000);
        } else {
            alert(message);
        }
    }
}

window.web3Manager = new Web3Manager();
window.web3Manager.init();
