import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import seoStatic from './vite-plugins/seoStatic.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoStatic()],
  server: {
    host: '0.0.0.0',
    port: 5273,
    strictPort: true,
  },
})
