/**
 * ============================================
 * 事件发射器 - 简单的事件订阅/发布系统
 * ============================================
 */

type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   * @returns 取消订阅的函数
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * 订阅一次性事件
   */
  once(event: string, callback: EventCallback): () => void {
    const unsubscribe = this.on(event, (...args) => {
      callback(...args);
      unsubscribe();
    });

    return unsubscribe;
  }

  /**
   * 发布事件
   */
  emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      // 复制一份以避免在迭代过程中修改
      const callbacks = Array.from(listeners);
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[Terminal EventEmitter] 事件 "${event}" 的回调执行出错:`, error);
        }
      }
    }
  }

  /**
   * 移除某个事件的所有监听器
   */
  off(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}
