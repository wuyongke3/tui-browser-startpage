import { useCallback, useEffect } from 'react';
import { useTerminalStore } from '../store/useTerminalStore';
import { parseCommand, COMMAND_DESCRIPTIONS } from '../utils/commands';
import { isValidUrl, normalizeUrl, extractDomainName, getFaviconUrl, escapeHtml } from '../utils/validators';
import { performSearch, detectProxy } from '../utils/searchEngine';
import type { ParsedCommand } from '../types';

/**
 * 命令执行 Hook
 * 处理所有命令的解析和执行逻辑
 */
export function useCommandParser() {
  const {
    currentInput,
    clearInput,
    addOutput,
    quickLinks,
    addQuickLink,
    removeQuickLink,
    isConfigMode,
    setConfigMode,
    isUseMode,
    setUseMode,
    username,
    addToCommandHistory,
  } = useTerminalStore();

  /**
   * 执行帮助命令
   */
  const executeHelp = useCallback(() => {
    const helpText = `
╔══════════════════════════════════════════════╗
║           可用命令列表                        ║
╠══════════════════════════════════════════════╣
║  use     - ${COMMAND_DESCRIPTIONS.use.padEnd(32)}║
║  search  - ${COMMAND_DESCRIPTIONS.search.padEnd(32)}║
║  add     - ${COMMAND_DESCRIPTIONS.add.padEnd(32)}║
║  list    - ${COMMAND_DESCRIPTIONs.list.padEnd(32)}║
║  config  - ${COMMAND_DESCRIPTIONs.config.padEnd(32)}║
║  clear   - ${COMMAND_DESCRIPTIONs.clear.padEnd(32)}║
║  help    - ${COMMAND_DESCRIPTIONs.help.padEnd(32)}║
╚══════════════════════════════════════════════╝

使用示例:
  search React 教程
  add https://github.com
  list
`.trim();

    addOutput({ type: 'info', content: helpText });
  }, [addOutput]);

  /**
   * 执行列表命令
   */
  const executeList = useCallback(() => {
    if (quickLinks.length === 0) {
      addOutput({
        type: 'info',
        content: '暂无快速连接。使用 "add <URL>" 命令添加。',
      });
      return;
    }

    let output = '\n快速连接列表:\n';
    output += '─'.repeat(45) + '\n';
    
    quickLinks.forEach((link, index) => {
      output += `  [${index + 1}] ${escapeHtml(link.name)}\n`;
      output += `       ${escapeHtml(link.url)}\n\n`;
    });

    output += `─'.repeat(45)}\n`;
    output += `  共 ${quickLinks.length} 个链接\n`;

    addOutput({ type: 'output', content: output });
  }, [quickLinks, addOutput]);

  /**
   * 执行 use 命令（交互式选择）
   */
  const executeUse = useCallback(() => {
    if (quickLinks.length === 0) {
      addOutput({
        type: 'error',
        content: '暂无快速连接。请先使用 "add <URL>" 添加。',
      });
      return;
    }

    let output = '\n选择要访问的连接:\n';
    output += '─'.repeat(45) + '\n';
    
    quickLinks.forEach((link, index) => {
      output += `  [${index + 1}] ${escapeHtml(link.name)} - ${escapeHtml(link.url)}\n`;
    });

    output += '\n输入编号或名称访问，按 Esc 取消...';
    
    addOutput({ type: 'info', content: output });
    setUseMode(true);
  }, [quickLinks, addOutput, setUseMode]);

  /**
   * 处理 use 模式下的选择
   */
  const handleUseSelection = useCallback(
    (selection: string) => {
      const trimmed = selection.trim();
      
      // 尝试作为数字解析
      const index = parseInt(trimmed, 10);
      
      let selectedLink;
      if (!isNaN(index) && index > 0 && index <= quickLinks.length) {
        selectedLink = quickLinks[index - 1];
      } else {
        // 尝试匹配名称
        selectedLink = quickLinks.find(
          (link) => link.name.toLowerCase() === trimmed.toLowerCase()
        );
      }

      if (selectedLink) {
        addOutput({
          type: 'success',
          content: `正在打开: ${escapeHtml(selectedLink.name)}...`,
        });
        window.open(selectedLink.url, '_blank');
      } else {
        addOutput({
          type: 'error',
          content: `无效的选择: "${escapeHtml(trimmed)}"，请输入正确的编号或名称。`,
        });
        return; // 不退出 use 模式，让用户重新选择
      }

      setUseMode(false);
    },
    [quickLinks, addOutput, setUseMode]
  );

  /**
   * 执行搜索命令
   */
  const executeSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        addOutput({
          type: 'error',
          content: '请提供搜索关键词。用法: search <关键词>',
        });
        return;
      }

      addOutput({
        type: 'info',
        content: `正在搜索: ${escapeHtml(query.trim())}...`,
      });

      try {
        // 显示使用的搜索引擎
        const hasProxy = await detectProxy();
        const engine = hasProxy ? 'Google' : '百度';
        addOutput({
          type: 'info',
          content: `使用搜索引擎: ${engine}`,
        });

        await performSearch(query);
        
        addOutput({
          type: 'success',
          content: `已在 ${engine} 中搜索: ${escapeHtml(query.trim())}`,
        });
      } catch (error) {
        addOutput({
          type: 'error',
          content: '搜索失败，请检查网络连接后重试。',
        });
      }
    },
    [addOutput]
  );

  /**
   * 执行添加命令
   */
  const executeAdd = useCallback(
    (url: string) => {
      if (!url.trim()) {
        addOutput({
          type: 'error',
          content: '请提供 URL。用法: add <URL>',
        });
        return;
      }

      const normalizedUrl = normalizeUrl(url);

      if (!isValidUrl(normalizedUrl)) {
        addOutput({
          type: 'error',
          content: `无效的 URL 格式: "${escapeHtml(url)}"`,
        });
        return;
      }

      // 检查是否已存在
      const exists = quickLinks.some((link) => link.url === normalizedUrl);
      if (exists) {
        addOutput({
          type: 'error',
          content: `该 URL 已存在于快速连接中。`,
        });
        return;
      }

      const name = extractDomainName(normalizedUrl);
      const icon = getFaviconUrl(normalizedUrl);

      addQuickLink({ name, url: normalizedUrl, icon });

      addOutput({
        type: 'success',
        content: `✓ 已添加: ${name}\n  URL: ${normalizedUrl}`,
      });
    },
    [quickLinks, addQuickLink, addOutput]
  );

  /**
   * 处理配置模式下的命令
   */
  const handleConfigInput = useCallback(
    (input: string) => {
      const trimmed = input.toLowerCase().trim();
      
      if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'q') {
        setConfigMode(false);
        addOutput({
          type: 'success',
          content: '已退出配置模式。',
        });
        return true;
      }

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
        addOutput({ type: 'info', content: configHelp });
        return true;
      }

      if (trimmed === 'show') {
        const config = useTerminalStore.getState().config;
        const configDisplay = `
当前配置:
  背景图片: ${config.backgroundImage || '(未设置)'}
  背景颜色: ${config.backgroundColor}
  光标颜色: ${config.cursorColor}
  光标样式: ${config.cursorStyle}
  用户名:   ${username}
`;
        addOutput({ type: 'output', content: configDisplay });
        return true;
      }

      // 解析配置命令
      const parts = trimmed.split(/\s+/);
      const configCmd = parts[0];
      const configValue = parts.slice(1).join(' ');

      switch (configCmd) {
        case 'background':
          if (configValue) {
            // 判断是 URL 还是颜色
            if (configValue.startsWith('#') || configValue.startsWith('rgb')) {
              useTerminalStore.getState().updateConfig({
                backgroundImage: undefined,
                backgroundColor: configValue,
              });
              addOutput({
                type: 'success',
                content: `背景颜色已设置为: ${configValue}`,
              });
            } else {
              useTerminalStore.getState().updateConfig({
                backgroundImage: configValue,
              });
              addOutput({
                type: 'success',
                content: `背景图片已设置`,
              });
            }
          } else {
            addOutput({
              type: 'error',
              content: '请提供背景 URL 或颜色值',
            });
          }
          return true;

        case 'cursor-color':
          if (configValue) {
            useTerminalStore.getState().updateConfig({
              cursorColor: configValue,
            });
            addOutput({
              type: 'success',
              content: `光标颜色已设置为: ${configValue}`,
            });
          } else {
            addOutput({
              type: 'error',
              content: '请提供颜色值',
            });
          }
          return true;

        case 'cursor-style':
          const validStyles = ['blink', 'static', 'underline', 'block'];
          if (validStyles.includes(configValue)) {
            useTerminalStore.getState().updateConfig({
              cursorStyle: configValue as any,
            });
            addOutput({
              type: 'success',
              content: `光标样式已设置为: ${configValue}`,
            });
          } else {
            addOutput({
              type: 'error',
              content: `无效的光标样式。可选值: ${validStyles.join(', ')}`,
            });
          }
          return true;

        case 'username':
          if (configValue) {
            useTerminalStore.getState().setUsername(configValue);
            addOutput({
              type: 'success',
              content: `用户名已设置为: ${configValue}`,
            });
          } else {
            addOutput({
              type: 'error',
              content: '请提供用户名',
            });
          }
          return true;

        default:
          addOutput({
            type: 'error',
            content: `未知配置命令: ${configValue}。输入 "help" 查看可用命令。`,
          });
          return true;
      }
    },
    [setConfigMode, addOutput, username]
  );

  /**
   * 执行命令
   */
  const executeCommand = useCallback(
    (input: string) => {
      if (!input.trim()) return;

      // 显示用户输入
      addOutput({ type: 'input', content: input });

      // 如果在配置模式下
      if (isConfigMode) {
        handleConfigInput(input);
        addToCommandHistory(input);
        clearInput();
        return;
      }

      // 如果在 use 模式下
      if (isUseMode) {
        handleUseSelection(input);
        addToCommandHistory(input);
        clearInput();
        return;
      }

      // 解析命令
      const parsed: ParsedCommand = parseCommand(input);
      addToCommandHistory(input);

      switch (parsed.command) {
        case 'help':
          executeHelp();
          break;

        case 'list':
          executeList();
          break;

        case 'use':
          executeUse();
          break;

        case 'search':
          executeSearch(parsed.args.join(' '));
          break;

        case 'add':
          executeAdd(parsed.args[0] || '');
          break;

        case 'config':
          setConfigMode(true);
          addOutput({
            type: 'info',
            content: '\n进入配置模式。输入 "help" 查看可用命令，"exit" 退出。\n',
          });
          break;

        case 'clear':
          // 清屏延迟一帧，让用户看到 clear 命令
          setTimeout(() => {
            useTerminalStore.getState().clearOutputs();
          }, 50);
          break;

        default:
          addOutput({
            type: 'error',
            content: `未知命令: "${parsed.command}"。输入 "help" 查看可用命令。`,
          });
      }

      clearInput();
    },
    [
      isConfigMode,
      isUseMode,
      addOutput,
      addToCommandHistory,
      clearInput,
      handleConfigInput,
      handleUseSelection,
      executeHelp,
      executeList,
      executeUse,
      executeSearch,
      executeAdd,
      setConfigMode,
    ]
  );

  return {
    executeCommand,
  };
}
