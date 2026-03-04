import { ethers } from 'ethers';

// Network config - BASE MAINNET
export const NETWORK_CONFIG = {
  BASE_MAINNET: {
    chainId: '0x2105',
    chainName: 'Base Mainnet',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://basescan.org/'],
  }
};

// Network detection and switching - BASE
export const detectAndSwitchNetwork = async () => {
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0x2105') { // Base Mainnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG.BASE_MAINNET],
          });
        } else {
          throw switchError;
        }
      }
    }
  } catch (error) {
    console.error('Network switch failed:', error);
  }
};

// Marketplace debug helper
export const debugMarketplace = async (marketplaceContract, listingId) => {
  try {
    const code = await marketplaceContract.runner.provider.getCode(marketplaceContract.target);
    const stats = await marketplaceContract.getMarketplaceStats();
    if (listingId) {
      const listing = await marketplaceContract.listings(listingId);
      const nftContract = new ethers.Contract(
        await marketplaceContract.coffyMemoriesContract(),
        ['function ownerOf(uint256) view returns (address)', 'function getApproved(uint256) view returns (address)', 'function isApprovedForAll(address,address) view returns (bool)'],
        marketplaceContract.runner
      );
      const nftOwner = await nftContract.ownerOf(listing.tokenId);
      const approved = await nftContract.getApproved(listing.tokenId);
      const isApprovedForAll = await nftContract.isApprovedForAll(listing.seller, marketplaceContract.target);
    }
    const signer = await marketplaceContract.runner.provider.getSigner();
    const userAddress = await signer.getAddress();
    const userBalance = await marketplaceContract.runner.provider.getBalance(userAddress);
  } catch (error) {
    console.error('Debug failed:', error);
  }
};

export const decodeMarketplaceError = (error) => {
  const errorMessages = {
    'Listing not active': 'This NFT is no longer available for sale',
    'ETH not accepted': 'This seller only accepts CoffyCoin payments',
    'Insufficient ETH': 'You need to send more ETH to buy this NFT',
    'Cannot buy own item': 'You cannot buy your own NFT',
    'Not token owner': 'Only the NFT owner can perform this action',
    'Marketplace not approved': 'Please approve the marketplace to transfer your NFT',
    'Seller no longer owns token': 'The seller no longer owns this NFT'
  };
  if (error.reason) {
    return errorMessages[error.reason] || error.reason;
  }
  if (error.message) {
    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        return value;
      }
    }
  }
  return 'Transaction failed. Please check the console for details.';
};

export const safeContractCall = async (contractFunction, ...args) => {
  try {
    const result = await contractFunction.staticCall(...args);
    const tx = await contractFunction(...args);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Contract call failed:', error);
    const userFriendlyError = decodeMarketplaceError(error);
    throw new Error(userFriendlyError);
  }
}; 