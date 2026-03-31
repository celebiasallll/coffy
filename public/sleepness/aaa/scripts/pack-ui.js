import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import texturePacker from 'free-tex-packer-core';

// Setup directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.join(__dirname, '../public/assets/ui');
const iconsDir = path.join(assetsDir, 'icons');
const srcDir = path.join(__dirname, '../src');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Minimal 32x32 blank base64 PNGs representing icons (for demonstration)
// In a real project you'd drop your Kenney / Game-Icons PNGs in /icons folder.
const dummyIcons = {
    'btn-fire.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVFhH7cwxEQAACAMwtP61b2MIOMg60tz71qQnAAEgAAQgAAQgAAQgAAQgAAQgAMR3YAAWkQER8t8u8QAAAABJRU5ErkJggg==',
    'btn-jump.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAzSURBVFhH7cxhEQAAAMKg9E/tsSbgIAvIe+eZJz0BCAABIAAEIAAEIAAEIAAEIAAEgPgMDEA7AQs4i+1pAAAAAElFTkSuQmCC',
    'btn-dash.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVFhH7c1BDQAACIMwsH9qPwwR7qD2oW/vPNOtB1QgUIIqEChBEQiUoAoESlAEAiXoBzAAuM8EE7fylQkAAAAASUVORK5CYII='
};

// Create dummy icons if the folder is empty
let createdDummies = false;
for (const [name, b64] of Object.entries(dummyIcons)) {
    const filePath = path.join(iconsDir, name);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
        createdDummies = true;
    }
}
if (createdDummies) console.log('📝 Created dummy icons in /public/assets/ui/icons for demo.');

// Read icons
const images = [];
const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png'));

for (const file of files) {
    images.push({
        path: file,
        contents: fs.readFileSync(path.join(iconsDir, file))
    });
}

console.log(`📦 Packing ${images.length} UI image(s)...`);

const options = {
    textureName: 'ui-atlas',
    width: 256,
    height: 256,
    fixedSize: false,
    padding: 2,
    allowRotation: false,
    detectIdentical: true,
    exporter: 'css',
    removeFileExtension: true
};

texturePacker(images, options, (files, error) => {
    if (error) {
        console.error('❌ Packer Error: ', error);
        return;
    }
    
    // Write packed atlas files
    for (const item of files) {
        // if item is CSS, we might want it in src/core/ or public/assets
        if (item.name.endsWith('.css')) {
            const cssPath = path.join(srcDir, 'ui-atlas.css');
            fs.writeFileSync(cssPath, item.buffer);
            console.log(`✔️  Written CSS definition to: ${cssPath}`);
        } else {
            const imgPath = path.join(assetsDir, item.name);
            fs.writeFileSync(imgPath, item.buffer);
            console.log(`✔️  Written Texture atlas to: ${imgPath}`);
        }
    }
    console.log('✅ UI Spritesheet generation successful!');
    console.log('📉 Note: Use TinyPNG/imagemin to compress ui-atlas.png before production!');
});
