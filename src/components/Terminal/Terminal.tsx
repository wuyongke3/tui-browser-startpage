/**
 * ============================================
 * 可插拔终端组件 - 通用 React 组件
 * ============================================
 */
import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type {
  ITerminalProps,
  ITerminalAPI,
  ITerminalOutput,
  ITheme,
} from '../lib/types';
import { createTerminalEngine } from '../../lib/TerminalEngine';
import { ThemeManager, PRESET_THEMES } from '../../lib/ThemeManager';
import { builtinCommandsPlugin, handleUseSelection } from '../../plugins/BuiltinCommands';

// 子组件
import Cursor from './Cursor';
import OutputDisplay from './OutputDisplay';
import ProgressBar from './ProgressBar';

/** 获取系统信息字符串 */
function getSystemInfoString(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  const date = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${os} | ${date}`;
}

/** 生成默认欢迎信息（纯 ASCII，确保等宽对齐） */
function generateWelcomeMessage(username: string): string {
  const systemInfo = getSystemInfoString();
  const line = '+------------------------------+';

  return `
${line}
|  &&&&&   GGG    OOO          |
|    N    G      O   O         |
|    N    G====  O   O         |
|    U    G   I  O   O         |
|    V     GG N   OOO          |
|                              |
|      Terminal v2.0           |
${line}
|  ${username.padEnd(25)}   |
|  ${systemInfo.padEnd(25)}  | 
${line}
|  help -> commands            |
${line}
`.trim();
}

export interface TerminalHandle {
  /** 获取终端 API */
  getAPI: () => ITerminalAPI | null;
}

/**
 * 可插拔终端组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Terminal />
 * 
 * // 自定义配置
 * <Terminal
 *   username="admin"
 *   theme={customTheme}
 *   plugins={[myPlugin]}
 *   onReady={(api) => console.log(api)}
 * />
 * ```
 */
/**
 * 获取当前操作系统登录用户名
 * 浏览器环境下的最佳尝试方案
 */
function getSystemUsername(): string {
  // 尝试从 localStorage 读取之前保存的用户名（配置模式设置过的话）
  try {
    const savedConfig = localStorage.getItem('terminal_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.username) {
        return config.username;
      }
    }
  } catch { /* 忽略 */ }

  // 在 Windows 环境下，可以尝试通过 ActiveX 获取（仅 IE/Edge 兼容模式）
  // 现代浏览器无法直接获取 OS 用户名
  
  // 回退策略：使用 navigator 对象的一些信息作为参考
  // 注意：这不是真正的 OS 用户名，只是合理的默认值
  const ua = navigator.userAgent;
  
  if (ua.includes('Windows')) {
    // Windows 系统：尝试从用户代理或其他方式推断
    // 大多数情况下返回 'User' 作为通用名称
    return 'User';
  } else if (ua.includes('Mac')) {
    return 'user';
  } else if (ua.includes('Linux')) {
    return 'user';
  }

  return 'guest';
}

