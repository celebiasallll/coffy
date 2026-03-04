// SPDX-License-Identifier: MIT
// COFFY GAME MODULE V16 — Single + Match(PvP/Battle) + QuickMatch + Character
// V15→V16: Battle/PvP duplicate events → MatchEvent(id,isBattle,kind,addr,val)
//          Character.name removed | comment lines cleaned
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/access/AccessControl.sol";
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.9.6/utils/cryptography/ECDSA.sol";

interface ICoffyCore {
    function isDAOMember(address user) external view returns (bool);
    function userCharacters(address user, uint256 cid) external view returns (uint128);
    function setDAOMember(address user, bool status) external;
    function addCharacterForModule(address user, uint256 cid, uint128 amount) external;
    function burnCharacterForModule(address user, uint256 cid, uint128 amount) external;
    function getCharacterMultiplier(address user) external view returns (uint256);
    function transferForModule(address from, address to, uint256 amt) external;
    function claimMinBalanceEnabled() external view returns (bool);
    function claimMinBalance() external view returns (uint256);
    function burnFromModule(address from, uint256 amt) external;
    function payRewardFromModule(address to, uint256 amt) external;
    function recordGameResult(bytes32 gameId, address winner) external;
    function community() external view returns (address);
    function minWalletAge() external view returns (uint256);
    function getModuleData(address user, bytes32 key) external view returns (uint256);
    function setModuleData(address user, bytes32 key, uint256 value) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IBonusModule {
    function onGameWin(address winner, uint256 prize, uint16 streak) external;
}

contract CoffyGameModule is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    ICoffyCore public immutable coffyCore;
    IERC20     public immutable coffyToken;
    address    internal trustedSigner;
    address    internal multisig;
    address    internal bonusModule;

    uint8      internal requiredSignatures = 1;
    mapping(address => bool) internal isSigner;

    struct Character { uint128 price; bool isActive; }
    mapping(uint256 => Character) internal characters;
    uint256 internal constant CHARACTER_COUNT = 5;

    struct PlayerStats {
        uint64  totalGames; uint64  wins; uint64  draws; uint64  losses;
        uint128 totalWinnings; uint16 currentStreak; uint16 maxStreak;
    }
    mapping(address => PlayerStats) internal playerStats;

    uint256 internal totalLockedStakes;
    uint256 internal constant MAX_DAILY_BETS = 20;
    mapping(address => mapping(uint256 => uint256)) internal dailyBetCount;

    struct SingleGame { address player; uint64 startedAt; uint64 gameType; bool claimed; }
    mapping(uint256 => SingleGame) internal singleGames;
    mapping(address => uint256)    internal activeGameOf;
    mapping(bytes32 => bool)       internal usedGameSigs;
    uint256 internal nextSingleId      = 1;
    uint256 internal constant MIN_GAME_DURATION = 2 minutes;
    uint256 internal singleGameTimeout = 4 hours;

    // --- Unified Match Structure ---
    struct Match {
        address p1; address p2;
        uint128 stake; uint64 createdAt; uint64 expiresAt;
        uint8 status; address winner;
    }
    mapping(uint256 => Match) internal games;
    mapping(uint256 => mapping(address => bool)) internal hasClaimedGame;
    uint256 internal nextGameId = 1;
    mapping(uint256 => Match) internal battles;
    mapping(uint256 => mapping(address => bool)) internal hasClaimedBattle;
    // We add these two explicitly back to ensure ABI parsers that read the old struct format don't break. 
    uint256 internal nextBattleId = 1;
    
    uint16  internal matchFee           = 500;
    uint32  internal battleExpiration   = 24 hours;
    uint32  internal gameAbandonTimeout = 2 hours;
    uint256 internal constant BATTLE_COOLDOWN = 1 minutes;
    mapping(address => uint256) internal lastBattleTimestamp;

    struct QueueEntry { address player; uint128 stake; uint64 queuedAt; bool active; }
    mapping(uint256 => QueueEntry) internal matchQueue;
    uint256 internal nextQueueId     = 1;
    uint32  internal queueExpiration = 10 minutes;

