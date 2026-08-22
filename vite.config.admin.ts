import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Config separado pra construir o app de Administração como um bundle
// independente do app de barbeiro (H11) — "dois mundos" publicados como
// sites estáticos distintos, cada um só com o código que usa (quem entra
// pelo app de barbeiro nunca baixa nada de Lojas/Barbeiros, e vice-versa).
// `vite.config.ts` continua sendo o app de barbeiro, sem nenhuma mudança.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: resolve(rootDir, 'admin.html'),
    },
  },
})
