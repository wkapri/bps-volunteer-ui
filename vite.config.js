import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Project-site base path for GitHub Pages (https://<user|org>.github.io/bps-volunteer-ui/).
// Override with `VITE_BASE=/` if this ever moves to a user/org root site or a custom domain.
const base = process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/bps-volunteer-ui/' : '/')

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