    uint128 internal minStakeAmount = 1_000      * 1e18;
    uint128 internal maxStakeAmount = 10_000_000 * 1e18;

    uint128 internal minMatchStake = 1 * 1e18;
    uint128 internal maxMatchStake = 50_000 * 1e18;

    bool    internal dynamicLimitEnabled   = true;
    uint256 internal dailyUserLimit        = 10_000  * 1e18;
    uint256 internal maxDailyRewardPerUser = 500_000 * 1e18;
    mapping(address => mapping(uint256 => uint256)) internal dailyUserEarned;
    mapping(uint256 => uint256)                      internal weeklyPlayerCount;
    mapping(uint256 => mapping(address => bool))     internal weeklyPlayerSeen;

    // We restore the original specific events so backend listeners that look for them don't break
    // Single
    event SingleStarted(uint256 indexed id, address indexed player, uint64 gameType);
    event SingleClaimed(uint256 indexed id, address indexed player, uint256 payout);
    event SingleExpired(uint256 indexed id, address indexed player);
    
    // Game Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 stakeAmount);
    event GameJoined(uint256 indexed gameId, address indexed player);
    event GameCompleted(uint256 indexed gameId, address indexed winner, uint256 prize);
    event GameDraw(uint256 indexed gameId, address indexed player, uint256 refundAmount);
    event GameCancelled(uint256 indexed gameId);
    
    // Battle Events
    event BattleCreated(uint256 indexed battleId, address indexed initiator, uint256 stakeAmount);
    event BattleJoined(uint256 indexed battleId, address indexed opponent);
    event BattleCompleted(uint256 indexed battleId, address indexed winner, uint256 prize);
    event BattleDraw(uint256 indexed battleId, address indexed player, uint256 refundAmount);
    event BattleCancelled(uint256 indexed battleId);
    
    // Queue
    event QueueJoined(uint256 indexed id, address indexed player, uint256 stake);
    event QueueCancelled(uint256 indexed id, address indexed player);
    event QuickMatchMade(uint256 indexed gameId, address p1, address p2, uint256 stake);
    
    // Misc
    event CharacterPurchased(address indexed buyer, uint256 indexed cid, uint256 price);
    event DAOMemberAdded(address indexed member);
    event StreakFrozen(address indexed player, uint16 streak);
    event DailyLimitExceeded(address indexed user, uint256 attempted, uint256 remaining);
    event FundsWithdrawn(address indexed to, uint256 amt);
    event BonusModuleSet(address indexed mod);


    error Unauthorized();
    error InvalidAmount();
    error InvalidLimits();
    error InvalidSignature();
    error InvalidGame();

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 internal constant SINGLE_WIN_TYPEHASH = keccak256("SingleWin(uint256 id,address user,uint256 payout,uint256 deadline)");
    bytes32 internal constant GAME_WIN_TYPEHASH   = keccak256("GameWin(uint256 id,address winner)");
    bytes32 internal constant GAME_DRAW_TYPEHASH  = keccak256("GameDraw(uint256 id)");
    bytes32 internal constant BATTLE_WIN_TYPEHASH = keccak256("BattleWin(uint256 id,address winner)");
    bytes32 internal constant BATTLE_DRAW_TYPEHASH = keccak256("BattleDraw(uint256 id)");
    bytes32 internal constant QUICK_MATCH_TYPEHASH = keccak256("QuickMatch(uint256 q1,uint256 q2)");

