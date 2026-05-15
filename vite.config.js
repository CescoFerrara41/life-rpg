import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: For GitHub Pages project sites (username.github.io/repo-name/),
// you need to set `base` to '/repo-name/'.
// If you fork this to a repo named "life-rpg", the line below is correct.
// If your repo has a different name, change it here.
// If you use a custom domain or *.github.io user/org site, set base to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/life-rpg/',
})
