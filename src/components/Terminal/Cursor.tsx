/**
 * ============================================
 * 可插拔终端 - 光标组件（支持主题配置）
 * ============================================
 */
import React from 'react';
import type { ITerminalAPI } from '../../lib/types';

interface CursorProps {
  engineRef: React.RefObject<ITerminalAPI | null>;
  /** 光标位置（相对于输入行容器），null 时使用 inline 默认位置 */
  position?: { top: number; left: number; height: number } | null;
}

const Cursor: React.FC<CursorProps> = ({ engineRef, position }) => {
  // 从引擎获取配置
  const config = engineRef.current?.getConfig();
  
  // 默认配置 - 使用 block 粗光标
  const cursorColor = config?.cursorColor || '#00ff00';
  const cursorStyle = config?.cursorStyle || 'block';

  /**
   * 根据配置生成光标样式
   */
  const getCursorStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      color: cursorColor,
      transition: 'all 0.1s ease',
    };

    // 有精确位置时使用绝对定位
    if (position) {
      base.position = 'absolute';
      base.left = `${position.left}px`;
      base.top = `${position.top}px`;
      // 高度跟随文字行高
      if (cursorStyle === 'block') {
        base.height = `${position.height || 18}px`;
      }
    } else {
      // 无位置信息时回退为 inline 模式
      base.display = 'inline-block';
    }

    switch (cursorStyle) {
      case 'blink':
        return { ...base, animation: 'cursorBlink 1s step-end infinite' };
      
      case 'static':
        return base;
      
      case 'underline':
        return {
          ...base,
          borderBottom: `2px solid ${cursorColor}`,
          width: '0.6em',
          height: '0',
          verticalAlign: 'baseline',
        };

      case 'block':
        return {
          ...base,
          backgroundColor: cursorColor,
          color: cursorColor === '#000000' ? '#fff' : '#000',
          width: '0.6em',
          animation: 'cursorBlink 1s step-end infinite',
          verticalAlign: 'text-bottom',
        };
      
      default:
        return base;
    }
  };

  return (
    <span className="terminal-cursor" style={getCursorStyle()}>
      {cursorStyle !== 'underline' && cursorStyle !== 'block' ? '▊' : ''}
    </span>
  );
};

export default Cursor;
