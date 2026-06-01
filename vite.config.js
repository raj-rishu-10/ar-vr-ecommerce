import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Only enable self-signed SSL in local dev (needed for WebXR on LAN)
    // Vercel provides real HTTPS in production, so skip it there
    command === 'serve' && basicSsl(),
  ].filter(Boolean),
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
}))
