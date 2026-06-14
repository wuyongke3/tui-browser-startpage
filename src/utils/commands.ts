import type { ParsedCommand, CommandType } from '../types';

/**
 * 命令列表（用于提示和补全）
 */
export const COMMAND_LIST: CommandType[] = [
  'use',
  'search',
  'add',
  'list',
  'config',
  'clear',
  'help',
];

/**
 * 命令描述信息
 */
export const COMMAND_DESCRIPTIONS: Record<CommandType, string> = {
  use: '交互式选择并访问快速连接',
  search: '搜索关键词（自动选择搜索引擎）',
  add: '添加新的快速连接，格式: add <URL>',
  list: '列出所有快速连接',
  config: '进入配置模式',
  clear: '清空终端屏幕',
  help: '显示帮助信息',
  unknown: '未知命令',
};

/**
 * 解析用户输入的命令
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { command: 'unknown', args: [], raw: trimmed };
  }

  const parts = trimmed.split(/\s+/);
  const commandName = parts[0].toLowerCase() as CommandType;
  const args = parts.slice(1);

  // 验证是否为已知命令
  const isValidCommand = COMMAND_LIST.includes(commandName);
  
  return {
    command: isValidCommand ? commandName : 'unknown',
    args,
    raw: trimmed,
  };
}

/**
 * 获取匹配的命令建议（用于 Tab 补全）
 */
export function getCommandSuggestions(partial: string): CommandType[] {
  const lowerPartial = partial.toLowerCase();
  return COMMAND_LIST.filter((cmd) => cmd.startsWith(lowerPartial));
}
