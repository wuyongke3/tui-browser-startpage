// 快速连接类型
export interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string; // 网站 favicon
  createdAt: number;
}

// 应用配置类型
export interface AppConfig {
  backgroundImage?: string; // 背景图片 URL 或 base64
  backgroundColor: string; // 背景色（无图片时使用）
  cursorColor: string; // 光标颜色
  cursorStyle: 'blink' | 'static' | 'underline' | 'block'; // 光标样式
  username?: string; // 自定义用户名（可选）
}

// 历史命令类型
export interface HistoryEntry {
  command: string;
  timestamp: number;
  output?: string;
}

// 解析后的命令类型
export type CommandType = 'use' | 'search' | 'add' | 'list' | 'config' | 'clear' | 'help' | 'unknown';

export interface ParsedCommand {
  command: CommandType;
  args: string[];
  raw: string;
}

// 终端输出项类型
export interface TerminalOutput {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp: number;
}
