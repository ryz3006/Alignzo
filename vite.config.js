import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // This base path must exactly match your GitHub repository name.
  base: '/Alignzo/',
  plugins: [react()],
})
