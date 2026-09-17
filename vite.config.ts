import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// xlsx is loaded via dynamic import() only where it's used (admin Excel
// import/export), so Rollup already splits it into its own chunk that's
// fetched on demand — no manualChunks needed, and this keeps it out of the
// Mini App's initial bundle (most visitors never touch the admin panel).
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
