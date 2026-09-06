import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching using function format
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // React and core dependencies
            if (id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // State management
            if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('@tanstack')) {
              return 'vendor-state';
            }
            // UI libraries
            if (id.includes('framer-motion') || id.includes('@dnd-kit') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // Other vendor code
            return 'vendor-misc';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
})
