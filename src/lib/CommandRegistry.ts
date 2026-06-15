/**
 * ============================================
 * 命令注册器 - 管理所有命令的注册、查找和执行
 * ============================================
 */
import type { ICommandDefinition, CommandContext, OutputType } from './types';

export class CommandRegistry {
  private commands: Map<string, ICommandDefinition> = new Map();
  private aliases: Map<string, string> = new Map(); // alias -> command name

  /**
   * 注册单个命令
   */
  register(command: ICommandDefinition): void {
    const normalizedName = command.name.toLowerCase();

    // 检查是否已存在
    if (this.commands.has(normalizedName)) {
      console.warn(`[Terminal] 命令 "${normalizedName}" 已存在，将被覆盖`);
    }

    this.commands.set(normalizedName, command);

    // 注册别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        const normalizedAlias = alias.toLowerCase();
        this.aliases.set(normalizedAlias, normalizedName);
      }
    }
  }

  /**
   * 批量注册命令
   */
  registerAll(commands: ICommandDefinition[]): void {
    for (const cmd of commands) {
      this.register(cmd);
    }
  }

  /**
   * 注销命令
   */
  unregister(name: string): boolean {
    const normalizedName = name.toLowerCase();
    const command = this.commands.get(normalizedName);

    if (command) {
      // 移除别名
      if (command.aliases) {
        for (const alias of command.aliases) {
          this.aliases.delete(alias.toLowerCase());
        }
      }
      return this.commands.delete(normalizedName);
    }

    return false;
  }

  /**
   * 获取命令定义
   */
  get(name: string): ICommandDefinition | undefined {
    const normalizedName = name.toLowerCase();

    // 先尝试直接匹配
    let command = this.commands.get(normalizedName);

    // 再尝试别名匹配
    if (!command) {
      const resolvedName = this.aliases.get(normalizedName);
      if (resolvedName) {
        command = this.commands.get(resolvedName);
      }
    }

    return command;
  }

  /**
   * 获取所有已注册的命令
   */
  getAll(): ICommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * 检查命令是否存在
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  /**
   * 获取匹配的命令建议（用于 Tab 补全）
   */
  getSuggestions(partial: string): ICommandDefinition[] {
    const lowerPartial = partial.toLowerCase();
    const suggestions: ICommandDefinition[] = [];

    // 匹配命令名
    for (const [name, cmd] of this.commands) {
      if (name.startsWith(lowerPartial)) {
        suggestions.push(cmd);
      }
    }

    // 匹配别名
    for (const [alias, resolvedName] of this.aliases) {
      if (alias.startsWith(lowerPartial)) {
        const cmd = this.commands.get(resolvedName);
        if (cmd && !suggestions.includes(cmd)) {
          suggestions.push(cmd);
        }
      }
    }

    return suggestions;
  }

  /**
   * 解析并执行命令
   */
  async execute(
    input: string,
    context: Omit<CommandContext, 'rawInput' | 'args'>
  ): Promise<{ success: boolean; command?: ICommandDefinition }> {
    const trimmed = input.trim();

    if (!trimmed) {
      return { success: false };
    }

    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.get(commandName);

    if (!command) {
      // 非指令关键字 → 默认走 search
      const searchCmd = this.get('search');
      if (searchCmd) {
        return await this.execute(`search ${trimmed}`, context);
      }
      context.output(`未知命令: "${commandName}"。输入 "help" 查看可用命令。`, 'error');
      return { success: false };
    }

    // 检查必需参数
    if (command.requireArgs && args.length === 0) {
      context.output(
        `命令 "${command.name}" 需要参数。\n用法: ${command.name} ${command.argsDescription || '<参数>'}`,
        'error'
      );
      return { success: false, command };
    }

    // 构建完整上下文
    const fullContext: CommandContext = {
      ...context,
      rawInput: trimmed,
      args,
    };

    try {
      await command.execute(fullContext);
      return { success: true, command };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      context.output(`执行命令时出错: ${errorMessage}`, 'error');
      return { success: false, command };
    }
  }

  /**
   * 生成帮助文本
   */
  generateHelpText(): string {
    const commands = this.getAll();

    if (commands.length === 0) {
      return '暂无可用命令。';
    }

    let text = '\n╔══════════════════════════════════════════════╗\n';
    text += '║           可用命令列表                        ║\n';
    text += '╠══════════════════════════════════════════════╣\n';

    for (const cmd of commands) {
      const paddedName = cmd.name.padEnd(12);
      const desc = (cmd.description || '').substring(0, 28).padEnd(28);
      text += `║  ${paddedName} - ${desc}║\n`;
    }

    text += '╚══════════════════════════════════════════════╝\n';

    // 显示有详细用法的命令
    const commandsWithUsage = commands.filter((c) => c.usage);
    if (commandsWithUsage.length > 0) {
      text += '\n使用示例:\n';
      for (const cmd of commandsWithUsage) {
        text += `  ${cmd.usage}\n`;
      }
    }

    return text;
  }
}
