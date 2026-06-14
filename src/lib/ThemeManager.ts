/**
 * ============================================
 * 主题系统 - 管理主题配置和切换
 * ============================================
 */
import type { ITheme, IThemeColors, IThemeFonts, CursorStyle } from './types';

/** 预设主题 */
export const PRESET_THEMES: Record<string, ITheme> = {
  // 经典绿色终端
  'classic-green': {
    id: 'classic-green',
    name: '经典绿',
    colors: {
      background: '#0a0a0a',
      foreground: '#e5e7eb',
      primary: '#00ff00',
      secondary: '#00cccc',
      success: '#00ff88',
      error: '#ff4444',
      warning: '#ffb000',
      info: '#00ffff',
      cursor: '#00ff00',
      selection: 'rgba(0, 255, 0, 0.3)',
    },
    fonts: {
      mono: "'JetBrains Mono', 'Fira Code', monospace",
      size: '14px',
      lineHeight: 1.6,
    },
    cursorStyle: 'blink',
    scanlinesEnabled: true,
    glowEnabled: true,
  },

  // 赛博朋克风格
  cyberpunk: {
    id: 'cyberpunk',
    name: '赛博朋克',
    colors: {
      background: '#0d0221',
      foreground: '#ffffff',
      primary: '#f72585',     // 品红
      secondary: '#7209b7',   // 紫色
      success: '#06ffa5',
      error: '#ff006e',
      warning: '#fb5607',
      info: '#3a86ff',
      cursor: '#f72585',
      selection: 'rgba(247, 37, 133, 0.3)',
    },
    fonts: {
      mono: "'JetBrains Mono', monospace",
      size: '14px',
      lineHeight: 1.5,
    },
    cursorStyle: 'blink',
    scanlinesEnabled: false,
    glowEnabled: true,
  },

  // 黑客帝国
  matrix: {
    id: 'matrix',
    name: '黑客帝国',
    colors: {
      background: '#000000',
      foreground: '#00ff41',
      primary: '#00ff41',     // 矩阵绿
      secondary: '#008f11',
      success: '#39ff14',
      error: '#ff3333',
      warning: '#ffff00',
      info: '#00ff41',
      cursor: '#00ff41',
      selection: 'rgba(0, 255, 65, 0.3)',
    },
    fonts: {
      mono: "'Fira Code', monospace",
      size: '15px',
      lineHeight: 1.7,
    },
    cursorStyle: 'block',
    scanlinesEnabled: true,
    glowEnabled: true,
  },

  // 暗蓝海洋
  ocean: {
    id: 'ocean',
    name: '暗蓝海洋',
    colors: {
      background: '#0a1628',
      foreground: '#c5d1de',
      primary: '#64ffda',     // 青色
      secondary: '#80cbc4',
      success: '#69f0ae',
      error: '#ff5252',
      warning: '#ffd740',
      info: '#82b1ff',
      cursor: '#64ffda',
      selection: 'rgba(100, 255, 218, 0.2)',
    },
    fonts: {
      mono: "'JetBrains Mono', monospace",
      size: '14px',
      lineHeight: 1.55,
    },
    cursorStyle: 'underline',
    scanlinesEnabled: false,
    glowEnabled: true,
  },

  // 极简白
  minimal: {
    id: 'minimal',
    name: '极简白',
    colors: {
      background: '#ffffff',
      foreground: '#1a1a1a',
      primary: '#2563eb',     // 蓝色
      secondary: '#64748b',
      success: '#16a34a',
      error: '#dc2626',
      warning: '#d97706',
      info: '#0891b2',
      cursor: '#2563eb',
      selection: 'rgba(37, 99, 235, 0.15)',
    },
    fonts: {
      mono: "'SF Mono', 'Consolas', monospace",
      size: '14px',
      lineHeight: 1.5,
    },
    cursorStyle: 'static',
    scanlinesEnabled: false,
    glowEnabled: false,
  },
};

export class ThemeManager {
  private currentTheme: ITheme;
  private customThemes: Map<string, ITheme> = new Map();
  private onChangeCallbacks: ((theme: ITheme) => void)[] = [];

  constructor(initialTheme?: Partial<ITheme>) {
    // 默认使用经典绿主题
    this.currentTheme = this.mergeWithPreset(
      PRESET_THEMES['classic-green'],
      initialTheme
    );
  }

  /**
   * 合并预设主题和自定义配置
   */
  private mergeWithPreset(preset: ITheme, custom?: Partial<ITheme>): ITheme {
    if (!custom) return { ...preset };

    return {
      ...preset,
      ...custom,
      colors: {
        ...preset.colors,
        ...custom.colors,
      },
      fonts: {
        ...preset.fonts,
        ...custom.fonts,
      },
      cssVariables: {
        ...preset.cssVariables,
        ...custom.cssVariables,
      },
    };
  }

