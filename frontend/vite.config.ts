import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const codespaceName = process.env.CODESPACE_NAME
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'
const proxyTarget = process.env.VITE_API_PROXY_TARGET

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: codespaceName ? [`${codespaceName}-5173.${forwardingDomain}`] : [],
    proxy: proxyTarget ? {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/dj-rest-auth': { target: proxyTarget, changeOrigin: true },
    } : undefined,
  },
})
