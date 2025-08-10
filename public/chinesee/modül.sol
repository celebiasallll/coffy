// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICoffyTokenV2 {
    // --- GÜNCELLENMİŞ VE UYUMLU ARAYÜZ ---
    function mintForModule(address to, uint256 amount) external;
    function burnFromModule(address from, uint256 amount) external;
    function transferForModule(address from, address to, uint256 amount) external;
    function updateCharacterForModule(uint256 characterId, uint256 newPrice, bool isActive) external;

    // Ana kontrattan kullanılan diğer fonksiyonlar
    function burnFromGame(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function getUserCharacterBalance(address user, uint256 characterId) external view returns (uint256);
    function getCharacter(uint256 characterId) external view returns (
        string memory name,
        uint256 price,
        uint256 totalSupply,
        uint256 maxSupply,
        bool isActive,
        string memory metadataURI,
        bool daoControlled
    );
    function treasury() external view returns (address);
}

/**
 * @title CoffyAuxiliary - Yardımcı Kontrat
 * @dev Battle, Marketplace, DAO ve diğer gelişmiş özellikler
 */
contract CoffyAuxiliary is AccessControl, ReentrancyGuard, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BATTLE_MANAGER_ROLE = keccak256("BATTLE_MANAGER_ROLE");
    bytes32 public constant MARKETPLACE_MANAGER_ROLE = keccak256("MARKETPLACE_MANAGER_ROLE");
    bytes32 public constant DAO_MANAGER_ROLE = keccak256("DAO_MANAGER_ROLE");
    bytes32 public constant GAME_MANAGER_ROLE = keccak256("GAME_MANAGER_ROLE");

    ICoffyTokenV2 public coffyToken;
    address public marketingWallet;

    // ============ BATTLE SİSTEMİ ============
    
    struct Battle {
        uint256 battleId;
        address initiator;
        address opponent;
        uint256 stakeAmount;
        BattleStatus status;
        address winner;
        uint256 createdAt;
        uint256 expiresAt;
    }

    enum BattleStatus {
        Pending,
        Active,
        Completed,
        Cancelled,
        Expired
    }

    mapping(uint256 => Battle) public battles;
    mapping(address => uint256[]) public userBattles;
    uint256 public nextBattleId = 1;
    uint256 public battleFee = 500; // %5 (500/10000)
    uint256 public battleExpiration = 24 hours;
    
    // EnumerableSet for efficient tracking
    EnumerableSet.UintSet private activeBattleIds;
    EnumerableSet.UintSet private activeMarketplaceIds;
    EnumerableSet.UintSet private activeProposalIds;

    // ============ MARKETPLACE SİSTEMİ ============
    
    struct MarketplaceItem {
        uint256 itemId;
        address seller;
        uint256 characterId;
        uint256 amount;
        uint256 pricePerUnit;
        bool isActive;
        uint256 createdAt;
    }

    mapping(uint256 => MarketplaceItem) public marketplaceItems;
    uint256 public nextItemId = 1;
    uint256 public marketplaceFee = 500; // %5 (500/10000)

    // Esnek Marketplace Item Sistemi
    struct MarketplaceItemType {
        string name;
        string description;
        uint256 basePrice;
        bool isActive;
        uint8 category; // 1=Consumable, 2=Equipment, 3=Cosmetic, 4=Utility
    }
    
    mapping(uint256 => MarketplaceItemType) public marketplaceItemTypes;
    mapping(uint256 => bool) public itemTypeExists;
    uint256 public nextItemTypeId = 1;
    
    // Admin tarafından belirlenebilir item kategorileri
    event MarketplaceItemTypeCreated(uint256 indexed itemTypeId, string name, uint256 basePrice);
    event MarketplaceItemTypeUpdated(uint256 indexed itemTypeId, uint256 newPrice, bool isActive);

    // Karakter fiyat sınırları
    uint256 public constant MIN_CHARACTER_PRICE = 50000 * 10**18; // 50K COFFY
    uint256 public constant MAX_CHARACTER_PRICE = 50000000 * 10**18; // 50M COFFY

    // ============ DAO SİSTEMİ ============
    
    // Remove DAO system: Proposal struct, createProposal, vote, executeProposal, getActiveProposals, ProposalType, ProposalStatus, and related mappings/events
    // Remove admin functions: setBattleFee, setMarketplaceFee, setBattleExpiration, setVotingPeriod, setMinimumVotingPower, emergencyTokenWithdraw, emergencyBattleRefund
    // Remove Sybil/airdrop/social verification logic
    // Remove view functions: getActiveMarketplaceItems, getActiveProposals, getUserTotalPowers, getUserUpgradeBonus
    // Only keep setCoffyToken and view functions for PvP/battle and marketplace (if present)

    // Battle cooldown ve minimum oynama süresi için mapping
    mapping(address => uint256) public lastBattleTimestamp;
    mapping(uint256 => uint256) public battleStartTimestamp;
    uint256 public constant MIN_BATTLE_DURATION = 3 minutes;
    uint256 public constant BATTLE_COOLDOWN = 1 minutes;

    // ============ GAME UPGRADES SİSTEMİ ============
    
    struct GameUpgrade {
        string name;
        string description;
        uint256 price; // COFFY cinsinden
        uint8 upgradeType; // 1=Speed, 2=Power, 3=Defense, 4=Luck, 5=Health, vb.
        uint256 upgradeValue; // Artış miktarı (%)
        bool isActive;
    }
    
    mapping(uint256 => GameUpgrade) public gameUpgrades; // upgradeId => upgrade bilgisi
    mapping(address => mapping(uint256 => bool)) public userUpgrades; // user => upgradeId => sahip mi
    mapping(address => mapping(uint256 => uint256)) public userUpgradeLevels; // user => upgradeId => level
    
    uint256 public maxUpgradeId = 10;
    
    event UpgradePurchased(address indexed user, uint256 indexed upgradeId, uint256 level, uint256 price);
    event UpgradeCreated(uint256 indexed upgradeId, string name, uint256 price);
    event UpgradeUpdated(uint256 indexed upgradeId, uint256 newPrice, bool isActive);

    // ============ ÇOK OYUNCULU OYUNLAR ============

    enum GameStatus { Pending, Active, Completed, Cancelled }
    struct Game {
        uint256 gameId;
        string gameType; // "race", "poker", "battle", vs.
        address[] players;
        mapping(address => uint256) stakes;
        uint256 totalStaked;
        GameStatus status;
        address winner;
    }
    mapping(uint256 => Game) public games;
    uint256 public nextGameId = 1;
    event GameCreated(uint256 indexed gameId, string gameType);
    event GameJoined(uint256 indexed gameId, address indexed player, uint256 stake);
    event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 prize);
    event GameCancelled(uint256 indexed gameId);

    // Events
    event BattleCreated(uint256 indexed battleId, address indexed initiator, uint256 stakeAmount);
    event BattleJoined(uint256 indexed battleId, address indexed opponent);
    event BattleCompleted(uint256 indexed battleId, address indexed winner);
    event MarketplaceItemListed(uint256 indexed itemId, address indexed seller, uint256 characterId, uint256 amount);
    event MarketplaceItemSold(uint256 indexed itemId, address indexed buyer, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool vote);
    event ProposalExecuted(uint256 indexed proposalId);
    event BattleCancelled(uint256 indexed battleId);

    // --- EĞLENCE AMAÇLI PVP/ÇOKLU OYUNLAR ============
    // Her cüzdan günde en fazla 5 bet'e katılabilir, tek bet için max 10,000 COFFY stake edilebilir.

    mapping(address => uint256) public dailyStaked;
    mapping(address => uint256) public lastStakeDay;
    mapping(address => uint256) public dailyBetCount;
    uint256 public constant MAX_DAILY_BET = 10;
    uint256 public constant MAX_BET_STAKE = 20000 * 1e18;

    mapping(uint256 => mapping(address => bool)) public hasClaimedWin; // gameId => user => claimed?

    function claimGameWin(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Completed, "Game not completed");
        require(game.winner == msg.sender, "You are not the winner");
        require(!hasClaimedWin[gameId][msg.sender], "Reward already claimed");

        hasClaimedWin[gameId][msg.sender] = true;
        uint256 prize = game.totalStaked; // Ödül miktarı
        
        coffyToken.transferForModule(address(this), msg.sender, prize);
    }

    // Quick Battle için bekleyen oyuncu ve stake
    address public quickBattleWaitingPlayer;
    uint256 public quickBattleWaitingStake;

    // Quick Battle event
    event QuickBattleMatched(address indexed player1, address indexed player2, uint256 stake, address winner);

    constructor(address _coffyToken, address _marketingWallet) {
        coffyToken = ICoffyTokenV2(_coffyToken);
        marketingWallet = _marketingWallet;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BATTLE_MANAGER_ROLE, msg.sender);
        _grantRole(MARKETPLACE_MANAGER_ROLE, msg.sender);
        _grantRole(DAO_MANAGER_ROLE, msg.sender);
        _grantRole(GAME_MANAGER_ROLE, msg.sender);

        // Oyun ici guclendirici itemleri olustur
        _createGameUpgrade(1, "Speed Boost", "Speed+10%", 50000 * 10**18, 1, 10);
        _createGameUpgrade(2, "Power Amplifier", "Power+15%", 100000 * 10**18, 2, 15);
        _createGameUpgrade(3, "Shield Generator", "Defense+12%", 100000 * 10**18, 3, 12);
        _createGameUpgrade(4, "Lucky Coin", "Luck+8%", 50000 * 10**18, 4, 8);
        _createGameUpgrade(5, "Health Pack", "Health+20%", 150000 * 10**18, 5, 20);
        _createGameUpgrade(6, "Energy Drink", "Energy+25%", 50000 * 10**18, 6, 25);
        _createGameUpgrade(7, "Precision Scope", "Accuracy+18%", 150000 * 10**18, 7, 18);
        _createGameUpgrade(8, "Stealth Mode", "Stealth+30%", 200000 * 10**18, 8, 30);
        _createGameUpgrade(9, "Double XP", "XP+50%", 250000 * 10**18, 9, 50);
        _createGameUpgrade(10, "Gold Magnet", "Gold+40%", 200000 * 10**18, 10, 40);
        
        // Marketplace item tiplerini oluştur
        _createMarketplaceItemType(1, "Espresso Shot", "Energy+10m", 1000 * 10**18, 1);
        _createMarketplaceItemType(2, "Coffee Grinder", "Bean+15%", 15000 * 10**18, 2);
        _createMarketplaceItemType(3, "Barista Apron", "Brew+5%", 8000 * 10**18, 3);
        _createMarketplaceItemType(4, "Latte Art Kit", "Art Kit", 5000 * 10**18, 4);
        _createMarketplaceItemType(5, "Turkish Coffee Pot", "Trad. Pot", 12000 * 10**18, 2);
        _createMarketplaceItemType(6, "Cold Brew Bottle", "Energy+24h", 20000 * 10**18, 1);
        _createMarketplaceItemType(7, "Cappuccino Mug", "Ceramic Mug", 7500 * 10**18, 3);
        _createMarketplaceItemType(8, "Coffee Bean Bag", "Arabica", 3000 * 10**18, 4);
        _createMarketplaceItemType(9, "Mocha Blend", "Choco Mix", 4500 * 10**18, 1);
        _createMarketplaceItemType(10, "Nitro Coffee Can", "Nitro Can", 25000 * 10**18, 1);
    }

    // ============ BATTLE SİSTEMİ FONKSİYONLARI ============

    // Battle oluştururken commit-reveal ve force complete opsiyonel
    function createBattle(
        uint256 _stakeAmount
    ) external nonReentrant whenNotPaused {
        require(_stakeAmount > 0, "!stake");
        require(coffyToken.balanceOf(msg.sender) >= _stakeAmount, "!bal");
        require(block.timestamp >= lastBattleTimestamp[msg.sender] + BATTLE_COOLDOWN, "!cd");

        // Kullanıcıdan stake çekme işlemlerinde transferForModule yerine transferFrom kullanılacak
        IERC20(address(coffyToken)).transferFrom(msg.sender, address(this), _stakeAmount);

        Battle storage newBattle = battles[nextBattleId];
        newBattle.battleId = nextBattleId;
        newBattle.initiator = msg.sender;
        newBattle.stakeAmount = _stakeAmount;
        newBattle.status = BattleStatus.Pending;
        newBattle.createdAt = block.timestamp;
        newBattle.expiresAt = block.timestamp + battleExpiration;

        userBattles[msg.sender].push(nextBattleId);
        battleStartTimestamp[nextBattleId] = block.timestamp;
        lastBattleTimestamp[msg.sender] = block.timestamp;
        activeBattleIds.add(nextBattleId);
        emit BattleCreated(nextBattleId, msg.sender, _stakeAmount);
        nextBattleId++;
    }

    // Battle'a katılımda commit-reveal ve force complete ayarları korunur
    function joinBattle(uint256 _battleId) external nonReentrant whenNotPaused {
        Battle storage battle = battles[_battleId];
        require(battle.status == BattleStatus.Pending, "Battle not available");
        require(battle.initiator != msg.sender, "Cannot join own battle");
        require(block.timestamp < battle.expiresAt, "Battle expired");
        require(coffyToken.balanceOf(msg.sender) >= battle.stakeAmount, "Insufficient balance");

        IERC20(address(coffyToken)).transferFrom(msg.sender, address(this), battle.stakeAmount);

        battle.opponent = msg.sender;
        battle.status = BattleStatus.Active;
        userBattles[msg.sender].push(_battleId);
        emit BattleJoined(_battleId, msg.sender);
    }

    // commitMove ve revealMove fonksiyonları tamamen kaldırıldı

    // forceCompleteBattle fonksiyonunda commit-reveal ile ilgili mantıklar kaldırıldı
    function forceCompleteBattle(uint256 battleId) external {
        require(battles[battleId].status == BattleStatus.Active, "Battle not active");
        require(block.timestamp > battles[battleId].expiresAt, "Battle not expired");
        coffyToken.transferForModule(address(this), battles[battleId].initiator, battles[battleId].stakeAmount);
        coffyToken.transferForModule(address(this), battles[battleId].opponent, battles[battleId].stakeAmount);
        battles[battleId].status = BattleStatus.Cancelled;
        activeBattleIds.remove(battleId);
        emit BattleCancelled(battleId);
        return;
    }

    // View fonksiyonları
    function getBattleMoves(uint256) external pure returns (uint8 initiatorMove, uint8 opponentMove) {
        initiatorMove = 0;
        opponentMove = 0;
    }

    function getBattleResult(uint256 battleId) external view returns (address winner, BattleStatus status) {
        winner = battles[battleId].winner;
        status = battles[battleId].status;
    }

    function completeBattleAuto(uint256 _battleId) external whenNotPaused {
        Battle storage battle = battles[_battleId];
        require(battle.status == BattleStatus.Active, "Battle not active");
        require(block.timestamp >= battleStartTimestamp[_battleId] + MIN_BATTLE_DURATION, "Battle too short");
        require(
            msg.sender == battle.initiator || msg.sender == battle.opponent,
            "Only participants can complete"
        );

        // Otomatik kazanan belirleme (karakter güçlerine göre)
        address winner = _determineWinner(_battleId);
        
        battle.status = BattleStatus.Completed;
        battle.winner = winner;

        // Ödül hesaplama
        uint256 totalPrize = battle.stakeAmount * 2;
        uint256 fee = (totalPrize * battleFee) / 10000;
        uint256 winnerPrize = totalPrize - fee;

        // Battle ve Marketplace Fee dağıtımı: %20 burn, %80 treasury
        // Battle örneği:
        // uint256 fee = (totalPrize * battleFee) / 10000;
        // uint256 burnAmount = (fee * 2000) / 10000;
        // uint256 treasuryAmount = fee - burnAmount;
        // coffyToken.transferForModule(address(this), DEAD, burnAmount);
        // coffyToken.transferForModule(address(this), coffyToken.treasury(), treasuryAmount);
        // Marketplace için de aynı oranlar uygulanacak.

        // Kazanana ödül ver
        coffyToken.transferForModule(address(this), winner, winnerPrize);
        
        // Fee'yi marketing cüzdanına gönder
        if (fee > 0) {
            coffyToken.transferForModule(address(this), coffyToken.treasury(), fee);
        }

        // Active battle listesinden çıkar
        activeBattleIds.remove(_battleId);

        emit BattleCompleted(_battleId, winner);
    }

    function _determineWinner(uint256 _battleId) internal view returns (address) {
        Battle storage battle = battles[_battleId];
        // Karakter gücü yerine salt random ile kazanan belirle
        uint256 randomFactor = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            _battleId
        ))) % 2; // 0-1
        return (randomFactor == 0) ? battle.initiator : battle.opponent;
    }

    function cancelBattle(uint256 _battleId) external nonReentrant whenNotPaused {
        Battle storage battle = battles[_battleId];
        require(battle.initiator == msg.sender, "Not battle initiator");
        require(battle.status == BattleStatus.Pending, "Cannot cancel active battle");

        battle.status = BattleStatus.Cancelled;
        
        // Stake'i geri ver
        coffyToken.transferForModule(address(this), msg.sender, battle.stakeAmount);

        // Active battle listesinden çıkar
        activeBattleIds.remove(_battleId);
    }

    // ============ MARKETPLACE SİSTEMİ FONKSİYONLARI ============

    function listCharacterForSale(
        uint256 _characterId,
        uint256 _amount,
        uint256 _pricePerUnit
    ) external nonReentrant whenNotPaused {
        require(getActiveMarketplaceItemCount() < 1000, "Marketplace item limit exceeded");
        require(_amount > 0, "Amount must be greater than 0");
        require(_pricePerUnit >= MIN_CHARACTER_PRICE, "Price too low");
        require(_pricePerUnit <= MAX_CHARACTER_PRICE, "Price too high");
        require(_characterId >= 1 && _characterId <= 13, "Invalid character ID"); // 13 karakter var
        require(coffyToken.getUserCharacterBalance(msg.sender, _characterId) >= _amount, "Insufficient character balance");

        marketplaceItems[nextItemId] = MarketplaceItem({
            itemId: nextItemId,
            seller: msg.sender,
            characterId: _characterId,
            amount: _amount,
            pricePerUnit: _pricePerUnit,
            isActive: true,
            createdAt: block.timestamp
        });

        // Active marketplace listesine ekle
        activeMarketplaceIds.add(nextItemId);
        
        emit MarketplaceItemListed(nextItemId, msg.sender, _characterId, _amount);
        nextItemId++;
    }

    function buyCharacterFromMarketplace(uint256 _itemId, uint256 _amount) external nonReentrant whenNotPaused {
        MarketplaceItem storage item = marketplaceItems[_itemId];
        require(item.isActive, "Item not active");
        require(item.seller != msg.sender, "Cannot buy own item");
        require(_amount > 0 && _amount <= item.amount, "Invalid amount");
        uint256 totalCost = item.pricePerUnit * _amount;
        uint256 fee = (totalCost * marketplaceFee) / 10000;
        uint256 burnAmount = (fee * 2000) / 10000;
        uint256 treasuryAmount = fee - burnAmount;
        uint256 sellerReceives = totalCost - fee;
        require(coffyToken.balanceOf(msg.sender) >= totalCost, "Insufficient balance");
        // Komisyonun %40'ı yakıma, %60'ı marketingWallet'a
        if (burnAmount > 0) {
            IERC20(address(coffyToken)).transferFrom(msg.sender, DEAD, burnAmount);
            emit Burn(msg.sender, burnAmount, "Marketplace commission burn");
        }
        if (treasuryAmount > 0) {
            IERC20(address(coffyToken)).transferFrom(msg.sender, coffyToken.treasury(), treasuryAmount);
        }
        IERC20(address(coffyToken)).transferFrom(msg.sender, item.seller, sellerReceives);
        item.amount -= _amount;
        if (item.amount == 0) {
            item.isActive = false;
            // Active marketplace listesinden çıkar
            activeMarketplaceIds.remove(_itemId);
        }
        emit MarketplaceItemSold(_itemId, msg.sender, _amount);
    }

    function cancelMarketplaceListing(uint256 _itemId) external whenNotPaused {
        MarketplaceItem storage item = marketplaceItems[_itemId];
        require(item.seller == msg.sender, "Not item seller");
        require(item.isActive, "Item not active");

        item.isActive = false;
        // Active marketplace listesinden çıkar
        activeMarketplaceIds.remove(_itemId);
    }

    // ============ DAO SİSTEMİ FONKSİYONLARI ============

    // Remove DAO system: Proposal struct, createProposal, vote, executeProposal, getActiveProposals, ProposalType, ProposalStatus, and related mappings/events
    // Remove admin functions: setBattleFee, setMarketplaceFee, setBattleExpiration, setVotingPeriod, setMinimumVotingPower, emergencyTokenWithdraw, emergencyBattleRefund
    // Remove Sybil/airdrop/social verification logic
    // Remove view functions: getActiveMarketplaceItems, getActiveProposals, getUserTotalPowers, getUserUpgradeBonus
    // Only keep setCoffyToken and view functions for PvP/battle and marketplace (if present)

    // Battle cooldown ve minimum oynama süresi için mapping
    // (DUPLICATE REMOVED)

    // ============ GAME UPGRADES FONKSİYONLARI ============

    /**
     * @dev Oyun içi upgrade satın alma
     */
    function purchaseUpgrade(uint256 upgradeId) external nonReentrant whenNotPaused {
        require(upgradeId > 0 && upgradeId <= maxUpgradeId, "!upid");
        GameUpgrade storage upgrade = gameUpgrades[upgradeId];
        require(upgrade.isActive, "!upact");
        require(coffyToken.balanceOf(msg.sender) >= upgrade.price, "Insufficient balance");

        // COFFY token yak
        coffyToken.burnFromGame(msg.sender, upgrade.price);

        // Upgrade'i kullanıcıya ver
        if (!userUpgrades[msg.sender][upgradeId]) {
            userUpgrades[msg.sender][upgradeId] = true;
            userUpgradeLevels[msg.sender][upgradeId] = 1;
        } else {
            // Zaten sahipse level artır (maksimum 5 level)
            require(userUpgradeLevels[msg.sender][upgradeId] < 5, "!maxlv");
            userUpgradeLevels[msg.sender][upgradeId]++;
        }

        uint256 currentLevel = userUpgradeLevels[msg.sender][upgradeId];
        emit UpgradePurchased(msg.sender, upgradeId, currentLevel, upgrade.price);
    }

    /**
     * @dev Frontend için kullanıcının toplam güçlerini hesapla
     */
    function getUserTotalPowers(address user) external view returns (
        uint256 speedBonus,
        uint256 powerBonus,
        uint256 defenseBonus,
        uint256 luckBonus,
        uint256 healthBonus
    ) {
        speedBonus = this.getUserUpgradeBonus(user, 1);
        powerBonus = this.getUserUpgradeBonus(user, 2);
        defenseBonus = this.getUserUpgradeBonus(user, 3);
        luckBonus = this.getUserUpgradeBonus(user, 4);
        healthBonus = this.getUserUpgradeBonus(user, 5);
    }

    // ============ ADMIN UPGRADE FONKSİYONLARI ============

    /**
     * @dev Yeni upgrade oluştur
     */
    function createGameUpgrade(
        uint256 upgradeId,
        string memory name,
        string memory description,
        uint256 price,
        uint8 upgradeType,
        uint256 upgradeValue
    ) external onlyRole(ADMIN_ROLE) {
        require(upgradeId > 0 && upgradeId <= maxUpgradeId, "!upid");
        require(price >= 50000 * 10**18 && price <= 500000 * 10**18, "Price out of range");
        require(upgradeType >= 1 && upgradeType <= 10, "Invalid upgrade type");
        _createGameUpgrade(upgradeId, name, description, price, upgradeType, upgradeValue);
    }

    /**
     * @dev Upgrade fiyatını güncelle
     */
    function updateUpgradePrice(uint256 upgradeId, uint256 newPrice) external onlyRole(ADMIN_ROLE) {
        require(upgradeId > 0 && upgradeId <= maxUpgradeId, "!upid");
        require(newPrice >= 50000 * 10**18 && newPrice <= 500000 * 10**18, "Price out of range");
        gameUpgrades[upgradeId].price = newPrice;
        emit UpgradeUpdated(upgradeId, newPrice, gameUpgrades[upgradeId].isActive);
    }

    /**
     * @dev Upgrade aktiflik durumunu değiştir
     */
    function setUpgradeActive(uint256 upgradeId, bool active) external onlyRole(ADMIN_ROLE) {
        require(upgradeId > 0 && upgradeId <= maxUpgradeId, "!upid");
        gameUpgrades[upgradeId].isActive = active;
        emit UpgradeUpdated(upgradeId, gameUpgrades[upgradeId].price, active);
    }

    /**
     * @dev Internal upgrade creation function
     */
    function _createGameUpgrade(
        uint256 upgradeId,
        string memory name,
        string memory description,
        uint256 price,
        uint8 upgradeType,
        uint256 upgradeValue
    ) internal {
        gameUpgrades[upgradeId] = GameUpgrade({
            name: name,
            description: description,
            price: price,
            upgradeType: upgradeType,
            upgradeValue: upgradeValue,
            isActive: true
        });

        emit UpgradeCreated(upgradeId, name, price);
    }
    
    function _createMarketplaceItemType(
        uint256 _itemTypeId,
        string memory _name,
        string memory _description,
        uint256 _basePrice,
        uint8 _category
    ) internal {
        marketplaceItemTypes[_itemTypeId] = MarketplaceItemType({
            name: _name,
            description: _description,
            basePrice: _basePrice,
            isActive: true,
            category: _category
        });
        
        itemTypeExists[_itemTypeId] = true;
        emit MarketplaceItemTypeCreated(_itemTypeId, _name, _basePrice);
    }

    /**
     * @dev Belirli bir upgrade'in toplam bonus değerini hesapla
     */
    function getUserUpgradeBonus(address user, uint8 upgradeType) external view returns (uint256) {
        uint256 totalBonus = 0;
        
        for (uint256 i = 1; i <= maxUpgradeId; i++) {
            if (userUpgrades[user][i] && gameUpgrades[i].upgradeType == upgradeType) {
                uint256 level = userUpgradeLevels[user][i];
                totalBonus += gameUpgrades[i].upgradeValue * level;
            }
        }
        
        return totalBonus;
    }

    modifier onlyGameParticipant(uint256 gameId) {
        require(games[gameId].stakes[msg.sender] > 0, "Not a participant");
        _;
    }
    
    function getActiveMarketplaceItemCount() public view returns (uint256) {
        return activeMarketplaceIds.length();
    }

    // --- OYUN İÇİ YAKIM (BURN) MEKANİZMASI ---
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    event Burn(address indexed from, uint256 amount, string reason);

    // Ana kontrattaki treasury adresini çekmek için fonksiyon
    function getTreasury() public view returns (address) {
        return coffyToken.treasury();
    }

    // Upgrade satın alırken yakım ve treasury yönlendirmesi
    function purchaseUpgradeWithBurn(uint256 upgradeId) external nonReentrant whenNotPaused {
        GameUpgrade storage upgrade = gameUpgrades[upgradeId];
        require(upgrade.isActive, "!upact");
        require(coffyToken.balanceOf(msg.sender) >= upgrade.price, "Insufficient balance");
        uint256 burnAmount = (upgrade.price * 2000) / 10000; // %20 yakım
        uint256 treasuryAmount = upgrade.price - burnAmount;
        coffyToken.transferForModule(msg.sender, DEAD, burnAmount); // Yakım
        coffyToken.transferForModule(msg.sender, getTreasury(), treasuryAmount); // Treasury'ye kalan
        // ... upgrade işlemi
        emit Burn(msg.sender, burnAmount, "upgrade");
        emit UpgradePurchased(msg.sender, upgradeId, 1, upgrade.price);
    }

    /**
     * @dev Kazanan oyuncu veya herhangi biri, oyunu tamamlayıp kazananı kontrata yazabilir
     */
    function completeGame(uint256 gameId, address winner) external whenNotPaused {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Active || game.status == GameStatus.Pending, "Game already completed");
        require(winner != address(0), "Invalid winner");
        game.status = GameStatus.Completed;
        game.winner = winner;
        emit GameCompleted(gameId, winner, game.totalStaked);
    }

    function createQuickBattle(uint256 _stakeAmount) external nonReentrant whenNotPaused {
        require(_stakeAmount >= 100 * 10**18, "Minimum 100 COFFY");
        require(_stakeAmount <= 10000 * 10**18, "Maximum 10,000 COFFY for quick battles");
        require(coffyToken.balanceOf(msg.sender) >= _stakeAmount, "Insufficient balance");

        IERC20(address(coffyToken)).transferFrom(msg.sender, address(this), _stakeAmount);

        if (quickBattleWaitingPlayer == address(0)) {
            // Bekleyen yok, sıraya al
            quickBattleWaitingPlayer = msg.sender;
            quickBattleWaitingStake = _stakeAmount;
        } else {
            // Eşleşme var, battle başlat
            require(quickBattleWaitingPlayer != msg.sender, "Cannot match with yourself");
            require(quickBattleWaitingStake == _stakeAmount, "Stake must match waiting player");

            address player1 = quickBattleWaitingPlayer;
            address player2 = msg.sender;
            uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player1, player2))) % 2;
            address winner = (random == 0) ? player1 : player2;

            uint256 totalPrize = _stakeAmount * 2;
            uint256 fee = (totalPrize * battleFee) / 10000;
            uint256 winnerPrize = totalPrize - fee;

            coffyToken.transferForModule(address(this), winner, winnerPrize);
            if (fee > 0) {
                coffyToken.transferForModule(address(this), coffyToken.treasury(), fee);
            }

            emit QuickBattleMatched(player1, player2, _stakeAmount, winner);

            // Sırayı temizle
            quickBattleWaitingPlayer = address(0);
            quickBattleWaitingStake = 0;
        }
    }

    // Aktif (açık) battle ID'lerini dönen fonksiyon
    function getActiveBattleIds() public view returns (uint256[] memory) {
        return activeBattleIds.values();
    }
}