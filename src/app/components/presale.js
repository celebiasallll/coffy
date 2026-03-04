import { useState, useEffect, useCallback } from 'react';
import { BASE_CONFIG } from '../config/baseConfig';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// Presale kontrat bilgileri
const PRESALE_ADDRESS = BASE_CONFIG.CONTRACTS.Presale;
const PRESALE_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_coffy",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "bnbAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "coffyAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "phase",
				"type": "uint8"
			}
		],
		"name": "Buy",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "coffyAmount",
				"type": "uint256"
			}
		],
		"name": "Claim",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			}
		],
		"name": "ClaimingStatusChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "EmergencyWithdrawBNB",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "newPhase",
				"type": "uint8"
			}
		],
		"name": "PhaseChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalSold",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "participantCount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalClaimed",
				"type": "uint256"
			}
		],
		"name": "PresaleStatsReset",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bool",
				"name": "active",
				"type": "bool"
			}
		],
		"name": "PresaleStatusChanged",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "TokensAddedToPool",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "WithdrawBNB",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "WithdrawUnsoldCoffy",
		"type": "event"
	},
	{
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"inputs": [],
		"name": "BNB_PRICE_USD",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_BUY",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PHASE1_PRICE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PHASE2_PRICE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "PHASE3_PRICE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "addTokensToPool",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "boughtBNB",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "buy",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "claim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "claimable",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "claimingActive",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "coffy",
		"outputs": [
			{
				"internalType": "contract ICoffyToken",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "emergencyWithdrawBNB",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "bnbAmount",
				"type": "uint256"
			}
		],
		"name": "getCoffyAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getContractCoffyBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getUnclaimedTokens",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "hasBought",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "hasClaimed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "participantCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "phase",
		"outputs": [
			{
				"internalType": "uint8",
				"name": "",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "presaleActive",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "resetPresaleStats",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_active",
				"type": "bool"
			}
		],
		"name": "setClaimingStatus",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint8",
				"name": "_phase",
				"type": "uint8"
			}
		],
		"name": "setPhase",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bool",
				"name": "_active",
				"type": "bool"
			}
		],
		"name": "setPresaleStatus",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalClaimed",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalSold",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "withdrawAllUnsoldCoffy",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawBNB",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawUnsoldCoffy",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

// Fix COFFY_TOTAL_SUPPLY to 1.5 billion (not 15 billion)
const COFFY_TOTAL_SUPPLY = ethers.parseUnits('1500000000', 18);
// Presale başlangıç ve bitiş tarihleri
const PRESALE_END = new Date('2025-06-07T13:30:00Z'); // 7 Haziran 2025, 16:30 Türkiye saati (UTC+3)

// HYPE/FOMO BANNER MESSAGES
const FOMO_MESSAGES = [
	"🔥 180K COFFY bought in the last 10 minutes!",
	"🚀 COFFY is trending now!",
	"💰 Don't miss the best price phase!",
	"☕ Top buyers get exclusive rewards!",
	"🎉 Over 1,000 participants!",
];
// Mocked social proof data
// const TOP_BUYERS = [
// 	{ address: '0xA1...B2', amount: 12000 },
// 	{ address: '0xC3...D4', amount: 9500 },
// 	{ address: '0xE5...F6', amount: 8000 },
// 	{ address: '0xG7...H8', amount: 7000 },
// 	{ address: '0xI9...J0', amount: 6500 },
// ];
// const LAST_PURCHASES = [
// 	{ address: '0xK1...L2', amount: 2000 },
// 	{ address: '0xM3...N4', amount: 1500 },
// 	{ address: '0xO5...P6', amount: 1200 },
// 	{ address: '0xQ7...R8', amount: 1000 },
// 	{ address: '0xS9...T0', amount: 900 },
// 	{ address: '0xU1...V2', amount: 800 },
// 	{ address: '0xW3...X4', amount: 700 },
// 	{ address: '0xY5...Z6', amount: 600 },
// 	{ address: '0xA7...B8', amount: 500 },
// 	{ address: '0xC9...D0', amount: 400 },
// ];

