class Web3Handler {
    constructor() {
        // BASE MAINNET KONTRAT ADRESİ
        // YENİ ABI - Human Readable formatı
        this.tokenAddress = '0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41';
        this.gameModuleAddress = '0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea';

        this.tokenABI = [
            "function balanceOf(address account) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ];

        this.gameModuleABI = [
            "function startGame(uint64 gameType) external",
            "function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig) external",
            "event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType)",
            "event SingleClaimed(uint256 indexed id, address indexed player, uint256 payout)"
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

        // Migration durumu
        this.migrationInfo = {
            enabled: false,
            deadline: 0,
            oldBalance: 0,
            canMigrate: false
        };

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

        // Create contract instances if Web3 is available
        if (this.web3) {
            try {
                this.tokenContract = new this.web3.eth.Contract(
                    this.tokenABI,
                    this.tokenAddress
                );
                this.gameModuleContract = new this.web3.eth.Contract(
                    this.gameModuleABI,
                    this.gameModuleAddress
                );
                console.log("Contracts initialized");
            } catch (error) {
                console.error("Failed to initialize contracts:", error);
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

            if (chainId !== 8453) { // Base Mainnet ID
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
        return this.balance;
    }

    async claimRewards() {
        try {
            console.log("Attempting to claim rewards via Backend Signature...");

            if (!this.currentAccount) {
                await this.connectWallet();
                if (!this.currentAccount) {
                    this.showNotification("Please connect your wallet first", "warning");
                    return false;
                }
            }

            const totalEarned = localStorage.getItem('coffyTokens') || "0";
            const earnedTokens = parseInt(totalEarned);

            if (earnedTokens <= 0) {
                this.showNotification("No tokens to claim", "warning");
                return false;
            }

            this.showNotification("Fetching signature from backend...", "info");

            // Backend'den imza al (EIP-712)
            const response = await fetch('/api/game-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: this.currentAccount,
                    amount: earnedTokens,
                    gameType: 'adventure'
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Backend signature failed");
            }

            const resJson = await response.json();
            if (!resJson.success) throw new Error(resJson.error || "Backend signature failed");

            const { id, payout, deadline, signature } = resJson.data;

            this.showNotification("Sending claim transaction...", "info");

            // contract call: claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes sig)
            const result = await this.gameModuleContract.methods.claimSingleWin(
                id,
                payout,
                deadline,
                signature
            ).send({ from: this.currentAccount });

            if (result) {
                localStorage.setItem('coffyTokens', "0");
                this.totalEarnedTokens = 0;
                this.showNotification(`Successfully claimed ${earnedTokens} COFFY!`, "success");
                await this.fetchTokenBalance();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error claiming rewards:", error);
            this.showNotification(this.getErrorMessage(error), "error");
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

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = type;
            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        } else {
            console.log(`Notification (${type}): ${message}`);
        }
    }
}
