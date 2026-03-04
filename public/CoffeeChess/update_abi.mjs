import { readFileSync, writeFileSync } from 'fs';

const gameAbi = readFileSync('./config/GameModuleABI.json', 'utf8').trim();
let content = readFileSync('./coffytokenvemodülabi.js', 'utf8');

// Fix moduleAddress - works regardless of line endings
content = content.replace(
    '"0x5F23031155615B97C5a479efB0Af5f74Dfc54E27"',
    '"0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea"'
);

// Find moduleAbi block - use indexOf with both LF and CRLF
const MARKER_START = 'export const moduleAbi =';
const idxStart = content.indexOf(MARKER_START);
if (idxStart === -1) { console.error('moduleAbi not found'); process.exit(1); }

// Find the end: last "];" before activityModuleAddress
const MARKER_END = 'export const activityModuleAddress';
const idxEnd = content.indexOf(MARKER_END);
if (idxEnd === -1) { console.error('activityModuleAddress not found'); process.exit(1); }

const before = content.substring(0, idxStart);
const after = content.substring(idxEnd);

const newContent = before
    + 'export const moduleAbi = ' + gameAbi + ';\r\n\r\n'
    + after;

writeFileSync('./coffytokenvemodülabi.js', newContent);
console.log('Done!');
console.log('moduleAddress: 0xEb00A304DD1aB9A5bC995d4eD9cAFc190bC593Ea');
console.log('moduleAbi: updated from GameModuleABI.json');
console.log('File size:', newContent.length, 'bytes');
