// vite.config.js
import { defineConfig, loadEnv } from "file:///C:/Users/justa/CascadeProjects/mixpla/hls-player/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/justa/CascadeProjects/mixpla/hls-player/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { VitePWA } from "file:///C:/Users/justa/CascadeProjects/mixpla/hls-player/node_modules/vite-plugin-pwa/dist/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/justa/CascadeProjects/mixpla/hls-player/vite.config.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "https://bratan.online";
  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          // Allow the Keycloak silent SSO page to work correctly.
          navigateFallbackAllowlist: [/^\/silent-check-sso.html/]
        },
        devOptions: {
          enabled: true
        },
        manifest: {
          name: "Mixpla",
          short_name: "Mixpla",
          description: "HLS Audio Player",
          theme_color: "#ffffff",
          icons: [
            {
              src: "favicon.ico",
              sizes: "64x64",
              type: "image/x-icon",
              purpose: "any"
            },
            {
              src: "apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "vite.svg",
              sizes: "48x48 72x72 96x96 128x128 256x256",
              type: "image/svg+xml",
              purpose: "any"
            }
          ]
        }
      })
    ],
    server: {
      port: 5176
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqdXN0YVxcXFxDYXNjYWRlUHJvamVjdHNcXFxcbWl4cGxhXFxcXGhscy1wbGF5ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGp1c3RhXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxtaXhwbGFcXFxcaGxzLXBsYXllclxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvanVzdGEvQ2FzY2FkZVByb2plY3RzL21peHBsYS9obHMtcGxheWVyL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJztcclxuXHJcbi8vIGh0dHBzOi8vdml0ZS5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XHJcbiAgY29uc3QgcHJveHlUYXJnZXQgPSBlbnYuVklURV9QUk9YWV9UQVJHRVQgfHwgJ2h0dHBzOi8vYnJhdGFuLm9ubGluZSc7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHZ1ZSgpLFxyXG4gICAgICBWaXRlUFdBKHtcclxuICAgICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmd9J10sXHJcbiAgICAgICAgICAvLyBBbGxvdyB0aGUgS2V5Y2xvYWsgc2lsZW50IFNTTyBwYWdlIHRvIHdvcmsgY29ycmVjdGx5LlxyXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFja0FsbG93bGlzdDogWy9eXFwvc2lsZW50LWNoZWNrLXNzby5odG1sL11cclxuICAgICAgICB9LFxyXG4gICAgICAgIGRldk9wdGlvbnM6IHtcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgICBuYW1lOiAnTWl4cGxhJyxcclxuICAgICAgICAgIHNob3J0X25hbWU6ICdNaXhwbGEnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdITFMgQXVkaW8gUGxheWVyJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAnZmF2aWNvbi5pY28nLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNjR4NjQnLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS94LWljb24nLFxyXG4gICAgICAgICAgICAgIHB1cnBvc2U6ICdhbnknXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdhcHBsZS10b3VjaC1pY29uLnBuZycsXHJcbiAgICAgICAgICAgICAgc2l6ZXM6ICcxODB4MTgwJyxcclxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAndml0ZS5zdmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNDh4NDggNzJ4NzIgOTZ4OTYgMTI4eDEyOCAyNTZ4MjU2JyxcclxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXHJcbiAgICAgICAgICAgICAgcHVycG9zZTogJ2FueSdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIF0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogNTE3NixcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThVLFNBQVMsY0FBYyxlQUFlO0FBQ3BYLE9BQU8sU0FBUztBQUNoQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxlQUFlLFdBQVc7QUFIZ0wsSUFBTSwyQ0FBMkM7QUFNcFEsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sY0FBYyxJQUFJLHFCQUFxQjtBQUU3QyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxJQUFJO0FBQUEsTUFDSixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsUUFDZCxTQUFTO0FBQUEsVUFDUCxjQUFjLENBQUMsZ0NBQWdDO0FBQUE7QUFBQSxVQUUvQywyQkFBMkIsQ0FBQywwQkFBMEI7QUFBQSxRQUN4RDtBQUFBLFFBQ0EsWUFBWTtBQUFBLFVBQ1YsU0FBUztBQUFBLFFBQ1g7QUFBQSxRQUNBLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLE9BQU87QUFBQSxZQUNMO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsY0FDTixTQUFTO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxjQUNOLFNBQVM7QUFBQSxZQUNYO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLE1BQ3REO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
