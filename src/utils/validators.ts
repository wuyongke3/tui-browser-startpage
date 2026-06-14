/**
 * URL 格式验证
 */
export function isValidUrl(url: string): boolean {
  try {
    // 检查是否是危险协议
    if (/^javascript:/i.test(url)) {
      return false;
    }
    
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 规范化 URL（自动补充协议）
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // 如果已经有协议，直接返回
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  
  // 否则补充 https://
  return `https://${url}`;
}

/**
 * 从 URL 提取网站名称
 */
export function extractDomainName(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.replace('www.', '');
    // 首字母大写
    return hostname.charAt(0).toUpperCase() + hostname.slice(1).split('.')[0];
  } catch {
    return url;
  }
}

/**
 * 获取网站 Favicon URL
 */
export function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * HTML 转义（防止 XSS）
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
