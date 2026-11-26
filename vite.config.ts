import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        // Split big libraries into their own cacheable files. Note: Rollup pulls a manual
        // chunk's dependencies into it, so small helpers shared with recharts (clsx, …)
        // must be assigned to "vendor" or the landing page would download the charts chunk.
        manualChunks(id) {
          if (id.includes('commonjsHelpers')) return 'vendor';
          if (!id.includes('node_modules')) return undefined;
          const pkg = /node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)?.[1].replace('\\', '/') ?? '';
          if (/^(recharts|d3-|victory-vendor|internmap|decimal\.js-light|lodash)/.test(pkg)) return 'charts';
          if (pkg.startsWith('@supabase/')) return 'supabase';
          if (pkg.startsWith('@tanstack/')) return 'query';
          if (
            /^(react|react-dom|react-router|react-router-dom|@remix-run\/router|scheduler|clsx|tailwind-merge|class-variance-authority|react-is|tiny-invariant|eventemitter3)$/.test(
              pkg,
            )
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
