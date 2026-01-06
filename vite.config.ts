import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const pwaIconVersioner = (buildId: string) => ({
  name: "pwa-icon-versioner",
  transformIndexHtml(html: string) {
    // Bust aggressive OS/browser icon caches by versioning icon URLs on every build.
    return html
      .replaceAll("/pwa-192x192.png", `/pwa-192x192.png?v=${buildId}`)
      .replaceAll("/pwa-512x512.png", `/pwa-512x512.png?v=${buildId}`);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const buildId = Date.now().toString();

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      pwaIconVersioner(buildId),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "Barber360 - Agendamento de Barbearias",
          short_name: "Barber360",
          description:
            "Encontre e agende serviços nas melhores barbearias próximas a você",
          theme_color: "#000000",
          background_color: "#000000",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: `/pwa-192x192.png?v=${buildId}`,
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: `/pwa-512x512.png?v=${buildId}`,
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: `/pwa-512x512.png?v=${buildId}`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