  /**
   * 获取当前主题
   */
  getCurrent(): ITheme {
    return { ...this.currentTheme };
  }

  /**
   * 设置预设主题
   */
  setPreset(themeId: string): boolean {
    const preset = PRESET_THEMES[themeId];
    if (!preset) {
      console.warn(`[Terminal ThemeManager] 未找到预设主题: ${themeId}`);
      return false;
    }

    this.currentTheme = { ...preset };
    this.notifyChange();
    return true;
  }

  /**
   * 设置自定义主题
   */
  setTheme(theme: Partial<ITheme>): void {
    this.currentTheme = this.mergeWithPreset(this.currentTheme, theme);
    this.notifyChange();
  }

  /**
   * 注册自定义主题
   */
  registerCustomTheme(theme: ITheme): void {
    this.customThemes.set(theme.id, theme);
  }

  /**
   * 获取所有可用主题（预设 + 自定义）
   */
  getAllThemes(): ITheme[] {
    const presets = Object.values(PRESET_THEMES);
    const customs = Array.from(this.customThemes.values());
    return [...presets, ...customs];
  }

  /**
   * 更新单个颜色
   */
  setColor(key: keyof IThemeColors, value: string): void {
    this.currentTheme = {
      ...this.currentTheme,
      colors: {
        ...this.currentTheme.colors,
        [key]: value,
      },
    };
    this.notifyChange();
  }

  /**
   * 更新光标样式
   */
  setCursorStyle(style: CursorStyle): void {
    this.currentTheme = {
      ...this.currentTheme,
      cursorStyle: style,
    };
    this.notifyChange();
  }

  /**
   * 设置背景图片
   */
  setBackgroundImage(url?: string): void {
    this.currentTheme = {
      ...this.currentTheme,
      backgroundImage: url,
    };
    this.notifyChange();
  }

  /**
   * 切换扫描线效果
   */
  toggleScanlines(enabled?: boolean): void {
    this.currentTheme = {
      ...this.currentTheme,
      scanlinesEnabled: enabled ?? !this.currentTheme.scanlinesEnabled,
    };
    this.notifyChange();
  }

  /**
   * 切换发光效果
   */
  toggleGlow(enabled?: boolean): void {
    this.currentTheme = {
      ...this.currentTheme,
      glowEnabled: enabled ?? !this.currentTheme.glowEnabled,
    };
    this.notifyChange();
  }

  /**
   * 生成 CSS 变量（用于注入到 DOM）
   */
  generateCSSVariables(): Record<string, string> {
    const { colors, fonts } = this.currentTheme;

    return {
      '--terminal-bg': colors.background,
      '--terminal-text': colors.foreground,
      '--terminal-primary': colors.primary,
      '--terminal-secondary': colors.secondary,
      '--terminal-success': colors.success,
      '--terminal-error': colors.error,
      '--terminal-warning': colors.warning,
      '--terminal-info': colors.info,
      '--terminal-cursor': colors.cursor,
      '--terminal-selection': colors.selection,
      '--font-mono': fonts.mono,
      '--font-size': fonts.size,
      '--line-height': String(fonts.lineHeight),
      ...this.currentTheme.cssVariables,
    };
  }

  /**
   * 应用主题到 DOM（设置 CSS 变量）
   */
  applyToDOM(element?: HTMLElement): void {
    const target = element || document.documentElement;
    const variables = this.generateCSSVariables();

    for (const [key, value] of Object.entries(variables)) {
      target.style.setProperty(key, value);
    }
  }

  /**
   * 订阅主题变化
   */
  onChange(callback: (theme: ITheme) => void): () => void {
    this.onChangeCallbacks.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const index = this.onChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知主题变化
   */
  private notifyChange(): void {
    for (const callback of this.onChangeCallbacks) {
      try {
        callback({ ...this.currentTheme });
      } catch (error) {
        console.error('[Terminal ThemeManager] 主题变化回调执行失败:', error);
      }
    }
  }

  /**
   * 导出当前主题配置（可持久化）
   */
  exportConfig(): string {
    return JSON.stringify(this.currentTheme, null, 2);
  }

  /**
   * 导入主题配置
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as Partial<ITheme>;
      if (config && typeof config === 'object') {
        this.setTheme(config);
        return true;
      }
      return false;
    } catch {
      console.error('[Terminal ThemeManager] 无效的主题配置 JSON');
      return false;
    }
  }
}
