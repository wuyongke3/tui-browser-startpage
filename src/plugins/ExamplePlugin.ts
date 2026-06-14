/**
 * ============================================
 * 示例插件 - 展示如何创建自定义插件
 * ============================================
 */
import type { IPlugin, ICommandDefinition, ITerminalAPI } from '../lib/types';

/**
 * 示例：时间/日期命令插件
 */
const dateCommand: ICommandDefinition = {
  name: 'date',
  description: '显示当前日期和时间',
  usage: 'date',
  aliases: ['time', 'now'],
  execute(ctx) {
    const now = new Date();
    const formatted = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    });
    
    ctx.output(`\n  📅 ${formatted}\n`, 'info');
  },
};

/**
 * 示例：Echo 命令（输出用户输入的文本）
 */
const echoCommand: ICommandDefinition = {
  name: 'echo',
  description: '输出文本到终端',
  usage: 'echo <文本>',
  requireArgs: true,
  argsDescription: '要输出的文本内容',
  execute(ctx) {
    ctx.output(ctx.args.join(' '));
  },
};

/**
 * 示例：主题切换命令
 */
const themeCommand: ICommandDefinition = {
  name: 'theme',
  description: '切换或查看可用主题',
  usage: 'theme [主题名称]',
  execute(ctx) {
    const themeManager = (ctx.terminal as any).getThemeManager?.();
    
    if (!themeManager) {
      ctx.output('主题管理器不可用', 'error');
      return;
    }

    const themeName = ctx.args[0];

    if (!themeName) {
      // 显示所有可用主题
      const themes = themeManager.getAllThemes();
      let output = '\n可用主题:\n';
      output += '─'.repeat(35) + '\n';
      
      themes.forEach((theme, index) => {
        const current = theme.id === themeManager.getCurrent().id ? ' ◄ 当前' : '';
        output += `  [${index + 1}] ${theme.name}${current}\n`;
        output += `      ID: ${theme.id}\n\n`;
      });

      output += '\n使用方法: theme <主题名称或ID>';
      ctx.output(output, 'info');
      return;
    }

    // 尝试切换主题
    const success = themeManager.setPreset(themeName);
    
    if (success) {
      // 应用到 DOM
      themeManager.applyToDOM();
      
      const currentTheme = themeManager.getCurrent();
      ctx.output(`✓ 主题已切换为: "${currentTheme.name}"`, 'success');
      
      // 触发事件
      ctx.terminal.emit('theme:change', currentTheme);
    } else {
      ctx.output(`未找到主题: "${themeName}"，输入 "theme" 查看可用主题。`, 'error');
    }
  },
};

/**
 * 示例：系统信息命令
 */
const sysinfoCommand: ICommandDefinition = {
  name: 'sysinfo',
  description: '显示系统信息（含IP地址）',
  usage: 'sysinfo',
  aliases: ['system', 'info'],
  async execute(ctx) {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let browser = 'Unknown';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';

    // 报告进度：开始获取 IP
    ctx.reportProgress(10, '正在获取公网 IP 地址...');

    // 模拟加载过程，让进度条可见
    await new Promise(resolve => setTimeout(resolve, 300));
    if (ctx.signal.aborted) return;
    ctx.reportProgress(30, '连接 IP 服务中...');

    // 异步获取公网 IP
    let ip = '获取中...';
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(8000) });
      ip = (await res.json()).ip;
    } catch {
      ip = '无法获取';
    }

    if (ctx.signal.aborted) return;
    ctx.reportProgress(80, '正在收集系统信息...');

    await new Promise(resolve => setTimeout(resolve, 200));

    if (ctx.signal.aborted) return;
    ctx.reportProgress(100);

    const info = `
┌─────────────────────────────┐
│       系统信息               │
├─────────────────────────────┤
│ 公网IP:     ${ip.padEnd(16)}│
│ 操作系统:   ${os.padEnd(16)}│
│ 浏览器:     ${browser.padEnd(16)}│
│ 屏幕尺寸:   ${screen.width}x${`${screen.height}`.padEnd(11)}│
│ 语言:       ${navigator.language.padEnd(14)}│
│ 平台:       ${navigator.platform?.padEnd(13) || 'N/A'.padEnd(13)}│
│ 时区:       ${Intl.DateTimeFormat().resolvedOptions().timeZone.padEnd(14)}│
└─────────────────────────────┘
`.trim();

    ctx.output(info, 'output');
  },
};

