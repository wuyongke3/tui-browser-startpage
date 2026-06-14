import { create } from 'zustand';
import type { TerminalOutput, QuickLink, AppConfig } from '../types';
import * as storage from '../utils/storage';
import { DEFAULT_CONFIG } from '../utils/storage';

interface TerminalStore {
  // 用户名
  username: string;
  setUsername: (name: string) => void;

  // 当前输入
  currentInput: string;
  setCurrentInput: (input: string) => void;
  clearInput: () => void;

  // 终端输出
  outputs: TerminalOutput[];
  addOutput: (output: Omit<TerminalOutput, 'id' | 'timestamp'>) => void;
  clearOutputs: () => void;

  // 快速连接
  quickLinks: QuickLink[];
  addQuickLink: (link: Omit<QuickLink, 'id' | 'createdAt'>) => void;
  removeQuickLink: (id: string) => void;
  loadQuickLinks: () => void;

  // 配置
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
  loadConfig: () => void;

  // 配置模式
  isConfigMode: boolean;
  setConfigMode: (mode: boolean) => void;

  // use 命令交互状态
  isUseMode: boolean;
  setUseMode: (mode: boolean) => void;

  // 历史命令索引（用于上下键浏览）
  historyIndex: number;
  commandHistory: string[];
  setHistoryIndex: (index: number) => void;
  addToCommandHistory: (command: string) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // 初始化用户名（默认 guest，可从配置中读取）
  username: 'guest',
  setUsername: (name) => {
    set({ username: name });
    // 同时保存到配置
    get().updateConfig({ username: name });
  },

  // 输入相关
  currentInput: '',
  setCurrentInput: (input) => set({ currentInput: input }),
  clearInput: () => set({ currentInput: '' }),

  // 输出相关
  outputs: [],
  addOutput: (output) => {
    const newOutput: TerminalOutput = {
      ...output,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    set((state) => ({ outputs: [...state.outputs, newOutput] }));
  },
  clearOutputs: () => set({ outputs: [] }),

  // 快速连接
  quickLinks: [],
  addQuickLink: (link) => {
    const newLink = storage.addQuickLink(link);
    set((state) => ({ quickLinks: [...state.quickLinks, newLink] }));
  },
  removeQuickLink: (id) => {
    const success = storage.removeQuickLink(id);
    if (success) {
      set((state) => ({
        quickLinks: state.quickLinks.filter((link) => link.id !== id),
      }));
    }
  },
  loadQuickLinks: () => {
    const links = storage.getQuickLinks();
    set({ quickLinks: links });
  },

  // 配置
  config: { ...DEFAULT_CONFIG },
  updateConfig: (newConfig) => {
    const updated = { ...get().config, ...newConfig };
    set({ config: updated });
    storage.saveConfig(updated);

    // 如果更新了用户名，同步更新 username 字段
    if (newConfig.username) {
      set({ username: newConfig.username });
    }
  },
  loadConfig: () => {
    const config = storage.getConfig();
    set({ 
      config,
      username: config.username || 'guest',
    });
  },

  // 模式切换
  isConfigMode: false,
  setConfigMode: (mode) => set({ isConfigMode: mode }),

  isUseMode: false,
  setUseMode: (mode) => set({ isUseMode: mode }),

  // 命令历史
  historyIndex: -1,
  commandHistory: [],
  setHistoryIndex: (index) => set({ historyIndex: index }),
  addToCommandHistory: (command) => {
    const history = [...get().commandHistory];
    // 避免重复添加相同的连续命令
    if (history[history.length - 1] !== command) {
      history.push(command);
      // 只保留最近 50 条
      if (history.length > 50) {
        history.shift();
      }
    }
    set({ commandHistory: history, historyIndex: -1 });
  },
}));
