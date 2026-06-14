import type { QuickLink, AppConfig, HistoryEntry } from '../types';

// localStorage 键名常量
const STORAGE_KEYS = {
  QUICK_LINKS: 'homepage_quicklinks',
  CONFIG: 'homepage_config',
  HISTORY: 'homepage_command_history',
} as const;

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  backgroundColor: '#0a0a0a',
  cursorColor: '#00ff00',
  cursorStyle: 'blink',
};

/**
 * 获取快速连接列表
 */
export function getQuickLinks(): QuickLink[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUICK_LINKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取快速连接失败:', error);
    return [];
  }
}

/**
 * 保存快速连接列表
 */
export function saveQuickLinks(links: QuickLink[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUICK_LINKS, JSON.stringify(links));
  } catch (error) {
    console.error('保存快速连接失败:', error);
  }
}

/**
 * 添加单个快速连接
 */
export function addQuickLink(link: Omit<QuickLink, 'id' | 'createdAt'>): QuickLink {
  const links = getQuickLinks();
  const newLink: QuickLink = {
    ...link,
    id: generateId(),
    createdAt: Date.now(),
  };
  links.push(newLink);
  saveQuickLinks(links);
  return newLink;
}

/**
 * 删除快速连接
 */
export function removeQuickLink(id: string): boolean {
  const links = getQuickLinks();
  const filtered = links.filter((link) => link.id !== id);
  if (filtered.length < links.length) {
    saveQuickLinks(filtered);
    return true;
  }
  return false;
}

/**
 * 获取应用配置
 */
export function getConfig(): AppConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : { ...DEFAULT_CONFIG };
  } catch (error) {
    console.error('读取配置失败:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 保存应用配置
 */
export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

/**
 * 获取命令历史
 */
export function getHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
}

/**
 * 添加命令到历史记录
 */
export function addToHistory(entry: HistoryEntry): void {
  const history = getHistory();
  // 只保留最近 100 条记录
  history.push(entry);
  if (history.length > 100) {
    history.shift();
  }
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

/**
 * 清空历史记录
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (error) {
    console.error('清空历史记录失败:', error);
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
