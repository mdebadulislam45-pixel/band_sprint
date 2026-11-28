import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    },
    dedupe: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime'
    ]
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'framer-motion',
      'lucide-react'
    ]
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
    ws: false,
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // No sourcemaps in production: they would add ~MBs to the deploy for
    // files nobody reads on the live site. (Vite default is already off;
    // this pins the intent so a future config change can't re-enable them.)
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core changes far less often than app code: keep it in
            // its own chunk so repeat visitors keep a stable cached copy
            // while the rest of vendor churns. Still part of the initial
            // load (App needs React immediately) — this is a caching win,
            // not a byte saving.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'react-vendor';
            }
            if (id.includes('three')) {
              return 'three-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdf-vendor';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            return 'vendor';
          }
          if (id.includes('masterVocabDatabase')) {
            return 'vocab-master';
          }
          if (id.includes('vocabularyData')) {
            return 'vocab-general';
          }
          if (id.includes('sprintLibraryData') || id.includes('sprintTestGenerator')) {
            return 'sprint-data';
          }
        }
      }
    }
  }
});

