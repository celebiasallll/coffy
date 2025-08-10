// SPDX-License-Identifier: MIT
// Ağ: BSC (Binance Smart Chain)
// Token Name: Coffy Coin
// Token Symbol: COFFY
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// Module Interfaces - Ready for external development
interface IDAOModule {
    function proposeCharacterPriceChange(uint256 characterId, uint256 newPrice) external;
    function vote(uint256 proposalId, bool support) external;
    function executeProposal(uint256 proposalId) external;
    function getVotingPower(address user) external view returns (uint256);
}

interface INFTModule {
    function migrateCharacterToNFT(address user, uint256 characterId, uint256 amount) external returns (uint256[] memory nftIds);
    function getNFTMultiplier(address user, uint256 nftId) external view returns (uint256);
    function isNFTActive() external view returns (bool);
}

interface ISocialModule {
    function processStepReward(address user, uint256 steps, uint256 characterMultiplier) external;
    function processSnapReward(address user, uint256 photos, uint256 characterMultiplier) external;
    function getDailyLimit(address user) external view returns (uint256);
}

/**
 * @title CoffyCoin V2 - Modular Core
 * @dev Lightweight core with module support for DAO, NFT, and Social features
 */
contract CoffyCoin is ERC20, AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODULE_ROLE = keccak256("MODULE_ROLE");

    // Token Distribution - 15B Total
    uint256 public constant TOTAL_SUPPLY = 15_000_000_000 * 1e18;
    uint256 public constant TREASURY_ALLOCATION = (TOTAL_SUPPLY * 25) / 100;
    uint256 public constant LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 20) / 100;
    uint256 public constant COMMUNITY_ALLOCATION = (TOTAL_SUPPLY * 35) / 100;
    uint256 public constant TEAM_ALLOCATION = (TOTAL_SUPPLY * 10) / 100;
    uint256 public constant MARKETING_ALLOCATION = (TOTAL_SUPPLY * 10) / 100;

    // Core Constants
    uint256 public constant FIXED_CHARACTERS_COUNT = 5;
    uint256 public constant MAX_WEEKLY_CLAIM = 35000 * 1e18; // 7x günlük limit
    uint256 public constant MIN_CLAIM_BALANCE = 100000 * 1e18;
    uint256 public constant MIN_BALANCE_FOR_ACCUMULATION = 10000 * 1e18;
    uint256 public constant PENDING_REWARD_EXPIRY = 60 days;
    uint256 public constant MIN_WALLET_AGE = 3 days;
    uint256 public constant MIN_ACTIVITY_DURATION = 1 minutes;
    // Enflasyon oranı: 6 ayda bir %1 (yılda %2)
    uint256 public constant SEMIANNUAL_INFLATION_RATE = 100; // 1% per 6 months, 2% annual

    // Character System - Enhanced with Metadata and Max Supply
    // Character struct'ını storage packing ile optimize ediyorum
    struct Character {
        uint128 price;
        uint128 totalSupply;
        uint128 maxSupply;
        uint16 multiplier;
        uint16 claimMultiplier;
        bool isActive;
        // string metadataURI ayrı tutulacak
    }
    
    mapping(uint256 => Character) public characters;
    // characterNames ve metadataURI ayrı mapping olarak tutulacak
    mapping(uint256 => string) public characterNames;
    mapping(uint256 => string) public characterMetadataURIs;
    // Character oluştururken metadataURI'yi ayrı mapping'e kaydediyorum
    function _createCharacter(
        string memory _name, 
        uint256 _price, 
        uint16 _multiplier, 
        uint16 _claimMultiplier, 
        string memory _metadataURI
    ) internal {
        characters[nextCharacterId] = Character({
            price: uint128(_price),
            totalSupply: 0,
            maxSupply: type(uint128).max,
            multiplier: _multiplier,
            claimMultiplier: _claimMultiplier,
            isActive: true
        });
        characterNames[nextCharacterId] = _name;
        characterMetadataURIs[nextCharacterId] = _metadataURI;
        nextCharacterId++;
    }

    mapping(address => mapping(uint256 => uint128)) public userCharacters;
    uint256 public nextCharacterId = 1;

    // Staking System - Enhanced with minimum stake requirement and character multiplier
    struct Stake {
        uint128 amount;
        uint64 startTime;
        uint64 lastClaim;
    }
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;
    uint256 public constant ANNUAL_RATE = 500; // 5%
    uint256 public constant EARLY_UNSTAKE_PENALTY = 500; // 5% penalty

    // Security & Trading
    mapping(address => bool) public isDEXPair;
    uint16 public constant DEX_TAX = 200; // 2%

    // Core Addresses - Const wallets that can trigger inflation
    address public treasury;
    address public liquidity;
    address public community;
    address public team;
    address public marketing;
    
    // Const wallets mapping for inflation trigger
    mapping(address => bool) public isConstWallet;

    // Module System - Enhanced with deauthorization timelock
    mapping(address => bool) public authorizedModules;
    
    // Module addresses
    address public daoModule;
    address public nftModule;
    address public socialModule;
    
    // Weekly tracking for combined limits
    mapping(address => uint256) public weeklyRewards;
    mapping(address => uint256) public lastRewardWeek;

    // Game rewards tracking
    mapping(address => uint256) public lastClaimWeek;
    mapping(address => uint256) public claimedThisWeek;

    // Pending Rewards System
    mapping(address => uint256) public pendingGameRewards;
    mapping(address => uint256) public pendingStepRewards;
    mapping(address => uint256) public pendingSnapRewards;
    mapping(address => uint256) public lastPendingUpdate;

    // Sybil Protection
    mapping(address => uint256) public walletCreatedAt;
    mapping(address => uint256) public lastGameStart;
    mapping(address => uint256) public lastStepStart;

    // Game Statistics - Simplified
    struct GameStats {
        uint256 totalGamesPlayed;
        uint256 totalRewardsClaimed;
        uint256 lastGameTimestamp;
    }
    mapping(address => GameStats) public gameStats;

    // Inflation System
    uint256 public lastInflationTime;

    // Mobile App Integration
    address public mobileAppBackend;
    mapping(address => string) public userProfiles;
    mapping(string => address) public profileToWallet;

    // DAO MEMBERSHIP SYSTEM
    uint256 public constant LEGENDARY_CHARACTER_ID = 5; // Legendary Dragon
    uint256 public constant DAO_MEMBERSHIP_THRESHOLD = 10_000_000 * 1e18; // 10M COFFY
    mapping(address => bool) public isDAOMember;

    // KYC ve Blacklist sistemleri
    // mapping(address => bool) public isKYCVerified; // kaldırıldı
    // mapping(address => bool) public isBlacklisted; // kaldırıldı
    // modifier onlyKYCVerified() { ... } // kaldırıldı
    // modifier notBlacklisted() { ... } // kaldırıldı
    // function setKYCStatus(address user, bool status) external onlyRole(ADMIN_ROLE) { ... } // kaldırıldı
    // function setBlacklistStatus(address user, bool status) external onlyRole(ADMIN_ROLE) { ... } // kaldırıldı
    // Tüm fonksiyonlardan onlyKYCVerified ve notBlacklisted modifier'larını kaldırıyorum

    // Events
    event CharacterPurchased(address indexed buyer, uint256 indexed characterId, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event GameRewardsClaimed(address indexed user, uint256 amount);
    event ModuleSet(string moduleType, address module);
    event ModuleEnabled(string moduleType);
    event TradingEnabled();
    event PendingRewardAdded(address indexed user, uint256 amount, string rewardType);
    event PendingRewardsClaimed(address indexed user, uint256 totalAmount);
    event InflationMinted(uint256 amount, uint256 time);
    event UserProfileLinked(address indexed wallet, string profileId);
    event GlobalModuleMint(address indexed module, address indexed to, uint256 amount, uint256 totalMintedThisYear);
    event GlobalModuleBurn(address indexed module, address indexed from, uint256 amount, uint256 totalBurnedThisYear);
    event EarlyUnstakePenalty(address indexed user, uint256 amount, uint256 penalty);
    event CrossChainModuleSet(address indexed module);
    event CrossChainEnabled(bool enabled);
    event BridgeModuleSet(address indexed module);

    constructor(
        address _treasury,
        address _liquidity,
        address _community,
        address _team,
        address _marketing
    ) ERC20("Coffy Coin", "COFFY") {
        require(_treasury != address(0) && _liquidity != address(0) && 
                _community != address(0) && _team != address(0) && 
                _marketing != address(0), "Invalid addresses");
        
        treasury = _treasury;
        liquidity = _liquidity;
        community = _community;
        team = _team;
        marketing = _marketing;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        // Multi-sig admin atama kaldırıldı
        // _grantRole(DEFAULT_ADMIN_ROLE, multisig);
        // _grantRole(ADMIN_ROLE, multisig);
        // _grantRole(TIMELOCK_ADMIN_ROLE, multisig);

        // Mint initial supply
        _mint(_treasury, TREASURY_ALLOCATION);
        _mint(_liquidity, LIQUIDITY_ALLOCATION);
        _mint(_community, COMMUNITY_ALLOCATION);
        _mint(_team, TEAM_ALLOCATION);
        _mint(_marketing, MARKETING_ALLOCATION);

        // Set const wallets for inflation trigger
        isConstWallet[_treasury] = true;
        isConstWallet[_liquidity] = true;
        isConstWallet[_community] = true;
        isConstWallet[_team] = true;
        isConstWallet[_marketing] = true;

        // Create 5 fixed-price characters with claim multipliers and unlimited supply
        _createCharacter("Genesis", 1000000 * 1e18, 200, 200, "ipfs://genesis-metadata"); // 2x
        _createCharacter("Mocha Knight", 3000000 * 1e18, 300, 300, "ipfs://mocha-metadata"); // 3x
        _createCharacter("Arabica Archmage", 5000000 * 1e18, 500, 500, "ipfs://arabica-metadata"); // 5x
        _createCharacter("Robusta Shadowblade", 8000000 * 1e18, 700, 700, "ipfs://robusta-metadata"); // 7x
        _createCharacter("Legendary Dragon", 10000000 * 1e18, 1000, 1000, "ipfs://dragon-metadata"); // 10x

        // Initialize inflation timer
        lastInflationTime = block.timestamp;
        
        // Initialize module tracking
        // moduleTrackingYear = block.timestamp / 365 days; // Removed as per new_code
        
        // Initialize current chain ID
        // currentChainId = block.chainid; // Removed as per new_code
    }

    // CHARACTER SYSTEM
    // _createCharacter function is updated in the new_code

    function purchaseCharacter(uint256 _characterId, uint256 _amount) external nonReentrant whenNotPaused {
        require(_amount > 0 && _characterId < nextCharacterId, "Invalid");
        Character storage character = characters[_characterId];
        require(character.isActive, "Inactive");
        uint256 cost = uint256(character.price) * _amount;
        require(balanceOf(msg.sender) >= cost, "Insufficient balance");
        uint256 burnAmount = (cost * 2000) / 10000; // %20 yakım
        uint256 treasuryAmount = cost - burnAmount;
        _transfer(msg.sender, address(0x000000000000000000000000000000000000dEaD), burnAmount);
        _transfer(msg.sender, treasury, treasuryAmount);
        userCharacters[msg.sender][_characterId] += uint128(_amount);
        character.totalSupply += uint128(_amount);
        if (_characterId == LEGENDARY_CHARACTER_ID) {
            isDAOMember[msg.sender] = true;
        }
        emit CharacterPurchased(msg.sender, _characterId, _amount);
    }

    // Character prices are IMMUTABLE for security and fairness

    // STAKING SYSTEM - Enhanced with minimum stake requirement
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), amount);
        Stake storage userStake = stakes[msg.sender];
        
        if (userStake.amount > 0) {
            uint256 reward = _calculateReward(msg.sender);
            if (reward > 0) _mint(msg.sender, reward);
        }
        
        userStake.amount += uint128(amount);
        userStake.startTime = uint64(block.timestamp);
        userStake.lastClaim = uint64(block.timestamp);
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }

    // Dinamik staking APY: Karakter sahibi olmayanlar için %5, karakter sahipleri için en yüksek multiplier kadar APY
    function _getUserStakingAPY(address user) internal view returns (uint256) {
        uint256 maxMultiplier = ANNUAL_RATE; // 500 = %5
        for (uint256 i = 1; i < nextCharacterId; i++) {
            if (userCharacters[user][i] > 0 && characters[i].multiplier > maxMultiplier) {
                maxMultiplier = characters[i].multiplier * 10; // multiplier örn. 10x için 1000 = %10
            }
        }
        return maxMultiplier;
    }

    function _calculateReward(address user) internal view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        uint256 duration = block.timestamp - userStake.lastClaim;
        uint256 apy = _getUserStakingAPY(user); // karakter çarpanlı APY
        return (userStake.amount * apy * duration) / (10000 * 365 days);
    }

    // Start game session - must be called before claimGameRewards
    function startGameSession() external whenNotPaused {
        lastGameStart[msg.sender] = block.timestamp;
    }

    // Modifier for minimum game time
    modifier minimumGameTime() {
        require(
            lastGameStart[msg.sender] > 0 && 
            block.timestamp >= lastGameStart[msg.sender] + 120, // 2 dakika
            "Minimum 2 minutes gameplay required"
        );
        _;
    }

    // ENHANCED STAKING FUNCTIONS
    function getStakingAPY() external view returns (uint256) {
        // Dinamik APY hesaplama - karakter çarpanına göre
        return _getUserStakingAPY(msg.sender);
    }

    function emergencyUnstake() external nonReentrant whenNotPaused {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "Nothing staked");
        
        uint256 stakedAmount = userStake.amount;
        uint256 reward = _calculateReward(msg.sender);
        if (reward > 0) _mint(msg.sender, reward);
        
        // Always apply 5% penalty for emergency unstake
        uint256 penalty = (stakedAmount * EARLY_UNSTAKE_PENALTY) / 10000;
        uint256 finalAmount = stakedAmount - penalty;
        
        // Reset stake
        userStake.amount = 0;
        totalStaked -= stakedAmount;
        userStake.lastClaim = uint64(block.timestamp);
        
        // Send penalty to treasury
        _transfer(address(this), treasury, penalty);
        _transfer(address(this), msg.sender, finalAmount);
        
        emit EarlyUnstakePenalty(msg.sender, stakedAmount, penalty);
        emit Unstaked(msg.sender, finalAmount);
    }

    // Normal unstake (no penalty after 7 days)
    function unstake() external nonReentrant whenNotPaused {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "Nothing staked");
        require(block.timestamp >= userStake.startTime + 7 days, "Unstake available after 7 days or use emergencyUnstake");
        uint256 stakedAmount = userStake.amount;
        uint256 reward = _calculateReward(msg.sender);
        if (reward > 0) _mint(msg.sender, reward);
        userStake.amount = 0;
        totalStaked -= stakedAmount;
        userStake.lastClaim = uint64(block.timestamp);
        _transfer(address(this), msg.sender, stakedAmount);
        emit Unstaked(msg.sender, stakedAmount);
    }

    // Partial unstake (no penalty after 7 days)
    function partialUnstake(uint256 amount) external nonReentrant whenNotPaused {
        Stake storage userStake = stakes[msg.sender];
        require(amount > 0, "Amount must be greater than 0");
        require(userStake.amount >= amount, "Insufficient staked amount");
        require(block.timestamp >= userStake.startTime + 7 days, "Partial unstake available after 7 days or use emergencyUnstake");
        uint256 reward = _calculateReward(msg.sender);
        if (reward > 0) _mint(msg.sender, reward);
        userStake.amount -= uint128(amount);
        totalStaked -= amount;
        userStake.lastClaim = uint64(block.timestamp);
        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function getUnstakePenalty(address user) external view returns (uint256 penalty, bool hasPenalty) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return (0, false);
        
        if (block.timestamp < userStake.startTime + 7 days) {
            penalty = (userStake.amount * EARLY_UNSTAKE_PENALTY) / 10000;
            hasPenalty = true;
        } else {
            penalty = 0;
            hasPenalty = false;
        }
    }

    // GAME REWARDS - Enhanced with character multipliers and pending system
    function claimGameRewards(uint256 baseAmount) external nonReentrant whenNotPaused minimumGameTime {
        require(baseAmount > 0, "Invalid amount");
        
        // Sybil protection
        require(walletCreatedAt[msg.sender] > 0 && 
                block.timestamp - walletCreatedAt[msg.sender] >= MIN_WALLET_AGE, "Wallet too young");
        
        // Calculate character multiplier based on owned characters and COFFY balance
        uint256 multiplier = _getCharacterMultiplier(msg.sender); // karakter yoksa 100 (1x)
        uint256 finalAmount = (baseAmount * multiplier) / 100;
        uint256 maxWeeklyClaim = (MAX_WEEKLY_CLAIM * multiplier) / 100; // karakter çarpanına göre limit
        require(finalAmount <= maxWeeklyClaim, "Amount exceeds weekly limit");
        
        // Check weekly limit
        uint256 currentWeek = block.timestamp / 1 weeks;
        if (lastRewardWeek[msg.sender] < currentWeek) {
            weeklyRewards[msg.sender] = 0;
            lastRewardWeek[msg.sender] = currentWeek;
        }
        require(weeklyRewards[msg.sender] + finalAmount <= maxWeeklyClaim, "Weekly limit exceeded");
        
        uint256 userBalance = balanceOf(msg.sender);
        
        // Update game statistics
        _updateGameStats(msg.sender, finalAmount);
        
        // Direct claim for 100K+ COFFY holders
        if (userBalance >= MIN_CLAIM_BALANCE) {
            weeklyRewards[msg.sender] += finalAmount;
            lastGameStart[msg.sender] = 0;
            _transfer(treasury, msg.sender, finalAmount);
            emit GameRewardsClaimed(msg.sender, finalAmount);
        }
        // Accumulate for 10K-100K COFFY holders
        else if (userBalance >= MIN_BALANCE_FOR_ACCUMULATION) {
            pendingGameRewards[msg.sender] += finalAmount;
            weeklyRewards[msg.sender] += finalAmount;
            lastPendingUpdate[msg.sender] = block.timestamp;
            lastGameStart[msg.sender] = 0;
            emit PendingRewardAdded(msg.sender, finalAmount, "game");
        }
        else {
            revert("Insufficient balance for rewards");
        }
    }
    
    // Calculate character multiplier based on owned characters and required COFFY balance
    function _getCharacterMultiplier(address user) internal view returns (uint256) {
        uint256 userBalance = balanceOf(user);
        uint256 maxMultiplier = 100; // Base 1x (100%)
        
        // Check each character in reverse order (highest multiplier first)
        for (uint256 i = 5; i >= 1; i--) {
            if (userCharacters[user][i] > 0) {
                Character memory char = characters[i];
                // User must have the character AND enough COFFY balance equal to character price
                if (userBalance >= char.price) {
                    maxMultiplier = char.claimMultiplier;
                    break;
                }
            }
        }
        
        return maxMultiplier;
    }

    // Public function to get character multiplier
    function getCharacterMultiplier(address user) external view returns (uint256) {
        return _getCharacterMultiplier(user);
    }

    // Helper function for statistics
    function _updateGameStats(address user, uint256 rewardAmount) internal {
        GameStats storage stats = gameStats[user];
        stats.totalGamesPlayed += 1;
        stats.totalRewardsClaimed += rewardAmount;
        stats.lastGameTimestamp = block.timestamp;
    }

    // Claim accumulated pending rewards (max 5K daily, respects combined limit)
    function claimPendingRewards(uint256 amount) external nonReentrant whenNotPaused {
        require(balanceOf(msg.sender) >= MIN_CLAIM_BALANCE, "Need 100K COFFY to claim");
        require(amount > 0 && amount <= MAX_WEEKLY_CLAIM, "Invalid amount");
        
        uint256 totalPending = pendingGameRewards[msg.sender] + pendingStepRewards[msg.sender] + pendingSnapRewards[msg.sender];
        require(totalPending > 0, "No pending rewards");
        require(amount <= totalPending, "Amount exceeds pending rewards");
        
        // Check expiry (30 days from last update)
        require(lastPendingUpdate[msg.sender] > 0 && 
                block.timestamp - lastPendingUpdate[msg.sender] <= PENDING_REWARD_EXPIRY, 
                "Rewards expired after 30 days");
        
        // Check daily limit (combined with other rewards)
        uint256 currentWeek = block.timestamp / 1 weeks;
        if (lastRewardWeek[msg.sender] < currentWeek) {
            weeklyRewards[msg.sender] = 0;
            lastRewardWeek[msg.sender] = currentWeek;
        }
        require(weeklyRewards[msg.sender] + amount <= MAX_WEEKLY_CLAIM, "Weekly limit exceeded");
        
        // Deduct from pending rewards (proportionally)
        uint256 gameShare = (pendingGameRewards[msg.sender] * amount) / totalPending;
        uint256 stepShare = (pendingStepRewards[msg.sender] * amount) / totalPending;
        uint256 snapShare = amount - gameShare - stepShare; // Remaining goes to snap
        
        pendingGameRewards[msg.sender] -= gameShare;
        pendingStepRewards[msg.sender] -= stepShare;
        pendingSnapRewards[msg.sender] -= snapShare;
        
        // Update daily tracking
        weeklyRewards[msg.sender] += amount;
        
        // If no pending rewards left, reset update time
        if (pendingGameRewards[msg.sender] + pendingStepRewards[msg.sender] + pendingSnapRewards[msg.sender] == 0) {
            lastPendingUpdate[msg.sender] = 0;
        }
        
        _transfer(treasury, msg.sender, amount);
        emit PendingRewardsClaimed(msg.sender, amount);
    }

    // PUBLIC VIEW FUNCTIONS FOR STATISTICS AND INFORMATION
    function getGameStats(address user) external view returns (
        uint256 totalGamesPlayed,
        uint256 totalRewardsClaimed,
        uint256 lastGameTimestamp
    ) {
        GameStats memory stats = gameStats[user];
        return (
            stats.totalGamesPlayed,
            stats.totalRewardsClaimed,
            stats.lastGameTimestamp
        );
    }

    // MODULE SYSTEM - Timelock protected
    function setDAOModule(address _module) external onlyRole(ADMIN_ROLE) {
        require(_module != address(0), "Invalid module address");
        daoModule = _module;
        authorizedModules[_module] = true;
        emit ModuleSet("DAO", _module);
    }

    function setNFTModule(address _module) external onlyRole(ADMIN_ROLE) {
        require(_module != address(0), "Invalid module address");
        nftModule = _module;
        authorizedModules[_module] = true;
        emit ModuleSet("NFT", _module);
    }

    function setSocialModule(address _module) external onlyRole(ADMIN_ROLE) {
        require(_module != address(0), "Invalid module address");
        socialModule = _module;
        authorizedModules[_module] = true;
        emit ModuleSet("Social", _module);
    }

    // MODULE INTERACTION FUNCTIONS - Character prices are now immutable

    function migrateToNFT(uint256 _characterId, uint256 _amount) external nonReentrant whenNotPaused {
        require(nftModule != address(0), "NFT module not set");
        require(userCharacters[msg.sender][_characterId] >= _amount, "Insufficient");
        
        userCharacters[msg.sender][_characterId] -= uint128(_amount);
        characters[_characterId].totalSupply -= uint128(_amount);
    }

    function processSocialReward(address user, uint256 amount) external whenNotPaused {
        require(msg.sender == socialModule, "Unauthorized");
        require(amount <= MAX_WEEKLY_CLAIM, "Amount too high");
        
        // 2-minute minimum activity duration for step rewards
        require(lastStepStart[user] > 0, "No step activity started");
        require(block.timestamp - lastStepStart[user] >= MIN_ACTIVITY_DURATION, 
                "Must be active at least 2 minutes");
        
        // Check combined daily limit
        uint256 currentWeek = block.timestamp / 1 weeks;
        if (lastRewardWeek[user] < currentWeek) {
            weeklyRewards[user] = 0;
            lastRewardWeek[user] = currentWeek;
        }
        require(weeklyRewards[user] + amount <= MAX_WEEKLY_CLAIM, "Weekly limit");
        
        uint256 userBalance = balanceOf(user);
        
        // Direct transfer for 100K+ holders, accumulate for 10K+ holders
        if (userBalance >= MIN_CLAIM_BALANCE) {
            weeklyRewards[user] += amount;
            lastStepStart[user] = 0; // Reset step start time
            _transfer(treasury, user, amount);
        } else if (userBalance >= MIN_BALANCE_FOR_ACCUMULATION) {
            pendingStepRewards[user] += amount; // Social module will specify type
            weeklyRewards[user] += amount;
            lastPendingUpdate[user] = block.timestamp;
            lastStepStart[user] = 0; // Reset step start time
            emit PendingRewardAdded(user, amount, "social");
        }
    }

    // MODULE UTILITY FUNCTIONS - WITH GLOBAL LIMITS
    // Kullanıcının stake etmediği serbest bakiyesini dönen fonksiyon
    function getFreeBalance(address user) public view returns (uint256) {
        uint256 totalBalance = balanceOf(user);
        uint256 stakedAmount = stakes[user].amount;
        return totalBalance > stakedAmount ? totalBalance - stakedAmount : 0;
    }

    // Güvenli transferForModule fonksiyonu
    function transferForModule(address from, address to, uint256 amount) external whenNotPaused {
        require(authorizedModules[msg.sender], "Unauthorized");
        require(to != msg.sender, "Module cannot transfer to itself");
        uint256 freeBalance = getFreeBalance(from);
        require(freeBalance >= amount, "Insufficient free balance");
        _transfer(from, to, amount);
    }

    // MODULE UTILITY FUNCTIONS - WITH GLOBAL LIMITS
    function mintForModule(address to, uint256 amount) external whenNotPaused {
        require(authorizedModules[msg.sender], "Unauthorized module");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        // Limit module minting to prevent abuse
        uint256 maxModuleMint = (totalSupply() * 100) / 10000; // 1% of total supply per call
        require(amount <= maxModuleMint, "Amount exceeds module limit");
        
        _mint(to, amount);
    }

    function burnFromModule(address from, uint256 amount) external whenNotPaused {
        require(authorizedModules[msg.sender], "Unauthorized module");
        require(from != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        // Check free balance (not staked)
        uint256 freeBalance = getFreeBalance(from);
        require(freeBalance >= amount, "Insufficient free balance");
        
        _burn(from, amount);
    }

    function burnFromGame(address from, uint256 amount) external whenNotPaused {
        require(authorizedModules[msg.sender], "Unauthorized module");
        require(from != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        require(balanceOf(from) >= amount, "Insufficient balance");
        
        // Check free balance (not staked)
        uint256 freeBalance = getFreeBalance(from);
        require(freeBalance >= amount, "Insufficient free balance");
        
        _burn(from, amount);
    }

    function updateCharacterForModule(uint256 characterId, uint256 newPrice, bool isActive) external {
        require(authorizedModules[msg.sender], "Unauthorized module");
        require(characterId > 0 && characterId < nextCharacterId, "Invalid character ID");
        
        // Character prices are immutable for fairness, only activity can be changed
        characters[characterId].isActive = isActive;
    }

    // MODULE DEAUTHORIZATION - With timelock protection
    // Removed as per new_code

    // INFLATION SYSTEM - Only const wallets can trigger
    function triggerInflation() external nonReentrant whenNotPaused {
        require(isConstWallet[msg.sender], "Only const wallets can trigger inflation");
        require(block.timestamp - lastInflationTime >= 180 days, "Too early");
        
        uint256 currentSupply = totalSupply();
        uint256 totalInflation = (currentSupply * SEMIANNUAL_INFLATION_RATE) / 10000;
        uint256 treasuryShare = (totalInflation * 25) / 100;
        uint256 liquidityShare = (totalInflation * 20) / 100;
        uint256 communityShare = (totalInflation * 35) / 100;
        uint256 teamShare = (totalInflation * 10) / 100;
        uint256 marketingShare = (totalInflation * 10) / 100;
        
        _mint(treasury, treasuryShare);
        _mint(liquidity, liquidityShare);
        _mint(community, communityShare);
        _mint(team, teamShare);
        _mint(marketing, marketingShare);
        
        lastInflationTime = block.timestamp;
        emit InflationMinted(totalInflation, block.timestamp);
    }

    // MOBILE APP INTEGRATION
    function setMobileBackend(address _backend) external onlyRole(ADMIN_ROLE) {
        require(_backend != address(0), "Invalid backend");
        mobileAppBackend = _backend;
        authorizedModules[_backend] = true;
    }
    
    function linkUserProfile(string calldata profileId) external {
        require(bytes(profileId).length > 0, "Invalid profile ID");
        require(profileToWallet[profileId] == address(0), "Profile already linked");
        require(bytes(userProfiles[msg.sender]).length == 0, "Wallet already linked");
        
        userProfiles[msg.sender] = profileId;
        profileToWallet[profileId] = msg.sender;
        walletCreatedAt[msg.sender] = block.timestamp; // Set wallet creation time
        
        emit UserProfileLinked(msg.sender, profileId);
    }

    function startGame() external whenNotPaused {
        lastGameStart[msg.sender] = block.timestamp;
    }

    function startStep() external whenNotPaused {
        lastStepStart[msg.sender] = block.timestamp;
    }

    // ADMIN FUNCTIONS
    function enableTrading() external onlyRole(ADMIN_ROLE) {
        // Trading enable işlemi kaldırıldı
    }

    // Coffee Shop Payment modülünü whitelist'e eklemek için fonksiyon
    function setCoffeeShopModule(address _module) external onlyRole(ADMIN_ROLE) {
        require(_module != address(0), "Invalid module address");
        authorizedModules[_module] = true;
        // İsteğe bağlı: aktif coffeeShopModule adresini güncellemek için bir değişken ekleyebilirsin
        // coffeeShopModule = _module;
        // event emit edilebilir
    }

    // OPTIMIZED TRANSFER WITH DEX TAX, REFLECTION AND MAX LIMIT
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        // Sadece DEX pair set edilmişse ve satış ise tax uygula
        if (isDEXPair[to]) {
            uint256 fee = (amount * DEX_TAX) / 10000;
            uint256 transferAmount = amount - fee;
            super._transfer(owner, to, transferAmount);
            _distributeReflection(fee);
        } else {
            super._transfer(owner, to, amount);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        uint256 currentAllowance = allowance(from, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "Insufficient allowance");
            _approve(from, spender, currentAllowance - amount);
        }
        // Sadece DEX pair set edilmişse ve satış ise tax uygula
        if (isDEXPair[to]) {
            uint256 fee = (amount * DEX_TAX) / 10000;
            uint256 transferAmount = amount - fee;
            super._transfer(from, to, transferAmount);
            _distributeReflection(fee);
        } else {
            super._transfer(from, to, amount);
        }
        return true;
    }

    // Reflection sadece holderlara dağıtılacak şekilde güncelle
    function _distributeReflection(uint256 amount) private {
        uint256 total = totalSupply();
        if (total == 0) return;
        // Herkese orantılı dağıtım (gas maliyetli olacağı için, burada topluluk cüzdanına gönderebilir veya modül ile dağıtım yapılabilir)
        // Basitçe topluluk cüzdanına gönderelim (örnek):
        super._transfer(address(this), community, amount);
    }

    // --- MODÜL FONKSİYONLARI EKLENDİ ---
    // VIEW FUNCTIONS
    function getCharacter(uint256 _characterId) external view returns (
        uint256 price, 
        uint256 totalSupply,
        uint256 maxSupply,
        uint256 multiplier,
        uint256 claimMultiplier,
        bool isActive
    ) {
        Character memory char = characters[_characterId];
        return (
            char.price, 
            char.totalSupply,
            char.maxSupply,
            char.multiplier,
            char.claimMultiplier,
            char.isActive
        );
    }
    // String alanlar için ayrı getter
    function getCharacterStrings(uint256 _characterId) external view returns (string memory name, string memory metadataURI) {
        return (characterNames[_characterId], characterMetadataURIs[_characterId]);
    }

    function getUserCharacterBalance(address _user, uint256 _characterId) external view returns (uint256) {
        return userCharacters[_user][_characterId];
    }

    function getGlobalModuleLimits() external pure returns (
        uint256 maxAnnualMint,
        uint256 maxAnnualBurn,
        uint256 mintedThisYear,
        uint256 burnedThisYear,
        uint256 remainingMint,
        uint256 remainingBurn
    ) {
        return (0, 0, 0, 0, 0, 0);
    }

    function getRemainingDailyLimit(address _user) external view returns (uint256) {
        uint256 currentWeek = block.timestamp / 1 weeks;
        if (lastRewardWeek[_user] < currentWeek) return MAX_WEEKLY_CLAIM;
        return MAX_WEEKLY_CLAIM > weeklyRewards[_user] ? MAX_WEEKLY_CLAIM - weeklyRewards[_user] : 0;
    }

    function getModuleStates() external view returns (
        address dao, bool daoActive,
        address nft, bool nftActive,
        address social, bool socialActive,
        address crossChain, bool crossChainActive
    ) {
        return (daoModule, true, nftModule, true, socialModule, true, address(0), false); // crossChainModule and crossChainEnabled removed
    }

    function getPendingRewardsStatus(address user) external view returns (
        uint256 totalPending,
        uint256 gameRewards,
        uint256 stepRewards,
        uint256 snapRewards,
        bool canClaim,
        bool hasExpired
    ) {
        gameRewards = pendingGameRewards[user];
        stepRewards = pendingStepRewards[user];
        snapRewards = pendingSnapRewards[user];
        totalPending = gameRewards + stepRewards + snapRewards;
        
        canClaim = balanceOf(user) >= MIN_CLAIM_BALANCE && totalPending > 0;
        
        if (lastPendingUpdate[user] > 0) {
            uint256 timeSinceUpdate = block.timestamp - lastPendingUpdate[user];
            hasExpired = timeSinceUpdate > PENDING_REWARD_EXPIRY;
        } else {
            hasExpired = false;
        }
    }

    function getUserProfile(address wallet) external view returns (string memory) {
        return userProfiles[wallet];
    }
    
    function getWalletByProfile(string calldata profileId) external view returns (address) {
        return profileToWallet[profileId];
    }

    function getInflationInfo() external view returns (uint256 lastTime, uint256 nextTime, bool canTrigger) {
        lastTime = lastInflationTime;
        nextTime = lastInflationTime + 180 days;
        canTrigger = block.timestamp >= nextTime;
    }

    function getUserCharacterMultiplier(address user) external view returns (uint256 multiplier, string memory eligibleCharacter) {
        multiplier = _getCharacterMultiplier(user);
        
        // Find which character gives this multiplier
        uint256 userBalance = balanceOf(user);
        for (uint256 i = 5; i >= 1; i--) {
            if (userCharacters[user][i] > 0) {
                Character memory char = characters[i];
                if (userBalance >= char.price && char.claimMultiplier == multiplier) {
                    eligibleCharacter = characterNames[i];
                    break;
                }
            }
        }
        
        if (multiplier == 100) {
            eligibleCharacter = "No character bonus";
        }
    }

    // CROSS-CHAIN MODULE MANAGEMENT - Simple and lightweight
    // Removed as per new_code

    function getActivityStatus(address user) external view returns (
        uint256 gameStartTime,
        uint256 stepStartTime,
        bool canClaimGame,
        bool canClaimStep,
        uint256 remainingGameTime,
        uint256 remainingStepTime
    ) {
        gameStartTime = lastGameStart[user];
        stepStartTime = lastStepStart[user];
        
        if (gameStartTime > 0) {
            uint256 elapsed = block.timestamp - gameStartTime;
            canClaimGame = elapsed >= MIN_ACTIVITY_DURATION;
            remainingGameTime = canClaimGame ? 0 : MIN_ACTIVITY_DURATION - elapsed;
        }
        
        if (stepStartTime > 0) {
            uint256 elapsed = block.timestamp - stepStartTime;
            canClaimStep = elapsed >= MIN_ACTIVITY_DURATION;
            remainingStepTime = canClaimStep ? 0 : MIN_ACTIVITY_DURATION - elapsed;
        }
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 pendingReward
    ) {
        Stake memory userStake = stakes[user];
        return (userStake.amount, userStake.startTime, _calculateReward(user));
    }

    // Emergency pause fonksiyonları
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}