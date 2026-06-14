// 代理检测状态
let proxyDetected: boolean | null = null;
let detectionPromise: Promise<boolean> | null = null;

/**
 * 检测代理是否可用
 * 通过尝试加载 Google 来判断
 */
export async function detectProxy(): Promise<boolean> {
  // 如果已经检测过，直接返回结果
  if (proxyDetected !== null) {
    return proxyDetected;
  }

  // 如果正在检测中，等待结果
  if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      proxyDetected = false;
      resolve(false);
    }, 3000); // 3 秒超时

    // 使用 Image 对象检测（比 fetch 更轻量）
    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      proxyDetected = true;
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      proxyDetected = false;
      resolve(false);
    };

    // 尝试加载 Google 的 favicon
    img.src = `https://www.google.com/favicon.ico?_t=${Date.now()}`;
  });

  return detectionPromise;
}

/**
 * 重置代理检测结果（用于强制重新检测）
 */
export function resetProxyDetection(): void {
  proxyDetected = null;
  detectionPromise = null;
}

/**
 * 根据关键词构建搜索 URL
 * 自动根据代理状态选择搜索引擎
 */
export async function getSearchUrl(query: string): Promise<string> {
  const encodedQuery = encodeURIComponent(query.trim());
  const hasProxy = await detectProxy();

  if (hasProxy) {
    // 使用谷歌搜索
    return `https://www.google.com/search?q=${encodedQuery}`;
  } else {
    // 使用百度搜索
    return `https://www.baidu.com/s?wd=${encodedQuery}`;
  }
}

/**
 * 执行搜索（在新标签页打开）
 */
export async function performSearch(query: string): Promise<void> {
  const url = await getSearchUrl(query);
  window.open(url, '_blank');
}
