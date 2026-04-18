import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const productionBase = process.env.PAGES_BASE_PATH || './'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? productionBase : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
