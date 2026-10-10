import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import dns from 'node:dns'

// Force IPv4 DNS resolution — Node v17+ defaults to verbatim (IPv6-first)
// which fails on networks without full IPv6 connectivity to Cloudflare
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/.vscode/**', '**/playwright-locator-profile/**', '**/scratch/**']
    },
    proxy: {
      '/api': {
        target: 'https://api.madesh.in',
        changeOrigin: true,
        secure: false
      },
      '/wake-gateway': {
        target: 'https://wake.madesh.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/wake-gateway/, '')
      }
    }
  }
})