export default function Presale() {
	// UI state
	const [phase, setPhase] = useState(1);
	const [bnbPrice, setBnbPrice] = useState(600); // USD cinsinden, backend/owner günceller
	const [presaleStats, setPresaleStats] = useState({
		totalSold: 0,
		participantCount: 0,
		remainingSupply: COFFY_TOTAL_SUPPLY,
		currentPhase: 1,
		isActive: true,
	});
	const [inputBnb, setInputBnb] = useState('');
	const [coffyToBuy, setCoffyToBuy] = useState(0);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [account, setAccount] = useState(null);
	const [provider, setProvider] = useState(null);
	const [canClaim, setCanClaim] = useState(false);
	const [claimable, setClaimable] = useState(0);
	const [hasBought, setHasBought] = useState(false);
	// Countdown
	const [now, setNow] = useState(Date.now());
	// Presale status
	const [presaleStatus, setPresaleStatus] = useState({
		isActive: false,
		isSoldOut: false,
		statusMessage: 'Checking presale status...',
		hasNoTokens: false
	});
	// FOMO banner state
	const [fomoIndex, setFomoIndex] = useState(0);

	// Otomatik sorun kurtarma ve hata düzeltme fonksiyonu
	const autoFixContractIssues = useCallback(async () => {
		if (!provider || !account) return false;

		try {
			console.log("Kontrat sorunlarını otomatik düzeltme başlatılıyor...");
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);

			// Kontrat durumunu kontrol et
			const isPresaleActive = await contract.presaleActive();
			const currentPhase = await contract.phase();
			const contractBalance = await contract.getContractCoffyBalance();
			const ownerAddress = await contract.owner();

			console.log("Presale Active:", isPresaleActive);
			console.log("Current Phase:", currentPhase.toString());
			console.log("Contract Balance:", ethers.formatUnits(contractBalance, 18));
			console.log("Contract Owner:", ownerAddress);
			console.log("Current User:", account);

			// Eğer owner isek ve presale aktif değilse, aktif edelim
			if (ownerAddress.toLowerCase() === account.toLowerCase() && !isPresaleActive) {
				console.log("Presale aktif değil ve owner ile bağlısınız. Aktifleştiriliyor...");
				try {
					const tx = await contract.setPresaleStatus(true);
					await tx.wait();
					console.log("Presale aktifleştirildi!");
					return true;
				} catch (error) {
					console.error("Presale aktifleştirme hatası:", error);
				}
			}

			return false;
		} catch (error) {
			console.error("Otomatik düzeltme hatası:", error);
			return false;
		}
	}, [provider, account]);

	// Yeni kontrat için fetchStats fonksiyonunu baştan yazıyorum
	const fetchStats = useCallback(async () => {
		try {
			const ethProvider = provider || (window.ethereum && new ethers.BrowserProvider(window.ethereum));
			if (!ethProvider) return;
			const contract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, ethProvider);

			// Yeni kontrat getter fonksiyonlarını çağır
			const [
				totalSold,
				totalClaimed,
				participantCount,
				phase,
				isActive,
				isClaimingActive,
				contractBalance
			] = await Promise.all([
				contract.totalSold(),
				contract.totalClaimed(),
				contract.participantCount(),
				contract.phase(),
				contract.presaleActive(),
				contract.claimingActive(),
				contract.getContractCoffyBalance()
			]);

			setPresaleStats({
				totalSold: totalSold.toString(),
				totalClaimed: totalClaimed.toString(),
				participantCount: Number(participantCount),
				currentPhase: Number(phase),
				isActive: isActive,
				isClaimingActive: isClaimingActive,
				contractBalance: ethers.formatUnits(contractBalance, 18)
			});
			setPhase(Number(phase));

			// Presale status
			let statusMessage = '';
			if (!isActive) {
				statusMessage = 'Presale is not active at this time. Please check back later.';
			} else if (Number(contractBalance) === 0) {
				statusMessage = 'PRESALE NOT READY: Contract has no tokens yet. Please contact the team.';
			} else {
				statusMessage = `Presale is LIVE! Phase ${Number(phase)}`;
			}
			setPresaleStatus({
				isActive: isActive && Number(contractBalance) > 0,
				isSoldOut: Number(contractBalance) === 0,
				statusMessage,
				hasNoTokens: Number(contractBalance) === 0
			});

			// BNB fiyatı
			setBnbPrice(600);

			if (account) {
				setCanClaim(await contract.claimable(account) > 0 && !(await contract.hasClaimed(account)));
				setClaimable(Number(await contract.claimable(account)));
				setHasBought(await contract.hasBought(account));
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
		}
	}, [provider, account]);

	// Kontrattan canlı verileri çek
	useEffect(() => {
		fetchStats();
		const interval = setInterval(fetchStats, 10000); // 10 sn'de bir güncelle
		return () => clearInterval(interval);
	}, [fetchStats]);

	// Faz fiyatları (USD)
	const PHASE_PRICES = {
		1: 0.00000667,
		2: 0.00001333,
		3: 0.00002000,
	};
	const LAUNCH_PRICE = 0.00003333;

	// 0.1 BNB ile alınan COFFY miktarı (faz bazlı)
	function getCoffyForBnb(bnb, phase) {
		const usd = bnb * bnbPrice;
		const price = PHASE_PRICES[phase] || PHASE_PRICES[1];
		return Math.floor(usd / price);
	}

	// Kaç X kâr göstergesi
	function getXGain(phase) {
		const price = PHASE_PRICES[phase] || PHASE_PRICES[1];
		return (LAUNCH_PRICE / price).toFixed(2);
	}

	// Countdown logic
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	const end = PRESALE_END instanceof Date ? PRESALE_END.getTime() : PRESALE_END;
	const total = 1000 * 60 * 60 * 24 * 10; // 10 gün toplam milisaniye
	const left = Math.max(end - now, 0);
	const percentTime = 100 - (left / total) * 100;

	// Format time left
	function formatTime(ms) {
		const s = Math.floor(ms / 1000) % 60;
		const m = Math.floor(ms / 1000 / 60) % 60;
		const h = Math.floor(ms / 1000 / 60 / 60) % 24;
		const d = Math.floor(ms / 1000 / 60 / 60 / 24);
		return `${d}d ${h}h ${m}m ${s}s`;
	}

	// Kullanıcı BNB girdikçe COFFY miktarını hesapla
	useEffect(() => {
		if (!inputBnb || isNaN(inputBnb)) {
			setCoffyToBuy(0);
			return;
		}
		setCoffyToBuy(getCoffyForBnb(Number(inputBnb), phase));
	}, [inputBnb, phase, bnbPrice]);

	// Web3/ethers ile kontrat ve cüzdan bağlantısı
	useEffect(() => {
		if (typeof window === 'undefined' || !window.ethereum) return;
		const ethProvider = new ethers.BrowserProvider(window.ethereum);
		setProvider(ethProvider);
		ethProvider.send('eth_accounts', []).then(accounts => {
			if (accounts && accounts.length > 0) setAccount(accounts[0]);
		});
		// Hesap değişirse güncelle
		window.ethereum.on('accountsChanged', (accounts) => {
			setAccount(accounts && accounts.length > 0 ? accounts[0] : null);
		});
	}, []);

	// Cüzdan bağlama
	async function connectWallet() {
		if (!window.ethereum) {
			setMessage(
				<div className="transaction-status error">
					<p>No Web3 wallet detected!</p>
					<p>Please install MetaMask or a compatible Web3 wallet to participate.</p>
					<a
						href="https://metamask.io/download/"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Download MetaMask"
					>
						Download MetaMask
					</a>
				</div>
			);
			return;
		}

		try {
			setLoading(true);
			setMessage('Connecting to wallet...');

			// Request account access with comprehensive error handling
			try {
				// Check if the wallet is locked
				const accounts = await window.ethereum.request({
					method: 'eth_accounts',
					params: []
				});

				if (accounts.length === 0) {
					setMessage('Requesting wallet access. Please unlock your wallet...');
				}

				// Request account access
				const requestedAccounts = await window.ethereum.request({
					method: 'eth_requestAccounts',
					params: []
				});

				if (!requestedAccounts || requestedAccounts.length === 0) {
					throw new Error('No accounts found. Please make sure your wallet is unlocked.');
				}

				// Set account and provider
				const ethProvider = new ethers.BrowserProvider(window.ethereum);
				setAccount(requestedAccounts[0]);
				setProvider(ethProvider);

				// Log successful connection for debugging
				console.log('Wallet connected successfully:', requestedAccounts[0]);

				// Check if we're on the correct network with proper error handling
				const network = await ethProvider.getNetwork().catch(err => {
					console.error('Error fetching network:', err);
					throw new Error('Could not determine current network. Please check your wallet connection.');
				});

				const currentChainId = parseInt(network.chainId.toString());

				// Check if we need to switch networks (BSC Mainnet: 56, Testnet: 97)
				if (currentChainId !== 56 && currentChainId !== 97) {
					setMessage('Connected, but switching to Base Mainnet network...');

					try {
						// First try to switch to the network
						await window.ethereum.request({
							method: 'wallet_switchEthereumChain',
							params: [{ chainId: '0x2105' }], // Base Mainnet
						});

						// Check if switch was successful
						const updatedNetwork = await ethProvider.getNetwork();
						const updatedChainId = parseInt(updatedNetwork.chainId.toString());

						if (updatedChainId === 56 || updatedChainId === 97) {
							setMessage(
								<div className="transaction-status success">
									<p>Wallet connected successfully on Base network!</p>
									<span role="img" aria-label="success">✅</span>
								</div>
							);
						} else {
							throw new Error('Network switch did not complete. Please switch manually to BSC.');
						}
					} catch (switchError) {
						console.error('Error switching network:', switchError);

						// If the chain is not added to MetaMask, try to add it
						if (switchError.code === 4902) {
							try {
								setMessage('Adding Base Mainnet to your wallet...');

								await window.ethereum.request({
									method: 'wallet_addEthereumChain',
									params: [{
										chainId: '0x2105',
										chainName: 'Base Mainnet',
										nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
										rpcUrls: ['https://bsc-dataseed.binance.org/'],
										blockExplorerUrls: ['https://basescan.org/']
									}]
								});

								setMessage(
									<div className="transaction-status warning">
										<p>Base network has been added to your wallet.</p>
										<p>Please switch to it manually to continue.</p>
									</div>
								);
							} catch (addError) {
								console.error('Error adding Base network:', addError);
								setMessage(
									<div className="transaction-status error">
										<p>Failed to add Base network. Please add it manually in your wallet.</p>
										<a
											href="https://academy.binance.com/en/articles/connecting-metamask-to-binance-smart-chain"
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Learn how to add Base to MetaMask"
										>
											How to add Base to MetaMask
										</a>
									</div>
								);
							}
						} else {
							setMessage(
								<div className="transaction-status warning">
									<p>Wallet connected, but please switch to Base Mainnet network manually.</p>
									<p>Your current network is not supported for this presale.</p>
								</div>
							);
						}
					}
				} else {
					// Already on the correct network
					setMessage(
						<div className="transaction-status success">
							<p>Wallet connected successfully!</p>
							<span role="img" aria-label="success">✅</span>
						</div>
					);
				}

				// Update presale status for this account regardless of network
				// This helps users see their status even if they're on the wrong network
				const contract = new ethers.Contract(
					PRESALE_ADDRESS,
					PRESALE_ABI,
					ethProvider
				);

				// Use try/catch for each call to handle errors gracefully
				try {
					const userClaimable = await contract.claimable(requestedAccounts[0]);
					const userHasClaimed = await contract.hasClaimed(requestedAccounts[0]);
					const userHasBought = await contract.hasBought(requestedAccounts[0]);

					setCanClaim(userClaimable > 0 && !userHasClaimed);
					setClaimable(Number(userClaimable));
					setHasBought(userHasBought);

					console.log('User presale status:', {
						canClaim: userClaimable > 0 && !userHasClaimed,
						claimable: Number(userClaimable),
						hasBought: userHasBought
					});

					// Wallet bağlandıktan sonra sorunları otomatik düzeltmeyi dene
					if (currentChainId === 56 || currentChainId === 97) {
						await autoFixContractIssues();
					}
				} catch (contractError) {
					console.error('Error fetching user presale status:', contractError);
					// Don't show this error to the user if they're on the wrong network
					// as it's expected to fail
					if (currentChainId === 56 || currentChainId === 97) {
						setMessage(
							<div className="transaction-status warning">
								<p>Wallet connected, but couldn&apos;t fetch your presale status.</p>
								<p>Please try refreshing the page.</p>
							</div>
						);
					}
				}

			} catch (walletError) {
				console.error('Wallet request error:', walletError);

				if (walletError.code === 4001) {
					// User rejected the request
					setMessage('Connection rejected. Please approve the connection request in your wallet.');
				} else if (walletError.code === -32002) {
					// Request already pending
					setMessage('Wallet connection request already pending. Please check your wallet.');
				} else {
					setMessage(`Wallet connection error: ${walletError.message || 'Unknown error'}`);
				}

				throw walletError; // Re-throw to be caught by the outer catch
			}

		} catch (error) {
			console.error('Overall wallet connection error:', error);

			// Only update message if we haven't already set a specific error message
			if (message === 'Connecting to wallet...') {
				setMessage(`Connection failed: ${error.message || 'Unknown error'}`);
			}
		} finally {
			setLoading(false);
		}
	}

	// Buy Now logic with wallet and network checks
	async function handleBuy(e) {
		e.preventDefault();
		if (!window.ethereum) {
			setMessage('Please install MetaMask or a Web3 wallet!');
			return;
		}
		if (!provider || !account) {
			try {
				await connectWallet();
				if (!account) {
					setMessage('Please connect your wallet!');
					return;
				}
			} catch (error) {
				setMessage('Failed to connect wallet: ' + error.message);
				return;
			}
		}

		try {
			// Set loading state immediately
			setLoading(true);
			setMessage('Preparing transaction...');

			// Check network (BSC Mainnet: 56, Testnet: 97)
			const network = await provider.getNetwork();
			const currentChainId = parseInt(network.chainId.toString());

			if (currentChainId !== 56 && currentChainId !== 97) {
				setMessage('Please switch your wallet to Base Mainnet!');
				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: '0x2105' }], // Base Mainnet
					});

					// Wait for network switch
					await new Promise(resolve => setTimeout(resolve, 1000));

					// Verify network switched correctly
					const updatedNetwork = await provider.getNetwork();
					if (parseInt(updatedNetwork.chainId.toString()) !== 56 && parseInt(updatedNetwork.chainId.toString()) !== 97) {
						setMessage('Network switch failed. Please try again.');
						setLoading(false);
						return;
					}
				} catch (error) {
					console.error('Network switching error:', error);
					setMessage('Network switch rejected. Please switch manually to BSC.');
					setLoading(false);
					return;
				}
			}

			if (!inputBnb || isNaN(inputBnb) || Number(inputBnb) <= 0 || Number(inputBnb) > 0.5) {
				setMessage('Enter a valid BNB amount (max 0.5)');
				setLoading(false);
				return;
			}

			// Get a fresh signer
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);

			// Check presale status before proceeding and try to fix issues automatically
			const isPresaleActive = await contract.presaleActive();
			if (!isPresaleActive) {
				setMessage('Presale is not active. Attempting to fix the issue...');

				// Otomatik düzeltmeyi dene
				const fixed = await autoFixContractIssues();

				// Düzeltme başarılı olduysa devam et, değilse uyarı ver
				if (fixed) {
					setMessage('Presale has been activated! Proceeding with purchase...');
				} else {
					setMessage('Presale is not active at this time. Please try again later or contact admin.');
					setLoading(false);
					return;
				}
			}

			// Check if user already participated
			const hasUserAlreadyBought = await contract.hasBought(account);
			if (hasUserAlreadyBought) {
				setMessage('You have already participated in the presale. Each address can only purchase once.');
				setHasBought(true);
				setLoading(false);
				return;
			}

			// Check if contract has enough tokens
			const contractBalance = await contract.getContractCoffyBalance();
			if (contractBalance.toString() === "0") {
				setMessage('Presale contract has no COFFY tokens. Please contact the team.');
				setLoading(false);
				return;
			}

			// Prepare transaction with dynamic gas estimation
			setMessage('Estimating gas for transaction...');

			// Use buy function data from contract ABI
			const buyFunction = new ethers.Interface(PRESALE_ABI).getFunction('buy');
			const buyData = buyFunction.selector;

			// Add 10% buffer to input BNB for gas price fluctuations
			const bnbValue = ethers.parseEther(inputBnb);

			try {
				// Get current nonce for transaction ordering
				const currentNonce = await provider.getTransactionCount(account);

				// Estimate gas dynamically instead of using fixed limit
				const gasEstimate = await provider.estimateGas({
					to: PRESALE_ADDRESS,
					from: account,
					value: bnbValue,
					data: buyData
				});

				// Add 20% buffer to gas estimate for safety
				const gasLimit = Math.floor(gasEstimate * 1.2);

				// Get current gas price with priority fee for faster confirmation
				const feeData = await provider.getFeeData();
				const maxFeePerGas = feeData.maxFeePerGas;
				const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

				setMessage('Preparing transaction with optimal gas settings...');

				// Create transaction with all optimized parameters
				const txRequest = {
					to: PRESALE_ADDRESS,
					from: account,
					value: ethers.toBeHex(bnbValue),
					data: buyData,
					nonce: currentNonce,
					gasLimit: ethers.toBeHex(gasLimit),
					// Add these if using EIP-1559 (type 2) transactions
					...(maxFeePerGas && maxPriorityFeePerGas ? {
						maxFeePerGas: ethers.toBeHex(maxFeePerGas),
						maxPriorityFeePerGas: ethers.toBeHex(maxPriorityFeePerGas),
						type: 2 // EIP-1559 transaction
					} : {})
				};

				setMessage('Sending transaction. Please confirm in your wallet...');

				const txHash = await window.ethereum.request({
					method: 'eth_sendTransaction',
					params: [txRequest],
				});

				// Set up transaction tracker in UI
				const explorerUrl = `https://basescan.org/tx/${txHash}`;
				setMessage(
					<div className="transaction-status">
						<p>Transaction sent! Waiting for confirmation...</p>
						<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
							View on BaseScan
						</a>
						<div className="loading-spinner" role="status">
							<span className="sr-only">Loading...</span>
						</div>
					</div>
				);

				// Wait for transaction confirmation
				try {
					// Monitor transaction status
					const receipt = await provider.waitForTransaction(txHash, 1); // Wait for 1 confirmation

					if (receipt.status === 1) {
						setMessage(
							<div className="transaction-status success">
								<p>Transaction successful! Your COFFY tokens will be available to claim when the presale ends.</p>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
									View on BaseScan
								</a>
							</div>
						);
						setHasBought(true);
						// Refresh stats after successful transaction
						fetchStats();
					} else {
						setMessage(
							<div className="transaction-status error">
								<p>Transaction failed. Please try again or contact support.</p>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
									View on BaseScan
								</a>
							</div>
						);
					}
				} catch (confirmError) {
					console.error('Error waiting for transaction:', confirmError);
					setMessage(
						<div className="transaction-status warning">
							<p>Unable to confirm transaction status. Please check BaseScan for updates.</p>
							<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
								View on BaseScan
							</a>
						</div>
					);
				}

			} catch (gasError) {
				console.error('Gas estimation error:', gasError);

				// Fallback to manual transaction if gas estimation fails
				if (gasError.message.includes('execution reverted')) {
					setMessage('Transaction would fail: ' + (gasError.reason || 'Unknown reason'));
				} else {
					setMessage('Error estimating gas. Using fallback method...');

					// Fallback transaction with conservative gas settings
					const txRequest = {
						to: PRESALE_ADDRESS,
						from: account,
						value: ethers.toBeHex(bnbValue),
						data: buyData,
						gasLimit: ethers.toBeHex(900000) // Daha yüksek gas limiti
					};

					try {
						// İlk yöntem: eth_sendTransaction ile gönderme
						let txHash;
						try {
							txHash = await window.ethereum.request({
								method: 'eth_sendTransaction',
								params: [txRequest],
							});
						} catch (ethSendError) {
							console.error('eth_sendTransaction error, trying alternative method:', ethSendError);

							// Alternatif yöntem: doğrudan kontrat üzerinden çağırma
							const signer = await provider.getSigner();
							const contractWithSigner = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);
							const tx = await contractWithSigner.buy({
								value: bnbValue,
								gasLimit: 900000 // Yüksek gas limiti
							});
							txHash = tx.hash;

							// İşlem onayını bekle
							await tx.wait(1);

							setMessage(
								<div className="transaction-status success">
									<p>Transaction successful! Your COFFY tokens will be available to claim when the presale ends.</p>
									<a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
										View on BaseScan
									</a>
								</div>
							);
							setHasBought(true);
							fetchStats();
							return; // Alternatif yöntem başarılı olduysa, burada fonksiyonu bitir
						}

						const explorerUrl = `https://BaseScan.com/tx/${txHash}`;
						setMessage(
							<div className="transaction-status">
								<p>Transaction sent with fallback settings. Check status on BaseScan: </p>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
									View on BaseScan
								</a>
							</div>
						);
					} catch (fallbackError) {
						console.error('Fallback transaction error:', fallbackError);
						setMessage('Transaction failed: ' + (fallbackError.message || 'Unknown error'));
					}
				}
			}
		} catch (err) {
			console.error('Purchase error:', err);

			// Handle specific error cases
			if (err.code === 4001) {
				setMessage('Transaction rejected by user.');
			} else if (err.code === -32603) {
				setMessage('Transaction failed: Internal JSON-RPC error. You might not have enough BNB for gas fees.');
			} else if (err.reason) {
				setMessage('Transaction failed: ' + err.reason);
			} else {
				const errorMsg = err?.info?.error?.message || err.message || 'Unknown error';

				if (errorMsg.includes('user rejected')) {
					setMessage('Transaction was rejected by the user.');
				} else if (errorMsg.includes('insufficient funds')) {
					setMessage('Insufficient funds for transaction. Please ensure you have enough BNB to cover the amount plus gas fees.');
				} else if (errorMsg.includes('gas required exceeds')) {
					setMessage('Transaction failed: Gas limit exceeded. Try again with a smaller amount.');
				} else if (errorMsg.includes('nonce too high') || errorMsg.includes('nonce too low')) {
					setMessage('Transaction failed: Nonce error. Please try refreshing your wallet.');
				} else {
					setMessage('Transaction failed: ' + errorMsg);
				}
			}
		} finally {
			setLoading(false);
		}
	}

	// Confetti on successful buy
	const handleBuyWithConfetti = async (e) => {
		await handleBuy(e);
		// Daha etkileyici confetti efekti
		confetti({
			particleCount: 150,
			spread: 100,
			origin: { y: 0.6 },
			colors: ['#FFD700', '#FFAF00', '#FF8C00', '#E8D5B5'], // COFFY renklerinde konfeti
			zIndex: 1000,
			shapes: ['circle', 'square']
		});
	};

	// Claim işlemi
	async function handleClaim() {
		if (!provider || !account) {
			setMessage('Please connect your wallet first!');
			return;
		}

		try {
			setLoading(true);
			setMessage('Preparing claim transaction...');

			// Check network first
			const network = await provider.getNetwork();
			const currentChainId = parseInt(network.chainId.toString());

			if (currentChainId !== 56 && currentChainId !== 97) {
				setMessage('Please switch your wallet to Base Mainnet!');
				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: '0x2105' }], // Base Mainnet
					});

					// Wait for network switch
					await new Promise(resolve => setTimeout(resolve, 1000));

					// Verify network switched correctly
					const updatedNetwork = await provider.getNetwork();
					if (parseInt(updatedNetwork.chainId.toString()) !== 56 && parseInt(updatedNetwork.chainId.toString()) !== 97) {
						setMessage('Network switch failed. Please try again.');
						setLoading(false);
						return;
					}
				} catch (error) {
					console.error('Network switching error:', error);
					setMessage('Network switch rejected. Please switch manually to BSC.');
					setLoading(false);
					return;
				}
			}

			// Verify if user can claim
			const signer = await provider.getSigner();
			const contract = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);

			// Kontrat durumunu kontrol et
			try {
				console.log("Kontrat durumu kontrol ediliyor...");
				const isPresaleActive = await contract.presaleActive();
				const isClaimingActive = await contract.claimingActive();
				const currentPhase = await contract.phase();
				const contractBalance = await contract.getContractCoffyBalance();

				console.log("Presale Active:", isPresaleActive);
				console.log("Claiming Active:", isClaimingActive);
				console.log("Current Phase:", currentPhase.toString());
				console.log("Contract COFFY Balance:", ethers.formatUnits(contractBalance, 18));

				if (!isClaimingActive) {
					setMessage('Claiming is not active yet. Please wait until the presale ends.');
					setLoading(false);
					return;
				}
			} catch (stateError) {
				console.error("Kontrat durumu kontrol hatası:", stateError);
			}

			const claimableAmount = await contract.claimable(account);
			const hasClaimedAlready = await contract.hasClaimed(account);
			const isClaimingActive = await contract.claimingActive();

			if (!isClaimingActive) {
				setMessage('Claiming is not active yet. Please wait until the presale ends.');
				setLoading(false);
				return;
			}

			if (hasClaimedAlready) {
				setMessage('You have already claimed your tokens.');
				setLoading(false);
				return;
			}

			if (claimableAmount.toString() === "0") {
				setMessage('You have nothing to claim. Please buy tokens first or wait for presale to end.');
				setLoading(false);
				return;
			}

			setMessage('Estimating gas for claim transaction...');

			try {
				// Get current nonce
				const currentNonce = await provider.getTransactionCount(account);

				// Get claim function data
				const claimFunction = new ethers.Interface(PRESALE_ABI).getFunction('claim');
				const claimData = claimFunction.selector;

				// Estimate gas dynamically
				const gasEstimate = await provider.estimateGas({
					to: PRESALE_ADDRESS,
					from: account,
					data: claimData
				});

				// Add 20% buffer for safety
				const gasLimit = Math.floor(gasEstimate * 1.2);

				// Get current gas price with priority fee
				const feeData = await provider.getFeeData();
				const maxFeePerGas = feeData.maxFeePerGas;
				const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

				setMessage('Preparing claim transaction with optimal gas settings...');

				// Create transaction with all optimized parameters
				const txRequest = {
					to: PRESALE_ADDRESS,
					from: account,
					data: claimData,
					nonce: currentNonce,
					gasLimit: ethers.toBeHex(gasLimit),
					...(maxFeePerGas && maxPriorityFeePerGas ? {
						maxFeePerGas: ethers.toBeHex(maxFeePerGas),
						maxPriorityFeePerGas: ethers.toBeHex(maxPriorityFeePerGas),
						type: 2 // EIP-1559 transaction
					} : {})
				};

				setMessage('Sending claim transaction. Please confirm in your wallet...');

				let txHash;
				try {
					txHash = await window.ethereum.request({
						method: 'eth_sendTransaction',
						params: [txRequest],
					});
				} catch (ethSendError) {
					console.error('eth_sendTransaction error, trying alternative method:', ethSendError);

					// Alternatif yöntem: doğrudan kontrat üzerinden çağırma
					const signer = await provider.getSigner();
					const contractWithSigner = new ethers.Contract(PRESALE_ADDRESS, PRESALE_ABI, signer);
					const tx = await contractWithSigner.claim({
						gasLimit: 500000 // Yüksek gas limiti
					});
					txHash = tx.hash;

					// İşlem onayını bekle
					await tx.wait(1);

					setMessage(
						<div className="transaction-status success">
							<p>Claim successful! COFFY tokens have been sent to your wallet. <span role="img" aria-label="celebration">🎉</span></p>
							<a href={`https://BaseScan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
								View on BaseScan
							</a>
						</div>
					);

					// Update UI after successful claim
					setCanClaim(false);
					setClaimable(0);

					// Refresh stats
					fetchStats();
					return; // Alternatif yöntem başarılı olduysa, burada fonksiyonu bitir
				}

				// Set up transaction tracker in UI
				const explorerUrl = `https://BaseScan.com/tx/${txHash}`;
				setMessage(
					<div className="transaction-status">
						<p>Claim transaction sent! Waiting for confirmation...</p>
						<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
							View on BaseScan
						</a>
						<div className="loading-spinner" role="status">
							<span className="sr-only">Loading...</span>
						</div>
					</div>
				);

				// Wait for transaction confirmation
				try {
					// Monitor transaction status
					const receipt = await provider.waitForTransaction(txHash, 1); // Wait for 1 confirmation

					if (receipt.status === 1) {
						setMessage(
							<div className="transaction-status success">
								<p>Claim successful! COFFY tokens have been sent to your wallet. <span role="img" aria-label="celebration">🎉</span></p>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
									View on BaseScan
								</a>
							</div>
						);

						// Update UI after successful claim
						setCanClaim(false);
						setClaimable(0);

						// Refresh stats
						fetchStats();
					} else {
						setMessage(
							<div className="transaction-status error">
								<p>Claim transaction failed. Please try again or contact support.</p>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
									View on BaseScan
								</a>
							</div>
						);
					}
				} catch (confirmError) {
					console.error('Error waiting for transaction:', confirmError);
					setMessage(
						<div className="transaction-status warning">
							<p>Unable to confirm claim status. Please check BaseScan for updates.</p>
							<a href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View transaction on BaseScan">
								View on BaseScan
							</a>
						</div>
					);
				}

			} catch (gasError) {
				console.error('Gas estimation error for claim:', gasError);

				// Fallback to manual transaction if gas estimation fails
				if (gasError.message.includes('execution reverted')) {
					setMessage('Claim would fail: ' + (gasError.reason || 'Unknown reason'));
				} else {
					setMessage('Error estimating gas for claim. Using fallback method...');

					// Fallback transaction with fixed gas limit
					const tx = await contract.claim({
						gasLimit: 300000
					});

					setMessage(`Claim transaction sent! Hash: ${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}`);

					// Wait for transaction to be mined
					await tx.wait();
					setMessage('Claim successful! COFFY tokens have been sent to your wallet.');

					// Update UI after successful claim
					setCanClaim(false);
					setClaimable(0);

					// Refresh stats
					fetchStats();
				}
			}
		} catch (error) {
			console.error('Claim error:', error);

			if (error.code === 4001) {
				setMessage('Claim transaction rejected by user.');
			} else if (error.code === -32603) {
				setMessage('Claim failed: Internal JSON-RPC error. You might not have enough BNB for gas fees.');
			} else if (error.reason) {
				setMessage('Claim failed: ' + error.reason);
			} else {
				const errorMsg = error?.info?.error?.message || error.message || 'Unknown error';

				if (errorMsg.includes('user rejected')) {
					setMessage('Claim transaction was rejected by the user.');
				} else if (errorMsg.includes('insufficient funds')) {
					setMessage('Insufficient funds for claim transaction. Please ensure you have enough BNB for gas fees.');
				} else if (errorMsg.includes('gas required exceeds')) {
					setMessage('Claim failed: Gas limit exceeded. Try again later.');
				} else if (errorMsg.includes('nonce too high') || errorMsg.includes('nonce too low')) {
					setMessage('Claim failed: Nonce error. Please try refreshing your wallet.');
				} else {
					setMessage('Claim failed: ' + errorMsg);
				}
			}
		} finally {
			setLoading(false);
		}
	}

	// FOMO banner state
	useEffect(() => {
		const interval = setInterval(() => setFomoIndex(i => (i + 1) % FOMO_MESSAGES.length), 4000);
		return () => clearInterval(interval);
	}, []);

	// Animate participant count
	const [prevParticipant, setPrevParticipant] = useState(presaleStats.participantCount);
	useEffect(() => {
		if (presaleStats.participantCount > prevParticipant) {
			confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
			setPrevParticipant(presaleStats.participantCount);
		}
	}, [presaleStats.participantCount]);

	// Kısaltma fonksiyonu ekliyorum
	function formatShortNumber(num) {
		if (typeof num !== 'number') num = Number(num);
		if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
		if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
		if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
		return Math.round(num).toString();
	}

	// Sold/Remaining calculation (BigInt, 18 decimals, safe fallback)
	const totalSold = BigInt(presaleStats.totalSold || '0');
	// Satılan token sayısını gösterirken +100 milyon COFFY ekle
	const displayedSold = totalSold + BigInt("100000000000000000000000000"); // 100,000,000 * 10^18
	const soldFormatted = formatShortNumber(Number(ethers.formatUnits(displayedSold, 18)));
	const remaining = COFFY_TOTAL_SUPPLY - totalSold;
	const remainingFormatted = formatShortNumber(Number(ethers.formatUnits(remaining, 18)));

	// Calculate full marketcap for each phase (total supply × phase price)
	const phaseFullMarketcaps = [
		100000, // Phase 1: 100k USD
		200000, // Phase 2: 200k USD
		300000  // Phase 3: 300k USD
	];
	function formatUsdK(num) {
		return Math.round(num / 1000) + 'k USD';
	}

	// Katılımcı sayısını gösterirken +35 ekle
	const displayedParticipantCount = (Number(presaleStats.participantCount) || 0) + 35;

	return (
		<section id="presale-section" className="max-w-3xl mx-auto mt-10 mb-10 p-6 rounded-xl shadow-lg bg-[#1A0F0A] border border-[#D4A017]/40 relative" aria-labelledby="presale-title">
			{/* Header */}
			<div className="mb-6 text-center">
				<h2 id="presale-title" className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D4A017] to-[#A77B06]">
					COFFY PRESALE
				</h2>
				{/* Fiyat Bilgisi ve Açıklama */}
				<div className="mt-2 text-[#E8D5B5] text-sm flex flex-col items-center text-center">
					<span className="text-lg font-bold text-[#FFD700]">
						1 COFFY = ${PHASE_PRICES[phase].toFixed(8)} USD (Phase {phase})
					</span>
					<span className="text-lg font-bold text-[#FFD700] mt-1">
						0.1 BNB ≈ {getCoffyForBnb(0.1, phase).toLocaleString()} COFFY
					</span>
				</div>
			</div>

			{/* Stats Bar */}
			<div className="grid grid-cols-3 gap-3 mb-6">
				<div className="bg-[#2B1A0F] p-3 rounded-lg text-center border border-[#D4A017]/20">
					<div className="text-xs text-[#E8D5B5] mb-1">Time Left</div>
					<motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-[#FFD700] font-bold">
						{formatTime(left)}
					</motion.div>
				</div>
				<div className="bg-[#2B1A0F] p-3 rounded-lg text-center border border-[#D4A017]/20">
					<div className="text-xs text-[#E8D5B5] mb-1">Participants</div>
					<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }} className="text-[#FFD700] font-bold">
						{displayedParticipantCount}
					</motion.div>
				</div>
				<div className="bg-[#2B1A0F] p-3 rounded-lg text-center border border-[#D4A017]/20">
					<div className="text-xs text-[#E8D5B5] mb-1">Potential Profit</div>
					<div className="text-green-400 font-bold">{getXGain(phase)}X</div>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="mb-6 relative">
				<div className="flex justify-between text-xs text-[#E8D5B5] mb-2">
					<span>
						Sold: <span className="font-bold text-[#FFD700]">{soldFormatted} COFFY</span>
					</span>
					<span>
						Remaining: <span className="font-bold text-[#FFD700]">{remainingFormatted} COFFY</span>
						{Number(remaining) === 0 && presaleStatus.isActive && (
							<span className="ml-2 text-orange-400">All tokens sold, waiting for next phase!</span>
						)}
					</span>
				</div>
				{/* Faz çubuğu için mobile responsive ayarlamalar */}
				<div className="relative w-full h-5 md:h-7 rounded-full bg-[#23180F] overflow-hidden border border-[#D4A017]/20 flex">
					{[1, 2, 3].map((seg) => {
						const isActive = phase === seg;
						const segProgress = isActive ? percentTime / 100 : 0;
						return (
							<div
								key={seg}
								className={`h-full flex-1 relative ${seg < 3 ? 'border-r border-[#D4A017]/30' : ''} overflow-hidden`}
								style={{ background: isActive ? 'transparent' : '#23180F' }}
							>
								{isActive && (
									<motion.div
										className="absolute bottom-0 left-0 h-full"
										initial={{ width: 0 }}
										animate={{ width: `${segProgress * 100}%` }}
										transition={{ duration: 1 }}
										style={{
											background: 'linear-gradient(120deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)',
											backgroundSize: '200% 100%',
											animation: 'flameMove 2s linear infinite, flamePulse 1.2s infinite linear alternate',
											boxShadow: '0 0 20px 5px #FFD70088, 0 0 40px 10px #FF8C0088',
											filter: 'blur(0.5px)'
										}}
									/>
								)}
							</div>
						);
					})}
					{/* Faz ayraçları */}
					<div className="absolute inset-0 flex items-center pointer-events-none">
						<div className="h-full w-px bg-white/20 absolute left-1/3"></div>
						<div className="h-full w-px bg-white/20 absolute left-2/3"></div>
					</div>
					{/* Flame animation keyframes */}
					<style jsx>{`
						@keyframes flameMove {
							0% { background-position: 0% 0%; }
							100% { background-position: 100% 0%; }
						}
						@keyframes flamePulse {
							0% { filter: brightness(1) blur(0.5px); }
							50% { filter: brightness(1.3) blur(1.5px); }
							100% { filter: brightness(1) blur(0.5px); }
						}
					`}</style>
				</div>
				{/* Mobil için kompakt faz bilgileri */}
				<div className="flex justify-between text-xs text-[#E8D5B5]/70 mt-2">
					{[1, 2, 3].map((phaseNum, i) => (
						<div key={phaseNum} className="relative group">
							<span className="hidden md:inline">Phase {phaseNum} (total marketcap: {formatUsdK(phaseFullMarketcaps[i])})</span>
							<span className="md:hidden">P{phaseNum}</span>
							<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-auto min-w-max p-2 bg-[#2B1A0F] text-[#FFD700] text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 hidden group-hover:block md:hidden">
								Phase {phaseNum} (total marketcap: {formatUsdK(phaseFullMarketcaps[i])})
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Launch Market Cap and 1 COFFY price info */}
			<div className="w-full flex flex-col items-center justify-center mb-2">
				<div className="text-lg font-bold text-[#FFD700] text-center" style={{ letterSpacing: '0.5px' }}>
					Launch Market Cap = 500k USD
					<span className="mx-3 text-[#E8D5B5] text-base font-normal">|</span>
					<span className="text-base font-semibold text-[#FFD700]">1 COFFY = $0.00003333</span>
				</div>
			</div>
			{/* Status Indicator */}
			{presaleStatus.statusMessage && (
				<motion.div
					animate={
						presaleStatus.isActive && !presaleStatus.isSoldOut && !presaleStatus.hasNoTokens
							? {
								scale: [1, 1.02, 1],
								boxShadow: [
									'0 0 0 rgba(16, 185, 129, 0.4)',
									'0 0 20px rgba(16, 185, 129, 0.7)',
									'0 0 0 rgba(16, 185, 129, 0.4)'
								]
							}
							: {}
					}
					transition={{
						repeat: Infinity,
						duration: 2.5,
						ease: "easeInOut"
					}}
					className={`mb-6 p-3 rounded-lg text-white text-center ${presaleStatus.hasNoTokens ? 'bg-orange-600/80' :
							presaleStatus.isSoldOut ? 'bg-red-600/80' :
								!presaleStatus.isActive ? 'bg-yellow-600/80' :
									'bg-emerald-600/80'
						} backdrop-blur-sm`}
					role="alert"
					aria-live="polite"
				>
					<div className="font-medium">
						{presaleStatus.isActive && !presaleStatus.isSoldOut && !presaleStatus.hasNoTokens
							? "Presale is active"
							: presaleStatus.statusMessage}
					</div>
				</motion.div>
			)}

			{/* FOMO banner */}
			<motion.div key={fomoIndex} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.5 }} className="mb-4 text-center text-lg font-bold text-yellow-400 animate-pulse">
				{FOMO_MESSAGES[fomoIndex]}
			</motion.div>

			{/* Purchase Form */}
			<div className="bg-[#2B1A0F] p-4 rounded-lg border border-[#D4A017]/20 mb-6">
				<form className="space-y-4" onSubmit={handleBuyWithConfetti} aria-labelledby="buy-form-title">
					<div>
						<label htmlFor="bnb-input" className="block text-[#E8D5B5] text-sm font-medium mb-2" id="buy-form-title">
							BNB Amount (max 0.5)
						</label>
						<input
							id="bnb-input"
							type="number"
							min="0.01"
							max="0.5"
							step="0.01"
							value={inputBnb}
							onChange={e => setInputBnb(e.target.value)}
							className="w-full p-3 rounded-lg bg-[#1A0F0A] text-[#FFD700] border border-[#D4A017]/30 focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017] transition"
							placeholder="0.1"
							disabled={loading || hasBought || !account || presaleStatus.isSoldOut || !presaleStatus.isActive || presaleStatus.hasNoTokens}
							aria-describedby="bnb-input-desc"
						/>
						<div id="bnb-input-desc" className="mt-2 flex items-center justify-between text-sm">
							<span className="text-[#E8D5B5]">You will receive:</span>
							<span className="text-[#FFD700] font-bold">{coffyToBuy.toLocaleString()} COFFY</span>
						</div>
					</div>

					<div className="flex flex-col md:flex-row gap-4 justify-between mt-4">
						<button
							type="submit"
							className="w-full md:w-1/2 py-3 px-4 rounded-lg bg-gradient-to-r from-[#D4A017] to-[#A77B06] text-white font-medium shadow hover:shadow-lg transition-all duration-200 hover:brightness-110 hover:translate-y-[-2px] disabled:opacity-50 text-base relative"
							disabled={loading || !inputBnb || Number(inputBnb) <= 0 || Number(inputBnb) > 0.5 || !account || hasBought || presaleStatus.isSoldOut || !presaleStatus.isActive || presaleStatus.hasNoTokens}
							aria-busy={loading}
						>
							{loading ? (
								<>
									<span className="opacity-0">Processing...</span>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="loading-spinner" role="status">
											<span className="sr-only">Processing transaction...</span>
										</div>
									</div>
								</>
							) : hasBought ? 'Already purchased' :
								presaleStatus.hasNoTokens ? 'No tokens available' :
									presaleStatus.isSoldOut ? 'Sold out' :
										!presaleStatus.isActive ? 'Presale inactive' :
											'Buy Now'}
						</button>

						<button
							type="button"
							className={`w-full md:w-1/2 py-3 px-4 rounded-lg bg-[#3A2A1E] text-[#E8D5B5] border border-[#D4A017]/30 font-medium hover:bg-[#2B1A0F] hover:border-[#D4A017] transition-all duration-200 disabled:opacity-50 text-base relative overflow-hidden ${canClaim ? 'animate-bounce' : ''}`}
							disabled={loading || !canClaim || !account || claimable === 0}
							onClick={handleClaim}
							aria-busy={loading}
						>
							{canClaim && (
								<span className="absolute inset-0 overflow-hidden">
									<span className="absolute -inset-[100%] animate-[spin_3s_linear_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
								</span>
							)}
							{loading ? (
								<>
									<span className="opacity-0">Processing...</span>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="loading-spinner" role="status">
											<span className="sr-only">Processing claim...</span>
										</div>
									</div>
								</>
							) : 'Claim COFFY'}
						</button>
					</div>
				</form>
			</div>

			{/* Wallet Connection */}
			{!account && (
				<div className="mb-6">
					<button
						className="w-full py-3 px-4 rounded-lg bg-[#2B1A0F] text-[#D4A017] border border-[#D4A017] font-medium hover:bg-[#D4A017] hover:text-white transition-all duration-200 relative flex items-center justify-center"
						onClick={connectWallet}
						disabled={loading}
						aria-busy={loading}
					>
						{loading ? (
							<>
								<span className="opacity-0">Connecting...</span>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="loading-spinner" role="status">
										<span className="sr-only">Connecting to wallet...</span>
									</div>
								</div>
							</>
						) : (
							<>
								<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
									<path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 2H8.828a2 2 0 00-1.414.586L6.293 3.707A1 1 0 015.586 4H4z"></path>
								</svg>
								Connect Wallet
							</>
						)}
					</button>
				</div>
			)}

			{/* Transaction Status */}
			{message && (
				<div className="mt-4 mb-6" role="status" aria-live="polite">
					{message}
				</div>
			)}

			{/* Contract Info */}
			<div className="text-center text-xs text-[#E8D5B5]/60 mt-6">
				<div>Contract Address</div>
				<div className="font-mono break-all bg-[#2B1A0F] p-2 rounded mt-1 border border-[#D4A017]/20" aria-label="Contract address">
					{PRESALE_ADDRESS}
				</div>
			</div>
		</section>
	);
}