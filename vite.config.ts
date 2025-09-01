// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/',                 // app servindo na raiz do subdomínio
  server: {
    host: true,              // expõe na rede (0.0.0.0)
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1024
  }
})
