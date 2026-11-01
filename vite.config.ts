import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

const pages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  // Relative assets work on GitHub Pages project sites without path mismatches.
  base: pages ? './' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
