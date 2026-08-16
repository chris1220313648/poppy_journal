import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/poppy/",
  build: { outDir: "docs", emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.png"],
      manifest: {
        name: "Poppy Journal",
        short_name: "Poppy",
        description: "私密、本地优先的电子手帐",
        theme_color: "#f2e3cf",
        background_color: "#f2e3cf",
        display: "standalone",
        lang: "zh-CN",
        start_url: "/poppy/",
        scope: "/poppy/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff2}"],
        globIgnores: ["**/og.png"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
