import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: resolve(__dirname, 'popup.html'), background: resolve(__dirname, 'src/background.ts'), content: resolve(__dirname, 'src/content.ts') },
      output: { entryFileNames: 'src/[name].js', chunkFileNames: 'src/chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
})
