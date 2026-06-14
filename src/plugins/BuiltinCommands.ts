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

/** 配置命令 */
const configCommand: ICommandDefinition = {
  name: 'config',
  description: '进入配置模式或设置配置项',
  usage: 'config [选项] [值]',
  execute(ctx) {
    // 如果没有参数，进入配置模式
    if (ctx.args.length === 0) {
      ctx.output('\n进入配置模式。输入 "help" 查看可用命令，"exit" 退出。\n', 'info');
      ctx.setState((state) => ({ ...state, isConfigMode: true }));
      return;
    }

    // 直接设置配置项
    const configCmd = ctx.args[0].toLowerCase();
    const configValue = ctx.args.slice(1).join(' ');

    switch (configCmd) {
      case 'background':
        if (configValue) {
          if (configValue.startsWith('#') || configValue.startsWith('rgb')) {
            ctx.terminal.updateConfig({ backgroundColor: configValue });
            ctx.output(`背景颜色已设置为: ${configValue}`, 'success');
          } else {
            ctx.terminal.updateConfig({ backgroundImage: configValue });
            ctx.output('背景图片已设置', 'success');
          }
        } else {
          ctx.output('请提供背景 URL 或颜色值', 'error');
        }
        break;

      case 'cursor-color':
        if (configValue) {
          ctx.terminal.updateConfig({ cursorColor: configValue });
          ctx.output(`光标颜色已设置为: ${configValue}`, 'success');
        } else {
          ctx.output('请提供颜色值', 'error');
        }
        break;

      case 'cursor-style': {
        const validStyles = ['blink', 'static', 'underline', 'block'];
        if (validStyles.includes(configValue)) {
          ctx.terminal.updateConfig({ cursorStyle: configValue as any });
          ctx.output(`光标样式已设置为: ${configValue}`, 'success');
        } else {
          ctx.output(`无效的光标样式。可选值: ${validStyles.join(', ')}`, 'error');
        }
        break;
      }

      case 'username':
        if (configValue) {
          ctx.terminal.setUsername(configValue);
          ctx.terminal.updateConfig({ username: configValue });
          ctx.output(`用户名已设置为: ${configValue}`, 'success');
        } else {
          ctx.output('请提供用户名', 'error');
        }
        break;

      case 'show': {
        const config = ctx.terminal.getConfig();
        const state = ctx.terminal.getState();
        const configDisplay = `
当前配置:
  背景图片: ${config.backgroundImage || '(未设置)'}
  背景颜色: ${config.backgroundColor || '#0a0a0a'}
  光标颜色: ${config.cursorColor || '#00ff00'}
  光标样式: ${config.cursorStyle || 'blink'}
  用户名:   ${state.username}
`;
        ctx.output(configDisplay);
        break;
      }

      default:
        ctx.output(`未知配置选项: "${configCmd}"`, 'error');
    }
  },
};

/** 配置模式内的命令处理 */
export function handleConfigInput(
  input: string,
  ctx: { terminal: ReturnType<typeof import('../lib/TerminalEngine').createTerminalEngine> }
): boolean {
  const trimmed = input.toLowerCase().trim();

  // 退出命令
  if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
    ctx.setState((state) => ({ ...state, isConfigMode: false }));
    ctx.output('已退出配置模式。', 'success');
    return true;
  }

  // 帮助命令
  if (trimmed === 'help') {
    const configHelp = `
配置模式命令:
  background <url|color>  - 设置背景（URL 或颜色值）
  cursor-color <color>    - 设置光标颜色
  cursor-style <style>   - 设置光标样式 (blink/static/underline/block)
  username <name>         - 设置显示的用户名
  show                    - 显示当前配置
  exit/quit               - 退出配置模式
`;
    ctx.output(configHelp, 'info');
    return true;
  }

  // 其他命令作为 config 的子命令执行
  configCommand.execute({
    ...ctx,
    rawInput: `config ${input}`,
    args: input.split(/\s+/),
  });

  return true;
}

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
  configCommand,
};