const Terminal = forwardRef<TerminalHandle, ITerminalProps>(({
  username,  // 不再设默认值，由 getSystemUsername 决定
  theme,
  welcomeMessage,
  plugins = [],
  commands = [],
  initialLinks = [],
  showHeader = true,
  showFooter = true,
  className = '',
  height = '100vh',
  onCommandExecute,
  onOutputChange,
  onReady,
}, ref) => {
  // 引用
  const engineRef = useRef<ITerminalAPI | null>(null);
  const inputRef = useRef<HTMLElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const commandLineRef = useRef<HTMLDivElement>(null); // 输入行容器，用于光标定位

  // 状态
  const [outputs, setOutputs] = useState<ITerminalOutput[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  // 光标跟随位置（相对于 command-line 容器）
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number; height: number } | null>(null);
  // 背景模式：dynamic=视频壁纸, static=静态图片
  const [isDynamicBg, setIsDynamicBg] = useState(() => {
    try { return localStorage.getItem('terminal_bg_mode') !== 'static' }
    catch { return true }
  });
  // 欢迎信息打字机动画：当前已显示的字符数，null 表示动画未开始/已结束
  const [welcomeCharCount, setWelcomeCharCount] = useState<number | null>(null);
  const fullWelcomeRef = useRef('');

  /** 判断字符是否属于 logo 图案区域（用于施加特殊动画） */
  const isLogoChar = (char: string): boolean => {
    return /[_|\\/]/.test(char);
  };

  /** 切换背景模式并持久化 */
  const toggleBgMode = useCallback(() => {
    setIsDynamicBg(prev => {
      const next = !prev;
      try { localStorage.setItem('terminal_bg_mode', next ? 'dynamic' : 'static') }
      catch { /* ignore */ }
      return next;
    });
  }, []);
  // 优先使用传入的 username，否则自动获取系统用户名
  const [currentUsername, setCurrentUsername] = useState(username || getSystemUsername());
  const [isUseMode, setIsUseMode] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestion, setSuggestion] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{ value: number; message: string } | null>(null);

  // 字体大小状态（支持 Ctrl+滚轮缩放）
  const [fontSize, setFontSize] = useState(() => {
    try { return parseInt(localStorage.getItem('terminal_font_size') || '14', 10) }
    catch { return 14 }
  });

  // 初始化引擎
  useEffect(() => {
    let engine: ITerminalAPI;

    const initEngine = async () => {
      // 使用传入的 username 或自动获取的系统用户名
      const effectiveUsername = username || getSystemUsername();
      
      // 创建引擎实例（包含内置命令插件）
      engine = await createTerminalEngine({
        username: effectiveUsername,
        theme,
        plugins: [builtinCommandsPlugin, ...plugins],
        commands,
        initialLinks,
      });

      // 存储引用
      engineRef.current = engine;

      // 监听状态变化
      engine.onStateUpdate((state) => {
        setOutputs([...state.outputs]);
        setCurrentUsername(state.username);
        setIsUseMode(state.isUseMode);
        setCommandHistory([...state.commandHistory]);
        setIsExecuting(state.isExecuting || false);
        setProgressInfo(state.progressInfo || null);
      });

      // 生成完整欢迎信息，存入 ref 供打字机动画使用
      const fullMsg = welcomeMessage || generateWelcomeMessage(effectiveUsername);
      fullWelcomeRef.current = fullMsg;

      // 启动打字机动画：逐字符显示欢迎信息
      setWelcomeCharCount(0);

      // 标记就绪
      setIsReady(true);

      // 触发就绪回调
      if (onReady) {
        onReady(engine);
      }
    };

    initEngine();

    // 清理
    return () => {
      if (engineRef.current) {
        (engineRef.current as any).destroy?.();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 打字机动画：逐字符显示欢迎信息
  useEffect(() => {
    if (welcomeCharCount === null || welcomeCharCount === -1) return; // 未开始或已完成

    const fullText = fullWelcomeRef.current;
    if (!fullText) return;

    // 动画已完成，保留显示（-1 = 已完成）
    if (welcomeCharCount >= fullText.length) {
      setWelcomeCharCount(-1);
      return;
    }

    // 根据字符类型调整打字速度（换行稍快，普通字符适中）
    const char = fullText[welcomeCharCount];
    const delay = char === '\n' ? 20 : 18 + Math.random() * 25;

    const timer = setTimeout(() => {
      setWelcomeCharCount(prev => (prev ?? 0) + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [welcomeCharCount]);

  // 暴露 API 给父组件
  useImperativeHandle(ref, () => ({
    getAPI: () => engineRef.current,
  }));

  // 自动滚动到最新输出
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputs]);

  // 输出变化通知
  useEffect(() => {
    if (onOutputChange && isReady) {
      onOutputChange(outputs);
    }
  }, [outputs, onOutputChange, isReady]);

  // Ctrl+滚轮缩放字体
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        setFontSize(prev => {
          const next = Math.min(32, Math.max(8, prev + delta));
          localStorage.setItem('terminal_font_size', String(next));
          return next;
        });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  /**
   * 计算光标在输入行中的精确位置
   * 基于 Selection API + Range.getClientRects()
   */
  const updateCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !inputRef.current || !commandLineRef.current) {
      return; // 容器未就绪时不更新，保留上次位置
    }

    const range = selection.getRangeAt(0);

    // 光标必须在 contenteditable 输入区域内
    if (!inputRef.current.contains(range.startContainer)) {
      return;
    }

    // 创建一个 0 宽度的 range 来获取光标精确位置
    const cursorRange = document.createRange();
    cursorRange.setStart(range.startContainer, range.startOffset);
    cursorRange.collapse(true);

    const rects = cursorRange.getClientRects();
    const containerRect = commandLineRef.current.getBoundingClientRect();

    if (rects.length === 0) {
      // 空输入时 getClientRects() 无结果 → 用 input 元素自身位置做 fallback
      const inputRect = inputRef.current.getBoundingClientRect();
      setCursorPosition({
        top: inputRect.top - containerRect.top,
        left: inputRect.left - containerRect.left,
        height: inputRect.height || 18,
      });
      return;
    }

    const rect = rects[0];
    setCursorPosition({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
      height: rect.height || 18,
    });
  }, []);

  // 光标位置跟随：监听输入区域的键盘/鼠标事件和全局选区变化
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // 键盘输入、鼠标点击/松开时更新位置
    const events = ['keyup', 'mouseup', 'click'] as const;
    events.forEach(event =>
      el.addEventListener(event, updateCursorPosition as EventListener)
    );

    // 全局 selectionchange（处理方向键移动光标等场景）
    document.addEventListener('selectionchange', updateCursorPosition);

    // 立即计算一次初始位置
    updateCursorPosition();

    return () => {
      events.forEach(event =>
        el.removeEventListener(event, updateCursorPosition as EventListener)
      );
      document.removeEventListener('selectionchange', updateCursorPosition);
    };
  }, [updateCursorPosition]);

  /**
   * 执行命令
   */
  const executeCommand = useCallback(async (input: string) => {
    if (!input.trim() || !engineRef.current) return;

    const engine = engineRef.current;

    // 处理特殊模式
    if (isUseMode) {
      // use 模式：处理选择
      handleUseSelection(input, { terminal: engine });
      setCurrentInput('');
      return;
    }

    // 命令执行前回调
    if (onCommandExecute) {
      const parts = input.trim().split(/\s+/);
      onCommandExecute(parts[0], parts.slice(1));
    }

    // 执行命令
    await engine.executeInput(input);
    
    // 清空输入（同时清空 contenteditable 内容）
    setCurrentInput('');
    setSuggestion('');
    if (inputRef.current) {
      inputRef.current.textContent = '';
    }
  }, [isUseMode, onCommandExecute]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        executeCommand(currentInput);
        break;

      case 'Tab':
        e.preventDefault();
        handleTabComplete();
        break;

      case 'ArrowUp':
        e.preventDefault();
        navigateHistory(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        navigateHistory(1);
        break;

      case 'Escape':
        e.preventDefault();
        // Esc 始终退出 use 模式
        if (isUseMode) {
          setIsUseMode(false);
          engineRef.current?.setState(s => ({ ...s, isUseMode: false }));
          setCurrentInput('');
          if (inputRef.current) inputRef.current.textContent = '';
          break;
        }
        // 非执行中 → 清空输入
        setCurrentInput('');
        setSuggestion('');
        if (inputRef.current) inputRef.current.textContent = '';
        break;

      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // 命令执行中 → 中断命令
          if (isExecuting) {
            engineRef.current?.abortCurrentCommand();
            return;
          }
          // 非执行中 → 清空输入
          setCurrentInput('');
          setSuggestion('');
          if (inputRef.current) inputRef.current.textContent = '';

          if (isUseMode) {
            setIsUseMode(false);
            engineRef.current?.setState(s => ({ ...s, isUseMode: false }));
          }
        }
        break;

      case 'q':
        // 命令执行中按 q 中断
        if (isExecuting && !e.ctrlKey && !e.metaKey && !e.altKey && currentInput === '') {
          e.preventDefault();
          engineRef.current?.abortCurrentCommand();
        }
        break;

      case 'l':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          engineRef.current?.clear();
        }
        break;
    }
  }, [currentInput, isUseMode, commandHistory.length, isExecuting]);

  /**
   * Tab 补全
   */
  const handleTabComplete = useCallback(() => {
    if (!currentInput.trim() || !engineRef.current) return;

    const suggestions = engineRef.current.getSuggestions(currentInput.trim());
    if (suggestions.length === 1) {
      setCurrentInput(suggestions[0].name);
      setSuggestion('');
      if (inputRef.current) inputRef.current.textContent = suggestions[0].name;
    } else if (suggestions.length > 1) {
      setSuggestion(suggestions.map(s => s.name).join('  '));
      setTimeout(() => setSuggestion(''), 3000);
    }
  }, [currentInput]);

  /**
   * 浏览历史命令
   */
  const navigateHistory = useCallback((direction: number) => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex + direction;
    if (newIndex < -1) newIndex = -1;
    if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;

    setHistoryIndex(newIndex);

    if (newIndex === -1) {
      setCurrentInput('');
      if (inputRef.current) inputRef.current.textContent = '';
    } else {
      const historyCmd = commandHistory[commandHistory.length - 1 - newIndex] || '';
      setCurrentInput(historyCmd);
      if (inputRef.current) inputRef.current.textContent = historyCmd;
    }
  }, [historyIndex, commandHistory]);

  /**
   * 获取当前提示符
   */
  const getPromptPrefix = (): string => {
    if (isUseMode) return `${currentUsername}(select)`;
    return currentUsername;
  };

  // 获取主题样式（不再包含背景图）
  const getThemeStyle = (): React.CSSProperties => {
    const config = engineRef.current?.getConfig();
    const style: React.CSSProperties = {};

    // 容器背景透明，让底层 fixed 背景图透出来
    style.backgroundColor = 'transparent';

    style.height = typeof height === 'number' ? `${height}px` : height;

    return style;
  };

  return (
    <>
      {/* 动态视频壁纸 - 全屏固定底层 */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: 'auto',
          zIndex: -1,
          pointerEvents: 'none',
          opacity: isDynamicBg ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        src="/bg.mp4"
      />
      {/* 静态图片壁纸 - 全屏固定底层 */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          opacity: isDynamicBg ? 0 : 1,
          transition: 'opacity 0.5s ease',
          backgroundImage: 'url(/bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* 右上角背景切换按钮 - 极客风 */}
      <button
        onClick={toggleBgMode}
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 9999,
          ...(isDynamicBg ? {
            background: 'rgba(0,255,0,0.06)',
            borderColor: 'rgba(0,255,0,0.25)',
            color: '#00ff00',
            boxShadow: '0 0 8px rgba(0,255,0,0.1), inset 0 0 8px rgba(0,255,0,0.05)',
          } : {
            background: 'rgba(0,180,255,0.06)',
            borderColor: 'rgba(0,180,255,0.25)',
            color: '#00b4ff',
            boxShadow: '0 0 8px rgba(0,180,255,0.1), inset 0 0 8px rgba(0,180,255,0.05)',
          }),
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer border transition-all duration-200"
        title={isDynamicBg ? '切换到静态背景' : '切换到动态背景'}
      >
        {/* 动态/静态图标 */}
        <span style={{ fontSize: 13, lineHeight: 1 }}>
          {isDynamicBg ? '▶' : '■'}
        </span>
        {/* 文字 */}
        <span style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em',
          textShadow: isDynamicBg ? '0 0 6px rgba(0,255,0,0.5)' : '0 0 6px rgba(0,180,255,0.5)',
        }}>
          {isDynamicBg ? 'DYNAMIC' : 'STATIC'}
        </span>
      </button>

      {/* 终端主容器 - 确保在背景视频/图片上层 */}
      <div
        className={`terminal-container relative w-full ${className}`}
        style={{
          ...getThemeStyle(),
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: `${fontSize}px`,
          paddingLeft: `14px`,
          zIndex: 1,
        }}
        onClick={() => inputRef.current?.focus()}
      >
      {/* 玻璃磨砂遮罩层 - 叠加在背景之上 */}
      <div
        className="glass-overlay absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 10, 20, 0.75) 0%, rgba(5, 15, 25, 0.65) 50%, rgba(0, 8, 16, 0.72) 100%)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* CRT 效果层 */}
      <div className="scanlines absolute inset-0 pointer-events-none z-10 opacity-10" />
      <div className="glow-overlay absolute inset-0 pointer-events-none z-0" />

      {/* 主内容区 */}
      <div className="relative z-20 flex flex-col h-full p-4 md:p-6 lg:p-8">
        {/* 头部栏 */}
        {showHeader && (
          <header className="terminal-header flex justify-between items-center mb-4 pb-2 border border-gray-800">
            <span className="text-xs text-gray-500">
              Terminal v2.0 | {getSystemInfoString()}
            </span>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
          </header>
        )}

        {/* 欢迎信息打字机动画 - 字符级动态效果 */}
        {welcomeCharCount !== null && (
          <pre
            style={{
              margin: 0,
              padding: 0,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontSize: `${typeof fontSize === 'number' ? fontSize : 14}px`,
              lineHeight: 1.2,
              color: '#00ff00',
              whiteSpace: 'pre',
              overflow: 'hidden',
            }}
          >
            {fullWelcomeRef.current.slice(0, welcomeCharCount === -1 ? fullWelcomeRef.current.length : welcomeCharCount).split('').map((char, i) => {
              // 换行符用 <br /> 替代，确保正确换行
              if (char === '\n') return <br key={i} />;
              const logo = isLogoChar(char);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    color: logo ? '#00ff99' : '#00ff00',
                    textShadow: logo
                      ? `0 0 ${6 + Math.sin(i * 0.4) * 4}px rgba(0,255,153,${0.5 + Math.sin(i * 0.3) * 0.3})`
                      : '0 0 6px rgba(0,255,0,0.3)',
                    animation: logo
                      ? `logoPulse ${1.2 + (i % 5) * 0.15}s ease-in-out infinite`
                      : undefined,
                    animationDelay: `${(i % 8) * 0.08}s`,
                  }}
                >
                  {char}
                </span>
              );
            })}
            {/* 打字光标（仅动画进行中显示） */}
            {welcomeCharCount > 0 && welcomeCharCount !== -1 && (
              <span
                style={{
                  display: 'inline-block',
                  width: '0.6em',
                  height: '1em',
                  backgroundColor: '#00ff00',
                  verticalAlign: 'text-bottom',
                  marginLeft: '1px',
                  animation: 'cursorBlink 0.7s step-end infinite',
                }}
              />
            )}
          </pre>
        )}

        {/* 输出显示 */}
        <OutputDisplay outputs={outputs} endRef={outputEndRef} />

        {/* 进度条 - 仅当命令主动报告进度时显示（避免快速命令闪烁） */}
        {progressInfo && (
          <div className="mt-2">
            <ProgressBar
              value={progressInfo?.value || 0}
              message={progressInfo?.message}
            />
            {/* 中断提示 */}
            {!progressInfo?.value && (
              <div className="mt-1 text-xs text-yellow-500/70 animate-pulse">
                执行中... 按 Ctrl+C 或 q 中断
              </div>
            )}
          </div>
        )}

        {/* 命令输入行 */}
        <div className="mt-4 pt-2 border-t border-gray-800/50">
          <div
            ref={commandLineRef}
            className="command-line relative flex items-center font-mono text-sm"
            onClick={() => inputRef.current?.focus()}
          >
            {/* 提示符 */}
            <span className="text-green-400 flex-shrink-0 select-none">
              {getPromptPrefix()}&gt;
            </span>

            {/* 输入区域 - 用 contenteditable 替代 input，无原生样式 */}
            <span
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const text = (e.target as HTMLElement).textContent || '';
                setCurrentInput(text);
                setSuggestion('');
              }}
              onKeyDown={handleKeyDown}
              className="outline-none border-none ml-1 min-w-[2ch]"
              style={{ 
                color: '#e5e7eb',
                caretColor: 'transparent',  // 隐藏原生细光标，只用自定义粗光标
                display: 'inline',
                border: 'none',
                boxShadow: 'none',
              }}
              spellCheck={false}
            />
            
            {/* 自定义粗光标 - 跟随输入光标位置 */}
            <Cursor engineRef={engineRef} position={cursorPosition} />

            {/* Tab 补全建议 */}
            {suggestion && (
              <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-green-900 rounded px-3 py-2 text-xs text-green-400 z-10">
                {suggestion}
              </div>
            )}
          </div>
        </div>

        {/* 底部状态栏 */}
        {showFooter && (
          <footer className="mt-2 text-xs text-gray-600 flex justify-between">
            <span>Tab: 补全 | ↑↓: 历史 | Ctrl+C: 清除</span>
            <span>按 Esc 取消操作</span>
          </footer>
        )}
      </div>
    </div>
    </>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
