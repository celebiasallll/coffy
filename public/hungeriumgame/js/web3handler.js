class Web3Handler {
    constructor() {
        // BASE MAINNET KONTRAT ADRESİ
        this.tokenAddress = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";
        this.gameModuleAddress = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";
        this.tokenABI = [{ "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }];
        this.gameModuleABI = [
            { "inputs": [{ "internalType": "uint64", "name": "gameType", "type": "uint64" }], "name": "startGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
            { "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "uint256", "name": "payout", "type": "uint256" }, { "internalType": "uint256", "name": "deadline", "type": "uint256" }, { "internalType": "bytes", "name": "sig", "type": "bytes" }], "name": "claimSingleWin", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
            { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }, { "internalType": "uint256", "name": "cid", "type": "uint256" }], "name": "getUserCharacterBalance", "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }], "stateMutability": "view", "type": "function" },
            { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "getUserGameState", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
        ];
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

        // Create contract instance if Web3 is available
        if (this.web3) {
            try {
                this.tokenContract = new this.web3.eth.Contract(
                    this.tokenABI,
                    this.tokenAddress
                );
                this.gameContract = new this.web3.eth.Contract(
                    this.gameModuleABI,
                    this.gameModuleAddress
                );
                console.log("Token contract initialized");

                // Resolve initialization promise
                if (this._resolveInit) {
                    this._resolveInit();
                    console.log("Web3Handler initializationPromise resolved");
                }
            } catch (error) {
                console.error("Failed to initialize token contract:", error);
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
                this.accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                console.log("Accounts after request:", this.accounts);
            } catch (permError) {
                console.log("Permission request error:", permError);
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
            if (!this.gameContract && !this.gameContractEthers) {
                console.log("Web3 bağlantısı yok, kontrat startGame çağrılmayacak");
                return false;
            }

            // Check if user already has an active game
            try {
                const account = this.currentAccount || (window.ethereum ? (await window.ethereum.request({ method: "eth_accounts" }))[0] : null);
                if (account) {
                    let activeId;
                    if (this.gameContractEthers) {
                        const userGameState = await this.gameContractEthers.getUserGameState(account);
                        activeId = userGameState[0];
                    } else if (this.gameContract) {
                        const userGameState = await this.gameContract.methods.getUserGameState(account).call();
                        activeId = userGameState[0];
                    }

                    if (activeId && activeId.toString() !== "0") {
                        console.warn("Aktif oyun var, devam ediliyor:", activeId.toString());
                        this.activeGameId = activeId.toString();
                        return true;
                    }
                    this.activeGameId = null;
                    // Zincirde aktif oyun yok, stale ID temizle
                    this.activeGameId = null;
                }
            } catch (checkError) {
                console.warn("Aktif oyun kontrolü yapılamadı, devam ediliyor:", checkError);
            }

            if (this.gameContractEthers && window.ethereum) {
                console.log("Kontrat uzerinde startGame cagiriliyor (ethers.js)...");
                const tx = await this.gameContractEthers.startGame(gameType);
                console.log("Oyun başlatma işlemi gönderildi, onay bekleniyor...");
                const receipt = await tx.wait();
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
                } catch (pe) { console.warn("GameId parse hatasi:", pe); }
                console.log("Contracts startGame basariyla cagirildi:", tx.hash);
                return true;
            } else if (this.gameContract && this.currentAccount) {
                console.log("Kontrat uzerinde startGame cagiriliyor...");
                const tx = await this.gameContract.methods.startGame(gameType).send({
                    from: this.currentAccount
                });
                // activeGameId'yi event'den parse et
                const event = tx.events && tx.events.SingleStarted;
                if (event) {
                    this.activeGameId = event.returnValues.id.toString();
                    console.log("Yeni oyun ID kaydedildi (web3):", this.activeGameId);
                } else {
                    try {
                        const state = await this.gameContract.methods.getUserGameState(this.currentAccount).call();
                        if (state[0] && state[0].toString() !== "0") {
                            this.activeGameId = state[0].toString();
                            console.log("Yeni oyun ID zincirden alindi:", this.activeGameId);
                        }
                    } catch (se) { console.warn("GameId fallback sorgusu basarisiz:", se); }
                }
                console.log("Contracts startGame basariyla cagirildi:", tx.transactionHash);
                return true;
            }
            return false;
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


    async claimRewards() {
        console.log('[claimRewards] account:', this.currentAccount, '| tokens:', this.totalEarnedTokens, '| gameId:', this.activeGameId);
        if (!this.currentAccount) {
            this.showNotification("Wallet not connected", "warning");
            return false;
        }
        if (this.totalEarnedTokens <= 0) {
            this.showNotification("No rewards to claim (0 tokens)", "warning");
            return false;
        }

        this.showNotification("Requesting claim signature from backend...", "info");

        try {
            const claimAmount = Math.floor(this.totalEarnedTokens).toString();

            // Aktif gameId'yi zincirden al (yoksa cache'den kullan)
            let gameId = this.activeGameId || null;
            if (!gameId) {
                try {
                    const account = this.currentAccount;
                    if (this.gameContractEthers) {
                        const state = await this.gameContractEthers.getUserGameState(account);
                        if (state[0] && state[0].toString() !== "0") {
                            gameId = state[0].toString();
                            this.activeGameId = gameId;
                            console.log("Zincirden aktif gameId alindi:", gameId);
                        }
                    } else if (this.gameContract) {
                        const state = await this.gameContract.methods.getUserGameState(account).call();
                        if (state[0] && state[0].toString() !== "0") {
                            gameId = state[0].toString();
                            this.activeGameId = gameId;
                        }
                    }
                } catch (e) { console.warn("GameId zincirden alinamadi:", e); }
            }

            if (!gameId) {
                throw new Error("No active game session found. Please start a game first.");
            }

            console.log('[claimRewards] Backend isteği - gameId:', gameId, 'amount:', claimAmount);
            const response = await fetch('/api/game-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: this.currentAccount,
                    amount: claimAmount,
                    gameId: gameId
                })
            });

            const resp = await response.json();
            const data = resp.data || resp;
            console.log('[claimRewards] Backend yanıtı:', JSON.stringify(resp));

            if (!response.ok) {
                throw new Error(resp.error || 'Failed to get claim signature from backend');
            }
            console.log('[claimRewards] İmza alındı - id:', data.id, 'payout:', data.payout, 'deadline:', data.deadline);

            this.showNotification("Please approve the claim transaction in your wallet...", "info");

            // ethers.js veya web3 ile claimSingleWin çağır
            let tx;
            if (this.gameContractEthers) {
                tx = await this.gameContractEthers.claimSingleWin(
                    data.id, data.payout, data.deadline, data.signature
                );
                await tx.wait();
                console.log("Claim successful:", tx.hash);
            } else {
                tx = await this.gameContract.methods.claimSingleWin(
                    data.id, data.payout, data.deadline, data.signature
                ).send({ from: this.currentAccount, gas: 400000 });
                console.log("Claim successful:", tx.transactionHash);
            }
            this.activeGameId = null;
            // dummy tx ref for legacy log below
            tx = tx || {};

            console.log("Claim successful:", tx.transactionHash);

            this.showNotification(`Successfully claimed ${this.totalEarnedTokens} COFFY!`, "success", 8000);

            // Reset tokens after successful claim
            this.setGameTokens(0);
            this.saveEarnedTokens(0);

            // Fetch updated balance
            await this.fetchTokenBalance();
            return true;

        } catch (error) {
            console.error("Claim reward failed:", error);
            // Log full error detail for debugging
            if (error.data) console.error("Contract revert data:", error.data);
            if (error.receipt) console.error("TX receipt:", JSON.stringify(error.receipt));
            
            let errMsg = error.message || String(error);
            // Extract revert reason from various error formats
            if (error.reason) {
                errMsg = error.reason;
            } else if (error.data && error.data.message) {
                errMsg = error.data.message;
            } else if (typeof error.data === 'string' && error.data.startsWith('0x')) {
                // Try to decode custom error selector
                const selector = error.data.slice(0, 10);
                const knownErrors = {
                    '0x6f6571e0': 'InvalidGame - No active game session on contract. Please start a new game.',
                    '0x01336cea': 'InvalidLimits - Game duration too short (min 2 min) or timeout exceeded.',
                    '0x8baa579f': 'InvalidSignature - Signature invalid or expired.',
                    '0x2c5211c6': 'InvalidAmount - Payout amount issue or daily limit reached.',
                };
                errMsg = knownErrors[selector] || ('Contract error: ' + selector);
            } else if (errMsg.toLowerCase().includes('invalidgame')) {
                errMsg = 'No active game on contract. Start a new game first.';
            } else if (errMsg.toLowerCase().includes('invalidlimits')) {
                errMsg = 'Game duration too short (min 2 min) or session expired.';
            } else if (errMsg.toLowerCase().includes('invalidsignature')) {
                errMsg = 'Invalid signature. Please try again.';
            } else if (errMsg.toLowerCase().includes('duration not met')) {
                errMsg = 'Game duration too short. (Minimum 2 minutes required).';
            } else if (error.code === 4001) {
                errMsg = 'Transaction rejected by user.';
            }
            this.showNotification("Claim failed: " + errMsg, "error", 8000);
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
        this.totalEarnedTokens = parseFloat(amount) || 0;
        this.saveEarnedTokens(this.totalEarnedTokens);
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
            this.showNotification("Migration yapılamaz", "error");
            return false;
        }

        try {
            this.showNotification("Migration işlemi başlatılıyor...", "info");

            const result = await this.tokenContract.methods.migrateTokens().send({
                from: this.currentAccount
            });

            this.showNotification(`${this.migrationInfo.oldBalance} COFFY başarıyla migrate edildi!`, "success");

            // Migration durumunu güncelle
            await this.checkMigrationStatus();
            await this.fetchTokenBalance();

            return true;

        } catch (error) {
            console.error("Migration hatası:", error);
            this.showNotification("Migration işlemi başarısız: " + error.message, "error");
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
                    migrationInfo.textContent = `Eski kontratınızda ${this.migrationInfo.oldBalance} COFFY var. Yeni kontraata migrate edebilirsiniz.`;
                }
            } else {
                migrationSection.style.display = 'none';
            }
        }
    }
}
