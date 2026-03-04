const fs = require('fs');

const baseConfigContent = fs.readFileSync('src/app/config/baseConfig.js', 'utf8');

const coffyCoreAddrMatch = baseConfigContent.match(/CoffyCore:\s*'([^']+)'/);
const gameModuleAddrMatch = baseConfigContent.match(/GameModule:\s*'([^']+)'/);

const coffytokenAddress = coffyCoreAddrMatch ? coffyCoreAddrMatch[1] : '';
const moduleAddress = gameModuleAddrMatch ? gameModuleAddrMatch[1] : '';

const coffytokenAbi = fs.readFileSync('src/app/config/CoffyCoreABI.json', 'utf8').trim();
const moduleAbi = fs.readFileSync('src/app/config/GameModuleABI.json', 'utf8').trim();

const output = `// coffytokenvemodülabi.js
// Generated from src/app/config

// CoffyCore contract (Base Network)
export const coffytokenAddress = "${coffytokenAddress}";
export const coffytokenAbi = ${coffytokenAbi};

// GameModule contract (Base Network)
export const moduleAddress = "${moduleAddress}";
export const moduleAbi = ${moduleAbi};
`;

fs.writeFileSync('public/CoffeeChess/coffytokenvemodülabi.js', output);
console.log('Successfully updated public/CoffeeChess/coffytokenvemodülabi.js');
