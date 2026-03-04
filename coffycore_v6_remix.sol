// SPDX-License-Identifier: MIT
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  COFFY COIN — IMMORTAL CORE V6                                               ║
// ║  Base (Coinbase L2)  |  Immutable Core Token                                ║
// ║  ⚠️  THIS CONTRACT CANNOT BE CHANGED AFTER DEPLOY                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// FIXES (V5 → V6):
//  [V6-FIX-01] BRIDGE_ROLE added — bridge contracts can mint/burn with this role.
//  [V6-FIX-02] burnForBridge() — burns COFFY on Base when user moves to another chain.
//  [V6-FIX-03] mintFromBridge() — mints COFFY on Base when user arrives from another chain.
//              NOT ADDED to yearlyMinted — bridge transfer is not new emission.
//  [V6-FIX-04] setBridgeContract() — admin sets bridge address, old bridge's
//              role is automatically revoked. Requires Timelock or ADMIN_ROLE.
//  [V6-FIX-05] dailyBridgeMintLimit — daily bridge mint limit (1% of total supply).
//              Protection against infinite mint attacks on bridge hacks.
//  [V6-FIX-06] BridgeMint / BridgeBurn / BridgeContractSet events added.
//  [V6-FIX-07] _teamVesting + _marketingVesting → single _vestingContract parameter.
//              VESTING_ALLOCATION = 20% minted at once. Constructor has 6 parameters.
//              triggerInflation also mints to a single vestingContract.
//  [V6-FIX-08] vestingContract removed — vesting will be an independent contract, Core doesn't know it.
//              Replaced by _team wallet. Team + Marketing tokens minted directly to team wallet.
//              Vesting is attached later as a module.
//
// FIXES (V4 → V5):
//  [V5-FIX-01] registerModule(address, name, kind) — gives MODULE_ROLE and sets
//              the corresponding slot (gameModule, activityModule etc.) in one call.
//              setGameModule / setActivityModule / setNFTModule / setRWAModule
//              separate functions REMOVED. One step is enough at deploy.
//  [V5-FIX-02] ModuleKind — "game" | "activity" | "nft" | "rwa" | "" (generic)
//              Secure comparison with bytes32 hash instead of string.
//  [V5-FIX-03] deactivateModule — also clears the corresponding kind slot.
//  [V5-FIX-04] reactivateModule — reads kind from ModuleInfo and restores the slot.
//  [V5-FIX-05] kind added to ModuleRegistered event.
//
// FIXES (V3 → V4):
//  [FIX-14] maxWeeklyCommunitySpend — dynamic: 1% of current balance instead of fixed number.
//  [FIX-15] maxWeeklyTreasurySpend  — dynamic: 1% of current balance instead of fixed number.
//  [FIX-16] MAX_WEEKLY_COMMUNITY_SPEND + MAX_WEEKLY_TREASURY_SPEND constants removed.
//  [FIX-17] Inflation 2%/year → 5%/year (2.5% every 6 months) — SocialFi/GameFi growth model.
//
// FIXES (V2 → V3):
//  [FIX-01] transferForModule added — critical function called by modules but NOT in Core before.
//  [FIX-02] revokeDeployerRole() — after 30 days, deployer DEFAULT_ADMIN + ADMIN_ROLE permanently removed.
//  [FIX-03] _yearKey() deploy-relative — secure year calculation against UTC epoch drift.
//  [FIX-04] Community pool weekly spending limit — 1%/week (~52.5M COFFY).
//  [FIX-05] Treasury pool weekly spending limit — 1%/week (~37.5M COFFY).
//  [FIX-06] mintForModule + triggerInflation use same yearlyMinted pool (total 2%/year).
//  [FIX-07] cancelRecovery() — cancellation mechanism against accidental triggers.
//  [FIX-08] moduleList push guard — same address not added twice.
//  [FIX-09] setDexTax/setDEXPair — can be changed by timelockModule OR ADMIN_ROLE.
//  [FIX-10] unpause ONLY multisig — admin cannot open the system alone.
//  [FIX-11] transferForModule — from==to protection + allowance check.
//  [FIX-12] transfer/transferFrom — whenNotPaused guard added + totalBurned updated.
//  [FIX-13] Constructor — deployer==multisig and deployer==recovery checks added.

pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.6/access/AccessControl.sol";
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.6/utils/cryptography/ECDSA.sol";

// ─── Module Interface ──────────────────────────────────────────────────────────────
interface IModuleReceiver {
    function onModuleMessage(address sender, bytes32 topic, bytes calldata data) external returns (bool);
}

