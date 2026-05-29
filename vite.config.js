import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,   // bind to 0.0.0.0 — accessible on LAN/network IP
    port: 5173,
    strictPort: true,
  },
})
