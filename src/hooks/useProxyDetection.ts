import { useState, useCallback } from 'react';
import { detectProxy as checkProxy, resetProxyDetection } from '../utils/searchEngine';

/**
 * 代理检测 Hook
 * 用于检测是否可以使用 Google（判断是否有代理）
 */
export function useProxyDetection() {
  const [hasProxy, setHasProxy] = useState<boolean | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * 执行代理检测
   */
  const doDetect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const result = await checkProxy();
      setHasProxy(result);
      return result;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * 重置并重新检测
   */
  const reDetect = useCallback(async () => {
    resetProxyDetection();
    setHasProxy(null);
    return doDetect();
  }, [doDetect]);

  return {
    hasProxy,
    isDetecting,
    detectProxy: doDetect,
    reDetect,
  };
}
