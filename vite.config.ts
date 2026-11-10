import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH diisi otomatis oleh GitHub Actions: /nama-repo/
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  test: { include: ['tests/**/*.test.ts'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Toolbox Offline',
        short_name: 'Toolbox',
        description: 'Kumpulan utilitas digital yang jalan offline',
        theme_color: '#101114',
        background_color: '#101114',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      // Batch 22B-2 (P9): do NOT precache large ORT WASM; use runtime CacheFirst.
      // Model ONNX is never in Workbox — it uses Cache Storage vocal-separator-models-v1.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Keep 15 MB for other large app chunks if any; ORT wasm excluded via globIgnores
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globIgnores: [
          '**/node_modules/**',
          '**/ort-wasm*.wasm',
          '**/ort-wasm*.mjs',
          '**/ort-wasm*.js',
          '**/*ort*wasm*',
          '**/ort/**',
        ],
        runtimeCaching: [
          {
            // ORT WASM / JS assets loaded at runtime (Worker + main)
            urlPattern: /ort-wasm.*\.(wasm|js|mjs)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-runtime-v1',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Fallback: any path under base that looks like ORT assets
            urlPattern: ({ url }) =>
              /onnxruntime|ort-wasm/i.test(url.pathname) &&
              /\.(wasm|js|mjs)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-runtime-v1',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    // COOP/COEP only for local dev experiments. GitHub Pages does NOT set these.
    // Vocal separator does not require SharedArrayBuffer (numThreads=1).
    // Kept for optional WebGPU multi-thread experiments; production parity note in handoff.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
