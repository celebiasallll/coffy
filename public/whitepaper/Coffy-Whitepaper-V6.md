# Coffy Whitepaper V6 (Tokenomics Update)

# Introduction
Coffy Coin is the core utility and rewards token across the Coffy ecosystem, uniting multiple games, a DAO structure, and a vibrant community. Version 6 (V6) brings newly optimized, sustainable tokenomics and improved mechanics directly benefiting players and long-term holders.

# Token Distribution (Maximum Supply: 15,000,000,000 COFFY)
- **Treasury:** 25% (3.75B) - Used to sustain game rewards.
- **Liquidity:** 20% (3.0B) - For decentralized exchanges.
- **Community:** 35% (5.25B) - Allocated for ecosystem growth.
- **Team (Vested):** 10% (1.5B) - Locked and vested to ensure long-term alignment.
- **Marketing (Vested):** 10% (1.5B) - Dedicated to expanding the player base.

*The contract includes an annual minting limit (MAX_ANNUAL_MINT) of strictly 2% to ensure managed inflation and protection of asset value.*

# Staking & APY Structure
Staking Coffy yields rewards, with multipliers granted by owning special ecosystem characters. V6 introduces sustainable APY caps to maintain long-term balance:
- **Base (No Character):** 5% APY
- **Genesis:** 10% APY
- **Mocha Knight:** 15% APY
- **Arabica Archmage:** 25% APY
- **Robusta Shadowblade:** 40% APY
- **Legendary Dragon:** 60% APY (Maximum possible APY in the ecosystem)

*Note: There is a 7-day minimum stake duration. Early unstaking triggers a 5% penalty, returning the penalized amount to the treasury.*

# Ecosystem Games & Rewards
Players participate in various Web3 games to earn Coffy. V6 updates to claiming mechanics:
- **Minimum Game Duration:** Valid game sessions must last at least 1 minute (reduced from 3 minutes) to combat botting while remaining fun.
- **Claim Limits Removed:** Previously, a minimum balance of 100K was required to claim pending game rewards. This restriction has been removed. All players can claim their earned rewards directly.
- **Weekly Claim Limits:** A dynamic weekly limit is enforced per wallet, calculated as `35,000 COFFY * Character Multiplier`.

# DAO & Governance
Owning the **Legendary Dragon** character and maintaining a minimum balance of **10,000,000 COFFY** grants exclusive access to the DAO. DAO members can propose and vote on ecosystem changes, including module integrations and character pricing.

# Module Security
V6 introduces a hardened `transferForModule` security model. Auxiliary smart contracts (like the Marketplace) cannot move your tokens without explicit, prior approval via `approveForModule()`.

# Tax & Deflation
- Character purchases burn 100% of the used COFFY.
- DEX trading incurs a 2% tax: 1% is completely burned, and 1% is sent to the Treasury for buybacks.