/**
 * 示例：清空历史记录命令
 */
const historyCommand: ICommandDefinition = {
  name: 'history',
  description: '显示或清空命令历史',
  usage: 'history [clear]',
  execute(ctx) {
    const state = ctx.getState();
    
    if (ctx.args[0] === 'clear') {
      ctx.setState((s) => ({ ...s, commandHistory: [], historyIndex: -1 }));
      ctx.output('命令历史已清空', 'success');
      return;
    }

    if (state.commandHistory.length === 0) {
      ctx.output('暂无命令历史', 'info');
      return;
    }

    let output = '\n命令历史:\n';
    output += '─'.repeat(40) + '\n';
    
    state.commandHistory.forEach((cmd, index) => {
      output += `  ${(index + 1).toString().padStart(3)}  ${cmd}\n`;
    });

    output += `\n共 ${state.commandHistory.length} 条记录`;
    ctx.output(output);
  },
};

/**
 * 导出数据命令 - 将所有用户数据导出为 JSON 并下载
 */
const exportCommand: ICommandDefinition = {
  name: 'export',
  description: '导出所有用户数据（配置、快速连接、历史）为 JSON 文件',
  usage: 'export',
  aliases: ['backup', 'dump'],
  execute(ctx) {
    const json = ctx.terminal.exportData();

    // 触发浏览器下载
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ctx.output('数据已导出并开始下载！', 'success');
  },
};

/**
 * 导入数据命令 - 从 JSON 文件导入用户数据
 */
const importCommand: ICommandDefinition = {
  name: 'import',
  description: '从 JSON 文件导入用户数据（配置、快速连接、历史）',
  usage: 'import',
  aliases: ['restore'],
  async execute(ctx) {
    return new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          ctx.output('未选择文件，已取消导入。', 'warning');
          resolve();
          return;
        }

        try {
          const text = await file.text();
          const result = ctx.terminal.importData(text);

          if (result.success) {
            ctx.output(result.message, 'success');
            ctx.output('数据导入完成，刷新页面以应用全部更改。', 'info');
          } else {
            ctx.output(`导入失败: ${result.message}`, 'error');
          }
        } catch (e) {
          ctx.output(`读取文件失败: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }

        resolve();
      };

      input.oncancel = () => {
        ctx.output('已取消导入。', 'warning');
        resolve();
      };

      input.click();
    });
  },
};

/**
 * 清理缓存命令 - 一键清除所有本地存储数据
 */
const clearCacheCommand: ICommandDefinition = {
  name: 'clear-cache',
  description: '清除所有本地缓存数据，重置终端到初始状态',
  usage: 'clear-cache',
  aliases: ['reset', 'purge'],
  execute(ctx) {
    ctx.terminal.clearCache();
    ctx.output('所有缓存已清理！终端已重置。', 'success');
    ctx.output('提示：刷新页面以完全重置界面。', 'info');
  },
};

/**
 * 示例插件 - 扩展命令集
 * 
 * 这个插件展示了如何:
 * 1. 创建自定义命令
 * 2. 使用别名
 * 3. 访问终端 API
 * 4. 处理参数
 */
export const exampleCommandsPlugin: IPlugin = {
  id: 'example-commands',
  name: '扩展命令示例',
  version: '1.0.0',
  description: '展示如何创建自定义命令插件的示例',
  author: 'easygo',
  
  commands: [
    dateCommand,
    echoCommand,
    themeCommand,
    sysinfoCommand,
    historyCommand,
    exportCommand,
    importCommand,
    clearCacheCommand,
  ],

  hooks: {
    onInstall(api: ITerminalAPI) {
      console.log('[Example Plugin] 插件已安装！');
      api.print('\n📦 扩展命令插件已加载！输入 "help" 查看新命令。\n', 'success');
    },

    beforeCommandExecute(command: string) {
      // 可以在这里添加日志或权限检查
      console.log(`[Example Plugin] 即将执行命令: ${command}`);
      return true; // 返回 false 可阻止命令执行
    },

    afterCommandExecute(command: string) {
      console.log(`[Example Plugin] 命令执行完成: ${command}`);
    },

    onUninstall() {
      console.log('[Example Plugin] 插件已卸载');
    },
  },
};
