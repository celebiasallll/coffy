import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            'three': path.resolve(__dirname, 'node_modules/three'),
            'three/build/three.module.js': path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
            'three/examples/jsm': path.resolve(__dirname, 'node_modules/three/examples/jsm')
        },
        dedupe: ['three', 'postprocessing']
    },
    optimizeDeps: {
        include: ['three'],
        exclude: ['@dimforge/rapier3d-compat']
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
        target: 'esnext',
        outDir: '../',
        emptyOutDir: false
    },
    assetsInclude: ['**/*.wasm']
});
