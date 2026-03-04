// SPDX-License-Identifier: MIT
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  COFFY ACTIVITY MODULE — V14                                                  ║
// ║  Staking + Pending + Session + Step + Snap + Referral + Profile               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// V13 → V14 CHANGES:
//  [+] Step Reward system added (claimStepReward)
//      → Exactly same as game claim rules: oracle signed, usedActivitySigs,
//         dailyLimit, weeklyLimit, walletAge, minBalance checks
//      → Admin settings: maxStepRewardPerClaim, maxDailyStepPerUser, stepEnabled
//      → minStepCount: how many steps required (passed in signature by backend)
//  [+] Snap Reward system added (claimSnapReward)
//      → Same protection layers as Step
//      → Admin settings: maxSnapRewardPerClaim, maxDailySnapPerUser, snapEnabled
//      → snapCooldown: how often the same user can take a snap
//  [preserved] All existing limits (dynamic pool, weekly, daily) apply to step+snap too

pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/access/AccessControl.sol";
import "@openzeppelin/contracts@4.9.6/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.6/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.9.6/utils/cryptography/ECDSA.sol";

interface ICoffyCore {
    function TOTAL_SUPPLY() external view returns (uint256);
    function community() external view returns (address);
    function treasury() external view returns (address);
    function claimMinBalance() external view returns (uint256);
    function claimMinBalanceEnabled() external view returns (bool);
    function addUserXP(address user, uint128 amount) external;
    function setModuleData(address user, bytes32 key, uint256 value) external;
    function getModuleData(address user, bytes32 key) external view returns (uint256);
    function payRewardFromModule(address to, uint256 amt) external;
    function payFromTreasury(address to, uint256 amt) external;
    function burnFromModule(address from, uint256 amt) external;
    function balanceOf(address account) external view returns (uint256);
    function minWalletAge() external view returns (uint256);
    function getCharacterMultiplier(address user) external view returns (uint256);
    function transferForModule(address from, address to, uint256 amt) external;
}

interface IBonusModule {
    function onStakingReward(address user, uint256 reward) external;
}

