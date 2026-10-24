import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor';
            }
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            return 'deps';
          }
          if (id.includes('masterVocabDatabase')) {
            return 'vocab-master';
          }
          if (id.includes('vocabularyData')) {
            return 'vocab-general';
          }
          if (id.includes('cambridgeLibraryData') || id.includes('cambridgeTestGenerator')) {
            return 'cambridge-data';
          }
        }
      }
    }
  }
});

