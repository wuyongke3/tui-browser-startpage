import React, { useRef, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../../store/useTerminalStore';
import { useCommandParser } from '../../hooks/useCommandParser';
import Cursor from './Cursor';
import { getCommandSuggestions } from '../../utils/commands';

/**
 * 命令输入行组件
 * 处理用户键盘输入和命令执行
 */
const CommandLine: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestion, setSuggestion] = useState('');
  
  const {
    currentInput,
    setCurrentInput,
    clearInput,
    username,
    isConfigMode,
    isUseMode,
    historyIndex,
    commandHistory,
    setHistoryIndex,
  } = useTerminalStore();

  const { executeCommand } = useCommandParser();

  // 聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          executeCommand(currentInput);
          setSuggestion('');
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
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            clearInput();
            setSuggestion('');
            
            // 如果在特殊模式中，退出模式
            if (isConfigMode) {
              useTerminalStore.getState().setConfigMode(false);
            }
            if (isUseMode) {
              useTerminalStore.getState().setUseMode(false);
            }
          }
          break;

        case 'l':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            useTerminalStore.getState().clearOutputs();
          }
          break;
      }
    },
    [
      currentInput,
      isConfigMode,
      isUseMode,
      historyIndex,
      commandHistory.length,
      executeCommand,
      clearInput,
      setHistoryIndex,
    ]
  );

  /**
   * Tab 自动补全
   */
  const handleTabComplete = useCallback(() => {
    if (!currentInput.trim()) return;

    const suggestions = getCommandSuggestions(currentInput.trim());
    if (suggestions.length === 1) {
      setCurrentInput(suggestions[0]);
      setSuggestion('');
    } else if (suggestions.length > 1) {
      setSuggestion(suggestions.join('  '));
      // 3秒后清除建议
      setTimeout(() => setSuggestion(''), 3000);
    }
  }, [currentInput, setCurrentInput]);

  /**
   * 浏览历史命令
   */
  const navigateHistory = useCallback(
    (direction: number) => {
      if (commandHistory.length === 0) return;

      let newIndex = historyIndex + direction;

      if (newIndex < -1) newIndex = -1;
      if (newIndex >= commandHistory.length) newIndex = commandHistory.length - 1;

      setHistoryIndex(newIndex);

      if (newIndex === -1) {
        setCurrentInput('');
      } else {
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    },
    [historyIndex, commandHistory, setCurrentInput, setHistoryIndex]
  );

  /**
   * 处理终端容器点击（聚焦输入框）
   */
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * 获取当前模式的提示符
   */
  const getPromptPrefix = (): string => {
    if (isConfigMode) return `${username}(config)`;
    if (isUseMode) return `${username}(select)`;
    return username;
  };

  return (
    <div 
      className="command-line flex items-center font-mono text-sm"
      onClick={handleContainerClick}
    >
      {/* 提示符 */}
      <span className="text-green-400 mr-2 flex-shrink-0 select-none">
        {getPromptPrefix()}&gt;
      </span>

      {/* 隐藏的输入框（用于接收键盘输入） */}
      <input
        ref={inputRef}
        type="text"
        value={currentInput}
        onChange={(e) => {
          setCurrentInput(e.target.value);
          setSuggestion('');
        }}
        onKeyDown={handleKeyDown}
        className="flex-1 outline-none bg-transparent caret-transparent"
        style={{
          color: 'transparent',
          caretColor: 'transparent',
        }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* 显示输入的文字（带语法高亮效果） */}
      <span className="absolute pointer-events-none flex items-center">
        <span style={{ color: '#e5e7eb' }}>{currentInput}</span>
        <Cursor />
      </span>

      {/* Tab 补全建议 */}
      {suggestion && (
        <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-green-900 rounded px-3 py-2 text-xs text-green-400 z-10">
          {suggestion}
        </div>
      )}
    </div>
  );
};

// 需要导入 useState
import { useState } from 'react';

export default CommandLine;