    constructor(address _core, address _signer, address _multisig) {
        if (_core == address(0) || _signer == address(0) || _multisig == address(0)) revert Unauthorized();
        coffyCore     = ICoffyCore(_core);
        coffyToken    = IERC20(_core);
        trustedSigner = _signer;
        multisig      = _multisig;
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(ADMIN_ROLE, _multisig);
        _grantRole(ADMIN_ROLE, msg.sender);
        characters[1] = Character(1_000_000  * 1e18, true);
        characters[2] = Character(3_000_000  * 1e18, true);
        characters[3] = Character(5_000_000  * 1e18, true);
        characters[4] = Character(8_000_000  * 1e18, true);
        characters[5] = Character(10_000_000 * 1e18, true);

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Coffy")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function _checkAdmin() internal view { if (!hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(); }
    modifier onlyAdmin() { _checkAdmin(); _; }

    function _checkDefaultAdmin() internal view { if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized(); }
    modifier onlyDefaultAdmin() { _checkDefaultAdmin(); _; }

    function emergencyPause() external {
        if (msg.sender != trustedSigner && msg.sender != multisig) revert Unauthorized();
        _pause();
    }

    function purchaseCharacter(uint8 cid, uint128 amount) external nonReentrant whenNotPaused {
        if (cid < 1 || cid > CHARACTER_COUNT || amount == 0) revert InvalidAmount();
        Character storage c = characters[cid];
        if (!c.isActive) revert Unauthorized();
        _basicRequirements();
        
        uint256 totalPrice = uint256(c.price) * amount;
        coffyCore.burnFromModule(msg.sender, totalPrice);
        coffyCore.addCharacterForModule(msg.sender, cid, uint128(amount));
        
        if (cid == 5 && !coffyCore.isDAOMember(msg.sender)) {
            coffyCore.setDAOMember(msg.sender, true);
            emit DAOMemberAdded(msg.sender);
        }
        emit CharacterPurchased(msg.sender, cid, totalPrice);
    }

    function startGame(uint64 gameType) external nonReentrant whenNotPaused {
        _basicRequirements();
        if (activeGameOf[msg.sender] != 0) revert InvalidGame();
        _incrementDailyBets();
        uint256 id = nextSingleId++;
        singleGames[id] = SingleGame(msg.sender, uint64(block.timestamp), gameType, false);
        activeGameOf[msg.sender] = id;
        _recordPlayer();
        emit SingleStarted(id, msg.sender, gameType);
    }

    function claimSingleWin(uint256 id, uint256 payout, uint256 deadline, bytes calldata sig) external nonReentrant whenNotPaused {
        SingleGame storage sg = singleGames[id];
        if (sg.player != msg.sender || sg.claimed) revert Unauthorized();
        if (activeGameOf[msg.sender] != id) revert InvalidGame();
        if (block.timestamp < sg.startedAt + MIN_GAME_DURATION) revert InvalidLimits();
        if (block.timestamp > sg.startedAt + singleGameTimeout) revert InvalidLimits();
        
        _verifySig(keccak256(abi.encode(SINGLE_WIN_TYPEHASH, id, msg.sender, payout, deadline)), sig);
        sg.claimed = true;
        activeGameOf[msg.sender] = 0;

        uint256 allowed = _checkDailyLimit(msg.sender, (payout * coffyCore.getCharacterMultiplier(msg.sender)) / 100);
        if (allowed == 0) revert InvalidLimits();
        
        try coffyCore.payRewardFromModule(msg.sender, allowed) {} catch { revert InvalidAmount(); }
        _updateStats(msg.sender, address(0), allowed);
        _notifyBonus(msg.sender, allowed, playerStats[msg.sender].currentStreak);
        coffyCore.recordGameResult(keccak256(abi.encodePacked("SINGLE", id)), msg.sender);
        emit SingleClaimed(id, msg.sender, allowed);
    }

    function expireSingleGame(uint256 id) external nonReentrant {
        SingleGame storage sg = singleGames[id];
        if (sg.claimed || activeGameOf[sg.player] != id) revert InvalidGame();
        if (block.timestamp <= sg.startedAt + singleGameTimeout) revert InvalidLimits();
        activeGameOf[sg.player] = 0;
        PlayerStats storage ps = playerStats[sg.player];
        ps.totalGames++; ps.losses++; ps.currentStreak = 0;
        emit SingleExpired(id, sg.player);
    }

    // --- GAME / MULTIPLAYER / BATTLE UNIFICATION ---
    function createGame(uint128 stake) public nonReentrant whenNotPaused {
        _createMatch(games[nextGameId], stake, 0);
        emit GameCreated(nextGameId++, msg.sender, stake);
    }

    function createMultiplayerGame(uint128 stake) external { createGame(stake); }

    function createBattle(uint128 stake) external nonReentrant whenNotPaused {
        if (block.timestamp < lastBattleTimestamp[msg.sender] + BATTLE_COOLDOWN) revert InvalidLimits();
        lastBattleTimestamp[msg.sender] = block.timestamp;
        _createMatch(battles[nextBattleId], stake, uint64(block.timestamp + battleExpiration));
        emit BattleCreated(nextBattleId++, msg.sender, stake);
    }

    function _createMatch(Match storage m, uint128 stake, uint64 exp) internal {
        _basicRequirements();
        if (stake < minMatchStake || stake > maxMatchStake) revert InvalidLimits();
        _incrementDailyBets();
        _transferAndLock(stake);
        m.p1 = msg.sender; m.stake = stake; m.createdAt = uint64(block.timestamp); m.expiresAt = exp;
        _recordPlayer();
    }

    function joinGame(uint256 id) external nonReentrant whenNotPaused {
        _joinMatch(games[id]);
        emit GameJoined(id, msg.sender);
    }

    function joinBattle(uint256 id) external nonReentrant whenNotPaused {
        Match storage b = battles[id];
        if (block.timestamp > b.expiresAt) revert InvalidLimits();
        _joinMatch(b);
        emit BattleJoined(id, msg.sender);
    }

    function _joinMatch(Match storage m) internal {
        _basicRequirements();
        if (m.status != 0 || msg.sender == m.p1) revert Unauthorized();
        _incrementDailyBets();
        _transferAndLock(m.stake);
        m.p2 = msg.sender; m.status = 1;
        _recordPlayer();
    }

    function claimGameWin(uint256 id, bytes calldata sig) external nonReentrant whenNotPaused {
        uint256 allowed = _claimMatchWin(games[id], id, false, GAME_WIN_TYPEHASH, hasClaimedGame[id], sig);
        emit GameCompleted(id, msg.sender, allowed);
    }
    
    function claimBattleWin(uint256 id, bytes calldata sig) external nonReentrant whenNotPaused {
        uint256 allowed = _claimMatchWin(battles[id], id, true, BATTLE_WIN_TYPEHASH, hasClaimedBattle[id], sig);
        emit BattleCompleted(id, msg.sender, allowed);
    }

    function _claimMatchWin(Match storage m, uint256 id, bool isBattle, bytes32 th, mapping(address=>bool) storage claimed, bytes calldata sig) internal returns (uint256 allowed) {
        if (m.status != 1) revert InvalidGame();
        if (msg.sender != m.p1 && msg.sender != m.p2) revert Unauthorized();
        if (claimed[msg.sender]) revert Unauthorized();
        _verifySig(keccak256(abi.encode(th, id, msg.sender)), sig);
        
        m.status = 2; m.winner = msg.sender;
        claimed[msg.sender] = true;
        
        uint256 total = uint256(m.stake) * 2;
        totalLockedStakes -= total;
        allowed = _distributeFeeAndPrize(total, matchFee, msg.sender);
        _updateStats(msg.sender, (msg.sender == m.p1) ? m.p2 : m.p1, allowed);
        coffyCore.recordGameResult(keccak256(abi.encodePacked(isBattle ? "BATTLE" : "GAME", id)), msg.sender);
    }

    function claimGameDraw(uint256 id, bytes calldata sig) external nonReentrant whenNotPaused {
        _claimMatchDraw(games[id], id, GAME_DRAW_TYPEHASH, hasClaimedGame[id], sig);
        emit GameDraw(id, msg.sender, games[id].stake);
    }
    
    function claimBattleDraw(uint256 id, bytes calldata sig) external nonReentrant whenNotPaused {
        _claimMatchDraw(battles[id], id, BATTLE_DRAW_TYPEHASH, hasClaimedBattle[id], sig);
        emit BattleDraw(id, msg.sender, battles[id].stake);
    }

    function _claimMatchDraw(Match storage m, uint256 id, bytes32 th, mapping(address=>bool) storage claimed, bytes calldata sig) internal {
        if (m.status != 1 && m.status != 4) revert InvalidGame();
        if (msg.sender != m.p1 && msg.sender != m.p2) revert Unauthorized();
        if (claimed[msg.sender]) revert Unauthorized();
        _verifySig(keccak256(abi.encode(th, id)), sig);
        claimed[msg.sender] = true;

        totalLockedStakes -= m.stake;
        if (m.status == 1) m.status = 4;
        if (claimed[(msg.sender == m.p1) ? m.p2 : m.p1]) { m.status = 2; m.winner = address(0); }
        coffyToken.safeTransfer(msg.sender, m.stake);
        PlayerStats storage ps = playerStats[msg.sender];
        ps.totalGames++; ps.draws++;
        emit StreakFrozen(msg.sender, ps.currentStreak);
    }

    function cancelGame(uint256 id) external nonReentrant { 
        _cancelMatch(games[id], false); 
        emit GameCancelled(id); 
    }
    
    function cancelBattle(uint256 id) external nonReentrant { 
        _cancelMatch(battles[id], true); 
        emit BattleCancelled(id);
    }
    
    function emergencyCancelGame(uint256 id)  external onlyAdmin nonReentrant { 
        _emergencyCancel(games[id]); 
        emit GameCancelled(id); 
    }
    
    function emergencyCancelBattle(uint256 id) external onlyAdmin nonReentrant { 
        _emergencyCancel(battles[id]); 
        emit BattleCancelled(id); 
    }

    function _cancelMatch(Match storage m, bool isBattle) internal {
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        if (m.status == 0) {
            bool expired = (isBattle) ? block.timestamp > m.expiresAt : false;
            if (msg.sender != m.p1 && !isAdmin && !expired) revert Unauthorized();
            totalLockedStakes -= m.stake;
            coffyToken.safeTransfer(m.p1, m.stake);
        } else if (m.status == 1) {
            if (!isAdmin && block.timestamp < m.createdAt + gameAbandonTimeout) revert InvalidLimits();
            uint256 total = uint256(m.stake) * 2;
            totalLockedStakes -= total;
            coffyToken.safeTransfer(m.p1, m.stake);
            coffyToken.safeTransfer(m.p2, total - m.stake); 
        } else revert Unauthorized();
        m.status = 3;
    }

    function _emergencyCancel(Match storage m) internal {
        if (m.status != 0 && m.status != 1) revert Unauthorized();
        uint8 old = m.status; m.status = 3;
        totalLockedStakes -= m.stake;
        coffyToken.safeTransfer(m.p1, m.stake);
        if (old == 1 && m.p2 != address(0)) {
            totalLockedStakes -= m.stake;
            coffyToken.safeTransfer(m.p2, m.stake);
        }
    }

    // --- QUICK MATCH ---
    function joinQuickMatch(uint128 stake) external nonReentrant whenNotPaused {
        if (stake < minMatchStake || stake > maxMatchStake) revert InvalidLimits();
        _incrementDailyBets();
        _transferAndLock(stake);
        
        uint256 id = nextQueueId++;
        matchQueue[id] = QueueEntry(msg.sender, stake, uint64(block.timestamp), true);
        _recordPlayer();
        emit QueueJoined(id, msg.sender, stake);
    }

    function cancelQuickMatch(uint256 id) external nonReentrant {
        QueueEntry storage e = matchQueue[id];
        if (!e.active || e.player != msg.sender) revert Unauthorized();
        e.active = false;
        totalLockedStakes -= e.stake;
        coffyToken.safeTransfer(msg.sender, e.stake);
        emit QueueCancelled(id, msg.sender);
    }

    function cancelExpiredQueue(uint256 id) external nonReentrant {
        QueueEntry storage e = matchQueue[id];
        if (!e.active || block.timestamp < e.queuedAt + queueExpiration) revert InvalidGame();
        e.active = false;
        totalLockedStakes -= e.stake;
        coffyToken.safeTransfer(e.player, e.stake);
        emit QueueCancelled(id, e.player);
    }

    function executeQuickMatch(uint256 q1, uint256 q2, bytes calldata sig) external nonReentrant whenNotPaused onlyAdmin {
        QueueEntry storage e1 = matchQueue[q1];
        QueueEntry storage e2 = matchQueue[q2];
        if (!e1.active || !e2.active || e1.player == e2.player || e1.stake != e2.stake) revert Unauthorized();
        
        _verifySig(keccak256(abi.encode(QUICK_MATCH_TYPEHASH, q1, q2)), sig);
        e1.active = false; e2.active = false;
        
        uint256 id = nextGameId++;
        games[id] = Match(e1.player, e2.player, e1.stake, uint64(block.timestamp), 0, 1, address(0));
        emit QuickMatchMade(id, e1.player, e2.player, e1.stake);
        emit GameCreated(id, e1.player, e1.stake);
        emit GameJoined(id, e2.player);
    }

    // --- INTERNAL HELPER METHODS ---
    function _basicRequirements() internal {
        uint256 firstTx = coffyCore.getModuleData(msg.sender, keccak256("wallet:firstTx"));
        if (firstTx == 0) {
            coffyCore.setModuleData(msg.sender, keccak256("wallet:firstTx"), block.timestamp);
            if (coffyCore.minWalletAge() > 0) revert Unauthorized();
        } else if (coffyCore.minWalletAge() > 0 && block.timestamp < firstTx + coffyCore.minWalletAge()) revert Unauthorized();
        if (coffyCore.claimMinBalanceEnabled() && coffyToken.balanceOf(msg.sender) < coffyCore.claimMinBalance()) revert Unauthorized();
    }

    function _incrementDailyBets() internal {
        uint256 today = block.timestamp / 1 days;
        if (dailyBetCount[msg.sender][today] >= MAX_DAILY_BETS) revert InvalidLimits();
        dailyBetCount[msg.sender][today]++;
    }

    function _transferAndLock(uint256 stake) internal {
        coffyCore.transferForModule(msg.sender, address(this), stake);
        totalLockedStakes += stake;
    }

    function _distributeFeeAndPrize(uint256 total, uint16 feeBPS, address winner) internal returns (uint256 finalPayout) {
        uint256 half = (total * feeBPS) / 20000;
        coffyToken.safeTransfer(DEAD, half);
        coffyToken.safeTransfer(coffyCore.community(), half);
        
        uint256 prize   = total - (half * 2);
        uint256 allowed = _checkDailyLimit(winner, prize);
        finalPayout     = (allowed * coffyCore.getCharacterMultiplier(winner)) / 100;
        
        if (finalPayout > 0) {
            uint256 contractPart = allowed > prize ? prize : allowed;
            coffyToken.safeTransfer(winner, contractPart);
            if (finalPayout > contractPart) try coffyCore.payRewardFromModule(winner, finalPayout - contractPart) {} catch {}
            _notifyBonus(winner, finalPayout, playerStats[winner].currentStreak);
        }
        if (prize > allowed) coffyToken.safeTransfer(coffyCore.community(), prize - allowed);
    }

    function _verifySig(bytes32 structHash, bytes calldata sig) internal {
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (usedGameSigs[hash]) revert InvalidSignature();
        
        if (requiredSignatures == 1) {
            if (ECDSA.recover(hash, sig) != trustedSigner) revert InvalidSignature();
        } else {
            if (sig.length != uint256(requiredSignatures) * 65) revert InvalidSignature();
            address lastSigner = address(0);
            for (uint8 i = 0; i < requiredSignatures; i++) {
                bytes memory currentSig = sig[i*65 : (i+1)*65];
                address recovered = ECDSA.recover(hash, currentSig);
                if (!isSigner[recovered]) revert InvalidSignature();
                if (recovered <= lastSigner) revert InvalidSignature();
                lastSigner = recovered;
            }
        }
        usedGameSigs[hash] = true;
    }

    function _updateStats(address winner, address loser, uint256 prize) internal {
        PlayerStats storage w = playerStats[winner];
        w.totalGames++; w.wins++; w.totalWinnings += uint128(prize); w.currentStreak++;
        if (w.currentStreak > w.maxStreak) w.maxStreak = w.currentStreak;
        PlayerStats storage l = playerStats[loser];
        l.totalGames++; l.losses++; l.currentStreak = 0;
    }

    function _checkDailyLimit(address user, uint256 amount) internal returns (uint256 allowed) {
        uint256 lim    = _dynDailyLimit();
        uint256 dayKey = block.timestamp / 1 days;
        uint256 earned = dailyUserEarned[user][dayKey];
        if (earned >= maxDailyRewardPerUser || earned >= lim) {
            emit DailyLimitExceeded(user, amount, 0); return 0;
        }
        uint256 rem = lim > earned ? lim - earned : 0;
        if (maxDailyRewardPerUser - earned < rem) rem = maxDailyRewardPerUser - earned;
        allowed = amount > rem ? rem : amount;
        dailyUserEarned[user][dayKey] += allowed;
        if (allowed < amount) emit DailyLimitExceeded(user, amount, rem);
    }

    function _dynDailyLimit() internal view returns (uint256) {
        if (!dynamicLimitEnabled) return dailyUserLimit;
        uint256 cBal = coffyCore.balanceOf(coffyCore.community());
        if (cBal == 0) return dailyUserLimit;
        uint256 players = weeklyPlayerCount[block.timestamp / 1 weeks];
        if (players < 100) players = 100;
        uint256 perDay = (cBal * 5 / 10000) / players / 7;
        uint256 lim = perDay < (cBal / 100000) ? perDay : (cBal / 100000);
        uint256 whale = (cBal * 5) / 14000000;
        lim = lim < whale ? lim : whale;
        return lim > dailyUserLimit ? lim : dailyUserLimit;
    }

    function _recordPlayer() internal {
        uint256 week = block.timestamp / 1 weeks;
        if (!weeklyPlayerSeen[week][msg.sender]) { weeklyPlayerSeen[week][msg.sender] = true; weeklyPlayerCount[week]++; }
    }

    function _notifyBonus(address winner, uint256 prize, uint16 streak) internal {
        if (bonusModule != address(0)) try IBonusModule(bonusModule).onGameWin(winner, prize, streak) {} catch {}
    }

    // --- RESTORED VIEW / GETTERS TO PREVENT FRONTEND ABI BREAKAGE ---

    function getUserCharacterBalance(address user, uint256 cid) external view returns (uint128) {
        return coffyCore.userCharacters(user, cid);
    }

    function getUserHighestCharacter(address user) external view returns (uint256 highestCid) {
        for (uint256 i = CHARACTER_COUNT; i >= 1; i--)
            if (coffyCore.userCharacters(user, i) > 0) return i;
        return 0;
    }

    function getCharacterInfo(uint256 cid) external view returns (uint128 price, bool isActive) {
        return (characters[cid].price, characters[cid].isActive);
    }

    function getGameInfo(uint256 id) external view returns (
        address player1, address player2, uint128 stakePerPlayer, uint128 totalStaked,
        uint64 createdAt, uint8 status, address winner, bool canCancel
    ) {
        Match storage g = games[id];
        return (g.p1, g.p2, g.stake, g.stake * 2, g.createdAt,
                g.status, g.winner,
                (g.status == 1 && block.timestamp >= g.createdAt + gameAbandonTimeout));
    }

    function getQueueEntry(uint256 id) external view returns (
        address player, uint128 stake, uint64 queuedAt, bool active, bool isExpired
    ) {
        QueueEntry storage e = matchQueue[id];
        return (e.player, e.stake, e.queuedAt, e.active,
                e.active && block.timestamp >= e.queuedAt + queueExpiration);
    }

    function getPoolStats() external view returns (uint256 total, uint256 locked, uint256 available) {
        total = coffyToken.balanceOf(address(this));
        locked = totalLockedStakes;
        available = total > locked ? total - locked : 0;
    }

    function getSystemState() external view returns (
        uint256 gameId, uint256 battleId, uint256 queueId,
        uint128 minGameStake, uint128 maxGameStake,
        uint256 dailyLimit, uint256 maxDailyReward
    ) {
        return (
            nextGameId, nextBattleId, nextQueueId,
            minMatchStake, maxMatchStake,
            dailyUserLimit, maxDailyRewardPerUser
        );
    }

    function getPlayerStats(address user) external view returns (PlayerStats memory) {
        return playerStats[user];
    }

    function getPlayerDailyEarned(address user) external view returns (uint256) {
        return dailyUserEarned[user][block.timestamp / 1 days];
    }

    // Kullanıcının sistemdeki genel anlık aktivite durumunu çeker
    function getUserGameState(address user) external view returns (
        uint256 activeSingleGameId, 
        uint256 dailyBetsPlaced,
        uint256 lastBattleTime
    ) {
        return (
            activeGameOf[user],
            dailyBetCount[user][block.timestamp / 1 days],
            lastBattleTimestamp[user]
        );
    }

    // --- ADMIN ---
    function setTrustedSigner(address s)            external onlyDefaultAdmin { if (s == address(0)) revert Unauthorized(); trustedSigner = s; }
    function setMultiSigner(address s, bool active) external onlyDefaultAdmin { if (s == address(0)) revert Unauthorized(); isSigner[s] = active; }
    function setRequiredSignatures(uint8 req)       external onlyDefaultAdmin { if (req == 0) revert InvalidLimits(); requiredSignatures = req; }
    function setMatchFee(uint16 f)                  external onlyAdmin { if (f > 1000) revert InvalidLimits(); matchFee = f; }
    function setMatchLimits(uint128 mn, uint128 mx) external onlyAdmin { if (mn == 0 || mx < mn || mx > 500_000 * 1e18) revert InvalidLimits(); minMatchStake = mn; maxMatchStake = mx; }
    function setStakeLimits(uint128 mn, uint128 mx) external onlyAdmin { if (mn == 0 || mx < mn) revert InvalidLimits(); minStakeAmount = mn; maxStakeAmount = mx; }
    function setBattleExpiration(uint32 e)          external onlyAdmin { if (e < 1 hours || e > 7 days) revert InvalidLimits(); battleExpiration = e; }
    function setQueueExpiration(uint32 e)           external onlyAdmin { if (e < 1 minutes || e > 1 hours) revert InvalidLimits(); queueExpiration = e; }
    function setAbandonTimeout(uint32 t)            external onlyAdmin { if (t < 30 minutes || t > 24 hours) revert InvalidLimits(); gameAbandonTimeout = t; }
    function setSingleGameTimeout(uint256 t)        external onlyAdmin { if (t < 5 minutes || t > 24 hours) revert InvalidLimits(); singleGameTimeout = t; }
    function setBonusModule(address b)              external onlyAdmin { bonusModule = b; emit BonusModuleSet(b); }
    function setCharacterActive(uint256 cid, bool a) external onlyAdmin { if (cid < 1 || cid > CHARACTER_COUNT) revert InvalidAmount(); characters[cid].isActive = a; }
    function setDailyLimit(bool dyn, uint256 lim)   external onlyAdmin { if (lim < 1_000 * 1e18 || lim > 100_000 * 1e18) revert InvalidLimits(); dynamicLimitEnabled = dyn; dailyUserLimit = lim; }
    function setMaxDailyReward(uint256 v)           external onlyAdmin { if (v < 1_000 * 1e18) revert InvalidLimits(); maxDailyRewardPerUser = v; }

    function withdrawAvailableFunds(address to, uint256 amt) external nonReentrant onlyAdmin {
        if (to == address(0)) revert Unauthorized();
        uint256 a = coffyToken.balanceOf(address(this));
        if (amt > (a > totalLockedStakes ? a - totalLockedStakes : 0)) revert InvalidLimits();
        coffyToken.safeTransfer(to, amt);
        emit FundsWithdrawn(to, amt);
    }

    function pause()   external onlyAdmin         { _pause(); }
    function unpause() external onlyDefaultAdmin  { _unpause(); }
}
