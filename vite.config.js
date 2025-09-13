// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/riyad-as-saleheen/', // <-- add this line (replace REPO_NAME)
  plugins: [react()],
})
