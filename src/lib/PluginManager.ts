/**
 * ============================================
 * 插件管理器 - 管理插件的安装、卸载和生命周期
 * ============================================
 */
import type { IPlugin, ITerminalAPI, PluginHooks, ICommandDefinition } from './types';
import { CommandRegistry } from './CommandRegistry';
import { EventEmitter } from './EventEmitter';

export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();
  private hooks: Map<string, PluginHooks[]> = new Map();

  constructor(
    private commandRegistry: CommandRegistry,
    private eventEmitter: EventEmitter,
    private terminalApi: ITerminalAPI
  ) {}

  /**
   * 安装插件
   */
  async install(plugin: IPlugin): Promise<boolean> {
    // 检查是否已安装
    if (this.plugins.has(plugin.id)) {
      console.warn(`[Terminal PluginManager] 插件 "${plugin.id}" 已安装，跳过安装`);
      return false;
    }

    // 注册插件提供的命令
    if (plugin.commands && plugin.commands.length > 0) {
      this.commandRegistry.registerAll(plugin.commands);
    }

    // 存储插件
    this.plugins.set(plugin.id, plugin);

    // 存储钩子
    if (plugin.hooks) {
      for (const hookType of Object.keys(plugin.hooks) as (keyof PluginHooks)[]) {
        if (!this.hooks.has(hookType)) {
          this.hooks.set(hookType, []);
        }
        this.hooks.get(hookType)!.push(plugin.hooks!);
      }
    }

    // 触发 onInstall 钩子
    if (plugin.hooks?.onInstall) {
      try {
        await plugin.hooks.onInstall(this.terminalApi);
      } catch (error) {
        console.error(`[Terminal PluginManager] 插件 "${plugin.id}" 安装钩子执行失败:`, error);
      }
    }

    // 发出事件
    this.eventEmitter.emit('plugin:install', plugin);

    console.log(`[Terminal PluginManager] 插件 "${plugin.name}" v${plugin.version} 已安装`);

    return true;
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      console.warn(`[Terminal PluginManager] 插件 "${pluginId}" 未安装，无法卸载`);
      return false;
    }

    // 触发 onUninstall 钩子
    if (plugin.hooks?.onUninstall) {
      try {
        await plugin.hooks.onUninstall(this.terminalApi);
      } catch (error) {
        console.error(`[Terminal PluginManager] 插件 "${pluginId}" 卸载钩子执行失败:`, error);
      }
    }

    // 注销插件提供的命令
    if (plugin.commands) {
      for (const cmd of plugin.commands) {
        this.commandRegistry.unregister(cmd.name);
      }
    }

    // 移除钩子
    if (plugin.hooks) {
      for (const hookType of Object.keys(plugin.hooks) as (keyof PluginHooks)[]) {
        const hooks = this.hooks.get(hookType);
        if (hooks) {
          const index = hooks.indexOf(plugin.hooks!);
          if (index !== -1) {
            hooks.splice(index, 1);
          }
        }
      }
    }

    // 移除插件
    this.plugins.delete(pluginId);

    // 发出事件
    this.eventEmitter.emit('plugin:uninstall', pluginId);

    console.log(`[Terminal PluginManager] 插件 "${plugin.name}" 已卸载`);

    return true;
  }

  /**
   * 获取已安装的插件
   */
  get(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有已安装的插件
   */
  getAll(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 检查插件是否已安装
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 执行指定类型的所有钩子
   */
  async executeHooks<T extends keyof PluginHooks>(
    hookType: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<boolean> {
    const hooks = this.hooks.get(hookType as string);
    
    if (!hooks || hooks.length === 0) {
      return true;
    }

    for (const hookObj of hooks) {
      const hook = hookObj[hookType];
      if (hook) {
        try {
          const result = await (hook as Function)(...args);
          
          // 如果返回 false，阻止后续执行
          if (result === false) {
            return false;
          }
        } catch (error) {
          console.error(`[Terminal PluginManager] 钩子 "${String(hookType)}" 执行失败:`, error);
        }
      }
    }

    return true;
  }

  /**
   * 获取所有注册的命令（来自所有插件）
   */
  getPluginCommands(): ICommandDefinition[] {
    const allCommands: ICommandDefinition[] = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.commands) {
        allCommands.push(...plugin.commands);
      }
    }

    return allCommands;
  }
}
