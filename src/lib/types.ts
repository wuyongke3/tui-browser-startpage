/**
 * ============================================
 * 可插拔终端组件 - 核心类型定义
 * ============================================
 */

// ============================================
// 命令相关类型
// ============================================

/** 命令执行上下文，提供给命令处理函数 */
export interface CommandContext {
  /** 原始输入 */
  rawInput: string;
  /** 解析后的参数 */
  args: string[];
  /** 输出方法（向终端输出内容） */
  output: (content: string, type?: OutputType) => void;
  /** 获取终端状态 */
  getState: () => TerminalState;
  /** 更新终端状态 */
  setState: (state: Partial<TerminalState>) => void;
  /** 终端实例引用（用于高级操作） */
  terminal: ITerminalAPI;
  /** 中断信号（命令可通过此信号检测是否被用户中断） */
  signal: AbortSignal;
  /** 报告进度（显示进度条） */
  reportProgress: (progress: number, message?: string) => void;
}

/** 输出类型枚举 */
export type OutputType = 'info' | 'success' | 'error' | 'warning' | 'output' | 'input' | 'progress';

/** 命令处理结果 */
export type CommandResult = void | Promise<void>;

/** 命令定义接口 */
export interface ICommandDefinition {
  /** 命令名称（小写） */
  name: string;
  /** 命令描述（用于 help） */
  description: string;
  /** 命令用法示例 */
  usage?: string;
  /** 命令别名列表 */
  aliases?: string[];
  /** 是否需要参数 */
  requireArgs?: boolean;
  /** 参数说明 */
  argsDescription?: string;
  /** 命令执行函数 */
  execute: (ctx: CommandContext) => CommandResult;
}

// ============================================
// 插件相关类型
// ============================================

/** 插件生命周期钩子 */
export interface PluginHooks {
  /** 插件安装时调用 */
  onInstall?: (api: ITerminalAPI) => void | Promise<void>;
  /** 每次命令执行前调用 */
  beforeCommandExecute?: (command: string, ctx: CommandContext) => boolean | Promise<boolean>;
  /** 命令执行后调用 */
  afterCommandExecute?: (command: string, ctx: CommandContext, result: CommandResult) => void | Promise<void>;
  /** 插件卸载时调用 */
  onUninstall?: (api: ITerminalAPI) => void | Promise<void>;
}

/** 插件定义接口 */
export interface IPlugin {
  /** 插件唯一标识符 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 提供的命令列表 */
  commands?: ICommandDefinition[];
  /** 生命周期钩子 */
  hooks?: PluginHooks;
  /** 提供的主题扩展 */
  themeExtensions?: Partial<ITheme>;
}

// ============================================
// 主题相关类型
// ============================================

/** 颜色主题配置 */
export interface IThemeColors {
  background: string;
  foreground: string;
  primary: string;        // 主要强调色（如绿色）
  secondary: string;      // 次要强调色
  success: string;
  error: string;
  warning: string;
  info: string;
  cursor: string;
  selection: string;
}

/** 字体主题配置 */
export interface IThemeFonts {
  mono: string;
  size: string;
  lineHeight: number;
}

/** 光标样式 */
export type CursorStyle = 'blink' | 'static' | 'underline' | 'block';

/** 完整主题配置 */
export interface ITheme {
  id: string;
  name: string;
  colors: IThemeColors;
  fonts: IThemeFonts;
  cursorStyle: CursorStyle;
  backgroundImage?: string;
  backgroundColor?: string;
  /** 自定义 CSS 变量覆盖 */
  cssVariables?: Record<string, string>;
  /** 扫描线效果 */
  scanlinesEnabled?: boolean;
  /** 发光效果 */
  glowEnabled?: boolean;
}

// ============================================
// 终端状态类型
// ============================================

/** 终端输出项 */
export interface ITerminalOutput {
  id: string;
  content: string;
  type: OutputType;
  timestamp: number;
}

/** 快速连接项 */
export interface IQuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
  createdAt: number;
}

