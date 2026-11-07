import { defineConfig } from 'vite'

// base: './' 让打包后的网页用“相对路径”找文件，
// 放在 GitHub Pages 的 /apollo3-learn/ 子目录、或 Vercel 的根目录，都能用。
export default defineConfig({
  base: './',
  // three.js 本身就有 600+ kB，把提醒门槛调高，免得打包时冒黄色警告
  build: { chunkSizeWarningLimit: 1000 },
})
