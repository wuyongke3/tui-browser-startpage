/**
 * ============================================
 * 内置命令插件 - 提供基础命令功能
 * ============================================
 */
import type { IPlugin, ICommandDefinition } from '../types';
import { escapeHtml } from '../utils/validators';

/** 生成帮助文本的命令 */
const helpCommand: ICommandDefinition = {
  name: 'help',
  description: '显示帮助信息',
  usage: 'help [命令名]',
  aliases: ['?', 'man'],
  async execute(ctx) {
    const commandName = ctx.args[0];
    
    if (commandName) {
      // 显示特定命令的帮助
      const cmd = ctx.terminal.getCommand(commandName);
      if (cmd) {
        let output = `\n命令: ${cmd.name}\n`;
        output += `描述: ${cmd.description}\n`;
        if (cmd.usage) output += `用法: ${cmd.usage}\n`;
        if (cmd.argsDescription) output += `参数: ${cmd.argsDescription}\n`;
        if (cmd.aliases?.length) output += `别名: ${cmd.aliases.join(', ')}\n`;
        ctx.output(output, 'info');
      } else {
        ctx.output(`未找到命令: "${commandName}"`, 'error');
      }
    } else {
      // 显示所有命令帮助
      ctx.output(ctx.terminal.getHelpText(), 'info');
    }
  },
};

/** 清屏命令 */
const clearCommand: ICommandDefinition = {
  name: 'clear',
  description: '清空终端屏幕',
  usage: 'clear',
  aliases: ['cls', 'reset'],
  execute(ctx) {
    setTimeout(() => ctx.terminal.clear(), 50);
  },
};

/** 列出快速连接 */
const listCommand: ICommandDefinition = {
  name: 'list',
  description: '列出所有快速连接',
  usage: 'list',
  aliases: ['ls', 'links'],
  execute(ctx) {
    const links = ctx.terminal.getQuickLinks();
    
    if (links.length === 0) {
      ctx.output('暂无快速连接。使用 "add <URL>" 命令添加。', 'info');
      return;
    }

    let output = '\n快速连接列表:\n';
    output += '─'.repeat(45) + '\n';
    
    links.forEach((link, index) => {
      output += `  [${index + 1}] ${escapeHtml(link.name)}\n`;
      output += `       ${escapeHtml(link.url)}\n\n`;
    });

    output += '─'.repeat(45) + '\n';
    output += `  共 ${links.length} 个链接\n`;

    ctx.output(output);
  },
};

/** 交互式选择快速连接 */
const useCommand: ICommandDefinition = {
  name: 'use',
  description: '交互式选择并访问快速连接',
  usage: 'use',
  execute(ctx) {
    const links = ctx.terminal.getQuickLinks();
    
    if (links.length === 0) {
      ctx.output('暂无快速连接。请先使用 "add <URL>" 添加。', 'error');
      return;
    }

    let output = '\n选择要访问的连接:\n';
    output += '─'.repeat(45) + '\n';
    
    links.forEach((link, index) => {
      output += `  [${index + 1}] ${escapeHtml(link.name)} - ${escapeHtml(link.url)}\n`;
    });

    output += '\n输入编号或名称访问，按 Esc 取消...';
    
    ctx.output(output, 'info');

    // 进入 use 模式
    ctx.setState((state) => ({ ...state, isUseMode: true }));
  },
};

/** 处理 use 模式下的选择 */
export function handleUseSelection(
  selection: string,
  ctx: { terminal: ReturnType<typeof import('../lib/TerminalEngine').createTerminalEngine> }
): boolean {
  const links = ctx.terminal.getQuickLinks();
  const trimmed = selection.trim();

  const index = parseInt(trimmed, 10);
  
  let selectedLink;
  if (!isNaN(index) && index > 0 && index <= links.length) {
    selectedLink = links[index - 1];
  } else {
    selectedLink = links.find(
      (link) => link.name.toLowerCase() === trimmed.toLowerCase()
    );
  }

  if (selectedLink) {
    ctx.output(`正在打开: ${escapeHtml(selectedLink.name)}...`, 'success');
    window.open(selectedLink.url, '_blank');
    
    // 退出 use 模式
    ctx.setState((state) => ({ ...state, isUseMode: false }));
    return true;
  } else {
    ctx.output(`无效的选择: "${escapeHtml(trimmed)}"，请输入正确的编号或名称。`, 'error');
    return false; // 不退出模式，让用户重新选择
  }
}