contract CoffyActivityModule is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    ICoffyCore public immutable coffyCore;
    IERC20     public immutable coffyToken;
    address    public multisig;
    address    public bonusModule;
    uint8      public requiredSignatures = 1;
    mapping(address => bool) public isOracle;
    uint256    private _flags = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4); // oracle, step, snap, dyn, user
    
    // Flag indices: 0:oracle, 1:step, 2:snap, 3:dyn, 4:user
    function _checkFlag(uint8 i) internal view returns (bool) { return (_flags & (1 << i)) != 0; }
    function _setFlag(uint8 i, bool v) internal { if(v) _flags |= (1 << i); else _flags &= ~(1 << i); }

    // ═══════════════════════════════════════════════════════════════════════════
    // STAKING
    // ═══════════════════════════════════════════════════════════════════════════

    struct Stake {
        uint128 amount;
        uint64  startTime;
        uint64  lastClaim;
    }
    mapping(address => Stake) public stakes;
    uint256 public totalStaked;

    uint256 public stakingMinAPY = 200;  // 2%
    uint256 public stakingMaxAPY = 5000; // 50%

    uint256 public constant PENALTY_BASE = 500; // 5% early exit penalty

    // Burn statistics
    uint256 public totalBurned;
    uint256 public burnCount;

    event Staked(address indexed user, uint256 amt);
    event Unstaked(address indexed user, uint256 amt);
    event PartialUnstaked(address indexed user, uint256 amt);
    event StakingRewardPaid(address indexed user, uint256 amt);
    event EarlyUnstakePenalty(address indexed user, uint256 penalty);

    // ═══════════════════════════════════════════════════════════════════════════
    // PENDING REWARDS
    // ═══════════════════════════════════════════════════════════════════════════

    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public lastPendingUpdate;
    uint256 public constant PENDING_EXPIRY = 90 days;

    event PendingAdded(address indexed user, uint256 amt);
    event PendingClaimed(address indexed user, uint256 amt);
    event PendingCleared(address indexed user);

    uint256 public perUserWeeklyLimit  = 50_000 * 1e18;
    mapping(address => mapping(uint256 => uint256)) public weeklyUserClaimed;


    // ═══════════════════════════════════════════════════════════════════════════
    // STEP REWARD
    // ═══════════════════════════════════════════════════════════════════════════
    //  Backend verifies step count, signs → user calls claimStepReward.
    //  All pool/daily/weekly limits are the same as game rules.

    uint256 public maxStepRewardPerClaim = 10_000 * 1e18;
    uint256 public maxDailyStepPerUser   = 30_000 * 1e18;
    uint256 public minStepCount          = 1_000;
    mapping(address => mapping(uint256 => uint256)) public dailyStepClaimed;
    mapping(bytes32 => bool) public usedStepSigs;

    event StepRewardClaimed(address indexed user, uint256 steps, uint256 amt);

    // ═══════════════════════════════════════════════════════════════════════════
    // SNAP REWARD
    // ═══════════════════════════════════════════════════════════════════════════
    //  Backend analyzes the photo, signs if approved → user calls claimSnapReward.
    //  snapCooldown: same user cannot take another snap before this time pass.

    uint256 public maxSnapRewardPerClaim = 20_000 * 1e18;
    uint256 public maxDailySnapPerUser   = 40_000 * 1e18;
    uint256 public snapCooldown          = 30 minutes;
    mapping(address => uint256)          public lastSnapTimestamp;
    mapping(address => mapping(uint256 => uint256)) public dailySnapClaimed;
    mapping(bytes32 => bool) public usedSnapSigs;

    event SnapRewardClaimed(address indexed user, bytes32 indexed snapId, uint256 amt);

    // ═══════════════════════════════════════════════════════════════════════════
    // ANTI-WHALE DYNAMIC LIMIT
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 public dailyUserLimit      = 10_000 * 1e18;
    mapping(address => mapping(uint256 => uint256)) public dailyUserEarned;
    mapping(uint256 => uint256)                      public weeklyPlayerCount;
    mapping(uint256 => mapping(address => bool))     public weeklyPlayerSeen;

    event DailyLimitExceeded(address indexed user, uint256 attempted, uint256 remaining);

    // ═══════════════════════════════════════════════════════════════════════════
    // REFERRAL
    // ═══════════════════════════════════════════════════════════════════════════

    mapping(address => address) public referredBy;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralBonusEarned;
    mapping(address => bool)    public referralBonusPaid;
    mapping(address => uint256) public pendingReferralBonus;
    uint256 public referralBPS = 200; // 2%

    event ReferralRegistered(address indexed referee, address indexed referrer);
    event ReferralBonus(address indexed referrer, address indexed referee, uint256 amt);
    event ReferralBonusPending(address indexed referrer, address indexed referee, uint256 amt);
    event PendingReferralClaimed(address indexed referrer, uint256 amt);

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════════════════════

    mapping(address => string) public userProfiles;
    mapping(string => address) public profileToWallet;
    uint256 public profileChangeCost = 100_000 * 1e18;

    event ProfileLinked(address indexed wallet, string pid);
    event ProfileChanged(address indexed wallet, string oldPid, string newPid);

    // ── Oracle event ──────────────────────────────────────────────────────────
    event OracleUpdated(address indexed oldOracle, address indexed newOracle, bool enabled);

    // ── Constructor ───────────────────────────────────────────────────────────
    // --- CUSTOM ERRORS ---
    error Unauthorized();
    error ZeroAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error CooldownActive();
    error Expired();
    error SignatureUsed();
    error InvalidSignature();
    error WeeklyLimitReached();
    error DailyLimitReached();
    error StakingLocked();
    error ProfileError();
    error MinBalanceRequired();
    error WalletTooNew();

    // --- EIP-712 ---
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant STEP_REWARD_TYPEHASH    = keccak256("StepReward(address user,uint256 steps,uint256 payout,uint256 deadline)");
    bytes32 public constant SNAP_REWARD_TYPEHASH    = keccak256("SnapReward(bytes32 snapId,address user,uint256 payout,uint256 deadline)");
    bytes32 public constant LINK_PROFILE_TYPEHASH   = keccak256("LinkProfile(address user)");

    address    public trustedOracle;
    constructor(address _core, address _oracle, address _multisig) {
        if (_core == address(0) || _oracle == address(0) || _multisig == address(0)) revert ZeroAddress();
        coffyCore      = ICoffyCore(_core);
        coffyToken     = IERC20(_core);
        trustedOracle  = _oracle;
        multisig       = _multisig;
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
        _grantRole(ADMIN_ROLE, _multisig);

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Coffy")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function emergencyPause() external {
        if (msg.sender != trustedOracle && msg.sender != multisig) revert Unauthorized();
        _pause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STAKING
    // ═══════════════════════════════════════════════════════════════════════════

    function stake(uint256 amt) external nonReentrant whenNotPaused {
        if (amt == 0) revert InvalidAmount(); 
        Stake storage s = stakes[msg.sender];
        if (s.amount > 0) _payStakeReward(msg.sender);
        // [V15] use transferForModule instead of safeTransferFrom (Revert fix)
        coffyCore.transferForModule(msg.sender, address(this), amt);
        s.amount += uint128(amt);
        if (s.startTime == 0) {
            s.startTime = uint64(block.timestamp);
            coffyCore.setModuleData(msg.sender, keccak256("stake:startTime"), block.timestamp);
        }
        s.lastClaim = uint64(block.timestamp);
        totalStaked += amt;
        coffyCore.setModuleData(msg.sender, keccak256("staking:amount"), s.amount);
        _recordPlayer(msg.sender);
        emit Staked(msg.sender, amt);
    }

    function unstake() external nonReentrant whenNotPaused {
        _doUnstake(msg.sender, stakes[msg.sender].amount);
    }

    function partialUnstake(uint256 amt) external nonReentrant whenNotPaused {
        if (amt == 0 || amt > stakes[msg.sender].amount) revert InvalidAmount(); // Replaced require
        _doUnstake(msg.sender, amt);
    }

    function _doUnstake(address user, uint256 amt) internal {
        Stake storage s = stakes[user];
        if (s.amount < amt || amt == 0) revert InvalidAmount(); // Replaced require
        if (block.timestamp < s.startTime + 7 days) revert StakingLocked(); // Replaced require
        _payStakeReward(user);
        s.amount    -= uint128(amt);
        totalStaked -= amt;
        if (s.amount == 0) {
            s.startTime = 0;
            coffyCore.setModuleData(user, keccak256("stake:startTime"), 0);
        }
        coffyCore.setModuleData(user, keccak256("staking:amount"), s.amount);
        coffyToken.safeTransfer(user, amt);
        if (s.amount == 0) emit Unstaked(user, amt);
        else emit PartialUnstaked(user, amt);
    }

    function emergencyUnstake() external nonReentrant whenNotPaused {
        Stake storage s = stakes[msg.sender];
        if (s.amount == 0) revert InvalidAmount(); // Replaced require
        uint256 amt = s.amount;
        uint256 pen = (amt * PENALTY_BASE) / 10000;
        s.amount = 0; s.startTime = 0; s.lastClaim = uint64(block.timestamp);
        totalStaked -= amt;
        // Penalty: safeTransfer to DEAD address — instead of burnFromModule(address(this))
        // because burnFromModule burns from caller and contract cannot burn its own address
        coffyToken.safeTransfer(DEAD, pen);
        totalBurned += pen;
        burnCount++;
        coffyToken.safeTransfer(msg.sender, amt - pen);
        coffyCore.setModuleData(msg.sender, keccak256("staking:amount"), 0);
        emit EarlyUnstakePenalty(msg.sender, pen);
        emit Unstaked(msg.sender, amt - pen);
    }

    function claimStakingReward() external nonReentrant whenNotPaused {
        if (stakes[msg.sender].amount == 0) revert InvalidAmount(); // Replaced require
        _payStakeReward(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PENDING REWARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev Internal helper to add pending reward.
    ///      GameModule or other internal systems call this function.
    function _addPending(address user, uint256 amt) internal {
        if (amt == 0 || user == address(0)) return;
        pendingRewards[user]    += amt;
        lastPendingUpdate[user]  = block.timestamp;
        emit PendingAdded(user, amt);
    }

    /// @notice Manually add pending reward by Admin (for off-chain event integration).
    function adminAddPending(address user, uint256 amt) external onlyRole(ADMIN_ROLE) {
        if (user == address(0) || amt == 0) revert InvalidAmount();
        _addPending(user, amt);
    }

    function claimPendingRewards(uint256 amt) external nonReentrant whenNotPaused {
        if (amt == 0) revert InvalidAmount(); 
        _checkWalletAge(msg.sender);
        _checkMinBalance(msg.sender);
        if (block.timestamp > lastPendingUpdate[msg.sender] + PENDING_EXPIRY) {
            pendingRewards[msg.sender] = 0;
            emit PendingCleared(msg.sender);
            revert Expired(); 
        }
        if (pendingRewards[msg.sender] < amt) revert InvalidAmount(); 
        pendingRewards[msg.sender] -= amt;
        uint256 allowed = _checkDailyLimit(msg.sender, amt);
        if (allowed == 0) revert DailyLimitReached(); 
        coffyCore.payRewardFromModule(msg.sender, allowed);
        emit PendingClaimed(msg.sender, allowed);
    }

    function clearExpiredPending(address user) external {
        if (msg.sender != user && !hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(); // Replaced require
        if (lastPendingUpdate[user] == 0 || block.timestamp <= lastPendingUpdate[user] + PENDING_EXPIRY) revert Expired(); // Replaced require
        pendingRewards[user]    = 0;
        lastPendingUpdate[user] = 0;
        emit PendingCleared(user);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP REWARD
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Backend verifies step count and signs, user takes the reward.
    /// @param steps    How many steps were taken (verified by backend, in signature)
    /// @param payout   Reward amount calculated by backend
    /// @param deadline Signature expiration time
    /// @param sig      trustedOracle signature
    function claimStepReward(uint256 steps, uint256 payout, uint256 deadline, bytes calldata sig) external nonReentrant whenNotPaused {
        if (!_checkFlag(1)) revert Unauthorized(); // stepEnabled
        _preClaimChecks(payout, maxStepRewardPerClaim, deadline);
        if (steps < minStepCount) revert InvalidAmount();

        uint256 dayKey = block.timestamp / 1 days;
        if (dailyStepClaimed[msg.sender][dayKey] + payout > maxDailyStepPerUser) revert DailyLimitReached();
 
        bytes32 structHash = keccak256(abi.encode(STEP_REWARD_TYPEHASH, msg.sender, steps, payout, deadline));
        _verifySig(structHash, sig);
 
        uint256 allowed = _calculateAllowed(payout);
        dailyStepClaimed[msg.sender][dayKey] += allowed;
        _finalizeClaim(msg.sender, allowed);
        emit StepRewardClaimed(msg.sender, steps, allowed);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SNAP REWARD
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Backend analyzes photo and signs, user takes the reward.
    /// @param snapId   Unique photo ID (replay protection)
    /// @param payout   Reward amount calculated by backend
    /// @param deadline Signature expiration time
    /// @param sig      trustedOracle signature
    function claimSnapReward(bytes32 snapId, uint256 payout, uint256 deadline, bytes calldata sig) external nonReentrant whenNotPaused {
        if (!_checkFlag(2)) revert Unauthorized(); // snapEnabled
        _preClaimChecks(payout, maxSnapRewardPerClaim, deadline);
        if (block.timestamp < lastSnapTimestamp[msg.sender] + snapCooldown) revert CooldownActive();

        uint256 dayKey = block.timestamp / 1 days;
        if (dailySnapClaimed[msg.sender][dayKey] + payout > maxDailySnapPerUser) revert DailyLimitReached();
 
        bytes32 structHash = keccak256(abi.encode(SNAP_REWARD_TYPEHASH, snapId, msg.sender, payout, deadline));
        _verifySig(structHash, sig);
 
        lastSnapTimestamp[msg.sender] = block.timestamp;
        uint256 allowed = _calculateAllowed(payout);
        dailySnapClaimed[msg.sender][dayKey] += allowed;
        _finalizeClaim(msg.sender, allowed);
        emit SnapRewardClaimed(msg.sender, snapId, allowed);
    }
    
    function _preClaimChecks(uint256 payout, uint256 max, uint256 deadline) internal {
        if (!_checkFlag(0)) revert Unauthorized(); // oracleEnabled
        if (block.timestamp > deadline) revert Expired();
        if (payout == 0 || payout > max) revert InvalidAmount();
        _checkWalletAge(msg.sender);
        _checkMinBalance(msg.sender);
    }

    function _verifySig(bytes32 structHash, bytes calldata sig) internal {
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (usedStepSigs[hash] || usedSnapSigs[hash]) revert SignatureUsed(); 
        
        if (requiredSignatures == 1) {
            if (hash.recover(sig) != trustedOracle) revert InvalidSignature();
        } else {
            if (sig.length != uint256(requiredSignatures) * 65) revert InvalidSignature();
            address lastSigner = address(0);
            for (uint8 i = 0; i < requiredSignatures; i++) {
                bytes memory currentSig = sig[i*65 : (i+1)*65];
                address recovered = hash.recover(currentSig);
                if (!isOracle[recovered]) revert InvalidSignature();
                if (recovered <= lastSigner) revert InvalidSignature();
                lastSigner = recovered;
            }
        }
        usedStepSigs[hash] = true; // Shared sig tracking for extra safety
    }

    function _calculateAllowed(uint256 payout) internal view returns (uint256) {
        return (_scaledReward(payout) * coffyCore.getCharacterMultiplier(msg.sender)) / 100;
    }

    function _finalizeClaim(address user, uint256 payout) internal {
        _checkWeeklyLimit(user, payout);
        uint256 allowed = _checkDailyLimit(user, payout);
        if (allowed == 0) revert DailyLimitReached();
        coffyCore.payRewardFromModule(user, allowed);
        coffyCore.addUserXP(user, uint128(allowed / 1e18));
        _recordPlayer(user);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REFERRAL
    // ═══════════════════════════════════════════════════════════════════════════

    mapping(address => uint256) public userPendingRewards; // Added for the new claimPendingRewards logic

    function registerReferral(address referrer) external {
        if (referrer == address(0) || referrer == msg.sender) revert InvalidAmount(); // Replaced require
        if (referredBy[msg.sender] != address(0)) revert ProfileError(); // Replaced require
        referredBy[msg.sender] = referrer;
        referralCount[referrer]++;
        emit ReferralRegistered(msg.sender, referrer);
    }

    function _payReferralBonus(address referee) internal {
        address referrer = referredBy[referee];
        if (referrer == address(0) || referralBonusPaid[referee]) return;
        uint256 bonus = (coffyCore.balanceOf(referrer) * referralBPS) / 10000;
        if (bonus == 0) return;
        referralBonusPaid[referee]    = true;
        referralBonusEarned[referrer] += bonus;
        try coffyCore.payRewardFromModule(referrer, bonus) {
            emit ReferralBonus(referrer, referee, bonus);
        } catch {
            pendingReferralBonus[referrer] += bonus;
            emit ReferralBonusPending(referrer, referee, bonus);
        }
    }

    function claimPendingReferral() external nonReentrant whenNotPaused {
        uint256 bonus = pendingReferralBonus[msg.sender];
        if (bonus == 0) revert InvalidAmount(); // Replaced require
        uint256 allowed = _checkDailyLimit(msg.sender, bonus);
        if (allowed == 0) revert DailyLimitReached(); // Replaced require
        pendingReferralBonus[msg.sender] = bonus - allowed;
        coffyCore.payRewardFromModule(msg.sender, allowed);
        emit PendingReferralClaimed(msg.sender, allowed);
    }

    function triggerReferralBonus(address referee) external nonReentrant whenNotPaused {
        if (msg.sender != referee && !hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(); // Replaced require
        _payReferralBonus(referee);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROFİL
    // ═══════════════════════════════════════════════════════════════════════════

    function linkUserProfile(string calldata pid, address referrer) external {
        if (bytes(pid).length == 0) revert ProfileError(); // EMPTY_PID
        if (profileToWallet[pid] != address(0)) revert ProfileError(); // ID_TAKEN
        if (bytes(userProfiles[msg.sender]).length != 0) revert ProfileError(); // ALREADY_LINKED
        userProfiles[msg.sender] = pid;
        profileToWallet[pid]     = msg.sender;
        // Cüzdan yaşını kaydet
        if (coffyCore.getModuleData(msg.sender, keccak256("wallet:firstTx")) == 0)
            coffyCore.setModuleData(msg.sender, keccak256("wallet:firstTx"), block.timestamp);
        // Referral
        if (referrer != address(0) && referrer != msg.sender &&
            bytes(userProfiles[referrer]).length > 0 && referredBy[msg.sender] == address(0)) {
            referredBy[msg.sender] = referrer;
            referralCount[referrer]++;
            emit ReferralRegistered(msg.sender, referrer);
        }
        emit ProfileLinked(msg.sender, pid);
    }

    function changeProfileName(string calldata newId) external nonReentrant whenNotPaused {
        if (bytes(userProfiles[msg.sender]).length == 0) revert ProfileError(); // NO_PROFILE
        if (profileToWallet[newId] != address(0)) revert ProfileError(); // ID_TAKEN
        if (coffyCore.balanceOf(msg.sender) < profileChangeCost) revert InsufficientBalance();
        coffyCore.burnFromModule(msg.sender, profileChangeCost);
        totalBurned += profileChangeCost;
        burnCount++;
        string memory oldId = userProfiles[msg.sender];
        profileToWallet[oldId]   = address(0);
        userProfiles[msg.sender] = newId;
        profileToWallet[newId]   = msg.sender;
        emit ProfileChanged(msg.sender, oldId, newId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    function _checkWalletAge(address user) internal {
        uint256 firstTx = coffyCore.getModuleData(user, keccak256("wallet:firstTx"));
        if (firstTx == 0) {
            coffyCore.setModuleData(user, keccak256("wallet:firstTx"), block.timestamp);
            revert WalletTooNew();
        }
        if (block.timestamp < firstTx + coffyCore.minWalletAge()) revert WalletTooNew();
    }

    function _checkMinBalance(address user) internal view {
        if (coffyCore.claimMinBalanceEnabled())
            if (coffyCore.balanceOf(user) < coffyCore.claimMinBalance()) revert MinBalanceRequired();
    }

    function _checkDailyLimit(address user, uint256 amount) internal returns (uint256 allowed) {
        uint256 lim    = _dynDailyLimit();
        uint256 dayKey = block.timestamp / 1 days;
        uint256 earned = dailyUserEarned[user][dayKey];
        if (earned >= lim) { emit DailyLimitExceeded(user, amount, 0); return 0; }
        uint256 rem = lim - earned;
        allowed = amount > rem ? rem : amount;
        dailyUserEarned[user][dayKey] += allowed;
        if (allowed < amount) emit DailyLimitExceeded(user, amount, rem);
    }

    function _dynDailyLimit() internal view returns (uint256) {
        if (!_checkFlag(3)) return dailyUserLimit;
        uint256 cBal = coffyCore.balanceOf(coffyCore.community());
        if (cBal == 0) return dailyUserLimit;
        uint256 week    = block.timestamp / 1 weeks;
        uint256 players = weeklyPlayerCount[week];
        if (players < 100) players = 100;
        uint256 perDay = (cBal * 5 / 10000) / players / 7;
        uint256 cap    = cBal / 100000;
        uint256 whale  = (cBal * 5 / 10000) * 100 / 10000 / 7;
        uint256 lim    = perDay < cap ? perDay : cap;
        if (lim > whale) lim = whale;
        return lim > dailyUserLimit ? lim : dailyUserLimit;
    }

    function _checkWeeklyLimit(address user, uint256 amt) internal {
        if (!_checkFlag(4)) return;
        uint256 wk = block.timestamp / 7 days;
        if (weeklyUserClaimed[user][wk] + amt > perUserWeeklyLimit) revert WeeklyLimitReached();
        weeklyUserClaimed[user][wk] += amt;
    }

    function _scaledReward(uint256 baseAmt) internal view returns (uint256) {
        uint256 cBal     = coffyCore.balanceOf(coffyCore.community());
        uint256 fullPool = (coffyCore.TOTAL_SUPPLY() * 35) / 100;
        if (cBal >= fullPool) return baseAmt;
        uint256 ratio = (cBal * 100) / fullPool;
        if (ratio < 10) ratio = 10;
        return (baseAmt * ratio) / 100;
    }

    function _payStakeReward(address user) internal {
        Stake storage s = stakes[user];
        if (s.amount == 0) return;
        uint256 r = (uint256(s.amount) * _stakingAPY() * (block.timestamp - s.lastClaim)) / (10000 * 365 days);
        s.lastClaim = uint64(block.timestamp);
        if (r == 0) return;
        uint256 scaled = _scaledReward(r);
        uint256 wk     = block.timestamp / 7 days;
        if (_checkFlag(4)) {
            uint256 rem = weeklyUserClaimed[user][wk] >= perUserWeeklyLimit
                ? 0 : perUserWeeklyLimit - weeklyUserClaimed[user][wk];
            if (scaled > rem) scaled = rem;
        }
        if (scaled == 0) return;
        if (_checkFlag(4)) weeklyUserClaimed[user][wk] += scaled;
        try coffyCore.payFromTreasury(user, scaled) {
            emit StakingRewardPaid(user, scaled);
            if (bonusModule != address(0))
                try IBonusModule(bonusModule).onStakingReward(user, scaled) {} catch {}
        } catch {}
    }

    function _stakingAPY() internal view returns (uint256) {
        if (totalStaked == 0) return stakingMinAPY;
        uint256 budget = (coffyCore.TOTAL_SUPPLY() * 2 / 100) * 25 / 100;
        uint256 base   = (budget * 10000) / totalStaked;
        return base < stakingMinAPY ? stakingMinAPY : base > stakingMaxAPY ? stakingMaxAPY : base;
    }

    function _recordPlayer(address u) internal {
        uint256 week = block.timestamp / 1 weeks;
        if (!weeklyPlayerSeen[week][u]) { weeklyPlayerSeen[week][u] = true; weeklyPlayerCount[week]++; }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════

    function getUserPending(address user) external view returns (uint256) {
        if (block.timestamp > lastPendingUpdate[user] + PENDING_EXPIRY) return 0;
        return pendingRewards[user];
    }

    function estimateStakingReward(address user) external view returns (uint256) {
        Stake memory s = stakes[user];
        if (s.amount == 0) return 0;
        return (uint256(s.amount) * _stakingAPY() * (block.timestamp - s.lastClaim)) / (10000 * 365 days);
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount, uint256 startTime, uint256 pendingReward, uint256 apy, bool canUnstake
    ) {
        Stake memory s = stakes[user];
        amount        = s.amount;
        startTime     = s.startTime;
        pendingReward = this.estimateStakingReward(user);
        apy           = _stakingAPY();
        canUnstake    = s.amount > 0 && block.timestamp >= s.startTime + 7 days;
    }

    /// @notice Early exit penalty rate (fixed for now, can be character-based later)
    function getEarlyPenaltyBPS(address /*user*/) external pure returns (uint256) {
        return PENALTY_BASE;
    }

    /// @notice Current staking APY
    function getStakingAPY(address /*user*/) external view returns (uint256) {
        return _stakingAPY();
    }

    /// @notice Total burn statistics from this module
    function getBurnStats() external view returns (uint256 burnedTotal, uint256 numberOfBurns) {
        burnedTotal   = totalBurned;
        numberOfBurns = burnCount;
    }

    /// @notice Timelock status — currently no timelock, placeholder
    function getTimelockStatus() external pure returns (
        bool timelockActive, uint256 timelockDelay, uint256 pendingOperationCount
    ) {
        timelockActive = false; timelockDelay = 0; pendingOperationCount = 0;
    }

    function currentAPY() external view returns (uint256) { return _stakingAPY(); }
    function getDynDailyLimit() external view returns (uint256) { return _dynDailyLimit(); }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice trustedOracle change — requires DEFAULT_ADMIN_ROLE (multisig)
    function setTrustedOracle(address o) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address old = trustedOracle;
        if (old != address(0) && hasRole(ORACLE_ROLE, old)) _revokeRole(ORACLE_ROLE, old);
        trustedOracle = o;
        if (o != address(0)) { _grantRole(ORACLE_ROLE, o); _setFlag(0, true); }
        else _setFlag(0, false);
        emit OracleUpdated(old, o, _checkFlag(0));
    }

    function setMultiOracle(address o, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (o == address(0)) revert ZeroAddress();
        isOracle[o] = active;
        if (active) _grantRole(ORACLE_ROLE, o);
        else _revokeRole(ORACLE_ROLE, o);
    }
    
    function setRequiredSignatures(uint8 req) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (req == 0) revert InvalidAmount();
        requiredSignatures = req;
    }

    function setDailyLimit(bool dynamic, uint256 fixedLim) external onlyRole(ADMIN_ROLE) {
        _setParam(1_000 * 1e18, 100_000 * 1e18, fixedLim);
        _setFlag(3, dynamic); dailyUserLimit = fixedLim;
    }

    function setPerUserWeeklyLimit(bool enabled, uint256 limit) external onlyRole(ADMIN_ROLE) {
        _setParam(1_000 * 1e18, type(uint256).max, limit);
        _setFlag(4, enabled); perUserWeeklyLimit = limit;
    }

    // Step settings
    function setStepEnabled(bool v)                  external onlyRole(ADMIN_ROLE) { _setFlag(1, v); }
    function setMaxStepRewardPerClaim(uint256 v)     external onlyRole(ADMIN_ROLE) { _setParam(1, type(uint256).max, v); maxStepRewardPerClaim = v; }
    function setMaxDailyStepPerUser(uint256 v)       external onlyRole(ADMIN_ROLE) { _setParam(1, type(uint256).max, v); maxDailyStepPerUser = v; }
    function setMinStepCount(uint256 v)              external onlyRole(ADMIN_ROLE) { minStepCount = v; }

    // Snap settings
    function setSnapEnabled(bool v)                  external onlyRole(ADMIN_ROLE) { _setFlag(2, v); }
    function setMaxSnapRewardPerClaim(uint256 v)     external onlyRole(ADMIN_ROLE) { _setParam(1, type(uint256).max, v); maxSnapRewardPerClaim = v; }
    function setMaxDailySnapPerUser(uint256 v)       external onlyRole(ADMIN_ROLE) { _setParam(1, type(uint256).max, v); maxDailySnapPerUser = v; }
    function setSnapCooldown(uint256 v)              external onlyRole(ADMIN_ROLE) { _setParam(1 minutes, 24 hours, v); snapCooldown = v; }

    function _setParam(uint256 min, uint256 max, uint256 v) internal pure {
        if (v < min || v > max) revert InvalidAmount();
    }
    function setReferralBPS(uint256 bps)         external onlyRole(ADMIN_ROLE) { if (bps > 500) revert InvalidAmount(); referralBPS = bps; }
    function setProfileChangeCost(uint256 c)     external onlyRole(ADMIN_ROLE) { if (c < 10_000 * 1e18) revert InvalidAmount(); profileChangeCost = c; }
    function setStakingAPYRange(uint256 mn, uint256 mx) external onlyRole(ADMIN_ROLE) {
        if (mn == 0 || mx <= mn || mx > 10000) revert InvalidAmount(); stakingMinAPY = mn; stakingMaxAPY = mx;
    }
    function setBonusModule(address b) external onlyRole(ADMIN_ROLE) { bonusModule = b; }

    function pause()   external onlyRole(ADMIN_ROLE)          { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE)  { _unpause(); }
}
