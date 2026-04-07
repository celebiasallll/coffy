import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
        },
        dedupe: ['three', 'postprocessing']
    },
    optimizeDeps: {
        include: ['three'],
        exclude: ['@dimforge/rapier3d-compat', '@recast-navigation/three', '@recast-navigation/core', '@recast-navigation/wasm-compat']
    },
    base: './',
    server: {
        port: 3000,
        open: true,
        headers: {
            // SharedArrayBuffer için zorunlu (Rapier Web Worker desteği)
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        }
    },
    build: {
        target: 'esnext'
    },
    assetsInclude: ['**/*.wasm']
});
