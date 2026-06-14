/**
 * ============================================
 * 可插拔终端 - 统一导出文件
 * ============================================
 */

// 核心类型
export type {
  ICommandDefinition,
  CommandContext,
  IPlugin,
  PluginHooks,
  ITheme,
  IThemeColors,
  IThemeFonts,
  CursorStyle,
  TerminalState,
  ITerminalOutput,
  IQuickLink,
  ITerminalAPI,
  TerminalEvent,
  ITerminalProps,
  OutputType,
} from './types';

// 核心类
export { CommandRegistry } from './CommandRegistry';
export { EventEmitter } from './EventEmitter';
export { PluginManager } from './PluginManager';
export { ThemeManager, PRESET_THEMES } from './ThemeManager';
export { TerminalEngine, createTerminalEngine } from './TerminalEngine';

// React 组件
export { default as Terminal } from '../components/Terminal/Terminal';
export type { TerminalHandle } from '../components/Terminal/Terminal';

// 内置插件
export { builtinCommandsPlugin } from '../plugins/BuiltinCommands';
export type {
  helpCommand,
  clearCommand,
  listCommand,
  useCommand,
  addCommand,
  searchCommand,
  configCommand,
} from '../plugins/BuiltinCommands';

/**
 * 快速开始指南
 * 
 * @example
 * ```tsx
 * import { Terminal, createCommandPlugin, IPlugin, ICommandDefinition } from '@/lib';
 * 
 * // 自定义命令
 * const myCommand: ICommandDefinition = {
 *   name: 'hello',
 *   description: '打招呼',
 *   execute(ctx) {
 *     ctx.output('Hello World!', 'success');
 *   }
 * };
 * 
 * // 使用组件
 * <Terminal
 *   username="admin"
 *   commands={[myCommand]}
 *   onReady={(api) => console.log('终端就绪', api)}
 * />
 * ```
 */
