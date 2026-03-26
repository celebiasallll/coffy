import { defineConfig } from 'vite';

export default defineConfig({
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
    optimizeDeps: {
        exclude: ['@dimforge/rapier3d-compat']
    },
    assetsInclude: ['**/*.wasm']
});