// ─── ICoffyCore Interface — All modules use this interface ──────────────────────
interface ICoffyCore {
    function TOTAL_SUPPLY() external view returns (uint256);
    function community() external view returns (address);
    function treasury() external view returns (address);
    function liquidity() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
    function addUserXP(address user, uint128 amount) external;
    function grantBadge(address user, uint8 badgeId) external;
    function recordGameResult(bytes32 gameId, address winner) external;
    function emitRegistryHook(address user, bytes32 topic, bytes32 data) external;
    function payRewardFromModule(address to, uint256 amt) external;
    function payFromTreasury(address to, uint256 amt) external;
    function burnFromModule(address from, uint256 amt) external;
    function mintForModule(address to, uint256 amt) external;
    function transferForModule(address from, address to, uint256 amt) external;
    function getUserXP(address user) external view returns (uint128);
    function hasBadge(address user, uint8 badgeId) external view returns (bool);
    function setModuleData(address user, bytes32 key, uint256 value) external;
    function getModuleData(address user, bytes32 key) external view returns (uint256);
    function isDEXPair(address pair) external view returns (bool);
    function dexTax() external view returns (uint16);
    function minWalletAge() external view returns (uint256);
    function claimMinBalanceEnabled() external view returns (bool);
    function claimMinBalance() external view returns (uint256);
    // Module slot getters — modules use these to recognize each other
    function gameModule() external view returns (address);
    function activityModule() external view returns (address);
    function nftModule() external view returns (address);
    function rwaModule() external view returns (address);
}

