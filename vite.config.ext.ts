/**
 * ============================================
 * Vite 配置 - 浏览器扩展（Chrome Extension v3）构建模式
 * ============================================
 *
 * 使用方式: npm run build:ext
 * 产物输出到 dist-ext/ 目录，可直接加载为 Chrome 扩展
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],

  // 扩展需要相对路径
  base: './',

  // 输出到 dist-ext 目录
  root: '.',
  build: {
    outDir: 'dist-ext',
    emptyOutDir: true,

    // 扩展 JS 输出为 assets/index.js（newtab.html 引用路径）
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/main-ext.tsx'),
      },
      output: {
        // 输出固定文件名（无哈希），与 newtab.html 中的引用路径一致
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/index.[ext]',
      },
    },

    // 不生成 index.html（使用自定义的 newtab.html）
    // 但 Vite 需要一个入口，我们通过 input 指定
  },

  // 扩展不需要 dev server，只做构建
  server: {
    port: 5174,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
