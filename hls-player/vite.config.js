import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://mixpla.online';

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // Allow the Keycloak silent SSO page to work correctly.
          navigateFallback: null,
          navigateFallbackDenylist: [/^\/api/, /^\/__/],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/fonts\.googleapis\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https?:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Mixpla',
          short_name: 'Mixpla',
          description: 'HLS Audio Player',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'favicon.ico',
              sizes: '64x64',
              type: 'image/x-icon',
              purpose: 'any'
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'vite.svg',
              sizes: '48x48 72x72 96x96 128x128 256x256',
              type: 'image/svg+xml',
              purpose: 'any'
            }
          ],
        },
      }),
    ],
    server: {
      port: 5176,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
