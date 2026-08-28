import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    // Raise the inline-asset threshold so small icons stay inlined (better
    // for Cloudflare, which charges per request on the free plan).
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting for better Cloudflare / Vercel edge caching.
         *
         * Vendor libraries change far less often than app code, so splitting
         * them into separate hashed chunks means Cloudflare can serve
         * react-vendor.abc123.js from cache even after you ship a new app
         * build — only the changed chunks get re-fetched.
         */
        manualChunks(id: string) {
          // React core — almost never changes
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          // Routing
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "router-vendor";
          }
          // Supabase client
          if (id.includes("node_modules/@supabase/")) {
            return "supabase-vendor";
          }
          // UI components (shadcn / Radix)
          if (id.includes("node_modules/@radix-ui/")) {
            return "radix-vendor";
          }
          // Data-fetching
          if (id.includes("node_modules/@tanstack/")) {
            return "query-vendor";
          }
          // Charts / heavy visualisation
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3")) {
            return "charts-vendor";
          }
          // Capacitor — bundled (not external) so the native bridge works,
          // but isolated into its own chunk so it only cache-busts when you
          // actually upgrade a @capacitor/* package (which is rare).
          if (id.includes("node_modules/@capacitor/")) {
            return "capacitor-vendor";
          }
        },
      },
    },
  },
}));
