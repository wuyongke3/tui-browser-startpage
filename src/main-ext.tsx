/**
 * ============================================
 * 浏览器扩展入口 - New Tab 页面
 * ============================================
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// 扩展环境不需要 StrictMode（避免双重渲染问题）
createRoot(document.getElementById('root')!).render(
  <App />
)
