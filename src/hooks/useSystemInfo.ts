import { useState, useEffect } from 'react';

/**
 * 系统信息获取 Hook
 * 由于浏览器安全限制，无法直接获取操作系统用户名
 * 采用以下策略：默认 guest，可自定义
 */
export function useSystemInfo() {
  const [username, setUsername] = useState('guest');

  useEffect(() => {
    // 尝试从 localStorage 读取之前保存的用户名
    try {
      const savedConfig = localStorage.getItem('homepage_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.username) {
          setUsername(config.username);
        }
      }
    } catch {
      // 使用默认值
    }
  }, []);

  return { username, setUsername };
}

/**
 * 获取系统信息（用于显示）
 * 返回格式化的系统信息字符串
 */
export function getSystemInfoString(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  const date = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${os} | ${date}`;
}
