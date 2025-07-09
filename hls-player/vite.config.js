import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://bratan.online';

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // Allow the Keycloak silent SSO page to work correctly.
          navigateFallbackAllowlist: [/^\/silent-check-sso.html/]
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
