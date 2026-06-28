import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // Base '/' no Vercel/Netlify; subpath no GitHub Pages (PAGES_BASE=/ag-painel/).
  base: process.env.PAGES_BASE ?? '/',
  // Carimbo do build (data/hora) — exibido na UI p/ confirmar que se está no deploy mais novo.
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }),
    ),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
