/**
 * ============================================
 * 终端核心引擎 - 整合所有子系统，提供统一 API
 * ============================================
 */
import type {
  ITerminalAPI,
  TerminalState,
  ITerminalOutput,
  OutputType,
  IQuickLink,
  ICommandDefinition,
  IPlugin,
  ITheme,
  TerminalEvent,
} from './types';
import { CommandRegistry } from './CommandRegistry';
import { EventEmitter } from './EventEmitter';
import { PluginManager } from './PluginManager';
import { ThemeManager } from './ThemeManager';

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class TerminalEngine implements ITerminalAPI {
  private commandRegistry: CommandRegistry;
  private eventEmitter: EventEmitter;
  private pluginManager: PluginManager;
  private themeManager: ThemeManager;

  private state: TerminalState;
  private stateUpdateCallback?: (state: TerminalState) => void;
  private promptPrefix: string = '';

  /** 当前命令的 AbortController，用于支持 Ctrl+C 中断 */
  private currentAbortController: AbortController | null = null;

  constructor(initialState?: Partial<TerminalState>) {
    // 初始化子系统
    this.commandRegistry = new CommandRegistry();
    this.eventEmitter = new EventEmitter();
    this.themeManager = new ThemeManager();

    // 初始化状态
    this.state = {
      username: initialState?.username || 'guest',
      currentInput: '',
      outputs: [],
      quickLinks: [],
      config: initialState?.config || {},
      isConfigMode: false,
      isUseMode: false,
      historyIndex: -1,
      commandHistory: [],
      isExecuting: false,
      progressInfo: null,
    };

    // 创建插件管理器（需要传入 API 引用，稍后设置）
    this.pluginManager = new PluginManager(
      this.commandRegistry,
      this.eventEmitter,
      this as any
    );
  }

  // ============================================
  // 初始化方法
  // ============================================

  /**
   * 初始化引擎（注册插件、命令等）
   */
  async initialize(options?: {
    plugins?: IPlugin[];
    commands?: ICommandDefinition[];
    initialLinks?: Omit<IQuickLink, 'id' | 'createdAt'>[];
    theme?: Partial<ITheme>;
  }): Promise<void> {
    // 注册插件
    if (options?.plugins) {
      for (const plugin of options.plugins) {
        await this.registerPlugin(plugin);
      }
    }

    // 注册命令
    if (options?.commands) {
      this.commandRegistry.registerAll(options.commands);
    }

    // 添加初始链接
    if (options?.initialLinks) {
      for (const link of options.initialLinks) {
        this.addQuickLink(link);
      }
    }

    // 设置主题
    if (options?.theme) {
      this.themeManager.setTheme(options.theme);
    }

    this.emit('ready');
  }

  /**
   * 设置状态更新回调（用于 React 组件同步）
   */
  onStateUpdate(callback: (state: TerminalState) => void): void {
    this.stateUpdateCallback = callback;
  }

  /**
   * 触发状态更新通知
   */
  private notifyStateUpdate(): void {
    if (this.stateUpdateCallback) {
      this.stateUpdateCallback({ ...this.state });
    }
  }

  // ============================================
  // 命令管理实现
  // ============================================

  registerCommand(command: ICommandDefinition): void {
    this.commandRegistry.register(command);
  }

  unregisterCommand(name: string): void {
    this.commandRegistry.unregister(name);
  }

  getCommand(name: string): ICommandDefinition | undefined {
    return this.commandRegistry.get(name);
  }

  getAllCommands(): ICommandDefinition[] {
    return this.commandRegistry.getAll();
  }

  // ============================================
  // 插件管理实现
  // ============================================

  async registerPlugin(plugin: IPlugin): Promise<boolean> {
    return this.pluginManager.install(plugin);
  }

  async unregisterPlugin(pluginId: string): Promise<boolean> {
    return this.pluginManager.uninstall(pluginId);
  }

  getPlugin(pluginId: string): IPlugin | undefined {
    return this.pluginManager.get(pluginId);
  }

  // ============================================
  // 输出控制实现
  // ============================================

  print(content: string, type: OutputType = 'output'): void {
    const output: ITerminalOutput = {
      id: generateId(),
      content,
      type,
      timestamp: Date.now(),
    };

    this.state.outputs.push(output);

    // 限制输出数量（保留最近 1000 条）
    if (this.state.outputs.length > 1000) {
      this.state.outputs = this.state.outputs.slice(-1000);
    }

    this.emit('output:add', output);
    this.notifyStateUpdate();
  }

  clear(): void {
    this.state.outputs = [];
    this.emit('clear');
    this.notifyStateUpdate();
  }

  // ============================================
  // 状态访问实现
  // ============================================

  getState(): Readonly<TerminalState> {
    return { ...this.state };
  }

  setState(updater: (state: TerminalState) => TerminalState): void {
    this.state = updater({ ...this.state });
    this.notifyStateUpdate();
  }

  // ============================================
  // 快速连接实现
  // ============================================

  addQuickLink(link: Omit<IQuickLink, 'id' | 'createdAt'>): void {
    const newLink: IQuickLink = {
      ...link,
      id: generateId(),
      createdAt: Date.now(),
    };

    this.state.quickLinks.push(newLink);

    // 持久化到 localStorage
    this.saveToStorage();

    this.notifyStateUpdate();
  }

  removeQuickLink(id: string): void {
    this.state.quickLinks = this.state.quickLinks.filter((link) => link.id !== id);
    this.saveToStorage();
    this.notifyStateUpdate();
  }

  getQuickLinks(): IQuickLink[] {
    return [...this.state.quickLinks];
  }

  // ============================================
  // 配置管理实现
  // ============================================

  updateConfig(config: Partial<TerminalState['config']>): void {
    this.state.config = { ...this.state.config, ...config };

    // 同步用户名
    if (config.username) {
      this.state.username = config.username;
    }

    // 同步主题相关配置到 ThemeManager
    if (config.cursorColor) {
      this.themeManager.setColor('cursor', config.cursorColor);
    }
    if (config.cursorStyle) {
      this.themeManager.setCursorStyle(config.cursorStyle);
    }
    if (config.backgroundImage !== undefined) {
      this.themeManager.setBackgroundImage(config.backgroundImage);
    }
    if (config.backgroundColor) {
      this.themeManager.setColor('background', config.backgroundColor);
    }

    this.saveToStorage();
    this.emit('config:change', this.state.config);
    this.notifyStateUpdate();
  }

  getConfig(): TerminalState['config'] {
    return { ...this.state.config };
  }

  // ============================================
  // 事件系统实现
  // ============================================

  on(event: TerminalEvent, callback: (...args: any[]) => void): () => void {
    return this.eventEmitter.on(event, callback);
  }

  emit(event: TerminalEvent, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // ============================================
  // 提示符管理
  // ============================================

  setPrompt(prefix: string): void {
    this.promptPrefix = prefix;
  }

  getPrompt(): string {
    if (this.promptPrefix) {
      return `${this.state.username}${this.promptPrefix}>`;
    }

    // 根据模式返回不同的提示符
    if (this.state.isConfigMode) {
      return `${this.state.username}(config)>`;
    }
    if (this.state.isUseMode) {
      return `${this.state.username}(select)>`;
    }

    return `${this.state.username}>`;
  }

  /**
   * 设置用户名（同时更新状态和配置）
   */
  setUsername(name: string): void {
    this.state.username = name;
    this.state.config.username = name;
    this.saveToStorage();
    this.notifyStateUpdate();
  }

  // ============================================
  // 命令执行入口
  // ============================================

  /**
   * 执行用户输入的命令
   */
  async executeInput(input: string): Promise<{ success: boolean }> {
    // 创建新的 AbortController
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    // 标记执行中
    this.state.isExecuting = true;
    this.state.progressInfo = null;
    this.notifyStateUpdate();

    // 显示输入内容
    this.print(input, 'input');

    // 执行 beforeCommandExecute 钩子
    const canContinue = await this.pluginManager.executeHooks(
      'beforeCommandExecute',
      input,
      {} as any
    );

    if (!canContinue || signal.aborted) {
      this.finishExecution();
      return { success: false };
    }

    // 发出事件
    this.emit('command:execute', input);

    // 构建上下文（包含中断信号和进度报告）
    const context = {
      rawInput: input,
      args: input.trim().split(/\s+/).slice(1),
      output: (content: string, type?: OutputType) => this.print(content, type),
      getState: () => this.getState(),
      setState: (updater: (state: TerminalState) => TerminalState) =>
        this.setState(updater),
      terminal: this as ITerminalAPI,
      signal,
      reportProgress: (value: number, message?: string) => {
        this.reportProgress(value, message);
      },
    };

    try {
      // 执行命令（传入 signal 供命令检测中断）
      const result = await this.commandRegistry.execute(input, context);

      // 检查是否被中断
      if (signal.aborted) {
        this.print('^C', 'warning');
        this.print('命令已中断', 'warning');
        this.emit('command:abort', input);
        this.finishExecution();
        return { success: false };
      }

      // 执行 afterCommandExecute 钩子
      await this.pluginManager.executeHooks(
        'afterCommandExecute',
        input,
        context,
        result
      );

      // 发出完成事件
      this.emit('command:complete', input, result.success);

      // 添加到历史记录
      if (input.trim()) {
        this.state.commandHistory.push(input.trim());
        if (this.state.commandHistory.length > 50) {
          this.state.commandHistory.shift();
        }
        this.state.historyIndex = -1;
      }

      this.notifyStateUpdate();

      return result;
    } catch (error) {
      if (signal.aborted) {
        this.print('^C', 'warning');
        this.print('命令已中断', 'warning');
        this.emit('command:abort', input);
      } else {
        this.print(`错误: ${error instanceof Error ? error.message : String(error)}`, 'error');
        this.emit('command:error', input, error);
      }

      this.finishExecution();
      return { success: false };
    }
  }

  /**
   * 结束命令执行，清理状态
   */
  private finishExecution(): void {
    this.state.isExecuting = false;
    this.state.progressInfo = null;
    this.currentAbortController = null;
    this.notifyStateUpdate();
  }

  // ============================================
  // 命令中断与进度
  // ============================================

  /**
   * 中断当前正在执行的命令
   */
  abortCurrentCommand(): void {
    if (this.currentAbortController && !this.currentAbortController.signal.aborted) {
      this.currentAbortController.abort();
    }
  }

  /**
   * 报告执行进度（0-100）
   */
  reportProgress(value: number, message?: string): void {
    this.state.progressInfo = { value: Math.min(100, Math.max(0, value)), message: message || '' };
    this.emit('progress:update', this.state.progressInfo);
    this.notifyStateUpdate();
  }

  /**
   * 获取命令建议（Tab 补全）
   */
  getSuggestions(partial: string): ICommandDefinition[] {
    return this.commandRegistry.getSuggestions(partial);
  }

  /**
   * 获取帮助文本
   */
  getHelpText(): string {
    return this.commandRegistry.generateHelpText();
  }

  // ============================================
  // 主题管理暴露
  // ============================================

  getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  // ============================================
  // 存储操作
  // ============================================

  /** localStorage 存储键名 */
  private static STORAGE_KEYS = {
    QUICKLINKS: 'terminal_quicklinks',
    CONFIG: 'terminal_config',
    HISTORY: 'terminal_history',
    USERNAME: 'terminal_username',
  } as const;

  /** 统一存储键（导出时使用） */
  public static EXPORT_KEY = 'terminal_data';

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        TerminalEngine.STORAGE_KEYS.QUICKLINKS,
        JSON.stringify(this.state.quickLinks)
      );
      localStorage.setItem(
        TerminalEngine.STORAGE_KEYS.CONFIG,
        JSON.stringify(this.state.config)
      );
      localStorage.setItem(
        TerminalEngine.STORAGE_KEYS.HISTORY,
        JSON.stringify(this.state.commandHistory)
      );
      if (this.state.username !== 'guest') {
        localStorage.setItem(TerminalEngine.STORAGE_KEYS.USERNAME, this.state.username);
      }
    } catch (error) {
      console.error('[Terminal Engine] 保存数据失败:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const linksData = localStorage.getItem(TerminalEngine.STORAGE_KEYS.QUICKLINKS);
      if (linksData) {
        this.state.quickLinks = JSON.parse(linksData);
      }

      const configData = localStorage.getItem(TerminalEngine.STORAGE_KEYS.CONFIG);
      if (configData) {
        this.state.config = { ...this.state.config, ...JSON.parse(configData) };
        
        if (this.state.config.username) {
          this.state.username = this.state.config.username;
        }
      }

      const historyData = localStorage.getItem(TerminalEngine.STORAGE_KEYS.HISTORY);
      if (historyData) {
        this.state.commandHistory = JSON.parse(historyData);
      }

      const usernameData = localStorage.getItem(TerminalEngine.STORAGE_KEYS.USERNAME);
      if (usernameData && !this.state.config.username) {
        this.state.username = usernameData;
      }
    } catch (error) {
      console.error('[Terminal Engine] 加载数据失败:', error);
    }

    this.notifyStateUpdate();
  }

  /**
   * 导出所有用户数据为格式化 JSON
   */
  exportData(): string {
    const data = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: {
        username: this.state.username,
        config: this.state.config,
        quickLinks: this.state.quickLinks,
        commandHistory: this.state.commandHistory,
      },
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 从 JSON 导入用户数据
   */
  importData(jsonStr: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonStr);

      // 验证基本结构
      if (!parsed.data || typeof parsed.data !== 'object') {
        return { success: false, message: '无效的数据格式：缺少 data 字段' };
      }

      const { data } = parsed;

      // 导入用户名
      if (data.username && typeof data.username === 'string') {
        this.setUsername(data.username);
      }

      // 导入配置
      if (data.config && typeof data.config === 'object') {
        this.updateConfig(data.config);
      }

      // 导入快速连接
      if (Array.isArray(data.quickLinks)) {
        this.state.quickLinks = data.quickLinks;
      }

      // 导入命令历史
      if (Array.isArray(data.commandHistory)) {
        this.state.commandHistory = data.commandHistory;
      }

      // 持久化
      this.saveToStorage();
      this.notifyStateUpdate();

      return { success: true, message: `导入成功！版本: ${parsed.version || '未知'}, 导出时间: ${parsed.exportTime || '未知'}` };
    } catch (e) {
      return { success: false, message: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  /**
   * 清理所有本地缓存，重置为初始状态
   */
  clearCache(): void {
    // 清除所有 localStorage 数据
    Object.values(TerminalEngine.STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // 重置状态
    this.state.username = 'guest';
    this.state.config = {};
    this.state.quickLinks = [];
    this.state.commandHistory = [];
    this.state.historyIndex = -1;
    this.state.outputs = [];
    this.state.isConfigMode = false;
    this.state.isUseMode = false;

    this.notifyStateUpdate();
    this.emit('clear');
  }

  // ============================================
  // 清理资源
  // ============================================

  destroy(): void {
    this.eventEmitter.off();
    this.commandRegistry.getAll().forEach((cmd) => this.commandRegistry.unregister(cmd.name));
    this.pluginManager.getAll().forEach((plugin) => this.pluginManager.uninstall(plugin.id));
  }
}

// 工厂函数：创建并初始化引擎实例
export async function createTerminalEngine(
  options?: ConstructorParameters<typeof TerminalEngine>[0] & {
    plugins?: IPlugin[];
    commands?: ICommandDefinition[];
    initialLinks?: Omit<IQuickLink, 'id' | 'createdAt'>[];
    theme?: Partial<ITheme>;
  }
): Promise<TerminalEngine> {
  const engine = new TerminalEngine(options);
  await engine.initialize(options);
  
  // 加载本地存储的数据
  engine.loadFromStorage();

  return engine;
}