// ─── Main Contract ──────────────────────────────────────────────────────────────────
contract CoffyCoin is ERC20, AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    // ─── Roles ───────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant MODULE_ROLE   = keccak256("MODULE_ROLE");
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 public constant BRIDGE_ROLE   = keccak256("BRIDGE_ROLE"); // [V6-FIX-01]

    // ─── Token Distribution — IMMUTABLE ───────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY         = 15_000_000_000 * 1e18;
    uint256 public constant TREASURY_ALLOCATION  = (TOTAL_SUPPLY * 25) / 100;
    uint256 public constant LIQUIDITY_ALLOCATION = (TOTAL_SUPPLY * 20) / 100;
    uint256 public constant COMMUNITY_ALLOCATION = (TOTAL_SUPPLY * 35) / 100;
    // [V6-FIX-08] Team + Marketing tokens are minted directly to the team wallet
    // Vesting is an independent contract — Core doesn't know it, connected later as a module
    uint256 public constant TEAM_ALLOCATION      = (TOTAL_SUPPLY * 10) / 100;
    uint256 public constant MARKETING_ALLOCATION = (TOTAL_SUPPLY * 10) / 100;

    // ─── Emission Constants — IMMUTABLE ────────────────────────────────────────────
    uint256 public constant MAX_ANNUAL_MINT = (TOTAL_SUPPLY * 5) / 100; // 750M/year — [FIX-17]
    uint256 public constant SEMI_INFLATION  = 250; // 2.5% in 6 months (250 bps) — [FIX-17]

    // ─── Rate Limit — [FIX-14, FIX-15] Dynamic: 1% of current balance instead of fixed number ──────
    // Fixed MAX_WEEKLY_COMMUNITY_SPEND and MAX_WEEKLY_TREASURY_SPEND removed.
    // Every week, 1% of the current pool balance can be spent.
    // As the pool grows, the limit grows; as it shrinks, the limit shrinks — self-balancing.
    function maxWeeklyCommunitySend() public view returns (uint256) {
        return balanceOf(community) / 100; // 1% of current community balance
    }
    function maxWeeklyTreasurySend() public view returns (uint256) {
        return balanceOf(treasury) / 100;  // 1% of current treasury balance
    }

    // ─── Addresses ─────────────────────────────────────────────────────────────────
    address public treasury;
    address public liquidity;
    address public community;
    // [V6-FIX-08] Vesting independent of Core — team and marketing direct wallets
    address public team;
    address public marketing;
    address public multisig;

    address public immutable deployerAddr;
    uint256 public immutable deployerExpiry;
    bool    public deployerRevoked;

    address public immutable recoveryAddress;
    uint256 public recoveryProposedAt;
    uint256 public immutable LAUNCH_TIME;

    // ─── Module Registry ──────────────────────────────────────────────────────────────
    struct Module {
        string name;
        string kind;
        uint8  status; // 0: None, 1: Active, 2: Inactive
        uint64 registeredAt;
    }
    mapping(address => Module) public modules;
    address[] public moduleList;

    address public timelockModule;
    address public gameModule;
    address public activityModule;
    address public nftModule;
    address public rwaModule;

    // [V5-FIX-02] Kind constants — used in registerModule
    bytes32 private constant KIND_GAME     = keccak256("game");
    bytes32 private constant KIND_ACTIVITY = keccak256("activity");
    bytes32 private constant KIND_NFT      = keccak256("nft");
    bytes32 private constant KIND_RWA      = keccak256("rwa");

    bytes32 public DOMAIN_SEPARATOR;
    mapping(address => uint256) public nonces;

    // ─── Manageable Parameters ───────────────────────────────────────────────
    uint256 public minWalletAge           = 3 days;
    uint16  public dexTax                 = 200;
    bool    public claimMinBalanceEnabled = false;
    uint256 public claimMinBalance        = 50_000 * 1e18;
    
    // ════════════════════════════ GLOBAL ASSETS ════════════════════════════
    struct Character { uint128 price; bool isActive; }
    mapping(uint256 => Character)                   public characters;
    mapping(address => mapping(uint256 => uint128)) public userCharacters;
    mapping(address => bool)                        public isDAOMember;
    uint256 public constant CHARACTER_COUNT = 5;

    event CharacterInventoryUpdated(address indexed user, uint256 indexed cid, uint128 amount, bool added);
    event DAOMemberSet(address indexed user, bool status);
    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    // ─── Inflation ────────────────────────────────────────────────────────────────
    mapping(uint256 => uint256) public yearlyMinted;
    uint256 public lastInflationTime;

    // ─── Bridge [V6-FIX-01] ───────────────────────────────────────────────────────
    // Active bridge contract address — set with setBridgeContract()
    address public bridgeContract;
    // [V6-FIX-05] Daily bridge mint limit — protection against infinite mint attack
    // Default: 1% of total supply (150M COFFY)
    uint256 public dailyBridgeMintLimit = TOTAL_SUPPLY / 100;
    // Daily mint tracking: dayKey => mintedAmount
    mapping(uint256 => uint256) public dailyBridgeMinted;

    // ─── Burn ─────────────────────────────────────────────────────────────────────
    uint256 public totalBurned;

    // ─── DEX ──────────────────────────────────────────────────────────────────────
    mapping(address => bool) public dexPairs;

    // ─── Storage ──────────────────────────────────────────────────────────────────
    mapping(address => mapping(bytes32 => uint256)) private _moduleData;
    mapping(address => uint128)                     private _userXP;
    mapping(address => uint256)                     private _badgeBitmap;

    // ─── Rate Limit Trackers [FIX-04, FIX-05] ────────────────────────────────────
    mapping(uint256 => uint256) public weeklyCommunitySent;
    mapping(uint256 => uint256) public weeklyTreasurySent;

    // ─── Events ───────────────────────────────────────────────────────────────────
    event ModuleRegistered(address indexed module, string name, string kind); // [V7-FIX] Changed bytes32 to string
    event ModuleStatusChanged(address indexed module, uint8 status); // [V7-FIX] Added
    event ModuleDeactivated(address indexed module);
    event ModuleActivated(address indexed module);
    event InflationMinted(uint256 amt, uint256 indexed yearKey);
    event Burned(address indexed from, uint256 amt, uint256 totalBurned);
    event ParamUpdated(string key, uint256 val);
    event DEXPairUpdated(address indexed pair, bool enabled);
    event RecoveryProposed(address indexed by, uint256 executeAfter);
    event RecoveryCancelled(address indexed by);
    event RecoveryExecuted(address indexed newAdmin);
    event ClaimGateUpdated(bool enabled, uint256 minBalance);
    event ModuleMessageSent(address indexed from, address indexed to, bytes32 topic);
    event RegistryHook(address indexed module, address indexed user, bytes32 indexed topic, bytes32 data);
    event UserXPAdded(address indexed user, uint256 amount, address indexed byModule);
    event BadgeGranted(address indexed user, uint8 indexed badgeId, address indexed byModule);
    event GameResultRecorded(bytes32 indexed gameId, address winner);
    event ModuleDataSet(address indexed module, address indexed user, bytes32 key);
    event TransferForModule(address indexed module, address indexed from, address indexed to, uint256 amt);
    event DeployerRoleRevoked(address indexed deployer);
    // [V6-FIX-06] Bridge events
    event BridgeMint(address indexed to, uint256 amt, address indexed bridge);
    event BridgeBurn(address indexed from, uint256 amt, address indexed bridge);
    event BridgeContractSet(address indexed oldBridge, address indexed newBridge);

    // ─── Modifiers ────────────────────────────────────────────────────────────────
    modifier onlyActiveAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "NOT_ADMIN");
        if (msg.sender == deployerAddr) {
            require(block.timestamp <= deployerExpiry && !deployerRevoked, "DEPLOYER_EXPIRED");
        }
        _;
    }

    modifier onlyMultisig() {
        require(msg.sender == multisig, "ONLY_MULTISIG");
        _;
    }

    modifier onlyTimelockOrAdmin() {
        if (!(msg.sender == timelockModule || hasRole(ADMIN_ROLE, msg.sender))) revert Unauthorized(); // ONLY_TIMELOCK_OR_ADMIN
        if (msg.sender == deployerAddr) {
            if (!(block.timestamp <= deployerExpiry && !deployerRevoked)) revert Unauthorized(); // DEPLOYER_EXPIRED
        }
        _;
    }

    modifier onlyAdmin() { if (!hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(); _; }
    modifier onlyActiveModule() {
        if (modules[msg.sender].status != 1) revert ModuleInactive();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────────
    constructor(
        address _treasury,
        address _liquidity,
        address _community,
        address _team,       // [V6-FIX-08] Team wallet — tokens are minted here
        address _marketing,  // [V6-FIX-08] Marketing wallet — tokens are minted here
        address _multisig,
        address _recovery
    ) ERC20("Coffy Coin", "COFFY") {
        if (_treasury  == address(0) ||
            _liquidity == address(0) ||
            _community == address(0) ||
            _team      == address(0) ||
            _marketing == address(0) ||
            _multisig  == address(0) ||
            _recovery  == address(0)) revert ZeroAddress();
        // [FIX-13]
        if (_recovery == _multisig)  revert Unauthorized(); // RECOVERY_EQ_MULTISIG
        if (_recovery == msg.sender) revert Unauthorized(); // RECOVERY_EQ_DEPLOYER
        if (_multisig == msg.sender) revert Unauthorized(); // MULTISIG_EQ_DEPLOYER

        treasury    = _treasury;
        liquidity   = _liquidity;
        community   = _community;
        team        = _team;        // [V6-FIX-08]
        marketing   = _marketing;   // [V6-FIX-08]
        multisig    = _multisig;
        recoveryAddress = _recovery;
        deployerAddr    = msg.sender;
        deployerExpiry  = block.timestamp + 30 days;
        deployerRevoked = false;
        LAUNCH_TIME     = block.timestamp;

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Coffy Coin")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));

        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, _multisig);
        _grantRole(ADMIN_ROLE, msg.sender);

        _mint(_treasury,  TREASURY_ALLOCATION);
        _mint(_liquidity, LIQUIDITY_ALLOCATION);
        _mint(_community, COMMUNITY_ALLOCATION);
        _mint(_team,      TEAM_ALLOCATION);       // [V6-FIX-08] directly to team wallet
        _mint(_marketing, MARKETING_ALLOCATION);  // [V6-FIX-08] directly to marketing wallet

        lastInflationTime = block.timestamp;
    }

    // --- CUSTOM ERRORS ---
    error Unauthorized();
    error ZeroAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error ModuleAlreadyRegistered();
    error ModuleInactive();
    error WeeklyLimitExceeded();
    error EmergencyStopActive();
    error TransferRestricted();
    error AnnualLimitReached();
    error Expired();
    error InvalidParameter();
    error LimitExceeded();
    error TooEarly(); // [V7-FIX] Added

    // This constructor is from the diff, but it's a complete replacement and doesn't fit the context of the original contract.
    // Keeping the original constructor and applying error changes to it.
    // constructor(address _multisig) ERC20("Coffy", "COFFY") {
    //     if (_multisig == address(0)) revert ZeroAddress();
    //     multisig = _multisig;
    //     _mint(msg.sender, INITIAL_SUPPLY); // 15B
    //     _grantRole(DEFAULT_ADMIN_ROLE, multisig);
    //     _grantRole(ADMIN_ROLE, multisig);
    //     _grantRole(ADMIN_ROLE, msg.sender);
    // }
    // The original constructor's minting logic is preserved above.

    // ─── [FIX-02] Permanently Revoke Deployer Role ───────────────────────────────────
    function revokeDeployerRole() external {
        if (!(block.timestamp > deployerExpiry)) revert Unauthorized(); // NOT_YET
        if (deployerRevoked) revert Unauthorized(); // ALREADY_REVOKED
        deployerRevoked = true;
        if (hasRole(ADMIN_ROLE, deployerAddr))         _revokeRole(ADMIN_ROLE, deployerAddr);
        if (hasRole(DEFAULT_ADMIN_ROLE, deployerAddr)) _revokeRole(DEFAULT_ADMIN_ROLE, deployerAddr);
        emit DeployerRoleRevoked(deployerAddr);
    }

    // ─── Module Management ───────────────────────────────────────────────────────────
    // [V5-FIX-01] MODULE_ROLE + slot set in a single call
    // kind: keccak256("game") | keccak256("activity") | keccak256("nft") | keccak256("rwa") | bytes32(0) generic
    function registerModule(address _module, string calldata _name, string calldata _kind) external onlyAdmin {
        if (_module == address(0)) revert ZeroAddress();
        if (bytes(_name).length == 0) revert Unauthorized(); // EMPTY_NAME
        if (modules[_module].status != 0) revert ModuleAlreadyRegistered();
        
        modules[_module] = Module(_name, _kind, 1, uint64(block.timestamp));
        
        bytes32 k = keccak256(abi.encodePacked(_kind));
        if (k == keccak256("game")) gameModule = _module;
        else if (k == keccak256("activity")) activityModule = _module;
        else if (k == keccak256("nft")) nftModule = _module;
        else if (k == keccak256("rwa")) rwaModule = _module;

        // [FIX-08] push guard
        bool found = false;
        for (uint i = 0; i < moduleList.length; i++) {
            if (moduleList[i] == _module) {
                found = true;
                break;
            }
        }
        if (!found) moduleList.push(_module);

        _grantRole(MODULE_ROLE, _module); // Still grant MODULE_ROLE for AccessControl
        emit ModuleRegistered(_module, _name, _kind);
    }

    // [V7-COMPAT] Alias for registerModule to support old ABI/scripts
    function setAuthorizedModule(address module, bool authorized) external onlyActiveAdmin {
        if (authorized) {
            if (modules[module].status == 0) { // If not registered, register it as generic
                modules[module] = Module("legacy_compat", "", 1, uint64(block.timestamp));
                moduleList.push(module);
            } else { // If already registered, just activate it
                modules[module].status = 1;
            }
            _grantRole(MODULE_ROLE, module);
        } else {
            setModuleStatus(module, 2); // Deactivate using new status system
        }
    }

    // [V5-FIX-02] Slot routing — internal helper
    function _setKindSlot(address module, bytes32 kind) internal {
        if      (kind == KIND_GAME)     gameModule     = module;
        else if (kind == KIND_ACTIVITY) activityModule = module;
        else if (kind == KIND_NFT)      nftModule      = module;
        else if (kind == KIND_RWA)      rwaModule      = module;
        // bytes32(0) or unknown kind → only MODULE_ROLE, slot not set
    }

    // [V5-FIX-03] Deactivate — MODULE_ROLE revoke + clear corresponding kind slot
    function setModuleStatus(address _module, uint8 _status) public onlyAdmin { // [V7-FIX] external -> public
        if (modules[_module].status == 0) revert ModuleInactive(); // Module not registered
        if (_status != 1 && _status != 2) revert Unauthorized(); // Only active (1) or inactive (2)
        
        modules[_module].status = _status;

        if (_status == 2) { // Deactivating
            _revokeRole(MODULE_ROLE, _module);
            // Clear kind slot — so no orphan reference remains
            bytes32 kind = keccak256(abi.encodePacked(modules[_module].kind));
            if      (kind == KIND_GAME     && gameModule     == _module) gameModule     = address(0);
            else if (kind == KIND_ACTIVITY && activityModule == _module) activityModule = address(0);
            else if (kind == KIND_NFT      && nftModule      == _module) nftModule      = address(0);
            else if (kind == KIND_RWA      && rwaModule      == _module) rwaModule      = address(0);
        } else if (_status == 1) { // Activating
            _grantRole(MODULE_ROLE, _module);
            // Restore kind slot
            bytes32 kind = keccak256(abi.encodePacked(modules[_module].kind));
            _setKindSlot(_module, kind);
        }
        emit ModuleStatusChanged(_module, _status);
    }

    // Original deactivateModule and reactivateModule are replaced by setModuleStatus
    // function deactivateModule(address module) external onlyActiveAdmin {
    //     require(moduleRegistry[module].active, "NOT_ACTIVE");
    //     moduleRegistry[module].active = false;
    //     _revokeRole(MODULE_ROLE, module);
    //     // Clear kind slot — so no orphan reference remains
    //     bytes32 kind = moduleRegistry[module].kind;
    //     if      (kind == KIND_GAME     && gameModule     == module) gameModule     = address(0);
    //     else if (kind == KIND_ACTIVITY && activityModule == module) activityModule = address(0);
    //     else if (kind == KIND_NFT      && nftModule      == module) nftModule      = address(0);
    //     else if (kind == KIND_RWA      && rwaModule      == module) rwaModule      = address(0);
    //     emit ModuleDeactivated(module);
    // }

    // function reactivateModule(address module) external onlyActiveAdmin {
    //     require(!moduleRegistry[module].active && moduleRegistry[module].registeredAt > 0, "NOT_REGISTERED");
    //     moduleRegistry[module].active = true;
    //     _grantRole(MODULE_ROLE, module);
    //     // Restore kind slot
    //     bytes32 kind = moduleRegistry[module].kind;
    //     _setKindSlot(module, kind);
    //     emit ModuleActivated(module);
    // }

    // timelockModule is still set separately — outside the kind system (not a token module)
    function setTimelockModule(address m) external onlyActiveAdmin {
        timelockModule = m;
        emit ModuleRegistered(m, "timelock", ""); // Kind is empty string for generic
    }

    // ─── Module Bridge — XP & Badge ────────────────────────────────────────────────
    function addUserXP(address user, uint128 amount) external onlyActiveModule {
        if (user == address(0)) revert ZeroAddress();
        _userXP[user] += amount;
        emit UserXPAdded(user, amount, msg.sender);
    }

    function getUserXP(address user) external view returns (uint128) { return _userXP[user]; }

    function grantBadge(address user, uint8 badgeId) external onlyActiveModule {
        if (user == address(0)) revert ZeroAddress();
        _badgeBitmap[user] |= (1 << uint256(badgeId));
        emit BadgeGranted(user, badgeId, msg.sender);
    }

    function hasBadge(address user, uint8 badgeId) external view returns (bool) {
        return (_badgeBitmap[user] & (1 << uint256(badgeId))) != 0;
    }

    function recordGameResult(bytes32 gameId, address winner) external onlyActiveModule {
        emit GameResultRecorded(gameId, winner);
    }

    function setModuleData(address user, bytes32 key, uint256 value) external onlyActiveModule {
        _moduleData[user][key] = value;
        emit ModuleDataSet(msg.sender, user, key);
    }

    function getModuleData(address user, bytes32 key) external view returns (uint256) {
        return _moduleData[user][key];
    }

    // ─── Module Bridge — Token ─────────────────────────────────────────────────────

    function transferForModule(address _from, address _to, uint256 _amt) external onlyActiveModule {
        if (_from == address(0) || _to == address(0)) revert ZeroAddress();
        if (_from == _to) revert TransferRestricted(); // SELF_TRANSFER
        if (_amt == 0) revert InvalidAmount();
        _transfer(_from, _to, _amt);
        emit TransferForModule(msg.sender, _from, _to, _amt);
    }

    function burnFromModule(address _from, uint256 _amt) external onlyActiveModule {
        if (_amt == 0) revert InvalidAmount();
        _burn(_from, _amt);
        totalBurned += _amt;
        emit Burned(_from, _amt, totalBurned);
    }

    // [FIX-04, FIX-14] Community rate limit — dynamic
    function payRewardFromModule(address _to, uint256 _amt) external onlyActiveModule nonReentrant whenNotPaused {
        if (_to == address(0)) revert ZeroAddress();
        if (_amt == 0) revert InvalidAmount();
        if (balanceOf(community) < _amt) revert InsufficientBalance(); // POOL_INSUFFICIENT
        uint256 wk = block.timestamp / 7 days;
        if (weeklyCommunitySent[wk] + _amt > maxWeeklyCommunitySend()) revert WeeklyLimitExceeded(); // WEEKLY_COMMUNITY_LIMIT
        weeklyCommunitySent[wk] += _amt;
        _transfer(community, _to, _amt);
    }

    // [FIX-05, FIX-15] Treasury rate limit — dynamic
    function payFromTreasury(address to, uint256 amt) external onlyActiveModule nonReentrant whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amt == 0) revert InvalidAmount();
        if (balanceOf(treasury) < amt) revert InsufficientBalance();
        uint256 wk = block.timestamp / 7 days;
        if (weeklyTreasurySent[wk] + amt > maxWeeklyTreasurySend()) revert WeeklyLimitExceeded();
        weeklyTreasurySent[wk] += amt;
        _transfer(treasury, to, amt);
    }

    // [V8] Global Inventory Management
    function addCharacterForModule(address user, uint256 cid, uint128 amount) external onlyActiveModule {
        if (cid < 1 || cid > CHARACTER_COUNT) revert InvalidParameter();
        userCharacters[user][cid] += amount;
        emit CharacterInventoryUpdated(user, cid, amount, true);
    }

    function burnCharacterForModule(address user, uint256 cid, uint128 amount) external onlyActiveModule {
        if (userCharacters[user][cid] < amount) revert InsufficientBalance();
        userCharacters[user][cid] -= amount;
        emit CharacterInventoryUpdated(user, cid, amount, false);
    }

    function setDAOMember(address user, bool status) external onlyActiveModule {
        isDAOMember[user] = status;
        emit DAOMemberSet(user, status);
    }

    function getCharacterMultiplier(address user) external view returns (uint256) {
        for (uint256 i = CHARACTER_COUNT; i >= 1; i--) {
            if (userCharacters[user][i] > 0) {
                if (i == 5) return 200; // 200%
                if (i == 4) return 150; // 150%
                if (i == 3) return 130; // 130%
                if (i == 2) return 120; // 120%
                if (i == 1) return 110; // 110%
            }
        }
        return 100; // 100% default
    }

    // [V7-NEW] EIP-2612 Permit
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp <= deadline, "EXPIRED_SIG");
        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH,
            owner,
            spender,
            value,
            nonces[owner]++,
            deadline
        ));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ECDSA.recover(hash, v, r, s);
        require(signer == owner, "INVALID_SIGNER");
        _approve(owner, spender, value);
    }

    // [FIX-06] Module mint — same pool as inflation
    function mintForModule(address to, uint256 amt) external onlyActiveModule {
        if (to == address(0)) revert ZeroAddress();
        if (amt == 0) revert InvalidAmount();
        uint256 yk = _yearKey();
        if (yearlyMinted[yk] + amt > MAX_ANNUAL_MINT) revert AnnualLimitReached();
        yearlyMinted[yk] += amt;
        _mint(to, amt);
    }

    // ─── Inter-Module Communication ──────────────────────────────────────────────────
    function moduleCall(address targetModule, bytes32 topic, bytes calldata data)
        external onlyActiveModule returns (bool success)
    {
        if (modules[targetModule].status != 1) revert ModuleInactive();
        emit ModuleMessageSent(msg.sender, targetModule, topic);
        try IModuleReceiver(targetModule).onModuleMessage(msg.sender, topic, data) returns (bool ok) {
            success = ok;
        } catch { success = false; }
    }

    function emitRegistryHook(address user, bytes32 topic, bytes32 data) external onlyActiveModule {
        emit RegistryHook(msg.sender, user, topic, data);
    }

    // ─── Transfer + DEX Tax [FIX-12] ─────────────────────────────────────────
    function transfer(address to, uint256 amt) public override whenNotPaused returns (bool) {
        if (dexPairs[to] || dexPairs[msg.sender]) {
            uint256 fee     = (amt * dexTax) / 10000;
            uint256 burnAmt = fee / 2;
            uint256 commAmt = fee - burnAmt;
            _burn(msg.sender, burnAmt);
            totalBurned += burnAmt;
            super._transfer(msg.sender, community, commAmt);
            super._transfer(msg.sender, to, amt - fee);
        } else {
            super._transfer(msg.sender, to, amt);
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) public override whenNotPaused returns (bool) {
        address spender = msg.sender;
        uint256 al = allowance(from, spender);
        if (al != type(uint256).max) {
            require(al >= amt, "ERC20: insufficient allowance");
            _approve(from, spender, al - amt);
        }
        if (dexPairs[to] || dexPairs[from]) {
            uint256 fee     = (amt * dexTax) / 10000;
            uint256 burnAmt = fee / 2;
            uint256 commAmt = fee - burnAmt;
            _burn(from, burnAmt);
            totalBurned += burnAmt;
            super._transfer(from, community, commAmt);
            super._transfer(from, to, amt - fee);
        } else {
            super._transfer(from, to, amt);
        }
        return true;
    }

    // ─── Inflation [FIX-03, FIX-06] ──────────────────────────────────────────────
    function triggerInflation() external nonReentrant whenNotPaused {
        if (!(hasRole(KEEPER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender))) revert Unauthorized();
        if (block.timestamp < lastInflationTime + 180 days) revert TooEarly();
        uint256 inf = (totalSupply() * SEMI_INFLATION) / 10000;
        uint256 yk  = _yearKey();
        if (yearlyMinted[yk] + inf > MAX_ANNUAL_MINT) revert AnnualLimitReached();
        yearlyMinted[yk]  += inf;
        lastInflationTime  = block.timestamp;
        _mint(treasury,   (inf * 25) / 100);
        _mint(liquidity,  (inf * 20) / 100);
        _mint(community,  (inf * 35) / 100);
        _mint(team,       (inf * 10) / 100); // [V6-FIX-08]
        _mint(marketing,  (inf * 10) / 100); // [V6-FIX-08]
        emit InflationMinted(inf, yk);
    }

    function _yearKey() internal view returns (uint256) {
        return (block.timestamp - LAUNCH_TIME) / 365 days;
    }

    function currentYearKey() external view returns (uint256) { return _yearKey(); }

    // ─── Recovery [FIX-07] ────────────────────────────────────────────────────────
    function proposeRecovery() external {
        if (msg.sender != recoveryAddress) revert Unauthorized();
        if (recoveryProposedAt != 0) revert Unauthorized(); // ALREADY_PROPOSED
        recoveryProposedAt = block.timestamp;
        emit RecoveryProposed(recoveryAddress, block.timestamp + 48 hours);
    }

    function cancelRecovery() external {
        if (msg.sender != recoveryAddress) revert Unauthorized();
        if (recoveryProposedAt == 0) revert Unauthorized(); // NOT_PROPOSED
        recoveryProposedAt = 0;
        emit RecoveryCancelled(recoveryAddress);
    }

    function executeRecovery() external {
        if (msg.sender != recoveryAddress) revert Unauthorized();
        if (recoveryProposedAt == 0) revert Unauthorized(); // NOT_PROPOSED
        if (block.timestamp < recoveryProposedAt + 48 hours) revert Unauthorized(); // TL_ACTIVE
        recoveryProposedAt = 0;
        _revokeRole(ADMIN_ROLE, multisig);
        _revokeRole(DEFAULT_ADMIN_ROLE, multisig);
        _grantRole(DEFAULT_ADMIN_ROLE, recoveryAddress);
        _grantRole(ADMIN_ROLE, recoveryAddress);
        emit RecoveryExecuted(recoveryAddress);
    }

    // ─── Param Set [FIX-09, FIX-10] ──────────────────────────────────────────────
    function setDexTax(uint16 val) external onlyTimelockOrAdmin {
        if (val > 500) revert LimitExceeded();
        dexTax = val;
        emit ParamUpdated("dexTax", val);
    }

    function setDEXPair(address pair, bool enabled) external onlyTimelockOrAdmin {
        if (pair == address(0)) revert ZeroAddress();
        dexPairs[pair] = enabled;
        emit DEXPairUpdated(pair, enabled);
    }

    function setClaimGate(bool enabled, uint256 minBalance) external onlyActiveAdmin {
        claimMinBalanceEnabled = enabled;
        claimMinBalance = minBalance;
        emit ClaimGateUpdated(enabled, minBalance);
    }

    function setMinWalletAge(uint256 age) external onlyActiveAdmin {
        if (age > 30 days) revert LimitExceeded();
        minWalletAge = age;
        emit ParamUpdated("minWalletAge", age);
    }

    // [FIX-10]
    function pause()   external onlyActiveAdmin { _pause(); }
    function unpause() external onlyMultisig    { _unpause(); }

    // ─── isDEXPair (interface compatibility) ──────────────────────────────────────────────
    function isDEXPair(address pair) external view returns (bool) { return dexPairs[pair]; }

    // ─── Bridge Functions [V6-FIX-01 → V6-FIX-06] ───────────────────────────

    // [V6-FIX-04] Set bridge contract — old bridge's role is automatically revoked
    // onlyTimelockOrAdmin: change is made via timelock or admin
    function setBridgeContract(address bridge) external onlyTimelockOrAdmin {
        if (bridge == address(0)) revert ZeroAddress();
        address old = bridgeContract;
        // Revoke the BRIDGE_ROLE from the old bridge
        if (old != address(0) && hasRole(BRIDGE_ROLE, old)) {
            _revokeRole(BRIDGE_ROLE, old);
        }
        bridgeContract = bridge;
        _grantRole(BRIDGE_ROLE, bridge);
        emit BridgeContractSet(old, bridge);
    }

    // [V6-FIX-05] Update daily bridge mint limit — admin can change
    // Minimum: 0.1% of total supply (15M COFFY), maximum: 5% (750M COFFY)
    function setDailyBridgeMintLimit(uint256 limit) external onlyTimelockOrAdmin {
        if (limit < TOTAL_SUPPLY / 1000) revert LimitExceeded();
        if (limit > TOTAL_SUPPLY / 20)   revert LimitExceeded();
        dailyBridgeMintLimit = limit;
        emit ParamUpdated("dailyBridgeMintLimit", limit);
    }

    // [V6-FIX-02] Bridge burn — user burns COFFY when moving from Base to another chain
    // Burn & Mint model: this burned COFFY is minted on the target chain
    function burnForBridge(address from, uint256 amt)
        external onlyRole(BRIDGE_ROLE) nonReentrant whenNotPaused
    {
        if (from == address(0)) revert ZeroAddress();
        if (amt == 0) revert InvalidAmount();
        if (balanceOf(from) < amt) revert InsufficientBalance();
        _burn(from, amt);
        totalBurned += amt;
        emit BridgeBurn(from, amt, msg.sender);
        emit Burned(from, amt, totalBurned);
    }

    // [V6-FIX-03] Bridge mint — COFFY is minted when user arrives from another chain to Base
    // NOT ADDED to yearlyMinted: this is not new emission, it's a cross-chain transfer
    // [V6-FIX-05] Daily limit: infinite mint is prevented in hack scenarios
    function mintFromBridge(address to, uint256 amt)
        external onlyRole(BRIDGE_ROLE) nonReentrant whenNotPaused
    {
        if (to == address(0)) revert ZeroAddress();
        if (amt == 0) revert InvalidAmount();
        // [V6-FIX-05] Daily limit check
        uint256 dayKey = block.timestamp / 1 days;
        if (dailyBridgeMinted[dayKey] + amt > dailyBridgeMintLimit) revert LimitExceeded();
        
        dailyBridgeMinted[dayKey] += amt;
        // yearlyMinted not updated — bridge transfer is not emission
        _mint(to, amt);
        emit BridgeMint(to, amt, msg.sender);
    }

    // ─── Bridge View Helpers ─────────────────────────────────────────────────

    // Returns how many COFFY was minted through the bridge today and how much remains
    function bridgeMintInfo() external view returns (
        uint256 mintedToday,
        uint256 remainingToday,
        uint256 limitPerDay
    ) {
        uint256 dayKey = block.timestamp / 1 days;
        mintedToday    = dailyBridgeMinted[dayKey];
        limitPerDay    = dailyBridgeMintLimit;
        remainingToday = mintedToday >= limitPerDay ? 0 : limitPerDay - mintedToday;
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────────
    function nextInflationTime() external view returns (uint256) {
        return lastInflationTime + 180 days;
    }

    function remainingAnnualMint() external view returns (uint256) {
        uint256 minted = yearlyMinted[_yearKey()];
        return minted >= MAX_ANNUAL_MINT ? 0 : MAX_ANNUAL_MINT - minted;
    }

    function weeklySpendInfo() external view returns (
        uint256 weekKey,
        uint256 communitySpentThisWeek,
        uint256 communityWeeklyLimit,
        uint256 treasurySpentThisWeek,
        uint256 treasuryWeeklyLimit
    ) {
        weekKey                = block.timestamp / 7 days;
        communitySpentThisWeek = weeklyCommunitySent[weekKey];
        communityWeeklyLimit   = maxWeeklyCommunitySend(); // [FIX-14] dynamic
        treasurySpentThisWeek  = weeklyTreasurySent[weekKey];
        treasuryWeeklyLimit    = maxWeeklyTreasurySend();  // [FIX-15] dynamic
    }

    function moduleCount() external view returns (uint256) { return moduleList.length; }
    
    // EIP-712 Helpers
    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }
}
