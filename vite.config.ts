import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  // Tauri expects a fixed port during dev
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching src-tauri
      ignored: ['**/src-tauri/**'],
    },
  },
})
