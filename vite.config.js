import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // basicSsl removed: WebXR works on localhost without HTTPS.
    // Re-enable @vitejs/plugin-basic-ssl only when testing on a LAN device (e.g. Android).
  ],
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
})
