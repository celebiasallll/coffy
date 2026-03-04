// import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js"; // KALDIRILDI

// COFFY_ABI'yi global scope'a taşı
const COFFY_TOKEN_ADDRESS = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";
const GAME_MODULE_ADDRESS = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";
const COFFY_TOKEN_ABI = [{ "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }];
const GAME_MODULE_ABI = [
    "function startGame(uint64 gameType) external",
    "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external",
    "function getUserCharacterBalance(address user, uint256 cid) external view returns (uint128)",
    "function getUserGameState(address user) external view returns (uint256, uint256, uint256)"
];

class Web3Handler {
    constructor() {
        // YENİ KONTRAT ADRESİ
        this.tokenAddress = COFFY_TOKEN_ADDRESS;
        this.gameModuleAddress = GAME_MODULE_ADDRESS;
        this.tokenABI = COFFY_TOKEN_ABI;
        this.gameModuleABI = GAME_MODULE_ABI;
        // COFFY_ABI artık globalde, burada tekrar tanımlamaya gerek yok

        // Web3 instance
        this.web3 = null;
        this.tokenContract = null;
        this.accounts = [];
        this.currentAccount = null;
        this.balance = "0.00";

        // Connection status
        this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'

        // Game token storage
        this.gameTokens = 0;
        this.totalEarnedTokens = this.loadEarnedTokens();

        // Maximum number of claims allowed per day (IP based)
        this.maxClaimsPerDay = 2;

        // Migration durumu
        this.migrationInfo = {
            enabled: false,
            deadline: 0,
            oldBalance: 0,
            canMigrate: false
        };

        // Sync mechanism
        this._resolveInit = null;
        this.initializationPromise = new Promise(resolve => {
            this._resolveInit = resolve;
        });

        // Initialize if Web3 is available
        this.initialize();
    }

    initialize() {
        // Check if Web3 is already available
        if (window.ethereum) {
            this.web3 = new Web3(window.ethereum);
            console.log("Web3 detected in browser");

            // Listen for account changes
            window.ethereum.on('accountsChanged', async (accounts) => {
                console.log("Accounts changed:", accounts);
                if (accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    await this.fetchTokenBalance();
                    this.notifyBalanceUpdate();
                } else {
                    this.currentAccount = null;
                    this.balance = "0.00";
                    this.connectionStatus = 'disconnected';
                    this.notifyBalanceUpdate();
                }
            });

            window.ethereum.on('chainChanged', async (chainId) => {
                console.log("Chain changed:", chainId);
                if (this.currentAccount) {
                    await this.fetchTokenBalance();
                    this.notifyBalanceUpdate();
                }
            });

            // Check if already connected
            window.ethereum.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts.length > 0) {
                        this.currentAccount = accounts[0];
                        this.connectionStatus = 'connected';
                        this.fetchTokenBalance();
                    }
                })
                .catch(error => console.error("Error checking accounts:", error));
        } else if (window.web3) {
            this.web3 = new Web3(window.web3.currentProvider);
            console.log("Legacy Web3 detected");
        } else {
            console.log("No Web3 detected. Please install MetaMask or another Web3 provider.");
        }
        // YENİ: ethers.js ile contract instance
        if (window.ethereum) {
            if (!window.ethers) {
                setTimeout(() => this.initialize(), 200);
                return;
            }
            this.ethersProvider = new window.ethers.providers.Web3Provider(window.ethereum);
            this.ethersSigner = this.ethersProvider.getSigner();
            this.tokenContractEthers = new window.ethers.Contract(this.tokenAddress, COFFY_TOKEN_ABI, this.ethersSigner);
            this.gameContractEthers = new window.ethers.Contract(this.gameModuleAddress, GAME_MODULE_ABI, this.ethersSigner);
            console.log("Token contract (ethers.js) initialized");

            // Resolve initialization promise
            if (this._resolveInit) {
                this._resolveInit();
                console.log("Web3Handler initializationPromise resolved");
            }
        }
    }

    async connectWallet() {
        if (!this.web3) {
            this.showNotification("Please install MetaMask to connect your wallet", "error");
            return false;
        }

        this.connectionStatus = 'connecting';
        this.showNotification("Connecting wallet... Please check your browser extension", "info");

        try {
            // Clear any previous accounts to ensure we get a fresh approval dialog
            this.currentAccount = null;
            this.accounts = [];

            // Give the user time to see the notification before the wallet popup appears
            await new Promise(resolve => setTimeout(resolve, 500));

            // Force wallet popup by using a specific approach - first check if wallet is locked
            // This improves user experience by ensuring they see the approval dialog
            const isLocked = !(await window.ethereum._metamask?.isUnlocked?.());
            console.log("Wallet locked status:", isLocked);

            // Request accounts - This should ALWAYS trigger the wallet approval dialog now
            console.log("Requesting wallet approval...");
            try {
                // Clear any cached permissions first
                if (window.ethereum.request?.({ method: 'wallet_requestPermissions' })) {
                    await window.ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }]
                    });
                }

                // Now request accounts (this should always show the popup)
                this.accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                    params: [{ eth_accounts: {} }]
                });

                console.log("Accounts after request:", this.accounts);
            } catch (permError) {
                console.log("Permission request error:", permError);
                // Try alternative approach if the above fails
                this.accounts = await window.ethereum.enable();
            }

            // Check if user approved and we have accounts
            if (!this.accounts || this.accounts.length === 0) {
                this.connectionStatus = 'error';
                this.showNotification("No accounts found or access denied", "error");
                return false;
            }

            this.currentAccount = this.accounts[0];
            console.log("Connected account:", this.currentAccount);

            // Check if we're on Base network
            const chainId = await this.web3.eth.getChainId();

            if (chainId !== 8453) { // Base Mainnet
                this.showNotification("Your wallet needs to connect to Base Mainnet", "info");

                // Prompt to switch to Base - this will show another wallet approval
                try {
                    this.showNotification("Please approve network switch in your wallet", "info");
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x2105' }], // Base Mainnet
                    });
                    this.showNotification("Successfully switched to Base network", "success");
                } catch (switchError) {
                    // If Base isn't added yet, prompt to add it
                    if (switchError.code === 4902) {
                        try {
                            this.showNotification("Please approve adding Base network to your wallet", "info");
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x2105',
                                    chainName: 'Base Mainnet',
                                    nativeCurrency: {
                                        name: 'ETH',
                                        symbol: 'ETH',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://mainnet.base.org'],
                                    blockExplorerUrls: ['https://basescan.org']
                                }],
                            });
                            this.showNotification("Base network added successfully", "success");
                        } catch (addError) {
                            this.connectionStatus = 'error';
                            this.showNotification("Failed to add Base network: " + this.getErrorMessage(addError), "error");
                            console.error("Failed to add Base network:", addError);
                            return false;
                        }
                    } else {
                        this.connectionStatus = 'error';
                        this.showNotification("Failed to switch to Base network: " + this.getErrorMessage(switchError), "error");
                        console.error("Failed to switch to Base network:", switchError);
                        return false;
                    }
                }
            }

            // Fetch token balance
            await this.fetchTokenBalance();

            this.connectionStatus = 'connected';
            this.showNotification("Wallet connected successfully!", "success");

            // Notify any listeners that the balance has been updated
            this.notifyBalanceUpdate();

            return true;
        } catch (error) {
            console.error("Error connecting wallet:", error);
            this.connectionStatus = 'error';

            if (error.code === 4001) {
                // User rejected the connection
                this.showNotification("Connection rejected by user", "error");
            } else {
                this.showNotification("Failed to connect wallet: " + this.getErrorMessage(error), "error");
            }

            return false;
        }
    }

    // Helper method to get friendly error messages
    getErrorMessage(error) {
        if (error.message) {
            // Trim the message if it's too long
            let message = error.message;
            if (message.length > 50) {
                message = message.substring(0, 47) + '...';
            }
            return message;
        }
        return 'Unknown error';
    }

    async fetchTokenBalance() {
        if (!this.currentAccount || !this.tokenContract) {
            this.balance = "0.00";
            return "0.00";
        }

        try {
            const balance = await this.tokenContract.methods.balanceOf(this.currentAccount).call();
            const decimals = await this.tokenContract.methods.decimals().call();

            // Convert from wei to token amount - handle BigInt properly
            const balanceNumber = Number(balance) / Math.pow(10, Number(decimals));
            const formattedBalance = balanceNumber.toFixed(2);
            this.balance = formattedBalance;
            return formattedBalance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            this.balance = "Error";
            return "Error";
        }
    }

    notifyBalanceUpdate() {
        // Dispatch a custom event that can be listened to
        const event = new CustomEvent('wallet-update', {
            detail: {
                connected: this.connectionStatus === 'connected',
                account: this.currentAccount,
                balance: this.balance
            }
        });
        document.dispatchEvent(event);
    }

    getDisplayBalance() {
        return parseFloat(this.balance).toFixed(2);
    }

    /**
     * Oyun başlatma fonksiyonu - Kontrat üzerinde lastGameStart'ı set eder
     */
    async startGameOnContract() {
        try {
            // Wait for initialization if it's in progress
            if (this.initializationPromise) {
                console.log("startGameOnContract: Waiting for Web3Handler initialization...");
                await this.initializationPromise;
            }

            const gameType = 1; // 1 = Default GameType
            if (!this.gameContractEthers || !window.ethereum) {
                console.log("Web3 bağlantısı yok, kontrat startGame çağrılmayacak");
                return false;
            }

            // Check if user already has an active game
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts && accounts.length > 0) {
                    const userGameState = await this.gameContractEthers.getUserGameState(accounts[0]);
                    const activeId = userGameState[0];
                    if (activeId && activeId.toString() !== "0") {
                        console.warn("Aktif bir oyun oturumu zaten var, devam ediliyor:", activeId.toString());
                        // Aktif oyun varsa yeni oyun başlatma, mevcut oturumla devam et
                        this.activeGameId = activeId.toString();
                        this.showNotification("Resuming your existing game session...", 'info', 3000);
                        return true; // Oyun zaten aktif, devam et
                    }
                }
            } catch (checkError) {
                console.warn("Aktif oyun kontrolü yapılamadı, devam ediliyor:", checkError);
            }

            console.log("Kontrat uzerinde startGame cagiriliyor (ethers.js)...");
            const tx = await this.gameContractEthers.startGame(gameType);
            console.log("Oyun başlatma işlemi gönderildi, onay bekleniyor...");
            const receipt = await tx.wait();

            // SingleStarted event'inden gameId'yi al ve sakla
            try {
                const iface = new window.ethers.utils.Interface([
                    "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)"
                ]);
                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed.name === "SingleStarted") {
                            this.activeGameId = parsed.args.id.toString();
                            console.log("Yeni oyun ID kaydedildi:", this.activeGameId);
                            break;
                        }
                    } catch (_) {}
                }
            } catch (parseError) {
                console.warn("GameId parse edilemedi:", parseError);
            }

            console.log("Contracts startGame basariyla cagirildi:", tx.hash);
            return true;
        } catch (error) {
            console.error("Kontrat startGame hatasi:", error);
            if (error.message && error.message.includes("InvalidGame")) {
                this.showNotification("Active game session already exists.", 'warning');
                return true;
            }
            this.showNotification("Blockchain error: " + (error.reason || error.message), 'error');
            return false;
        }
    }
    async claimRewards(amount) {
        if (!this.currentAccount || !this.gameContractEthers) {
            this.showNotification("Please connect your wallet first.", "error");
            return false;
        }

        try {
            this.showNotification("Requesting backend signature for claim...", "info");

            // Aktif gameId'yi zincirden al (yoksa cache'den kullan)
            let gameId = this.activeGameId || null;
            if (!gameId) {
                try {
                    const accounts = await window.ethereum.request({ method: "eth_accounts" });
                    if (accounts && accounts.length > 0) {
                        const userGameState = await this.gameContractEthers.getUserGameState(accounts[0]);
                        const activeId = userGameState[0];
                        if (activeId && activeId.toString() !== "0") {
                            gameId = activeId.toString();
                            this.activeGameId = gameId;
                            console.log("Zincirden aktif gameId alindi:", gameId);
                        }
                    }
                } catch (e) {
                    console.warn("GameId zincirden alinamadi:", e);
                }
            }

            if (!gameId) {
                throw new Error("No active game session found. Please start a game first.");
            }

            // 1. Backend'den EIP-712 imzasini al
            const response = await fetch("/api/game-claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userAddress: this.currentAccount,
                    amount: amount.toString(),
                    gameId: gameId
                })
            });

            const resp = await response.json();
            const data = resp.data || resp;

            if (!response.ok) {
                throw new Error(resp.error || "Failed to get claim signature from backend");
            }

            this.showNotification("Sending claim transaction...", "info");

            // 2. Kontrat uzerinde claimSingleWin cagir (backend'den gelen id ile)
            const tx = await this.gameContractEthers.claimSingleWin(
                data.id,
                data.payout,
                data.deadline,
                data.signature
            );

            this.showNotification("Waiting for confirmation...", "info");
            await tx.wait();

            this.showNotification("Rewards successfully claimed!", "success");

            // Aktif oyun bitti, temizle
            this.activeGameId = null;
            this.setGameTokens(0);
            this.saveEarnedTokens(0);
            return true;
        } catch (error) {
            console.error("Claim error:", error);
            this.showNotification(error.message || "An error occurred during claim", "error", 8000);
            return false;
        }
    }

    // IP rate limiting methods
    checkClaimRateLimit() {
        try {
            // Get current timestamp
            const currentTime = Date.now();

            // Get stored claim data from localStorage
            const claimData = JSON.parse(localStorage.getItem('hungeriumClaimData') || '{"claims":[]}');

            // Filter claims from today (last 24 hours)
            const oneDayAgo = currentTime - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);

            if (todayClaims.length >= this.maxClaimsPerDay) {
                // Too many claims already
                const oldestClaim = Math.max(...todayClaims);
                const nextClaimTime = oldestClaim + (24 * 60 * 60 * 1000);
                const remainingTime = nextClaimTime - currentTime;

                const hoursRemaining = Math.floor(remainingTime / 3600000);
                const minutesRemaining = Math.floor((remainingTime % 3600000) / 60000);

                return {
                    canClaim: false,
                    message: `Daily limit reached (${this.maxClaimsPerDay}/day). You can claim again in ${hoursRemaining}h ${minutesRemaining}m.`,
                    timeRemaining: remainingTime
                };
            }

            // Can claim
            return {
                canClaim: true,
                message: "You can claim your rewards now."
            };
        } catch (error) {
            console.error("Error checking claim rate limit:", error);

            // In case of error, return true to avoid blocking legitimate claims
            return {
                canClaim: true,
                message: "Error checking claim status. Allowing claim."
            };
        }
    }

    recordClaim() {
        try {
            // Get current data
            const claimData = JSON.parse(localStorage.getItem('hungeriumClaimData') || '{"claims":[]}');

            // Add current timestamp
            claimData.claims.push(Date.now());

            // Limit array size to avoid memory issues (keep last 20 claims)
            if (claimData.claims.length > 20) {
                claimData.claims = claimData.claims.slice(-20);
            }

            // Save back to localStorage
            localStorage.setItem('hungeriumClaimData', JSON.stringify(claimData));

            return true;
        } catch (error) {
            console.error("Error recording claim:", error);
            return false;
        }
    }

    getClaimCountToday() {
        try {
            const claimData = JSON.parse(localStorage.getItem('hungeriumClaimData') || '{"claims":[]}');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);
            return todayClaims.length;
        } catch (error) {
            console.error("Error getting claim count:", error);
            return 0;
        }
    }

    getNextClaimTime() {
        try {
            const claimData = JSON.parse(localStorage.getItem('hungeriumClaimData') || '{"claims":[]}');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const todayClaims = claimData.claims.filter(claim => claim > oneDayAgo);

            if (todayClaims.length >= this.maxClaimsPerDay && todayClaims.length > 0) {
                // Sort claims by timestamp
                todayClaims.sort((a, b) => a - b);
                // Get oldest claim and add 24 hours
                return todayClaims[0] + (24 * 60 * 60 * 1000);
            }

            return Date.now(); // Can claim now
        } catch (error) {
            console.error("Error getting next claim time:", error);
            return Date.now(); // Default to now on error
        }
    }

    clearClaimData() {
        try {
            localStorage.removeItem('hungeriumClaimData');
            return true;
        } catch (error) {
            console.error("Error clearing claim data:", error);
            return false;
        }
    }

    // Add tokens earned during gameplay
    addGameTokens(amount) {
        // Add tokens earned through gameplay
        if (typeof amount === 'number' && !isNaN(amount)) {
            this.totalEarnedTokens += amount;
            this.triggerWalletUpdate();
        }
    }

    // Set game tokens directly
    setGameTokens(amount) {
        // Set total directly to avoid accumulation errors
        // Make sure amount is treated as a number
        this.totalEarnedTokens = parseFloat(amount) || 0;

        // Trigger a wallet update event
        this.triggerWalletUpdate();
    }

    // Method to trigger wallet update events
    triggerWalletUpdate() {
        // Dispatch an event that wallet status has updated
        const walletEvent = new CustomEvent('wallet-update', {
            detail: {
                connected: this.currentAccount !== null,
                balance: this.getDisplayBalance(),
                earned: this.totalEarnedTokens
            }
        });

        document.dispatchEvent(walletEvent);
    }

    // Save earned tokens to localStorage
    saveEarnedTokens(amount) {
        try {
            localStorage.setItem('coffyEarnedTokens', amount.toString());
        } catch (error) {
            console.error("Error saving earned tokens:", error);
        }
    }

    // Load earned tokens from localStorage
    loadEarnedTokens() {
        try {
            const saved = localStorage.getItem('coffyEarnedTokens');
            return saved ? parseFloat(saved) : 0;
        } catch (error) {
            console.error("Error loading earned tokens:", error);
            return 0;
        }
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

    /**
     * Migration durumunu kontrol et
     */
    async checkMigrationStatus() {
        if (!this.tokenContract || !this.currentAccount) return;

        try {
            // Migration bilgilerini al
            const migrationInfo = await this.tokenContract.methods.getMigrationInfo().call();
            this.migrationInfo.enabled = migrationInfo[1];
            this.migrationInfo.deadline = migrationInfo[2];

            // Kullanıcının migration yapıp yapamayacağını kontrol et
            const canMigrate = await this.tokenContract.methods.canUserMigrate(this.currentAccount).call();
            this.migrationInfo.canMigrate = canMigrate.canMigrate;
            this.migrationInfo.oldBalance = this.web3.utils.fromWei(canMigrate.oldBalance, 'ether');

            console.log("Migration durumu:", this.migrationInfo);

            // Migration UI'ını güncelle
            this.updateMigrationUI();

        } catch (error) {
            console.error("Migration durumu kontrol hatası:", error);
        }
    }

    /**
     * Migration işlemini gerçekleştir
     */
    async migrateTokens() {
        if (!this.tokenContract || !this.migrationInfo.canMigrate) {
            this.showNotification("Migration cannot be performed", "error");
            return false;
        }

        try {
            this.showNotification("Migration process started...", "info");

            const result = await this.tokenContract.methods.migrateTokens().send({
                from: this.currentAccount
            });

            this.showNotification(`${this.migrationInfo.oldBalance} COFFY successfully migrated!`, "success");

            // Migration durumunu güncelle
            await this.checkMigrationStatus();
            await this.fetchTokenBalance();

            return true;

        } catch (error) {
            console.error("Migration failed:", error);
            this.showNotification("Migration failed: " + error.message, "error");
            return false;
        }
    }

    /**
     * Migration UI'ını güncelle
     */
    updateMigrationUI() {
        // Migration düğmesini göster/gizle
        const migrationSection = document.getElementById('migration-section');

        if (migrationSection) {
            if (this.migrationInfo.canMigrate && this.migrationInfo.oldBalance > 0) {
                migrationSection.style.display = 'block';

                const migrationInfo = document.getElementById('migration-info');
                if (migrationInfo) {
                    migrationInfo.textContent = `You have ${this.migrationInfo.oldBalance} COFFY in your old contract. You can migrate to the new contract.`;
                }
            } else {
                migrationSection.style.display = 'none';
            }
        }
    }
}

// Web3Handler'ı globalde erişilebilir yap
window.Web3Handler = Web3Handler;

// Claim Rewards butonuna tıklama fonksiyonu
function onClaimRewardsClick() {
    if (window.web3Handler && typeof window.web3Handler.claimRewards === 'function') {
        window.web3Handler.claimRewards().catch(error => {
            alert(error?.reason || error?.data?.message || error?.message || 'Claim failed');
            console.error('Claim error:', error);
        });
    } else {
        alert('Web3 connection not found!');
    }
}
// Buton bağlama
const claimButton = document.getElementById('claim-total-reward');
if (claimButton) {
    claimButton.onclick = onClaimRewardsClick;
}
