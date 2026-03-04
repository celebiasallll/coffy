const fs = require('fs');

function replaceMethod(content, methodName, newMethodText) {
    const startIdx = content.indexOf(methodName);
    if (startIdx === -1) return content;

    let braceCount = 0;
    let started = false;
    let endIdx = -1;

    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            started = true;
        } else if (content[i] === '}') {
            braceCount--;
        }

        if (started && braceCount === 0) {
            endIdx = i;
            break;
        }
    }

    if (endIdx !== -1) {
        return content.substring(0, startIdx) + newMethodText + content.substring(endIdx + 1);
    }
    return content;
}

const files = [
    'c:/Users/ACER/Desktop/coffysite/public/hungeriumgame/js/web3handler.js',
    'c:/Users/ACER/Desktop/coffysite/public/flagraceronline/js/web3handler.js',
    'c:/Users/ACER/Desktop/coffysite/public/beegame/js/web3handler.js'
];

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log("File not found:", file);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');

    // 1. Setup Addresses and ABIs
    if (file.includes('beegame')) {
        const topReplace = 'const COFFY_TOKEN_ADDRESS = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";\n' +
            'const GAME_MODULE_ADDRESS = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";\n' +
            'const COFFY_TOKEN_ABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}];\n' +
            'const GAME_MODULE_ABI = [{"inputs":[{"internalType":"uint64","name":"gameType","type":"uint64"}],"name":"startGame","outputs":[],"stateMutability":"nonpayable","type":"function"}];';

        content = content.replace(/const COFFY_TOKEN_ADDRESS[\s\S]*?\];(\r?\n)*?/g, topReplace + "\n");

        content = content.replace(/this\.tokenAddress\s*=\s*COFFY_TOKEN_ADDRESS;/,
            'this.tokenAddress = COFFY_TOKEN_ADDRESS;\n' +
            '        this.gameModuleAddress = GAME_MODULE_ADDRESS;\n' +
            '        this.tokenABI = COFFY_TOKEN_ABI;\n' +
            '        this.gameModuleABI = GAME_MODULE_ABI;');
    } else {
        const tokenRegex = /this\.tokenAddress\s*=\s*['"][a-zA-Z0-9x]+['"];[\s\S]*?(?=\/\/ Web3 instance)/;
        content = content.replace(tokenRegex,
            'this.tokenAddress = "0x29248bA2420757bF50595Af6d8903E5d8Dcb9b41";\n' +
            '        this.gameModuleAddress = "0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea";\n' +
            '        this.tokenABI = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}];\n' +
            '        this.gameModuleABI = [{"inputs":[{"internalType":"uint64","name":"gameType","type":"uint64"}],"name":"startGame","outputs":[],"stateMutability":"nonpayable","type":"function"}];\n        ');
    }

    // Initialize GameContract
    content = content.replace(/this\.tokenContract\s*=\s*new this\.web3\.eth\.Contract\([\s\S]*?this\.tokenAddress\s*\);/,
        'this.tokenContract = new this.web3.eth.Contract(\n' +
        '                    this.tokenABI,\n' +
        '                    this.tokenAddress\n' +
        '                );\n' +
        '                this.gameContract = new this.web3.eth.Contract(\n' +
        '                    this.gameModuleABI,\n' +
        '                    this.gameModuleAddress\n' +
        '                );');

    content = content.replace(/this\.tokenContract\s*=\s*new this\.web3\.eth\.Contract\(this\.tokenABI,\s*this\.tokenAddress\);/,
        'this.tokenContract = new this.web3.eth.Contract(this.tokenABI, this.tokenAddress);\n' +
        '            this.gameContract = new this.web3.eth.Contract(this.gameModuleABI, this.gameModuleAddress);');

    // ethers.js for beegame
    if (content.includes('this.tokenContractEthers =')) {
        content = content.replace(/this\.tokenContractEthers\s*=\s*new window\.ethers\.Contract\(this\.tokenAddress,\s*COFFY_TOKEN_ABI,\s*this\.ethersSigner\);/,
            'this.tokenContractEthers = new window.ethers.Contract(this.tokenAddress, COFFY_TOKEN_ABI, this.ethersSigner);\n' +
            '            this.gameContractEthers = new window.ethers.Contract(this.gameModuleAddress, GAME_MODULE_ABI, this.ethersSigner);');
    }

    // 2. modify startGameOnContract
    const startGameNew = 'async startGameOnContract() {\n' +
        '        try {\n' +
        '            const gameType = 1; // 1 = Default GameType\n' +
        '            if (this.gameContractEthers && window.ethereum) {\n' +
        '                console.log("Kontrat uzerinde startGame cagiriliyor (ethers.js)...");\n' +
        '                const accounts = await window.ethereum.request({ method: "eth_accounts" });\n' +
        '                if (!accounts || accounts.length === 0) return false;\n' +
        '                const tx = await this.gameContractEthers.startGame(gameType);\n' +
        '                await tx.wait();\n' +
        '                console.log("Contracts startGame basariyla cagirildi:", tx.hash);\n' +
        '                return true;\n' +
        '            } else if (this.gameContract && this.currentAccount) {\n' +
        '                console.log("Kontrat uzerinde startGame cagiriliyor...");\n' +
        '                const tx = await this.gameContract.methods.startGame(gameType).send({\n' +
        '                    from: this.currentAccount\n' +
        '                });\n' +
        '                console.log("Contracts startGame basariyla cagirildi:", tx.transactionHash);\n' +
        '                return true;\n' +
        '            }\n' +
        '            return false;\n' +
        '        } catch (error) {\n' +
        '            console.error("Kontrat startGame hatasi:", error);\n' +
        '            return false;\n' +
        '        }\n' +
        '    }';
    content = replaceMethod(content, 'async startGameOnContract()', startGameNew);

    // 3. modify claimRewards
    let claimSig = 'async claimRewards()';
    if (content.includes('async claimRewards(amount)')) claimSig = 'async claimRewards(amount)';
    if (content.includes('async claimRewards(tokensToClaimFromGame = null)')) claimSig = 'async claimRewards(tokensToClaimFromGame = null)';

    const claimRewardsNew = claimSig + ' {\n' +
        '        this.showNotification("Ödül talebi geçici olarak devre dışı bırakılmıştır. Yeni sözleşme mimarisine göre arka uç oracle onayı gerekmektedir.", "warning", 8000);\n' +
        '        console.warn("Backend Oracle required for claiming rewards in the new V16 GameModule Architecture.");\n' +
        '        return false;\n' +
        '    }';
    content = replaceMethod(content, claimSig, claimRewardsNew);

    fs.writeFileSync(file, content);
    console.log("Updated", file);
});