/** 添加快速连接 */
const addCommand: ICommandDefinition = {
  name: 'add',
  description: '添加新的快速连接',
  usage: 'add <URL>',
  requireArgs: true,
  argsDescription: '网址 URL',
  async execute(ctx) {
    let url = ctx.args[0];

    if (!url?.trim()) {
      ctx.output('请提供 URL。用法: add <URL>', 'error');
      return;
    }

    url = url.trim();

    // 简单验证 URL
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      new URL(url);
    } catch {
      ctx.output(`无效的 URL 格式: "${ctx.args[0]}"`, 'error');
      return;
    }

    // 检查是否已存在
    const links = ctx.terminal.getQuickLinks();
    if (links.some((link) => link.url === url)) {
      ctx.output('该 URL 已存在于快速连接中。', 'error');
      return;
    }

    // 从 URL 提取名称
    const hostname = new URL(url).hostname.replace('www.', '');
    const name = hostname.charAt(0).toUpperCase() + hostname.slice(1).split('.')[0];

    // 获取 favicon
    const icon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;

    ctx.terminal.addQuickLink({ name, url, icon });
    ctx.output(`✓ 已添加: ${name}\n  URL: ${url}`, 'success');
  },
};

/** 搜索命令 */
const searchCommand: ICommandDefinition = {
  name: 'search',
  description: '搜索关键词（自动选择搜索引擎）',
  usage: 'search <关键词>',
  requireArgs: true,
  argsDescription: '搜索关键词',
  async execute(ctx) {
    const query = ctx.args.join(' ');
    
    if (!query.trim()) {
      ctx.output('请提供搜索关键词。用法: search <关键词>', 'error');
      return;
    }

    ctx.output(`正在搜索: ${escapeHtml(query.trim())}...`, 'info');

    try {
      // 简单的代理检测
      let hasProxy = false;
      
      await Promise.race([
        fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors',
          signal: AbortSignal.timeout(3000)
        }).then(() => { hasProxy = true; }).catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 3500))
      ]);

      const engine = hasProxy ? 'Google' : '百度';
      ctx.output(`使用搜索引擎: ${engine}`, 'info');

      const encodedQuery = encodeURIComponent(query.trim());
      const url = hasProxy
        ? `https://www.google.com/search?q=${encodedQuery}`
        : `https://www.baidu.com/s?wd=${encodedQuery}`;

      window.open(url, '_blank');
      ctx.output(`已在 ${engine} 中搜索: ${escapeHtml(query.trim())}`, 'success');
    } catch (error) {
      ctx.output('搜索失败，请检查网络连接后重试。', 'error');
    }
  },
};

/** 配置命令 - 直接设置配置项（无交互模式） */
const configCommand: ICommandDefinition = {
  name: 'config',
  description: '查看或设置终端配置项',
  usage: 'config [选项] [值]',
  execute(ctx) {
    // 无参数 → 显示当前配置
    if (ctx.args.length === 0) {
      const cfg = ctx.terminal.getConfig();
      const state = ctx.terminal.getState();
      ctx.output(`
当前配置:
  用户名:   ${state.username}
  背景图片: ${cfg.backgroundImage || '(未设置)'}
  背景颜色: ${cfg.backgroundColor || '#0a0a0a'}
  光标颜色: ${cfg.cursorColor || '#00ff00'}
  光标样式: ${cfg.cursorStyle || 'blink'}
`, 'info');
      ctx.output('\n用法: config <选项> <值>\n', 'output');
      return;
    }

    // 直接设置配置项
    const subCmd = ctx.args[0].toLowerCase();
    const value = ctx.args.slice(1).join(' ');

    switch (subCmd) {
      case 'background':
        if (!value) { ctx.output('请提供背景 URL 或颜色值', 'error'); break; }
        if (value.startsWith('#') || value.startsWith('rgb')) {
          ctx.terminal.updateConfig({ backgroundColor: value });
          ctx.output(`背景颜色已设置为: ${value}`, 'success');
        } else {
          ctx.terminal.updateConfig({ backgroundImage: value });
          ctx.output('背景图片已设置', 'success');
        }
        break;

      case 'cursor-color':
        if (!value) { ctx.output('请提供颜色值', 'error'); break; }
        ctx.terminal.updateConfig({ cursorColor: value });
        ctx.output(`光标颜色已设置为: ${value}`, 'success');
        break;

      case 'cursor-style': {
        const valid = ['blink', 'static', 'underline', 'block'];
        if (!valid.includes(value)) {
          ctx.output(`无效样式。可选值: ${valid.join(', ')}`, 'error'); break;
        }
        ctx.terminal.updateConfig({ cursorStyle: value as any });
        ctx.output(`光标样式已设置为: ${value}`, 'success');
        break;
      }

      default:
        ctx.output(`未知配置项: "${subCmd}"\n可用项: background, cursor-color, cursor-style`, 'error');
    }
  },
};

/**
 * 内置命令插件定义
 * 包含所有基础命令
 */
export const builtinCommandsPlugin: IPlugin = {
  id: 'builtin-commands',
  name: '内置命令',
  version: '1.0.0',
  description: '提供终端基础命令功能',
  commands: [
    helpCommand,
    clearCommand,
    listCommand,
    useCommand,
    addCommand,
    searchCommand,
    configCommand,
  ],
};

// 导出单独的命令供外部使用
export {
  helpCommand,
  clearCommand,
  listCommand,
  useCommand,
  addCommand,
  searchCommand,
};
