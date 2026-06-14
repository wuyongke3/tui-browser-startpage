# Terminal Startpage - 项目上下文文档

> **生成时间**: 2026-06-14  
> **作者**: easygo (https://github.com/wuyongke3)  
> **授权**: 商用需联系作者  
> **用途**: 换 agent 工作时快速了解项目全貌

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| 名称 | terminal-startpage |
| 版本 | 1.0.0 |
| 类型 | 可插拔终端风格浏览器起始页 |
| 技术栈 | React 19 + TypeScript + Vite 8 + Zustand 5 |
| 运行命令 | `npm run dev` → http://localhost:5174/ |

### 核心功能
- 终端风格的浏览器起始页（仿 tui/startpage）
- 命令行交互（help/search/add/list/use/config 等）
- **可插拔架构**：引擎与 UI 分离，支持自定义命令和插件
- 5 种预设主题（经典绿/赛博朋克/黑客帝国/暗蓝海洋/极简白）
- 快速连接管理（添加/删除/访问）
- 进度条 + Ctrl+C/q 中断执行中的命令
- 数据导出/导入（JSON）/一键清理缓存
- CRT 终端视觉效果（扫描线/发光/等宽字体）
- localStorage 持久化

---

## 2. 目录结构

```
c:\code\myhomepage\
├── ai/                              # ← 本上下文目录
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── lib/                         # 🔧 核心引擎层（零 React 依赖）
│   │   ├── types.ts                #    全部类型定义
│   │   ├── TerminalEngine.ts        #    终端核心引擎
│   │   ├── CommandRegistry.ts       #    命令注册器
│   │   ├── EventEmitter.ts          #    事件系统
│   │   ├── PluginManager.ts         #    插件管理器
│   │   ├── ThemeManager.ts          #    主题系统（5套预设）
│   │   └── index.ts                 #    统一导出
│   │
│   ├── plugins/                     # 📦 插件目录
│   │   ├── BuiltinCommands.ts       #    内置命令插件（7个基础命令）
│   │   └── ExamplePlugin.ts         #    示例扩展插件（8个命令）
│   │
│   ├── components/Terminal/         # 🎨 UI 组件层
│   │   ├── Terminal.tsx             #    主终端组件（forwardRef）
│   │   ├── Cursor.tsx               #    光标组件（4种样式）
│   │   ├── OutputDisplay.tsx        #    输出显示组件
│   │   └── ProgressBar.tsx          #    进度条组件
│   │
│   ├── App.tsx                      # 应用入口
│   ├── main.tsx                     # React 挂载
│   └── index.css                    # 全局样式（CRT 效果）
│
├── index.html                       # HTML 入口（含版权 meta）
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 3. 架构设计

```
┌─────────────────────────────────────────────┐
│              React UI Layer                  │
│  Terminal.tsx | Cursor | ProgressBar | Output │
├─────────────────────────────────────────────┤
│              ITerminalAPI Interface           │
│  (命令/插件/输出/配置/事件/数据管理)            │
├─────────────────────────────────────────────┤
│            Core Engine Layer                 │
│  TerminalEngine                             │
│  ├─ CommandRegistry  (命令注册/查找/执行)     │
│  ├─ PluginManager     (安装/卸载/钩子)        │
│  ├─ EventEmitter      (发布/订阅)             │
│  └─ ThemeManager      (5套预设+自定义)         │
├─────────────────────────────────────────────┤
│              Plugins Layer                   │
│  builtinCommandsPlugin (7个)                 │
│  exampleCommandsPlugin  (8个)               │
│  [用户自定义插件...]                          │
└─────────────────────────────────────────────┘
```

**关键设计原则：**
- 引擎层 (`src/lib/`) **不依赖 React**，可在任何框架使用
- 通过 `ITerminalAPI` 接口暴露全部能力
- `CommandContext` 注入 `signal`(AbortSignal) + `reportProgress()` 支持中断和进度条
- 所有状态通过 `onStateUpdate` 回调同步到 React state

---

## 4. 完整命令列表

### 内置命令 (BuiltinCommandsPlugin)

| 命令 | 别名 | 功能 | 用法 |
|------|------|------|------|
| `help` | ?, man | 显示帮助 | `help [命令名]` |
| `clear` | cls, reset | 清屏 | `clear` |
| `list` | ls, links | 列出快速连接 | `list` |
| `use` | - | 选择并访问连接 | `use` |
| `add` | - | 添加快速连接 | `add <URL>` |
| `search` | - | 搜索关键词 | `search <关键词>` |
| `config` | - | 配置模式/设置项 | `config [选项] [值]` |

**config 子命令**: `background`, `cursor-color`, `cursor-style`, `username`, `show`

### 扩展命令 (ExamplePlugin)

| 命令 | 别名 | 功能 | 用法 |
|------|------|------|------|
| `date` | time, now | 显示日期时间 | `date` |
| `echo` | - | 输出文本 | `echo <文本>` |
| `theme` | - | 切换/查看主题 | `theme [名称]` |
| `sysinfo` | system, info | 系统信息(含IP+进度条) | `sysinfo` |
| `history` | - | 显示/清空历史 | `history [clear]` |
| `export` | backup, dump | 导出数据为 JSON 文件 | `export` |
| `import` | restore | 从 JSON 导入数据 | `import` |
| `clear-cache` | reset, purge | 一键清理所有缓存 | `clear-cache` |

---

## 5. 关键接口定义

### CommandContext（命令执行上下文）
```typescript
interface CommandContext {
  rawInput: string;           // 原始输入
  args: string[];              // 解析后的参数
  output(content, type?): void; // 输出到终端
  getState(): TerminalState;   // 获取状态
  setState(updater): void;     // 更新状态
  terminal: ITerminalAPI;      // API 引用
  signal: AbortSignal;         // 中断信号（检测 Ctrl+C）
  reportProgress(value, msg?): void; // 报告进度 0-100
}
```

### ICommandDefinition（命令定义）
```typescript
interface ICommandDefinition {
  name: string;                // 命令名（小写）
  description: string;         // help 中显示
  usage?: string;              // 用法示例
  aliases?: string[];          // 别名列表
  requireArgs?: boolean;       // 是否需要参数
  argsDescription?: string;    // 参数说明
  execute(ctx): CommandResult; // 执行函数（支持 async）
}
```

### IPlugin（插件定义）
```typescript
interface IPlugin {
  id: string;                  // 唯一标识
  name: string;                // 名称
  version: string;             // 版本号
  author?: string;             // 作者
  commands?: ICommandDefinition[]; // 提供的命令
  hooks?: PluginHooks;         // 生命周期钩子
  themeExtensions?: Partial<ITheme>; // 主题扩展
}

interface PluginHooks {
  onInstall?(api): void;
  beforeCommandExecute?(cmd, ctx): boolean | Promise<boolean>; // return false 阻止执行
  afterCommandExecute?(cmd, ctx, result): void;
  onUninstall?(): void;
}
```

### ITerminalAPI（完整 API）
```typescript
interface ITerminalAPI {
  // 命令管理
  registerCommand(cmd), unregisterCommand(name), getCommand(name), getAllCommands()
  // 插件管理
  registerPlugin(plugin), unregisterPlugin(id), getPlugin(id)
  // 输出控制
  print(content, type?), clear()
  // 状态访问
  getState(), setState(updater)
  // 快速连接
  addQuickLink(link), removeQuickLink(id), getQuickLinks()
  // 配置管理
  updateConfig(config), getConfig()
  // 事件系统
  on(event, callback), emit(event, ...args)
  // 工具方法
  setPrompt(prefix), getPrompt(), setUsername(name)
  // 中断与进度
  abortCurrentCommand(), reportProgress(value, message?)
  // 数据管理
  exportData(): string, importData(jsonStr): {success, message}, clearCache()
  // 主题
  getThemeManager(): ThemeManager
}
```

---

## 6. localStorage 存储结构

| Key | 内容 | 说明 |
|-----|------|------|
| `terminal_quicklinks` | IQuickLink[] | 快速连接列表 |
| `terminal_config` | object | 用户配置（username/theme/cursor 等） |
| `terminal_history` | string[] | 命令历史记录（最多50条） |
| `terminal_username` | string | 用户名（独立存储） |

**导出 JSON 格式**:
```json
{
  "version": "1.0",
  "exportTime": "ISO字符串",
  "data": { "username", "config", "quickLinks", "commandHistory" }
}
```

---

## 7. 交互快捷键

| 按键 | 功能 |
|------|------|
| `Enter` | 执行命令 |
| `Tab` | 命令自动补全 |
| `↑` / `↓` | 浏览历史命令 |
| `Ctrl+C` | 执行中→中断 / 非执行中→清空输入 |
| `q` | 执行中且无输入时→中断命令 |
| `Ctrl+L` | 清屏 |
| `Esc` | 退出 config/use 模式 |

---

## 8. 主题系统

| ID | 名称 | 主色 | 特点 |
|----|------|------|------|
| `classic-green` | 经典绿 | #00ff00 | 默认，扫描线+发光 |
| `cyberpunk` | 赛博朋克 | #f72585 | 品红+紫色霓虹 |
| `matrix` | 黑客帝国 | #00ff41 | 矩阵绿代码雨 |
| `ocean` | 暗蓝海洋 | #64ffda | 深海青色 |
| `minimal` | 极简白 | #2563eb | 白色背景无特效 |

光标样式: `blink`(闪烁细) | `static`(静态) | `underline`(下划线) | `block`(粗方块，默认)

---

## 9. 已知实现细节

### 输入框方案
- 使用 `<span contentEditable>` 替代原生 `<input>`，避免浏览器默认白色边框
- `caretColor: 'transparent'` 隐藏原生光标
- 自定义 `Cursor` 组件渲染 block 粗光标（默认）

### 用户名获取
- 优先从 localStorage `terminal_config.username` 读取
- 回退策略: Windows→`User`, macOS/Linux→`user`, 其他→`guest`
- 可通过 `config username <名字>` 或 `setUsername()` 修改

### 命令中断机制
- 每次 `executeInput()` 创建新 `AbortController`
- 命令内通过 `ctx.signal.aborted` 检测中断
- `abortCurrentCommand()` 触发 `controller.abort()`

### 进度条
- 命令调用 `ctx.reportProgress(value, message)` 更新
- Terminal 组件监听 `state.isExecuting` + `state.progressInfo` 渲染
- ProgressBar 组件: 绿色渐变填充 + 动画条纹 + 百分比

---

## 10. 开发注意事项

1. **新增命令**: 在 `IPlugin.commands[]` 中定义，或直接传给 `<Terminal commands={[...]} />`
2. **新增插件**: 实现 `IPlugin` 接口，传给 `<Terminal plugins={[...]} />`
3. **修改内置命令**: 编辑 `BuiltinCommands.ts` 或 `ExamplePlugin.ts`
4. **新增主题**: 在 `ThemeManager.PRESET_THEMES` 中添加，或调用 `registerCustomTheme()`
5. **引擎与 UI 解耦**: `TerminalEngine` 不依赖 React，可通过 `createTerminalEngine()` 独立使用
6. **类型安全**: 全部 TypeScript，核心类型在 `types.ts`
7. **运行命令**: `npm run dev` 启动开发服务器（端口 5174）