/** 终端完整状态 */
export interface TerminalState {
  username: string;
  currentInput: string;
  outputs: ITerminalOutput[];
  quickLinks: IQuickLink[];
  config: Partial<ITheme> & {
    username?: string;
    backgroundImage?: string;
    backgroundColor?: string;
    cursorColor?: string;
    cursorStyle?: CursorStyle;
  };
  isConfigMode: boolean;
  isUseMode: boolean;
  historyIndex: number;
  commandHistory: string[];
  /** 是否有命令正在执行 */
  isExecuting: boolean;
  /** 当前进度信息（0-100） */
  progressInfo: { value: number; message: string } | null;
}

// ============================================
// 终端 API 接口（暴露给插件使用）
// ============================================

export interface ITerminalAPI {
  // --- 命令管理 ---
  registerCommand(command: ICommandDefinition): void;
  unregisterCommand(name: string): void;
  getCommand(name: string): ICommandDefinition | undefined;
  getAllCommands(): ICommandDefinition[];

  // --- 插件管理 ---
  registerPlugin(plugin: IPlugin): void;
  unregisterPlugin(pluginId: string): void;
  getPlugin(pluginId: string): IPlugin | undefined;

  // --- 输出控制 ---
  print(content: string, type?: OutputType): void;
  clear(): void;

  // --- 状态访问 ---
  getState(): Readonly<TerminalState>;
  setState(updater: (state: TerminalState) => TerminalState): void;

  // --- 快速连接 ---
  addQuickLink(link: Omit<IQuickLink, 'id' | 'createdAt'>): void;
  removeQuickLink(id: string): void;
  getQuickLinks(): IQuickLink[];

  // --- 配置管理 ---
  updateConfig(config: Partial<TerminalState['config']>): void;
  getConfig(): TerminalState['config'];

  // --- 事件系统 ---
  on(event: TerminalEvent, callback: (...args: any[]) => void): () => void;
  emit(event: TerminalEvent, ...args: any[]): void;

  // --- 工具方法 ---
  setPrompt(prefix: string): void;
  getPrompt(): string;
  setUsername(name: string): void;

  // --- 命令中断与进度 ---
  /** 中断当前正在执行的命令 */
  abortCurrentCommand(): void;
  /** 报告执行进度 */
  reportProgress(value: number, message?: string): void;

  // --- 数据管理（导入/导出/清理）---
  /** 导出所有用户数据为 JSON 字符串 */
  exportData(): string;
  /** 从 JSON 字符串导入数据 */
  importData(jsonStr: string): { success: boolean; message: string };
  /** 清理所有本地缓存数据 */
  clearCache(): void;
}

/** 终端事件类型 */
export type TerminalEvent =
  | 'command:execute'
  | 'command:complete'
  | 'command:error'
  | 'command:abort'
  | 'output:add'
  | 'clear'
  | 'config:change'
  | 'plugin:install'
  | 'plugin:uninstall'
  | 'theme:change'
  | 'progress:update';

// ============================================
// 组件 Props 类型
// ============================================

/** Terminal 组件属性 */
export interface ITerminalProps {
  /** 初始用户名 */
  username?: string;
  /** 初始主题 */
  theme?: Partial<ITheme>;
  /** 初始欢迎信息 */
  welcomeMessage?: string;
  /** 要注册的插件列表 */
  plugins?: IPlugin[];
  /** 要注册的自定义命令 */
  commands?: ICommandDefinition[];
  /** 初始快速链接 */
  initialLinks?: Omit<IQuickLink, 'id' | 'createdAt'>[];
  /** 是否显示头部栏 */
  showHeader?: boolean;
  /** 是否显示底部状态栏 */
  showFooter?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 高度（默认 100vh） */
  height?: string | number;
  /** 命令执行回调 */
  onCommandExecute?: (command: string, args: string[]) => void;
  /** 输出变化回调 */
  onOutputChange?: (outputs: ITerminalOutput[]) => void;
  /** 就绪回调 */
  onReady?: (api: ITerminalAPI) => void;
}
