import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@dnd-kit/core': resolve(__dirname, 'src/lib/dnd-kit/core.tsx'),
      '@dnd-kit/sortable': resolve(__dirname, 'src/lib/dnd-kit/sortable.tsx'),
      '@dnd-kit/utilities': resolve(__dirname, 'src/lib/dnd-kit/utilities.ts')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
})
